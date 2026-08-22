import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraStatus, CameraError, UseCameraReturn } from '../types/camera';

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<CameraError | null>(null);
  const [cameraLabel, setCameraLabel] = useState<string>('Default Nursery Webcam');

  const streamRef = useRef<MediaStream | null>(null);

  // Stop active media tracks and clear video source
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore error if track already ended
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setCameraStatus('idle');
    setError(null);
  }, []);

  // Start webcam video stream
  const startCamera = useCallback(async (): Promise<boolean> => {
    // Check if browser supports mediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err: CameraError = {
        type: 'unsupported',
        message: 'Your browser does not support webcam access. Please use a modern browser (Chrome, Firefox, Safari, Edge).'
      };
      setCameraStatus('unsupported');
      setError(err);
      return false;
    }

    // Stop any existing stream before starting a new one
    stopCamera();

    setCameraStatus('requesting');
    setError(null);

    try {
      // Request video-only stream (1080p ideal)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraStatus('connected');
      setError(null);

      // Extract device label if available
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.label) {
        setCameraLabel(videoTrack.label);
      }

      // Attach stream to HTMLVideoElement if ref is currently mounted
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch {
          // Auto-play might need user interaction or is already playing
        }
      }

      // Listen for track ending (e.g. user unplugs camera or revokes permission)
      if (videoTrack) {
        videoTrack.onended = () => {
          stopCamera();
        };
      }

      return true;
    } catch (err: unknown) {
      let cameraErr: CameraError;

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          cameraErr = {
            type: 'permission_denied',
            message: 'Camera access was denied. Please allow camera permission in your browser settings to enable nursery monitoring.'
          };
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          cameraErr = {
            type: 'unavailable',
            message: 'No camera device found on this computer. Please connect a webcam and try again.'
          };
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          cameraErr = {
            type: 'unavailable',
            message: 'The webcam is currently in use by another application. Please close other camera apps and retry.'
          };
        } else {
          cameraErr = {
            type: 'error',
            message: `Camera error (${err.name}): ${err.message || 'Unable to access video stream.'}`
          };
        }
      } else {
        cameraErr = {
          type: 'error',
          message: 'An unexpected error occurred while accessing the webcam.'
        };
      }

      setCameraStatus(cameraErr.type);
      setError(cameraErr);
      setStream(null);
      streamRef.current = null;
      return false;
    }
  }, [stopCamera]);

  // Synchronize videoRef whenever ref or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Clean up all tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    stream,
    cameraStatus,
    isMonitoring: cameraStatus === 'connected',
    startCamera,
    stopCamera,
    error,
    cameraLabel
  };
};
