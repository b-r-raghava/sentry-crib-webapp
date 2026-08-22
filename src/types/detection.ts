export type ModelStatus = 'idle' | 'loading' | 'ready' | 'detecting' | 'error';

export interface BoundingBoxNormalized {
  top: number;    // 0 to 100 percentage
  left: number;   // 0 to 100 percentage
  width: number;  // 0 to 100 percentage
  height: number; // 0 to 100 percentage
}

export interface BoundingBoxPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  trackingId: string;      // e.g. "person-1", "hazard-1"
  trackNumber: number;     // numeric ID e.g. 1, 2
  className: string;       // e.g. "person", "scissors", "knife", "cell phone"
  displayName: string;     // e.g. "PERSON #1", "SCISSORS #1"
  rawConfidence: number;   // 0.0 to 1.0 (raw model prediction)
  rawConfidencePct: number;// 0 to 100
  confidence: number;      // 0.0 to 1.0 (smoothed confidence)
  confidencePct: number;   // 0 to 100 (smoothed percentage)
  isSharpHazard: boolean;  // true if knife, scissors, or custom sharp hazard
  modelSource: 'coco-ssd-builtin' | 'custom-onnx-pipeline';
  box: BoundingBoxNormalized;     // smoothed box coordinates
  rawBox: BoundingBoxNormalized;  // raw current frame box coordinates
  pixelBox: BoundingBoxPixels;
  missedFrames: number;    // number of consecutive frames missed
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
}

export interface TrackedPerson extends DetectedObject {
  className: 'person';
}

export interface SharpObjectDetection extends DetectedObject {
  isSharpHazard: true;
}

export interface SharpObjectDetectorMetadata {
  name: string;
  version: string;
  isCustomModelLoaded: boolean;
  supportedClasses: string[];
  plannedCustomClasses: string[];
}

export interface UseObjectDetectionReturn {
  detections: DetectedObject[];
  trackedPersons: TrackedPerson[];
  sharpObjectDetections: SharpObjectDetection[];
  modelStatus: ModelStatus;
  isModelLoading: boolean;
  isModelReady: boolean;
  isDetecting: boolean;
  inferenceFps: number;
  inferenceError: string | null;
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  sharpObjectMetadata: SharpObjectDetectorMetadata;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
}
