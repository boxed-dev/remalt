'use client';

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
    // Prevent multiple recordings - session should be null when ready for new recording
    if (this.session !== null) {
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

      // Try to setup Deepgram connection (non-blocking, continues without it if it fails)
      try {
        await this.setupDeepgramConnection();
        console.log('[RecordingManager] Live transcription enabled');
      } catch (deepgramError) {
        console.warn('[RecordingManager] Live transcription unavailable, will transcribe after recording:', deepgramError);
        // Continue without live transcription - we'll transcribe the final audio instead
      }

      // Handle audio data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Save for final audio blob
          this.session!.audioChunks.push(event.data);

          // Send to Deepgram for real-time transcription (if connected)
          if (this.deepgramConnection) {
            // Convert blob to ArrayBuffer and send
            event.data.arrayBuffer()
              .then(buffer => {
                if (this.deepgramConnection) {
                  this.deepgramConnection.send(buffer);
                }
              })
              .catch((error: Error) => {
                console.error('[RecordingManager] ❌ Failed to send audio chunk:', error);
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

      if (this.session) {
        this.session.state = 'error';
        this.session.error = errorMessage;
      }

      this.emit('state-changed', 'error');
      this.emit('error', errorMessage);
      this.cleanup();

      // Reset session to null after error to allow new recordings
      this.session = null;
    }
  }

  /**
   * Setup Deepgram connection for live transcription with retry logic
   */
  private async setupDeepgramConnection(retryCount = 0): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 1000; // Start with 1 second

    try {
      console.log('[RecordingManager] Fetching Deepgram API key...');

      // Fetch Deepgram API key from our secure endpoint
      const keyResponse = await fetch('/api/voice/transcribe-live', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!keyResponse.ok) {
        const errorData = await keyResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[RecordingManager] Failed to fetch API key:', errorData);
        throw new Error(errorData.error || 'Failed to get Deepgram API key');
      }

      const { apiKey } = await keyResponse.json();
      if (!apiKey) {
        throw new Error('No API key received from server');
      }

      console.log('[RecordingManager] API key received, creating Deepgram client...');

      // Create Deepgram client with browser-specific configuration
      const deepgramClient = createClient(apiKey);

      console.log('[RecordingManager] Establishing live transcription connection...');

      // Establish live transcription connection with optimized settings
      // Using nova-3: Most accurate model (6.84% WER, 54.2% better than competitors)
      const connection = deepgramClient.listen.live({
        model: 'nova-3',
        detect_language: true,        // Auto-detect language for multilingual support
        smart_format: true,           // Format numbers, currency, emails
        interim_results: true,        // Enable real-time streaming
        utterance_end_ms: 800,        // 800ms pause = end of utterance (reduced from 1000ms)
        vad_events: true,             // Voice Activity Detection
        endpointing: 250,             // 250ms silence = finalize (more responsive, reduced from 300ms)
        punctuate: true,              // Auto-punctuation
        filler_words: false,          // Remove "um", "uh", "like"
      });

      // Setup event handlers wrapped in Promise for initialization
      return new Promise((resolve, reject) => {
        let isResolved = false;

        // Increased timeout to 30s for slower networks
        const timeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            console.error('[RecordingManager] ⏱️ Connection timeout after 30s');

            // Clean up connection on timeout
            try {
              connection.finish();
            } catch (e) {
              console.error('[RecordingManager] Error cleaning up after timeout:', e);
            }

            reject(new Error('Voice transcription unavailable. Check your network connection.'));
          }
        }, 30000); // Increased from 15s to 30s

        // Connection opened - this MUST fire for transcription to work
        connection.on(LiveTranscriptionEvents.Open, () => {
          if (!isResolved) {
            isResolved = true;
            console.log('[RecordingManager] ✅ Deepgram connection opened successfully');
            clearTimeout(timeout);

            // Store connection reference AFTER successful open
            this.deepgramConnection = connection;

            // Setup event handlers AFTER connection is open
            connection.on(LiveTranscriptionEvents.Transcript, (data) => {
              this.handleDeepgramMessage({
                type: 'Results',
                ...data,
              });
            });

            connection.on(LiveTranscriptionEvents.Metadata, (data) => {
              console.log('[RecordingManager] 📊 Metadata:', data);
            });

            connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
              console.log('[RecordingManager] 🔚 Utterance ended');
              this.handleDeepgramMessage({
                type: 'UtteranceEnd',
                ...data,
              });
            });

            connection.on(LiveTranscriptionEvents.Warning, (warning) => {
              console.warn('[RecordingManager] ⚠️ Warning:', warning);
            });

            connection.on(LiveTranscriptionEvents.Close, (closeEvent) => {
              console.log('[RecordingManager] 🔌 Connection closed:', closeEvent);
            });

            resolve();
          }
        });

        // Error handling - before connection opens
        connection.on(LiveTranscriptionEvents.Error, (error) => {
          console.error('[RecordingManager] ❌ WebSocket error:', error);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);

            try {
              connection.finish();
            } catch (e) {
              // Ignore cleanup errors
            }

            reject(new Error('Voice transcription connection failed. Please try again.'));
          }
        });

        console.log('[RecordingManager] ⏳ Waiting for WebSocket connection...');
      });

    } catch (error) {
      console.error('[RecordingManager] Setup failed (attempt ' + (retryCount + 1) + '/' + maxRetries + '):', error);

      // Ensure cleanup on any error
      if (this.deepgramConnection) {
        try {
          this.deepgramConnection.finish();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.deepgramConnection = null;
      }

      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s
        console.log(`[RecordingManager] 🔄 Retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.setupDeepgramConnection(retryCount + 1);
      }

      // All retries exhausted
      console.error('[RecordingManager] ❌ All retry attempts failed');
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
      // Extract transcript from the response structure
      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      const isFinal = data.is_final === true || data.speech_final === true;

      // Skip empty transcripts
      if (!transcript || transcript.trim().length === 0) return;

      const confidence = data.channel?.alternatives?.[0]?.confidence || 0;

      console.log('[RecordingManager] 🎤 Transcript:', {
        text: transcript.substring(0, 50) + (transcript.length > 50 ? '...' : ''),
        isFinal,
        confidence: (confidence * 100).toFixed(1) + '%',
      });

      if (isFinal) {
        // Final transcript - add to final transcripts array
        this.session.finalTranscripts.push(transcript);
        this.session.interimTranscript = ''; // Clear interim
        this.emit('transcript-final', transcript);
        console.log('[RecordingManager] ✅ Final transcript added');
      } else {
        // Interim transcript - update current interim
        this.session.interimTranscript = transcript;
        this.emit('transcript-interim', transcript);
      }
    } else if (data.type === 'UtteranceEnd') {
      console.log('[RecordingManager] 🔚 Utterance ended, finalizing current transcript');
    }
  }

  /**
   * Stop recording and finalize
   */
  async stopRecording(): Promise<void> {
    // Gracefully handle if already stopped or no session
    if (!this.session) {
      console.log('[RecordingManager] No active session to stop');
      return;
    }

    // If already processing or idle, don't throw error
    if (this.session.state !== 'recording') {
      console.log('[RecordingManager] Recording already stopping or stopped, state:', this.session.state);
      return;
    }

    try {
      this.session.state = 'processing';
      this.emit('state-changed', 'processing');

      // Close Deepgram connection gracefully
      if (this.deepgramConnection) {
        console.log('[RecordingManager] 📡 Closing Deepgram connection...');

        // Capture reference before clearing
        const connection = this.deepgramConnection;
        this.deepgramConnection = null;

        // Wait a bit for final transcripts to arrive
        await new Promise(resolve => setTimeout(resolve, 800));

        // Finish the connection gracefully
        try {
          connection.finish();
          console.log('[RecordingManager] ✅ Deepgram connection closed');
        } catch (error) {
          console.error('[RecordingManager] ❌ Error closing connection:', error);
        }
      }

      // Stop MediaRecorder - this will trigger finalizeRecording via onstop handler
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        // If MediaRecorder is already stopped, manually finalize
        console.log('[RecordingManager] MediaRecorder already inactive, finalizing...');
        this.finalizeRecording();
      }
    } catch (error) {
      console.error('[RecordingManager] Error stopping recording:', error);
      // Clean up and reset session on error
      this.cleanup();
      this.session = null;
      this.emit('state-changed', 'error');
      this.emit('error', 'Failed to stop recording');
      throw error;
    }
  }

  /**
   * Finalize recording and create audio blob
   */
  private async finalizeRecording(): Promise<void> {
    if (!this.session) return;

    try {
      // Calculate duration
      const duration = (Date.now() - this.startTime) / 1000;
      this.session.duration = duration;

      // Create final audio blob
      const audioBlob = new Blob(this.session.audioChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm'
      });

      // Combine all final transcripts from live transcription
      let fullTranscript = this.session.finalTranscripts.join(' ').trim();

      // If no live transcription, try to transcribe the audio file
      if (!fullTranscript && audioBlob.size > 0) {
        console.log('[RecordingManager] No live transcript, attempting post-recording transcription...');
        try {
          fullTranscript = await this.transcribeAudioBlob(audioBlob);
          console.log('[RecordingManager] Post-recording transcription successful');
        } catch (transcribeError) {
          console.error('[RecordingManager] Post-recording transcription failed:', transcribeError);
          // Continue without transcript
        }
      }

      // Emit completion event
      this.emit('recording-complete', {
        audioBlob,
        transcript: fullTranscript,
        duration,
      });

      // Emit idle state before resetting session
      this.emit('state-changed', 'idle');

    } catch (error) {
      console.error('Failed to finalize recording:', error);
      this.session!.state = 'error';
      this.session!.error = 'Failed to process recording';
      this.emit('state-changed', 'error');
      this.emit('error', 'Failed to process recording');
    } finally {
      this.cleanup();
      // Always reset session to null after completion (success or error)
      this.session = null;
    }
  }

  /**
   * Transcribe audio blob using Deepgram's prerecorded API (fallback)
   */
  private async transcribeAudioBlob(audioBlob: Blob): Promise<string> {
    // Convert blob to base64 using browser APIs
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: base64Audio,
      }),
    });

    if (!response.ok) {
      throw new Error('Transcription API failed');
    }

    const result = await response.json();
    return result.transcript || '';
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (!this.session) return;

    // Remove onstop handler to prevent finalizeRecording from being called
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null;
    }

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
    // Stop MediaRecorder first to release browser recording state
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        // Remove event handlers to prevent memory leaks
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.onerror = null;
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
      // Explicitly null out reference
      this.mediaRecorder = null;
    }

    // Stop and release all media stream tracks immediately
    if (this.mediaStream) {
      const tracks = this.mediaStream.getTracks();
      tracks.forEach(track => {
        try {
          track.stop();
          // Explicitly remove track from stream
          this.mediaStream?.removeTrack(track);
        } catch (error) {
          console.error('Error stopping track:', error);
        }
      });
      // Null out reference to ensure browser releases microphone
      this.mediaStream = null;
    }

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
