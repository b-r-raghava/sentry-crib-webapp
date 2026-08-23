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

// Explicit Identity State Machine (Strict, Fail-Closed)
export type IdentityState = 'UNKNOWN' | 'UNCONFIRMED' | 'UNRECOGNISED' | 'TODDLER' | 'RECOGNISED';

export interface FaceQualityReport {
  passed: boolean;
  faceDetected: boolean;
  faceConfidence: number; // 0.0 to 1.0 (Face detector confidence)
  faceWidthPx: number;
  faceHeightPx: number;
  sharpnessScore: number;
  contrastScore: number;
  brightnessScore: number;
  aspectRatio: number;
  failureReason?: 'FACE_TOO_SMALL' | 'FACE_BLURRY' | 'LOW_CONTRAST' | 'EXTREME_LIGHTING' | 'INVALID_ASPECT_RATIO' | 'NO_FACE_DETECTED';
}

export interface PersonIdentityResult {
  profileId?: string;
  displayName: string; // "Toddler" | "RECOGNISED: Sarah (Parent)" | "UNRECOGNISED" | "UNCONFIRMED"
  relationship?: string;
  identityState: IdentityState;
  recognitionConfidence: number; // 0.0 to 1.0 (Cosine similarity score)
  requiredThreshold: number;     // e.g. 0.86
  temporalObservationsCount: number;
  faceQuality: FaceQualityReport;
}

export interface EnrolledIdentitySample {
  id: string;
  embedding: number[]; // Unit-normalized feature vector
  quality: FaceQualityReport;
  createdAt: string;
  sourceType: 'upload' | 'camera_capture';
}

