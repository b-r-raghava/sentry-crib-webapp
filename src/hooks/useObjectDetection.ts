import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { 
  DetectedObject, 
  TrackedPerson, 
  SharpObjectDetection, 
  ModelStatus, 
  UseObjectDetectionReturn,
  SharpObjectDetectorMetadata
} from '../types/detection';
import { MultiObjectTracker } from '../services/tracker';
import { sharpObjectDetector, CURRENT_BUILTIN_SHARP_CLASSES } from '../services/sharpObjectDetector';

// Singleton model reference across component mounts
let globalModelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let globalModelInstance: cocoSsd.ObjectDetection | null = null;

const getOrLoadModel = async (): Promise<cocoSsd.ObjectDetection> => {
  if (globalModelInstance) {
    return globalModelInstance;
  }
  if (!globalModelPromise) {
    globalModelPromise = (async () => {
      // Ensure tf backend is ready (WebGL preferred, fallback to CPU)
      await tf.ready();
      const model = await cocoSsd.load({ base: 'mobilenet_v2' });
      globalModelInstance = model;
      return model;
    })();
  }
  return globalModelPromise;
};

export const useObjectDetection = (): UseObjectDetectionReturn => {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [inferenceFps, setInferenceFps] = useState<number>(0);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5); // 50% default

  const isDetectingRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());
  const thresholdRef = useRef<number>(confidenceThreshold);

  // Multi-object tracker instance with EMA confidence (alpha = 0.30) and coordinate smoothing (alpha = 0.35)
  const trackerRef = useRef<MultiObjectTracker>(
    new MultiObjectTracker({ alphaConfidence: 0.30, alphaBox: 0.35, maxMissedFrames: 6 })
  );

  thresholdRef.current = confidenceThreshold;

  // Preload model on hook initialization
  useEffect(() => {
    let isMounted = true;
    setModelStatus('loading');

    getOrLoadModel()
      .then(() => {
        if (isMounted) {
          setModelStatus(isDetectingRef.current ? 'detecting' : 'ready');
          setInferenceError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('TensorFlow.js model loading error:', err);
          setModelStatus('error');
          setInferenceError('Failed to initialize local TensorFlow.js model in browser.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Stop inference loop and clear active tracks
  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    videoElementRef.current = null;
    trackerRef.current.reset();
    setDetections([]);
    setInferenceFps(0);
    if (globalModelInstance) {
      setModelStatus('ready');
    }
  }, []);

  // Start inference loop on a mounted HTMLVideoElement
  const startDetection = useCallback(async (videoEl: HTMLVideoElement) => {
    videoElementRef.current = videoEl;
    isDetectingRef.current = true;
    trackerRef.current.reset();

    try {
      setModelStatus('loading');
      const model = await getOrLoadModel();
      setModelStatus('detecting');
      setInferenceError(null);

      const targetIntervalMs = 90; // ~11 FPS (smooth & low CPU impact)

      const detectFrame = async (timestamp: number) => {
        if (!isDetectingRef.current || !videoElementRef.current) {
          return;
        }

        const video = videoElementRef.current;

        // Check if video is ready with valid dimensions and data
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const elapsed = timestamp - lastInferenceTimeRef.current;

          if (elapsed >= targetIntervalMs) {
            lastInferenceTimeRef.current = timestamp;

            try {
              // Run real in-browser detection using COCO-SSD
              const rawPredictions = await model.detect(video, 10, thresholdRef.current * 0.85);

              const vw = video.videoWidth;
              const vh = video.videoHeight;

              // Format raw detections before tracker smoothing
              const rawInputs = rawPredictions
                .filter(pred => pred.score >= thresholdRef.current * 0.85)
                .map(pred => {
                  const [x, y, width, height] = pred.bbox;
                  const className = pred.class.toLowerCase();
                  const isSharpHazard = CURRENT_BUILTIN_SHARP_CLASSES.includes(
                    className as (typeof CURRENT_BUILTIN_SHARP_CLASSES)[number]
                  );

                  // Normalized 0 to 100% coordinates
                  const top = Math.max(0, Math.min(100, (y / vh) * 100));
                  const left = Math.max(0, Math.min(100, (x / vw) * 100));
                  const boxWidth = Math.max(1, Math.min(100 - left, (width / vw) * 100));
                  const boxHeight = Math.max(1, Math.min(100 - top, (height / vh) * 100));

                  return {
                    className,
                    confidence: pred.score,
                    isSharpHazard,
                    modelSource: 'coco-ssd-builtin' as const,
                    box: {
                      top,
                      left,
                      width: boxWidth,
                      height: boxHeight
                    },
                    pixelBox: {
                      x,
                      y,
                      width,
                      height
                    }
                  };
                });

              // Process detections through multi-object tracker (IoU matching + EMA smoothing)
              const trackedResults = trackerRef.current.update(rawInputs, Date.now());

              // Filter results meeting the active confidence threshold
              const visibleDetections = trackedResults.filter(
                track => track.confidence >= thresholdRef.current && track.missedFrames === 0
              );

              setDetections(visibleDetections);

              // Calculate rolling FPS
              frameCountRef.current += 1;
              const now = performance.now();
              const fpsElapsed = now - lastFpsCalcTimeRef.current;
              if (fpsElapsed >= 1000) {
                const calculatedFps = Math.round((frameCountRef.current * 1000) / fpsElapsed);
                setInferenceFps(calculatedFps);
                frameCountRef.current = 0;
                lastFpsCalcTimeRef.current = now;
              }
            } catch (inferenceErr) {
              console.warn('Inference frame dropped:', inferenceErr);
            }
          }
        }

        if (isDetectingRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(detectFrame);
        }
      };

      animationFrameIdRef.current = requestAnimationFrame(detectFrame);
    } catch (err: unknown) {
      console.error('Failed to start object detection:', err);
      setModelStatus('error');
      setInferenceError('Failed to execute object detection model.');
      isDetectingRef.current = false;
    }
  }, []);

  // Cleanup on hook unmount
  useEffect(() => {
    return () => {
      isDetectingRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Derived collections
  const trackedPersons = useMemo(
    () => detections.filter((d): d is TrackedPerson => d.className === 'person'),
    [detections]
  );

  const sharpObjectDetections = useMemo(
    () => sharpObjectDetector.filterSharpDetections(detections),
    [detections]
  );

  const sharpObjectMetadata: SharpObjectDetectorMetadata = useMemo(
    () => sharpObjectDetector.getMetadata(),
    []
  );

  return {
    detections,
    trackedPersons,
    sharpObjectDetections,
    modelStatus,
    isModelLoading: modelStatus === 'loading',
    isModelReady: modelStatus === 'ready' || modelStatus === 'detecting',
    isDetecting: modelStatus === 'detecting',
    inferenceFps,
    inferenceError,
    confidenceThreshold,
    setConfidenceThreshold,
    sharpObjectMetadata,
    startDetection,
    stopDetection
  };
};
