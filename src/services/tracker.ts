import { DetectedObject, BoundingBoxNormalized, BoundingBoxPixels } from '../types/detection';

interface RawDetectionInput {
  className: string;
  confidence: number;
  isSharpHazard: boolean;
  modelSource: 'coco-ssd-builtin' | 'custom-onnx-pipeline';
  box: BoundingBoxNormalized;
  pixelBox: BoundingBoxPixels;
}

// Compute Intersection over Union (IoU) between two normalized bounding boxes
export const computeIoU = (boxA: BoundingBoxNormalized, boxB: BoundingBoxNormalized): number => {
  const xA = Math.max(boxA.left, boxB.left);
  const yA = Math.max(boxA.top, boxB.top);
  const xB = Math.min(boxA.left + boxA.width, boxB.left + boxB.width);
  const yB = Math.min(boxA.top + boxA.height, boxB.top + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;
  const unionArea = boxAArea + boxBArea - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
};

// Compute normalized Euclidean distance between center points of two boxes (0 to ~1.41)
export const computeCenterDistance = (boxA: BoundingBoxNormalized, boxB: BoundingBoxNormalized): number => {
  const centerAX = boxA.left + boxA.width / 2;
  const centerAY = boxA.top + boxA.height / 2;
  const centerBX = boxB.left + boxB.width / 2;
  const centerBY = boxB.top + boxB.height / 2;

  const dx = (centerAX - centerBX) / 100;
  const dy = (centerAY - centerBY) / 100;

  return Math.sqrt(dx * dx + dy * dy);
};

export class MultiObjectTracker {
  private tracks: Map<string, DetectedObject> = new Map();
  private nextTrackNumbers: Map<string, number> = new Map();
  private maxMissedFrames: number = 6; // Persist track across ~500ms dropouts
  private alphaConfidence: number = 0.30; // Temporal smoothing factor (0.25–0.35)
  private alphaBox: number = 0.35; // Coordinate interpolation factor

  constructor(options?: { maxMissedFrames?: number; alphaConfidence?: number; alphaBox?: number }) {
    if (options?.maxMissedFrames) this.maxMissedFrames = options.maxMissedFrames;
    if (options?.alphaConfidence) this.alphaConfidence = options.alphaConfidence;
    if (options?.alphaBox) this.alphaBox = options.alphaBox;
  }

  // Update tracker with detections from the latest frame
  public update(rawDetections: RawDetectionInput[], timestamp: number = Date.now()): DetectedObject[] {
    const activeTrackKeys = Array.from(this.tracks.keys());
    const matchedTrackKeys = new Set<string>();
    const matchedDetectionIndices = new Set<number>();

    // Phase 1: Match detections to existing tracks by class, IoU, and centroid proximity
    for (let dIdx = 0; dIdx < rawDetections.length; dIdx++) {
      const det = rawDetections[dIdx];
      let bestTrackKey: string | null = null;
      let highestScore = -1;

      for (const trackKey of activeTrackKeys) {
        if (matchedTrackKeys.has(trackKey)) continue;

        const track = this.tracks.get(trackKey);
        if (!track || track.className !== det.className) continue;

        const iou = computeIoU(track.box, det.box);
        const centerDist = computeCenterDistance(track.box, det.box);

        // Combined match score prioritizing IoU with centroid fallback for fast motions
        const proximityScore = Math.max(0, 1 - centerDist * 2);
        const matchScore = iou * 0.7 + proximityScore * 0.3;

        const isMatch = iou > 0.2 || (centerDist < 0.25 && matchScore > 0.3);

        if (isMatch && matchScore > highestScore) {
          highestScore = matchScore;
          bestTrackKey = trackKey;
        }
      }

      if (bestTrackKey) {
        matchedTrackKeys.add(bestTrackKey);
        matchedDetectionIndices.add(dIdx);

        // Update matched track with Exponential Moving Average (EMA)
        const prevTrack = this.tracks.get(bestTrackKey)!;

        // Smoothed Confidence: EMA = alpha * current + (1 - alpha) * previous
        const smoothedConf =
          this.alphaConfidence * det.confidence + (1 - this.alphaConfidence) * prevTrack.confidence;

        // Smoothed Bounding Box Coordinates: EMA
        const smoothedBox: BoundingBoxNormalized = {
          top: this.alphaBox * det.box.top + (1 - this.alphaBox) * prevTrack.box.top,
          left: this.alphaBox * det.box.left + (1 - this.alphaBox) * prevTrack.box.left,
          width: this.alphaBox * det.box.width + (1 - this.alphaBox) * prevTrack.box.width,
          height: this.alphaBox * det.box.height + (1 - this.alphaBox) * prevTrack.box.height
        };

        const updatedTrack: DetectedObject = {
          ...prevTrack,
          rawConfidence: det.confidence,
          rawConfidencePct: Math.round(det.confidence * 100),
          confidence: smoothedConf,
          confidencePct: Math.round(smoothedConf * 100),
          rawBox: det.box,
          box: smoothedBox,
          pixelBox: det.pixelBox,
          missedFrames: 0,
          lastSeenTimestamp: timestamp
        };

        this.tracks.set(bestTrackKey, updatedTrack);
      }
    }

    // Phase 2: Create new tracks for unmatched detections
    for (let dIdx = 0; dIdx < rawDetections.length; dIdx++) {
      if (matchedDetectionIndices.has(dIdx)) continue;

      const det = rawDetections[dIdx];
      const classKey = det.className;
      const currentTrackNum = (this.nextTrackNumbers.get(classKey) || 0) + 1;
      this.nextTrackNumbers.set(classKey, currentTrackNum);

      const trackingId = `${classKey}-${currentTrackNum}`;
      const prefix = det.isSharpHazard ? 'HAZARD' : det.className.toUpperCase();
      const displayName = `${prefix} #${currentTrackNum}`;

      const newTrack: DetectedObject = {
        id: `track-${trackingId}-${timestamp}`,
        trackingId,
        trackNumber: currentTrackNum,
        className: det.className,
        displayName,
        rawConfidence: det.confidence,
        rawConfidencePct: Math.round(det.confidence * 100),
        confidence: det.confidence, // Initial confidence is current
        confidencePct: Math.round(det.confidence * 100),
        isSharpHazard: det.isSharpHazard,
        modelSource: det.modelSource,
        box: det.box,
        rawBox: det.box,
        pixelBox: det.pixelBox,
        missedFrames: 0,
        firstSeenTimestamp: timestamp,
        lastSeenTimestamp: timestamp
      };

      this.tracks.set(trackingId, newTrack);
    }

    // Phase 3: Update missed frames for unmatched tracks and purge dead tracks
    const resultTracks: DetectedObject[] = [];

    for (const [trackKey, track] of this.tracks.entries()) {
      if (!matchedTrackKeys.has(trackKey)) {
        track.missedFrames += 1;
        // Slightly decay smoothed confidence during temporary dropout
        track.confidence = Math.max(0.1, track.confidence * 0.95);
        track.confidencePct = Math.round(track.confidence * 100);
      }

      if (track.missedFrames <= this.maxMissedFrames) {
        resultTracks.push(track);
      } else {
        this.tracks.delete(trackKey);
      }
    }

    return resultTracks;
  }

  // Clear all tracks on stream reset or stop
  public reset(): void {
    this.tracks.clear();
    this.nextTrackNumbers.clear();
  }
}
