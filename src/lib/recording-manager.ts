import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export type RecordingState = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'error';

export interface RecordingSession {
  id: string;
  state: RecordingState;
  interimTranscript: string;
  finalTranscripts: string[];
  audioChunks: Blob[];
  duration: number;
  error?: string;
}

type RecordingEventMap = {
  'state-changed': RecordingState;
  'transcript-interim': string;
  'transcript-final': string;
  'recording-complete': {
    audioBlob: Blob;
    transcript: string;
    duration: number;
  };
  'error': string;
};

type RecordingEventListener<K extends keyof RecordingEventMap> = (data: RecordingEventMap[K]) => void;

/**
 * Singleton manager for real-time voice recording with Deepgram live transcription
 * Uses Deepgram SDK directly in browser for WebSocket streaming
 */
class RecordingManager {
  private static instance: RecordingManager;

  private session: RecordingSession | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private deepgramConnection: any = null; // Deepgram LiveClient connection
  private startTime: number = 0;
  private listeners: Map<keyof RecordingEventMap, Set<RecordingEventListener<any>>> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): RecordingManager {
    if (!RecordingManager.instance) {
      RecordingManager.instance = new RecordingManager();
    }
    return RecordingManager.instance;
  }

  /**
   * Subscribe to recording events
   */
  on<K extends keyof RecordingEventMap>(event: K, listener: RecordingEventListener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit<K extends keyof RecordingEventMap>(event: K, data: RecordingEventMap[K]): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Get current recording session
   */
  getSession(): RecordingSession | null {
    return this.session;
  }

  /**
   * Get current media stream (for visualization)
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.session?.state === 'recording';
  }

  /**
   * Start recording with real-time transcription
   */
  async startRecording(): Promise<void> {
    // Prevent multiple recordings
    if (this.session && this.session.state !== 'idle') {
      throw new Error('Recording already in progress');
    }

    // Initialize session
    this.session = {
      id: crypto.randomUUID(),
      state: 'requesting-permission',
      interimTranscript: '',
      finalTranscripts: [],
      audioChunks: [],
      duration: 0,
    };
    this.emit('state-changed', 'requesting-permission');

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Setup MediaRecorder with 250ms chunks for streaming
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      // Setup Deepgram connection
      await this.setupDeepgramConnection();

      // Handle audio data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Save for final audio blob
          this.session!.audioChunks.push(event.data);

          // Send to Deepgram for real-time transcription
          if (this.deepgramConnection) {
            const connection = this.deepgramConnection; // Capture reference
            event.data.arrayBuffer().then(buffer => {
              if (connection) {
                connection.send(buffer);
              }
            }).catch((error: Error) => {
              console.error('[RecordingManager] Failed to send audio chunk:', error);
            });
          }
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        this.finalizeRecording();
      };

      // Start recording with 250ms chunks
      this.mediaRecorder.start(250);
      this.startTime = Date.now();

      this.session.state = 'recording';
      this.emit('state-changed', 'recording');

    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      this.session!.state = 'error';
      this.session!.error = errorMessage;
      this.emit('state-changed', 'error');
      this.emit('error', errorMessage);
      this.cleanup();
    }
  }

  /**
   * Setup Deepgram connection for live transcription
   */
  private async setupDeepgramConnection(): Promise<void> {
    try {
      // Fetch Deepgram API key from our secure endpoint
      const keyResponse = await fetch('/api/voice/transcribe-live');
      if (!keyResponse.ok) {
        throw new Error('Failed to get Deepgram API key');
      }

      const { apiKey } = await keyResponse.json();
      if (!apiKey) {
        throw new Error('No API key received');
      }

      // Create Deepgram client
      const deepgramClient = createClient(apiKey);

      // Establish live transcription connection
      const connection = deepgramClient.listen.live({
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        endpointing: 300,
        punctuate: true,
        filler_words: false,
      });

      // Store connection reference
      this.deepgramConnection = connection;

      // Setup event handlers wrapped in Promise for initialization
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Deepgram connection timeout'));
        }, 10000);

        // Connection opened
        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log('[Deepgram] Live connection opened');
          clearTimeout(timeout);
          resolve();
        });

        // Transcription results
        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          this.handleDeepgramMessage({
            type: 'Results',
            ...data,
          });
        });

        // Metadata events
        connection.on(LiveTranscriptionEvents.Metadata, (data) => {
          console.log('[Deepgram] Metadata:', data);
        });

        // Utterance end events
        connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
          console.log('[Deepgram] Utterance ended');
          this.handleDeepgramMessage({
            type: 'UtteranceEnd',
            ...data,
          });
        });

        // Error handling
        connection.on(LiveTranscriptionEvents.Error, (error) => {
          console.error('[Deepgram] Error:', error);
          clearTimeout(timeout);
          reject(error);
        });

        // Connection closed
        connection.on(LiveTranscriptionEvents.Close, () => {
          console.log('[Deepgram] Connection closed');
        });
      });

    } catch (error) {
      console.error('[Deepgram] Setup failed:', error);
      throw error;
    }
  }

  /**
   * Handle incoming Deepgram transcription messages
   */
  private handleDeepgramMessage(data: any): void {
    if (!this.session) return;

    // Deepgram sends different message types
    if (data.type === 'Results') {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final || data.speech_final;

      if (!transcript) return;

      if (isFinal) {
        // Final transcript - add to final transcripts array
        this.session.finalTranscripts.push(transcript);
        this.session.interimTranscript = ''; // Clear interim
        this.emit('transcript-final', transcript);
      } else {
        // Interim transcript - update current interim
        this.session.interimTranscript = transcript;
        this.emit('transcript-interim', transcript);
      }
    }
  }

  /**
   * Stop recording and finalize
   */
  async stopRecording(): Promise<void> {
    if (!this.session || this.session.state !== 'recording') {
      throw new Error('No active recording to stop');
    }

    this.session.state = 'processing';
    this.emit('state-changed', 'processing');

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Close Deepgram connection gracefully
    if (this.deepgramConnection) {
      // Capture reference before clearing
      const connection = this.deepgramConnection;
      this.deepgramConnection = null;

      // Wait a bit for final transcripts
      await new Promise(resolve => setTimeout(resolve, 500));

      // Finish the connection
      try {
        connection.finish();
      } catch (error) {
        console.error('[Deepgram] Error closing connection:', error);
      }
    }
  }

  /**
   * Finalize recording and create audio blob
   */
  private finalizeRecording(): void {
    if (!this.session) return;

    try {
      // Calculate duration
      const duration = (Date.now() - this.startTime) / 1000;
      this.session.duration = duration;

      // Create final audio blob
      const audioBlob = new Blob(this.session.audioChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm'
      });

      // Combine all final transcripts
      const fullTranscript = this.session.finalTranscripts.join(' ').trim();

      // Emit completion event
      this.emit('recording-complete', {
        audioBlob,
        transcript: fullTranscript,
        duration,
      });

      // Reset session
      this.session.state = 'idle';
      this.emit('state-changed', 'idle');

    } catch (error) {
      console.error('Failed to finalize recording:', error);
      this.session!.state = 'error';
      this.session!.error = 'Failed to process recording';
      this.emit('state-changed', 'error');
      this.emit('error', 'Failed to process recording');
    } finally {
      this.cleanup();
    }
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (!this.session) return;

    // Stop everything
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.deepgramConnection) {
      try {
        this.deepgramConnection.finish();
      } catch (error) {
        console.error('[Deepgram] Error canceling connection:', error);
      }
    }

    this.cleanup();

    this.session = null;
    this.emit('state-changed', 'idle');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Clear MediaRecorder
    this.mediaRecorder = null;

    // Close Deepgram connection
    if (this.deepgramConnection) {
      try {
        this.deepgramConnection.finish();
      } catch (error) {
        console.error('Failed to close Deepgram connection:', error);
      }
      this.deepgramConnection = null;
    }
  }

  /**
   * Destroy instance and cleanup all resources
   */
  destroy(): void {
    this.cancelRecording();
    this.listeners.clear();
  }
}

// Export singleton instance
export const recordingManager = RecordingManager.getInstance();
