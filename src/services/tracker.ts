import { 
  DetectedObject, 
  BoundingBoxNormalized, 
  BoundingBoxPixels, 
  PersonIdentityResult, 
  IdentityState, 
  FaceQualityReport, 
  PersonDiagnosticsTelemetry 
} from '../types/detection';
import { 
  TODDLER_RECOGNITION_THRESHOLD, 
  AUTHORIZED_PERSON_RECOGNITION_THRESHOLD, 
  RETENTION_HYSTERESIS_THRESHOLD, 
  TEMPORAL_CONFIRMATION_REQUIRED 
} from './faceRecognition';

export interface RawDetectionInput {
  className: string;
  confidence: number;
  isSharpHazard: boolean;
  isAnimal: boolean;
  animalClass?: string;
  faceMatchCandidate?: {
    candidateProfileId?: string;
    candidateDisplayName?: string;
    candidateRelationship?: string;
    candidateIsToddler: boolean;
    similarityScore: number;
    requiredThreshold: number;
    quality: FaceQualityReport;
  };
  modelSource: 'coco-ssd-builtin' | 'custom-onnx-pipeline';
  box: BoundingBoxNormalized;
  pixelBox: BoundingBoxPixels;
}

interface TrackIdentityTrackingState {
  currentIdentityState: IdentityState;
  candidateProfileId?: string;
  candidateDisplayName?: string;
  candidateRelationship?: string;
  candidateIsToddler: boolean;
  consecutiveMatchCount: number;
  missedObservationCount: number;
  lastSimilarityScore: number;
  lastRequiredThreshold: number;
  lastQuality: FaceQualityReport;
}

// Compute Intersection over Union (IoU) between two normalized bounding boxes (0.0 to 1.0)
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

