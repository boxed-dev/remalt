'use client';

import { useEffect, useRef } from 'react';

interface VoiceWaveVisualizerProps {
  mediaStream: MediaStream | null;
  isRecording: boolean;
}

/**
 * Minimal audio wave visualizer that syncs with microphone input
 * Renders smooth animated bars across the width of the container
 */
export function VoiceWaveVisualizer({ mediaStream, isRecording }: VoiceWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | undefined>(undefined);
  const dataArrayRef = useRef<Uint8Array | undefined>(undefined);

  useEffect(() => {
    if (!mediaStream || !isRecording) {
      // Stop animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // Setup Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);

    analyser.fftSize = 256; // Smaller for better performance
    analyser.smoothingTimeConstant = 0.8; // Smooth transitions

    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    // Animation loop
    const draw = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Update canvas size to match container
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw wave bars
      const barCount = 50; // Number of bars across the width
      const barWidth = rect.width / barCount;
      const centerY = rect.height / 2;

      for (let i = 0; i < barCount; i++) {
        // Sample from frequency data
        const dataIndex = Math.floor((i / barCount) * dataArrayRef.current.length);
        const value = dataArrayRef.current[dataIndex] || 0;

        // Normalize and scale (0-1, with minimum height)
        const normalizedValue = value / 255;
        const minHeight = 0.2; // Minimum 20% height for better visual
        const height = (minHeight + (normalizedValue * (1 - minHeight))) * rect.height * 0.6;

        const x = i * barWidth;
        const barGap = 1.5;

        // Draw rounded rectangle bar
        const actualBarWidth = barWidth - barGap;
        const y = centerY - height / 2;
        const radius = Math.min(actualBarWidth / 2, 2); // Max radius of 2px

        // Gradient from green to teal with opacity
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, 'rgba(12, 122, 83, 0.85)'); // #0C7A53
        gradient.addColorStop(1, 'rgba(25, 177, 122, 0.85)'); // #19B17A

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, actualBarWidth, height, radius);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [mediaStream, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  );
}