export interface EnrolledProfile {
  profileId: string;
  displayName: string;
  relationship: 'Parent' | 'Guardian' | 'Caregiver' | 'Other' | 'Toddler';
  isToddler: boolean;
  samples: EnrolledIdentitySample[]; // 1 to 5 reference samples
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdIdentitiesConfig {
  activeToddlerId: string | null;
  toddlerProfile: EnrolledProfile | null;
  authorisedPeople: EnrolledProfile[];
  toddlerRecognitionThreshold: number;       // Default 0.86
  authorisedPersonRecognitionThreshold: number; // Default 0.86
  temporalConfirmationRequiredCount: number;  // Default 3
}

export interface PersonDiagnosticsTelemetry {
  trackingId: string;
  personConfidence: number;      // 0.0 to 1.0 (COCO-SSD person detection confidence)
  faceDetected: boolean;         // true / false
  faceConfidence: number;        // 0.0 to 1.0 (Dedicated face detector confidence)
  faceDimensions: string;        // e.g. "142 × 160 px"
  faceQuality: string;           // PASS or REJECTED: <Reason>
  embeddingGenerated: boolean;
  bestIdentityCandidate: string; // e.g. "Toddler", "Sarah (Parent)", or "None"
  identitySimilarity: number;    // e.g. 0.43 (Cosine similarity against enrolled embeddings)
  recognitionThreshold: number;  // e.g. 0.86 (Validated required threshold)
  temporalConfirmationCount: number;
  finalIdentityState: IdentityState; // "UNRECOGNISED", "TODDLER", "RECOGNISED", "UNCONFIRMED"
}

export interface DetectedObject {
  id: string;
  trackingId: string;      // e.g. "person-1", "hazard-1", "animal-1"
  trackNumber: number;     // numeric ID e.g. 1, 2
  className: string;       // e.g. "person", "scissors", "knife", "dog", "cat", "snake"
  displayName: string;     // e.g. "Toddler", "RECOGNISED: Sarah", "UNRECOGNISED", "UNCONFIRMED", "ANIMAL — Dog", "ANIMAL — Snake"
  rawConfidence: number;   // 0.0 to 1.0 (raw model prediction)
  rawConfidencePct: number;// 0 to 100
  confidence: number;      // 0.0 to 1.0 (smoothed confidence)
  confidencePct: number;   // 0 to 100 (smoothed percentage)
  isSharpHazard: boolean;  // true if knife, scissors, or custom sharp hazard
  isAnimal: boolean;       // true if dog, cat, bird, snake, etc.
  animalClass?: string;    // e.g. "Dog", "Cat", "Bird", "Snake"
  identity?: PersonIdentityResult;
  inProximityDanger?: boolean;     // flagged when in active DANGER proximity to toddler
  inProximityAttention?: boolean;  // flagged when in active ATTENTION proximity to toddler
  proximityDistanceToToddlerPct?: number; // image-space distance (0-100%)
  modelSource: 'coco-ssd-builtin' | 'custom-onnx-pipeline' | 'mobilenet-animal-pipeline';
  box: BoundingBoxNormalized;     // smoothed box coordinates
  rawBox: BoundingBoxNormalized;  // raw current frame box coordinates
  pixelBox: BoundingBoxPixels;
  missedFrames: number;    // number of consecutive frames missed
  seenCount: number;       // total consecutive/active frames seen
  isConfirmed: boolean;    // true when object is confirmed across >= 2 frames
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
}

export interface TrackedPerson extends DetectedObject {
  className: 'person';
  identity: PersonIdentityResult;
}

export interface SharpObjectDetection extends DetectedObject {
  isSharpHazard: true;
}

export interface TrackedAnimal extends DetectedObject {
  isAnimal: true;
}

export interface SharpObjectDetectorMetadata {
  name: string;
  version: string;
  isCustomModelLoaded: boolean;
  supportedClasses: string[];
  plannedCustomClasses: string[];
}

export interface SnakeDetectorMetadata {
  name: string;
  version: string;
  backend: string;
  dataset: string;
  supportedClasses: string[];
  isLoaded: boolean;
}

export interface RawModelPrediction {
  className: string;
  confidence: number;
  confidencePct: number;
  bboxPixels: [number, number, number, number]; // [x, y, w, h]
  bboxNormalized: BoundingBoxNormalized;
  isSharpHazard: boolean;
  isAnimal: boolean;
  animalClass?: string;
  passedThreshold: boolean;
}

export type OverallSafetyState = 'SAFE' | 'ATTENTION' | 'DANGER';

export interface SafetyContextResult {
  overallState: OverallSafetyState;
  isDangerConfirmed: boolean; // true ONLY when DANGER has persisted continuously for >= threshold duration (e.g. 5000ms)
  dangerDurationMs: number;   // elapsed continuous duration in milliseconds of current danger condition
  dangerConfirmationThresholdMs: number; // configured confirmation threshold in milliseconds (default 5000ms)
  statusHeadline: string;
  statusDescription: string;
  toddlerDetected: boolean;
  toddlerTrackId?: string;
  recognisedPersonsCount: number;
  unrecognisedPersonsCount: number;
  unconfirmedPersonsCount: number;
  animalsCount: number;
  sharpHazardsCount: number;
  proximityEvents: Array<{
    id: string;
    type: 'unrecognised_person' | 'animal' | 'sharp_hazard' | 'caregiver_present';
    targetName: string;
    distancePct: number;
    isDanger: boolean;
    isAttention: boolean;
    description: string;
  }>;
  activeRuleCase: 'CASE_A_STRANGER_DANGER' | 'CASE_B_CARE_VISITOR' | 'CASE_C_KNOWN_ONLY' | 'CASE_D_SOLO_TODDLER' | 'CASE_E_NO_TODDLER' | 'ANIMAL_ALERT' | 'SHARP_HAZARD_DANGER';
}

export interface DeveloperDiagnostics {
  videoDimensions: { width: number; height: number };
  rawPredictions: RawModelPrediction[];
  rawSharpDetections: RawModelPrediction[];
  afterSharpFilter: SharpObjectDetection[];
  afterTracker: DetectedObject[];
  personDiagnostics: PersonDiagnosticsTelemetry[];
  personsCount: number;
  toddlerDetected: boolean;
  recognisedPersonsCount: number;
  unrecognisedPersonsCount: number;
  unconfirmedPersonsCount: number;
  animalsCount: number;
  safetyState: OverallSafetyState;
  toddlerPersonProximity?: string;
  toddlerAnimalProximity?: string;
  currentThreshold: number;
  inferenceFps: number;
  inferenceLatencyMs: number;
  tiledInferenceActive: boolean;
  tilesProcessed: number;
  rawFullFrameCount: number;
  rawTiledCount: number;
  lastCaptureTime: number;
}

export interface UseObjectDetectionReturn {
  detections: DetectedObject[];
  trackedPersons: TrackedPerson[];
  sharpObjectDetections: SharpObjectDetection[];
  trackedAnimals: TrackedAnimal[];
  safetyContext: SafetyContextResult;
  modelStatus: ModelStatus;
  isModelLoading: boolean;
  isModelReady: boolean;
  isDetecting: boolean;
  inferenceFps: number;
  inferenceError: string | null;
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  tiledInferenceEnabled: boolean;
  setTiledInferenceEnabled: (enabled: boolean) => void;
  sharpObjectMetadata: SharpObjectDetectorMetadata;
  snakeDetectorMetadata: SnakeDetectorMetadata;
  diagnostics: DeveloperDiagnostics;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
  testImageElement: (imgElement: HTMLImageElement | HTMLCanvasElement) => Promise<DeveloperDiagnostics | null>;
}
