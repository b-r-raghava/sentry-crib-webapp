import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { 
  DetectedObject, 
  TrackedPerson, 
  SharpObjectDetection, 
  TrackedAnimal,
  ModelStatus, 
  UseObjectDetectionReturn,
  SharpObjectDetectorMetadata,
  SnakeDetectorMetadata,
  DeveloperDiagnostics,
  SafetyContextResult
} from '../types/detection';
import { MultiObjectTracker, RawDetectionInput } from '../services/tracker';
import { sharpObjectDetector } from '../services/sharpObjectDetector';
import { snakeDetectorService } from '../services/snakeDetector';
import { tiledInferenceEngine, DEFAULT_TILED_CONFIG, TiledInferenceConfig } from '../services/tiledInference';
import { faceRecognitionService } from '../services/faceRecognition';
import { safetyContextEngine } from '../services/safetyContextEngine';

// Singleton model reference across component mounts
let globalModelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let globalModelInstance: cocoSsd.ObjectDetection | null = null;

const getOrLoadModel = async (): Promise<cocoSsd.ObjectDetection> => {
  if (globalModelInstance) {
    return globalModelInstance;
  }
  if (!globalModelPromise) {
    globalModelPromise = (async () => {
      await tf.ready();
      const model = await cocoSsd.load({ base: 'mobilenet_v2' });
      globalModelInstance = model;
      return model;
    })();
  }
  return globalModelPromise;
};

const INITIAL_SAFETY_CONTEXT: SafetyContextResult = {
  overallState: 'SAFE',
  statusHeadline: 'Monitored Space Clear',
  statusDescription: 'System active. No infant or toddler currently in frame.',
  toddlerDetected: false,
  recognisedPersonsCount: 0,
  unrecognisedPersonsCount: 0,
  unconfirmedPersonsCount: 0,
  animalsCount: 0,
  sharpHazardsCount: 0,
  proximityEvents: [],
  activeRuleCase: 'CASE_E_NO_TODDLER'
};

const INITIAL_DIAGNOSTICS: DeveloperDiagnostics = {
  videoDimensions: { width: 0, height: 0 },
  rawPredictions: [],
  rawSharpDetections: [],
  afterSharpFilter: [],
  afterTracker: [],
  personDiagnostics: [],
  personsCount: 0,
  toddlerDetected: false,
  recognisedPersonsCount: 0,
  unrecognisedPersonsCount: 0,
  unconfirmedPersonsCount: 0,
  animalsCount: 0,
  safetyState: 'SAFE',
  toddlerPersonProximity: 'N/A',
  toddlerAnimalProximity: 'N/A',
  currentThreshold: 0.5,
  inferenceFps: 0,
  inferenceLatencyMs: 0,
  tiledInferenceActive: true,
  tilesProcessed: 4,
  rawFullFrameCount: 0,
  rawTiledCount: 0,
  lastCaptureTime: 0
};