// Compute Containment (Intersection over Minimum Box Area) between two normalized boxes (0.0 to 1.0)
export const computeContainment = (boxA: BoundingBoxNormalized, boxB: BoundingBoxNormalized): number => {
  const xA = Math.max(boxA.left, boxB.left);
  const yA = Math.max(boxA.top, boxB.top);
  const xB = Math.min(boxA.left + boxA.width, boxB.left + boxB.width);
  const yB = Math.min(boxA.top + boxA.height, boxB.top + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const minArea = Math.min(areaA, areaB);

  if (minArea <= 0) return 0;
  return interArea / minArea;
};

// Compute normalized Euclidean distance between center points of two boxes (0.0 to ~1.41)
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
  private identityStates: Map<string, TrackIdentityTrackingState> = new Map();
  private maxMissedFrames: number = 4;
  private alphaConfidence: number = 0.35;
  private alphaBox: number = 0.40;

  constructor(options?: { maxMissedFrames?: number; alphaConfidence?: number; alphaBox?: number }) {
    if (options?.maxMissedFrames) this.maxMissedFrames = options.maxMissedFrames;
    if (options?.alphaConfidence) this.alphaConfidence = options.alphaConfidence;
    if (options?.alphaBox) this.alphaBox = options.alphaBox;
  }

  // Format exact UI display name according to explicit state machine rules
  private formatDisplayName(det: RawDetectionInput, trackNum: number, identity?: PersonIdentityResult): string {
    if (det.className === 'person') {
      if (!identity) return 'UNCONFIRMED';
      if (identity.identityState === 'TODDLER') {
        return 'Toddler';
      }
      if (identity.identityState === 'RECOGNISED') {
        const relStr = identity.relationship ? ` (${identity.relationship})` : '';
        return `RECOGNISED: ${identity.displayName || 'Caregiver'}${relStr}`;
      }
      if (identity.identityState === 'UNRECOGNISED') {
        return 'UNRECOGNISED';
      }
      return 'UNCONFIRMED';
    }

    if (det.isAnimal) {
      const aType = det.animalClass || 'Animal';
      return `ANIMAL — ${aType}`;
    }

    if (det.isSharpHazard) {
      return `HAZARD: ${det.className.toUpperCase()}`;
    }

    return `${det.className.toUpperCase()} #${trackNum}`;
  }

  // Deduplicate raw detection inputs before tracking association
  private deduplicateRawInputs(inputs: RawDetectionInput[]): RawDetectionInput[] {
    if (inputs.length <= 1) return inputs;

    const sorted = [...inputs].sort((a, b) => b.confidence - a.confidence);
    const selected: RawDetectionInput[] = [];
    const suppressed = new Set<number>();

    for (let i = 0; i < sorted.length; i++) {
      if (suppressed.has(i)) continue;
      const current = sorted[i];
      selected.push(current);

      for (let j = i + 1; j < sorted.length; j++) {
        if (suppressed.has(j)) continue;
        const candidate = sorted[j];

        const isSameClass = current.className === candidate.className;
        const isBothSharp = current.isSharpHazard && candidate.isSharpHazard;
        const isBothAnimal = current.isAnimal && candidate.isAnimal;

        if (isSameClass || isBothSharp || isBothAnimal) {
          const iou = computeIoU(current.box, candidate.box);
          const containment = computeContainment(current.box, candidate.box);

          if (current.className === 'person') {
            if (iou >= 0.30 || containment >= 0.50) {
              suppressed.add(j);
            }
          } else {
            if (iou >= 0.40 || containment >= 0.70) {
              suppressed.add(j);
            }
          }
        }
      }
    }

    return selected;
  }

  // Update tracker with latest frame detections and evaluate identity state machine
  public update(rawDetectionsInput: RawDetectionInput[], timestamp: number = Date.now()): DetectedObject[] {
    // Step 0: Filter out any duplicate raw candidate boxes
    const rawDetections = this.deduplicateRawInputs(rawDetectionsInput);

    const activeTrackKeys = Array.from(this.tracks.keys());
    const matchedTrackKeys = new Set<string>();
    const matchedDetectionIndices = new Set<number>();

    // Build all candidate match pairs
    interface MatchCandidate {
      trackKey: string;
      detectionIndex: number;
      score: number;
      iou: number;
      centerDist: number;
    }

    const matchCandidates: MatchCandidate[] = [];

    for (let dIdx = 0; dIdx < rawDetections.length; dIdx++) {
      const det = rawDetections[dIdx];

      for (const trackKey of activeTrackKeys) {
        const track = this.tracks.get(trackKey);
        if (!track) continue;

        const isCompatible =
          track.className === det.className ||
          (track.isSharpHazard && det.isSharpHazard) ||
          (track.isAnimal && det.isAnimal);

        if (!isCompatible) continue;

        const iou = computeIoU(track.box, det.box);
        const centerDist = computeCenterDistance(track.box, det.box);
        const containment = computeContainment(track.box, det.box);
        const proximityScore = Math.max(0, 1 - centerDist * 2.5);
        const matchScore = iou * 0.70 + proximityScore * 0.30;

        const isMatch = iou >= 0.15 || (centerDist <= 0.25 && matchScore >= 0.20) || containment >= 0.50;

        if (isMatch) {
          matchCandidates.push({
            trackKey,
            detectionIndex: dIdx,
            score: matchScore,
            iou,
            centerDist
          });
        }
      }
    }

    // Sort candidate matches descending by score (greedy bipartite matching)
    matchCandidates.sort((a, b) => b.score - a.score);

    // Phase 1: Update matched existing tracks
    for (const match of matchCandidates) {
      if (matchedTrackKeys.has(match.trackKey) || matchedDetectionIndices.has(match.detectionIndex)) {
        continue;
      }

      matchedTrackKeys.add(match.trackKey);
      matchedDetectionIndices.add(match.detectionIndex);

      const det = rawDetections[match.detectionIndex];
      const prevTrack = this.tracks.get(match.trackKey)!;
      const newSeenCount = (prevTrack.seenCount || 1) + 1;

      // Coordinate & Confidence Exponential Moving Average (EMA) smoothing
      const smoothedConf =
        this.alphaConfidence * det.confidence + (1 - this.alphaConfidence) * prevTrack.confidence;

      const smoothedBox: BoundingBoxNormalized = {
        top: this.alphaBox * det.box.top + (1 - this.alphaBox) * prevTrack.box.top,
        left: this.alphaBox * det.box.left + (1 - this.alphaBox) * prevTrack.box.left,
        width: this.alphaBox * det.box.width + (1 - this.alphaBox) * prevTrack.box.width,
        height: this.alphaBox * det.box.height + (1 - this.alphaBox) * prevTrack.box.height
      };

      // Evaluate Identity State Machine for Person track
      let resolvedIdentity: PersonIdentityResult | undefined = undefined;
      if (det.className === 'person') {
        resolvedIdentity = this.evaluatePersonIdentityStateMachine(match.trackKey, det.faceMatchCandidate);
      }

      const isConfirmed = newSeenCount >= 2;
      const displayName = this.formatDisplayName(det, prevTrack.trackNumber, resolvedIdentity);

      const updatedTrack: DetectedObject = {
        ...prevTrack,
        className: det.className,
        displayName,
        rawConfidence: det.confidence,
        rawConfidencePct: Math.round(det.confidence * 100),
        confidence: smoothedConf,
        confidencePct: Math.round(smoothedConf * 100),
        isSharpHazard: det.isSharpHazard,
        isAnimal: det.isAnimal,
        animalClass: det.animalClass,
        identity: resolvedIdentity,
        rawBox: det.box,
        box: smoothedBox,
        pixelBox: det.pixelBox,
        missedFrames: 0,
        seenCount: newSeenCount,
        isConfirmed,
        lastSeenTimestamp: timestamp
      };

      this.tracks.set(match.trackKey, updatedTrack);
    }

    // Phase 2: Create new tracks for genuinely unmatched detections
    for (let dIdx = 0; dIdx < rawDetections.length; dIdx++) {
      if (matchedDetectionIndices.has(dIdx)) continue;

      const det = rawDetections[dIdx];
      const classKey = det.isAnimal ? 'animal' : det.isSharpHazard ? 'hazard' : det.className;
      const currentTrackNum = (this.nextTrackNumbers.get(classKey) || 0) + 1;
      this.nextTrackNumbers.set(classKey, currentTrackNum);

      const trackingId = `${classKey}-${currentTrackNum}`;

      let resolvedIdentity: PersonIdentityResult | undefined = undefined;
      if (det.className === 'person') {
        resolvedIdentity = this.evaluatePersonIdentityStateMachine(trackingId, det.faceMatchCandidate);
      }

      const displayName = this.formatDisplayName(det, currentTrackNum, resolvedIdentity);

      const newTrack: DetectedObject = {
        id: `track-${trackingId}-${timestamp}`,
        trackingId,
        trackNumber: currentTrackNum,
        className: det.className,
        displayName,
        rawConfidence: det.confidence,
        rawConfidencePct: Math.round(det.confidence * 100),
        confidence: det.confidence,
        confidencePct: Math.round(det.confidence * 100),
        isSharpHazard: det.isSharpHazard,
        isAnimal: det.isAnimal,
        animalClass: det.animalClass,
        identity: resolvedIdentity,
        modelSource: det.modelSource,
        box: det.box,
        rawBox: det.box,
        pixelBox: det.pixelBox,
        missedFrames: 0,
        seenCount: 1,
        isConfirmed: false,
        firstSeenTimestamp: timestamp,
        lastSeenTimestamp: timestamp
      };

      this.tracks.set(trackingId, newTrack);
    }

    // Phase 3: Update missed frames and purge dead tracks
    const resultTracks: DetectedObject[] = [];

    for (const [trackKey, track] of this.tracks.entries()) {
      if (!matchedTrackKeys.has(trackKey)) {
        track.missedFrames += 1;
        track.confidence = Math.max(0.1, track.confidence * 0.90);
        track.confidencePct = Math.round(track.confidence * 100);

        if (track.className === 'person' && this.identityStates.has(trackKey)) {
          const idState = this.identityStates.get(trackKey)!;
          idState.missedObservationCount += 1;
          if (idState.missedObservationCount >= 5) {
            idState.currentIdentityState = 'UNCONFIRMED';
            idState.consecutiveMatchCount = 0;
            if (track.identity) {
              track.identity.identityState = 'UNCONFIRMED';
              track.displayName = 'UNCONFIRMED';
            }
          }
        }
      }

      if (track.missedFrames <= this.maxMissedFrames) {
        resultTracks.push(track);
      } else {
        this.tracks.delete(trackKey);
        this.identityStates.delete(trackKey);
      }
    }

    // Phase 4: Intra-Frame Track Deduplication
    // If multiple active tracks overlap heavily (e.g. containment >= 0.50 or IoU >= 0.30), keep only the strongest track
    this.deduplicateActiveTracks(resultTracks);

    // Phase 5: Enforce Exactly ONE Toddler and 1-to-1 Identity Constraint across all active tracks
    this.resolveHouseholdIdentityConflicts(resultTracks);

    return resultTracks;
  }

  // Deduplicate active tracks within the frame to guarantee 1 Person = 1 Track ID = 1 Box
  private deduplicateActiveTracks(tracks: DetectedObject[]): void {
    const personTracks = tracks.filter(t => t.className === 'person');
    if (personTracks.length <= 1) return;

    // Sort descending by seenCount, then by confidence
    personTracks.sort((a, b) => b.seenCount - a.seenCount || b.confidence - a.confidence);
    const suppressedKeys = new Set<string>();

    for (let i = 0; i < personTracks.length; i++) {
      if (suppressedKeys.has(personTracks[i].trackingId)) continue;
      const primary = personTracks[i];

      for (let j = i + 1; j < personTracks.length; j++) {
        if (suppressedKeys.has(personTracks[j].trackingId)) continue;
        const duplicate = personTracks[j];

        const iou = computeIoU(primary.box, duplicate.box);
        const containment = computeContainment(primary.box, duplicate.box);

        if (iou >= 0.30 || containment >= 0.50) {
          suppressedKeys.add(duplicate.trackingId);
          this.tracks.delete(duplicate.trackingId);
          this.identityStates.delete(duplicate.trackingId);
        }
      }
    }

    // Remove suppressed tracks from array in-place
    for (let i = tracks.length - 1; i >= 0; i--) {
      if (suppressedKeys.has(tracks[i].trackingId)) {
        tracks.splice(i, 1);
      }
    }
  }

  // Evaluate explicit Identity State Machine with Temporal Confirmation & Quality Gate
  private evaluatePersonIdentityStateMachine(
    trackKey: string,
    candidate?: RawDetectionInput['faceMatchCandidate']
  ): PersonIdentityResult {
    const defaultQuality: FaceQualityReport = candidate?.quality || {
      passed: false,
      faceDetected: false,
      faceConfidence: 0,
      faceWidthPx: 0,
      faceHeightPx: 0,
      sharpnessScore: 0,
      contrastScore: 0,
      brightnessScore: 0,
      aspectRatio: 1,
      failureReason: 'NO_FACE_DETECTED'
    };

    let idState = this.identityStates.get(trackKey);
    if (!idState) {
      idState = {
        currentIdentityState: 'UNKNOWN',
        consecutiveMatchCount: 0,
        missedObservationCount: 0,
        lastSimilarityScore: 0,
        lastRequiredThreshold: TODDLER_RECOGNITION_THRESHOLD,
        lastQuality: defaultQuality,
        candidateIsToddler: false
      };
      this.identityStates.set(trackKey, idState);
    }

    // Step 1: Face Quality Gate Check
    if (!candidate || !candidate.quality.passed) {
      idState.missedObservationCount += 1;
      idState.lastQuality = defaultQuality;

      if (idState.missedObservationCount >= 5 || idState.currentIdentityState === 'UNKNOWN') {
        idState.currentIdentityState = 'UNCONFIRMED';
        idState.consecutiveMatchCount = 0;
      }

      return {
        profileId: idState.candidateProfileId,
        displayName: idState.currentIdentityState === 'TODDLER' 
          ? 'Toddler' 
          : idState.currentIdentityState === 'RECOGNISED' 
          ? `RECOGNISED: ${idState.candidateDisplayName || 'Caregiver'}` 
          : 'UNCONFIRMED',
        relationship: idState.candidateRelationship,
        identityState: idState.currentIdentityState,
        recognitionConfidence: idState.lastSimilarityScore,
        requiredThreshold: idState.lastRequiredThreshold,
        temporalObservationsCount: idState.consecutiveMatchCount,
        faceQuality: defaultQuality
      };
    }

    // Step 2: Quality passed - evaluate candidate similarity
    const quality = candidate.quality;
    const similarity = candidate.similarityScore;
    const reqThreshold = candidate.requiredThreshold || TODDLER_RECOGNITION_THRESHOLD;
    const candProfileId = candidate.candidateProfileId;
    const candName = candidate.candidateDisplayName;
    const candRel = candidate.candidateRelationship;
    const candIsToddler = candidate.candidateIsToddler;

    idState.lastQuality = quality;
    idState.lastSimilarityScore = similarity;
    idState.lastRequiredThreshold = reqThreshold;

    // Check if match meets promotion threshold
    if (candProfileId && similarity >= reqThreshold) {
      if (idState.candidateProfileId === candProfileId) {
        idState.consecutiveMatchCount += 1;
      } else {
        idState.candidateProfileId = candProfileId;
        idState.candidateDisplayName = candName;
        idState.candidateRelationship = candRel;
        idState.candidateIsToddler = candIsToddler;
        idState.consecutiveMatchCount = 1;
      }

      idState.missedObservationCount = 0;

      // Check Temporal Confirmation Criteria (Requires >= 3 consecutive observations)
      if (idState.consecutiveMatchCount >= TEMPORAL_CONFIRMATION_REQUIRED) {
        idState.currentIdentityState = candIsToddler ? 'TODDLER' : 'RECOGNISED';
      } else {
        if (idState.currentIdentityState !== 'TODDLER' && idState.currentIdentityState !== 'RECOGNISED') {
          idState.currentIdentityState = 'UNCONFIRMED';
        }
      }
    } else {
      if (
        (idState.currentIdentityState === 'TODDLER' || idState.currentIdentityState === 'RECOGNISED') &&
        candProfileId === idState.candidateProfileId &&
        similarity >= RETENTION_HYSTERESIS_THRESHOLD
      ) {
        idState.missedObservationCount = 0;
      } else {
        idState.missedObservationCount += 1;
        if (idState.missedObservationCount >= 3) {
          idState.currentIdentityState = 'UNRECOGNISED';
          idState.consecutiveMatchCount = 0;
        }
      }
    }

    const finalDisplayName =
      idState.currentIdentityState === 'TODDLER'
        ? 'Toddler'
        : idState.currentIdentityState === 'RECOGNISED'
        ? `RECOGNISED: ${idState.candidateDisplayName || 'Caregiver'}`
        : idState.currentIdentityState === 'UNRECOGNISED'
        ? 'UNRECOGNISED'
        : 'UNCONFIRMED';

    return {
      profileId: idState.candidateProfileId,
      displayName: finalDisplayName,
      relationship: idState.candidateRelationship,
      identityState: idState.currentIdentityState,
      recognitionConfidence: similarity,
      requiredThreshold: reqThreshold,
      temporalObservationsCount: idState.consecutiveMatchCount,
      faceQuality: quality
    };
  }

  // Conflict Resolution: Enforces EXACTLY ONE Toddler and 1-to-1 matching across all active tracks in frame
  private resolveHouseholdIdentityConflicts(tracks: DetectedObject[]): void {
    const personTracks = tracks.filter(t => t.className === 'person' && t.identity);

    // 1. Resolve Duplicate Toddler assignments (Strict: exactly 1 toddler in household/frame)
    const toddlerTracks = personTracks.filter(t => t.identity?.identityState === 'TODDLER');

    if (toddlerTracks.length > 1) {
      toddlerTracks.sort((a, b) => (b.identity?.recognitionConfidence || 0) - (a.identity?.recognitionConfidence || 0));
      const winner = toddlerTracks[0];

      for (let i = 1; i < toddlerTracks.length; i++) {
        const loser = toddlerTracks[i];
        if (loser.identity) {
          loser.identity.identityState = 'UNRECOGNISED';
          loser.identity.displayName = 'UNRECOGNISED';
          loser.displayName = 'UNRECOGNISED';

          const state = this.identityStates.get(loser.trackingId);
          if (state) {
            state.currentIdentityState = 'UNRECOGNISED';
            state.consecutiveMatchCount = 0;
          }
        }
      }
    }

    // 2. Resolve Duplicate Authorised Person profile assignments (1-to-1 matching)
    const assignedProfiles = new Map<string, DetectedObject>();

    for (const track of personTracks) {
      if (track.identity?.identityState === 'RECOGNISED' && track.identity.profileId) {
        const pId = track.identity.profileId;

        if (assignedProfiles.has(pId)) {
          const existing = assignedProfiles.get(pId)!;
          const currentScore = track.identity.recognitionConfidence || 0;
          const existingScore = existing.identity?.recognitionConfidence || 0;

          if (currentScore > existingScore) {
            existing.identity!.identityState = 'UNRECOGNISED';
            existing.identity!.displayName = 'UNRECOGNISED';
            existing.displayName = 'UNRECOGNISED';

            const state = this.identityStates.get(existing.trackingId);
            if (state) {
              state.currentIdentityState = 'UNRECOGNISED';
              state.consecutiveMatchCount = 0;
            }

            assignedProfiles.set(pId, track);
          } else {
            track.identity.identityState = 'UNRECOGNISED';
            track.identity.displayName = 'UNRECOGNISED';
            track.displayName = 'UNRECOGNISED';

            const state = this.identityStates.get(track.trackingId);
            if (state) {
              state.currentIdentityState = 'UNRECOGNISED';
              state.consecutiveMatchCount = 0;
            }
          }
        } else {
          assignedProfiles.set(pId, track);
        }
      }
    }
  }

  // Generate detailed developer diagnostics telemetry for all person tracks
  public getPersonDiagnosticsTelemetry(tracks: DetectedObject[]): PersonDiagnosticsTelemetry[] {
    const personTracks = tracks.filter(t => t.className === 'person');

    return personTracks.map(t => {
      const idResult = t.identity;
      const q = idResult?.faceQuality;

      return {
        trackingId: t.trackingId,
        personConfidence: Math.round(t.rawConfidence * 100) / 100,
        faceDetected: q ? q.faceDetected : false,
        faceConfidence: q ? q.faceConfidence : 0,
        faceDimensions: q && q.faceWidthPx > 0 ? `${Math.round(q.faceWidthPx)} × ${Math.round(q.faceHeightPx)} px` : 'N/A',
        faceQuality: q?.passed ? 'PASS' : `REJECTED: ${q?.failureReason || 'LOW_QUALITY'}`,
        embeddingGenerated: q?.passed || false,
        bestIdentityCandidate: idResult?.profileId ? (idResult.identityState === 'TODDLER' ? 'Toddler' : (idResult.displayName || 'None')) : 'None',
        identitySimilarity: idResult ? Math.round(idResult.recognitionConfidence * 1000) / 1000 : 0,
        recognitionThreshold: idResult ? Math.round(idResult.requiredThreshold * 1000) / 1000 : TODDLER_RECOGNITION_THRESHOLD,
        temporalConfirmationCount: idResult?.temporalObservationsCount || 0,
        finalIdentityState: idResult?.identityState || 'UNCONFIRMED'
      };
    });
  }

  // Reset tracker state
  public reset(): void {
    this.tracks.clear();
    this.nextTrackNumbers.clear();
    this.identityStates.clear();
  }
}
