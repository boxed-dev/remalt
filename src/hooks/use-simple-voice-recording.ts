'use client';

import { useState, useRef, useCallback } from 'react';

interface UseSimpleVoiceRecordingReturn {
  isRecording: boolean;
  mediaStream: MediaStream | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ audioBlob: Blob; duration: number }>;
  cancelRecording: () => void;
  error: string | null;
}

/**
 * Simple voice recording hook without real-time transcription
 * Records audio and returns blob when stopped
 */
export function useSimpleVoiceRecording(): UseSimpleVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      setMediaStream(stream);

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Collect chunks every 250ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      setIsRecording(false);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<{ audioBlob: Blob; duration: number }> => {
    // Set recording to false IMMEDIATELY so UI updates instantly
    setIsRecording(false);

    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm'
        });

        // Cleanup
        cleanup();

        resolve({ audioBlob, duration });
      };

      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    // Set recording to false IMMEDIATELY
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setError(null);
  }, []);

  const cleanup = () => {
    // Stop and release media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
        mediaStream.removeTrack(track);
      });
      setMediaStream(null);
    }

    // Clear refs
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  return {
    isRecording,
    mediaStream,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  };
}