export const useObjectDetection = (): UseObjectDetectionReturn => {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [safetyContext, setSafetyContext] = useState<SafetyContextResult>(INITIAL_SAFETY_CONTEXT);
  const [inferenceFps, setInferenceFps] = useState<number>(0);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);
  const [tiledInferenceEnabled, setTiledInferenceEnabled] = useState<boolean>(true);
  const [diagnostics, setDiagnostics] = useState<DeveloperDiagnostics>(INITIAL_DIAGNOSTICS);

  const isDetectingRef = useRef<boolean>(false);
  const isInferenceRunningRef = useRef<boolean>(false); // Mutex guard against overlapping async frames
  const animationFrameIdRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());
  const thresholdRef = useRef<number>(confidenceThreshold);
  const tiledConfigRef = useRef<TiledInferenceConfig>({
    ...DEFAULT_TILED_CONFIG,
    enabled: tiledInferenceEnabled
  });

  const trackerRef = useRef<MultiObjectTracker>(
    new MultiObjectTracker({ alphaConfidence: 0.35, alphaBox: 0.40, maxMissedFrames: 4 })
  );

  thresholdRef.current = confidenceThreshold;
  tiledConfigRef.current.enabled = tiledInferenceEnabled;

  useEffect(() => {
    let isMounted = true;
    setModelStatus('loading');

    Promise.all([
      getOrLoadModel(),
      snakeDetectorService.init()
    ])
      .then(() => {
        if (isMounted) {
          setModelStatus(isDetectingRef.current ? 'detecting' : 'ready');
          setInferenceError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Model initialization error:', err);
          setModelStatus('error');
          setInferenceError('Failed to initialize local detection models in browser.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    isInferenceRunningRef.current = false;
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    videoElementRef.current = null;
    trackerRef.current.reset();
    setDetections([]);
    setSafetyContext(INITIAL_SAFETY_CONTEXT);
    setInferenceFps(0);
    if (globalModelInstance) {
      setModelStatus('ready');
    }
  }, []);

  const startDetection = useCallback(async (videoEl: HTMLVideoElement) => {
    videoElementRef.current = videoEl;
    isDetectingRef.current = true;
    isInferenceRunningRef.current = false;
    trackerRef.current.reset();

    try {
      setModelStatus('loading');
      const model = await getOrLoadModel();
      await snakeDetectorService.init();
      setModelStatus('detecting');
      setInferenceError(null);

      const targetIntervalMs = 90; // ~11 FPS target

      const detectFrame = async (timestamp: number) => {
        if (!isDetectingRef.current || !videoElementRef.current) {
          return;
        }

        const video = videoElementRef.current;

        // Skip if previous inference is still in-flight to prevent race conditions & duplicate tracks
        if (isInferenceRunningRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const elapsed = timestamp - lastInferenceTimeRef.current;

          if (elapsed >= targetIntervalMs) {
            isInferenceRunningRef.current = true;
            lastInferenceTimeRef.current = timestamp;
            const startTime = performance.now();

            try {
              const vw = video.videoWidth;
              const vh = video.videoHeight;

              // 1. Run COCO-SSD object inference (Full frame + small-object tiled inference)
              const cocoResult = await tiledInferenceEngine.executeInference(
                video,
                model,
                tiledConfigRef.current,
                thresholdRef.current
              );

              // 2. Run Snake & Reptile Detector
              const snakeResult = await snakeDetectorService.detectSnakes(
                video,
                thresholdRef.current
              );

              // 3. Perform Face Quality Evaluation & Embedding Matching on Person detections
              const rawInputs: RawDetectionInput[] = [];

              for (const pred of cocoResult.predictions) {
                let faceMatchCandidate = undefined;

                if (pred.className === 'person') {
                  const [px, py, pw, ph] = pred.bboxPixels;
                  const headBox = {
                    x: Math.max(0, px + pw * 0.15),
                    y: Math.max(0, py),
                    width: Math.max(10, pw * 0.7),
                    height: Math.max(10, ph * 0.38)
                  };

                  const { embedding, quality } = await faceRecognitionService.extractFaceEmbeddingWithQuality(video, headBox);
                  faceMatchCandidate = faceRecognitionService.matchFaceEmbedding(embedding, quality);
                }

                rawInputs.push({
                  className: pred.className,
                  confidence: pred.confidence,
                  isSharpHazard: pred.isSharpHazard,
                  isAnimal: pred.isAnimal,
                  animalClass: pred.animalClass,
                  faceMatchCandidate,
                  modelSource: 'coco-ssd-builtin',
                  box: pred.bboxNormalized,
                  pixelBox: {
                    x: pred.bboxPixels[0],
                    y: pred.bboxPixels[1],
                    width: pred.bboxPixels[2],
                    height: pred.bboxPixels[3]
                  }
                });
              }

              // Add snake detections into tracking stream
              for (const snakePred of snakeResult) {
                rawInputs.push({
                  className: 'snake',
                  confidence: snakePred.confidence,
                  isSharpHazard: false,
                  isAnimal: true,
                  animalClass: 'Snake',
                  modelSource: 'custom-onnx-pipeline',
                  box: snakePred.bboxNormalized,
                  pixelBox: {
                    x: snakePred.bboxPixels[0],
                    y: snakePred.bboxPixels[1],
                    width: snakePred.bboxPixels[2],
                    height: snakePred.bboxPixels[3]
                  }
                });
              }

              // 4. Update Multi-Object Tracker (With intra-frame deduplication)
              const trackedResults = trackerRef.current.update(rawInputs, Date.now());

              // 5. Filter visible detections (Ensure 1 Entity = 1 Track ID = 1 Box)
              const visibleDetections = trackedResults.filter(track => {
                if (track.isSharpHazard) {
                  if (track.isConfirmed && track.missedFrames <= 2) {
                    return track.confidence >= 0.22;
                  }
                  return track.missedFrames === 0 && track.confidence >= 0.25;
                } else if (track.isAnimal) {
                  return track.confidence >= 0.35 && track.missedFrames <= 1;
                } else if (track.className === 'person') {
                  return track.confidence >= 0.40 && track.missedFrames <= 1;
                } else {
                  return track.confidence >= thresholdRef.current && track.missedFrames <= 1;
                }
              });

              // 6. Evaluate Safety Context & Spatial Proximity
              const safetyResult = safetyContextEngine.evaluateSafetyContext(visibleDetections, Date.now());
              setSafetyContext(safetyResult);
              setDetections(visibleDetections);

              // 7. Calculate FPS & Latency
              const latencyMs = Math.round(performance.now() - startTime);
              frameCountRef.current += 1;
              const now = performance.now();
              const fpsElapsed = now - lastFpsCalcTimeRef.current;
              let currentCalculatedFps = inferenceFps;
              if (fpsElapsed >= 1000) {
                currentCalculatedFps = Math.round((frameCountRef.current * 1000) / fpsElapsed);
                setInferenceFps(currentCalculatedFps);
                frameCountRef.current = 0;
                lastFpsCalcTimeRef.current = now;
              }

              // 8. Update Developer Diagnostics with Detailed Telemetry
              const combinedRaw = [...cocoResult.predictions, ...snakeResult];
              const sharpFiltered = sharpObjectDetector.filterSharpDetections(visibleDetections);
              const persons = visibleDetections.filter(d => d.className === 'person');
              const animals = visibleDetections.filter(d => d.isAnimal);
              const personTelemetry = trackerRef.current.getPersonDiagnosticsTelemetry(visibleDetections);

              const toddlerObj = persons.find(p => p.identity?.identityState === 'TODDLER');
              let toddlerPersonProx = 'N/A';
              let toddlerAnimalProx = 'N/A';

              if (toddlerObj) {
                const nearestPerson = persons
                  .filter(p => p.id !== toddlerObj.id && p.proximityDistanceToToddlerPct !== undefined)
                  .sort((a, b) => (a.proximityDistanceToToddlerPct || 100) - (b.proximityDistanceToToddlerPct || 100))[0];

                if (nearestPerson) {
                  toddlerPersonProx = `${nearestPerson.displayName}: ${nearestPerson.proximityDistanceToToddlerPct}% distance`;
                }

                const nearestAnimal = animals
                  .filter(a => a.proximityDistanceToToddlerPct !== undefined)
                  .sort((a, b) => (a.proximityDistanceToToddlerPct || 100) - (b.proximityDistanceToToddlerPct || 100))[0];

                if (nearestAnimal) {
                  toddlerAnimalProx = `${nearestAnimal.displayName}: ${nearestAnimal.proximityDistanceToToddlerPct}% distance`;
                }
              }

              setDiagnostics({
                videoDimensions: { width: vw, height: vh },
                rawPredictions: combinedRaw,
                rawSharpDetections: combinedRaw.filter(p => p.isSharpHazard),
                afterSharpFilter: sharpFiltered,
                afterTracker: visibleDetections,
                personDiagnostics: personTelemetry,
                personsCount: persons.length,
                toddlerDetected: Boolean(toddlerObj),
                recognisedPersonsCount: persons.filter(p => p.identity?.identityState === 'RECOGNISED').length,
                unrecognisedPersonsCount: persons.filter(p => p.identity?.identityState === 'UNRECOGNISED').length,
                unconfirmedPersonsCount: persons.filter(p => p.identity?.identityState === 'UNCONFIRMED' || p.identity?.identityState === 'UNKNOWN').length,
                animalsCount: animals.length,
                safetyState: safetyResult.overallState,
                toddlerPersonProximity: toddlerPersonProx,
                toddlerAnimalProximity: toddlerAnimalProx,
                currentThreshold: thresholdRef.current,
                inferenceFps: currentCalculatedFps,
                inferenceLatencyMs: latencyMs,
                tiledInferenceActive: tiledConfigRef.current.enabled,
                tilesProcessed: cocoResult.tilesProcessed,
                rawFullFrameCount: cocoResult.fullFrameDetections.length,
                rawTiledCount: cocoResult.tiledDetections.length + snakeResult.length,
                lastCaptureTime: Date.now()
              });
            } catch (inferenceErr) {
              console.warn('Inference frame dropped:', inferenceErr);
            } finally {
              isInferenceRunningRef.current = false;
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
      isInferenceRunningRef.current = false;
    }
  }, [inferenceFps]);

  const testImageElement = useCallback(async (imgElement: HTMLImageElement | HTMLCanvasElement): Promise<DeveloperDiagnostics | null> => {
    try {
      const model = await getOrLoadModel();
      const vw = 'naturalWidth' in imgElement ? imgElement.naturalWidth || imgElement.width : imgElement.width;
      const vh = 'naturalHeight' in imgElement ? imgElement.naturalHeight || imgElement.height : imgElement.height;

      const startTime = performance.now();
      const cocoResult = await tiledInferenceEngine.executeInference(
        imgElement,
        model,
        tiledConfigRef.current,
        thresholdRef.current
      );
      const snakeResult = await snakeDetectorService.detectSnakes(imgElement, thresholdRef.current);
      const latencyMs = Math.round(performance.now() - startTime);

      const rawInputs: RawDetectionInput[] = [];
      for (const pred of cocoResult.predictions) {
        let faceMatchCandidate = undefined;
        if (pred.className === 'person') {
          const [px, py, pw, ph] = pred.bboxPixels;
          const headBox = {
            x: Math.max(0, px + pw * 0.15),
            y: Math.max(0, py),
            width: Math.max(10, pw * 0.7),
            height: Math.max(10, ph * 0.38)
          };
          const { embedding, quality } = await faceRecognitionService.extractFaceEmbeddingWithQuality(imgElement, headBox);
          faceMatchCandidate = faceRecognitionService.matchFaceEmbedding(embedding, quality);
        }

        rawInputs.push({
          className: pred.className,
          confidence: pred.confidence,
          isSharpHazard: pred.isSharpHazard,
          isAnimal: pred.isAnimal,
          animalClass: pred.animalClass,
          faceMatchCandidate,
          modelSource: 'coco-ssd-builtin',
          box: pred.bboxNormalized,
          pixelBox: {
            x: pred.bboxPixels[0],
            y: pred.bboxPixels[1],
            width: pred.bboxPixels[2],
            height: pred.bboxPixels[3]
          }
        });
      }

      for (const snakePred of snakeResult) {
        rawInputs.push({
          className: 'snake',
          confidence: snakePred.confidence,
          isSharpHazard: false,
          isAnimal: true,
          animalClass: 'Snake',
          modelSource: 'custom-onnx-pipeline',
          box: snakePred.bboxNormalized,
          pixelBox: {
            x: snakePred.bboxPixels[0],
            y: snakePred.bboxPixels[1],
            width: snakePred.bboxPixels[2],
            height: snakePred.bboxPixels[3]
          }
        });
      }

      const tracker = new MultiObjectTracker({ alphaConfidence: 0.35, alphaBox: 0.40, maxMissedFrames: 4 });
      const tracked = tracker.update(rawInputs, Date.now());
      const visible = tracked.filter(track => {
        if (track.isSharpHazard) return track.confidence >= 0.25;
        if (track.isAnimal) return track.confidence >= 0.35;
        if (track.className === 'person') return track.confidence >= 0.40;
        return track.confidence >= thresholdRef.current;
      });

      const sharp = sharpObjectDetector.filterSharpDetections(visible);
      const safetyResult = safetyContextEngine.evaluateSafetyContext(visible, Date.now());
      const persons = visible.filter(d => d.className === 'person');
      const animals = visible.filter(d => d.isAnimal);
      const personTelemetry = tracker.getPersonDiagnosticsTelemetry(visible);
      const combinedRaw = [...cocoResult.predictions, ...snakeResult];

      const diagResult: DeveloperDiagnostics = {
        videoDimensions: { width: vw, height: vh },
        rawPredictions: combinedRaw,
        rawSharpDetections: combinedRaw.filter(p => p.isSharpHazard),
        afterSharpFilter: sharp,
        afterTracker: visible,
        personDiagnostics: personTelemetry,
        personsCount: persons.length,
        toddlerDetected: safetyResult.toddlerDetected,
        recognisedPersonsCount: safetyResult.recognisedPersonsCount,
        unrecognisedPersonsCount: safetyResult.unrecognisedPersonsCount,
        unconfirmedPersonsCount: safetyResult.unconfirmedPersonsCount,
        animalsCount: animals.length,
        safetyState: safetyResult.overallState,
        toddlerPersonProximity: 'Test Image Evaluated',
        toddlerAnimalProximity: 'Test Image Evaluated',
        currentThreshold: thresholdRef.current,
        inferenceFps: 0,
        inferenceLatencyMs: latencyMs,
        tiledInferenceActive: tiledConfigRef.current.enabled,
        tilesProcessed: cocoResult.tilesProcessed,
        rawFullFrameCount: cocoResult.fullFrameDetections.length,
        rawTiledCount: cocoResult.tiledDetections.length + snakeResult.length,
        lastCaptureTime: Date.now()
      };

      setDiagnostics(diagResult);
      setSafetyContext(safetyResult);
      return diagResult;
    } catch (err) {
      console.error('Failed to run testImageElement diagnostic:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isDetectingRef.current = false;
      isInferenceRunningRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const trackedPersons = useMemo(
    () => detections.filter((d): d is TrackedPerson => d.className === 'person'),
    [detections]
  );

  const sharpObjectDetections = useMemo(
    () => sharpObjectDetector.filterSharpDetections(detections),
    [detections]
  );

  const trackedAnimals = useMemo(
    () => detections.filter((d): d is TrackedAnimal => d.isAnimal === true),
    [detections]
  );

  const sharpObjectMetadata: SharpObjectDetectorMetadata = useMemo(
    () => sharpObjectDetector.getMetadata(),
    []
  );

  const snakeDetectorMetadata: SnakeDetectorMetadata = useMemo(
    () => snakeDetectorService.getMetadata(),
    []
  );

  return {
    detections,
    trackedPersons,
    sharpObjectDetections,
    trackedAnimals,
    safetyContext,
    modelStatus,
    isModelLoading: modelStatus === 'loading',
    isModelReady: modelStatus === 'ready' || modelStatus === 'detecting',
    isDetecting: modelStatus === 'detecting',
    inferenceFps,
    inferenceError,
    confidenceThreshold,
    setConfidenceThreshold,
    tiledInferenceEnabled,
    setTiledInferenceEnabled,
    sharpObjectMetadata,
    snakeDetectorMetadata,
    diagnostics,
    startDetection,
    stopDetection,
    testImageElement
  };
};
