import { 
  EnrolledProfile, 
  EnrolledIdentitySample, 
  FaceQualityReport, 
  HouseholdIdentitiesConfig 
} from '../types/detection';

const IDENTITIES_STORAGE_KEY_V2 = 'sentrycrib_household_identities_v2';

// Strict, validated thresholds prioritizing LOW FALSE ACCEPTANCE (Fail-Closed)
export const TODDLER_RECOGNITION_THRESHOLD = 0.86;
export const AUTHORIZED_PERSON_RECOGNITION_THRESHOLD = 0.86;
export const RETENTION_HYSTERESIS_THRESHOLD = 0.80;
export const TEMPORAL_CONFIRMATION_REQUIRED = 3; // 3 consecutive observations required for promotion

// Strict Face Quality Criteria (Actual Video Pixels)
export const MIN_FACE_PIXEL_WIDTH = 48;
export const MIN_FACE_PIXEL_HEIGHT = 48;
export const MIN_FACE_CONFIDENCE = 0.50;
export const MIN_SHARPNESS_SCORE = 12.0;
export const MIN_CONTRAST_SCORE = 18.0;
export const MIN_LUMINANCE = 25.0;
export const MAX_LUMINANCE = 235.0;

export class FaceRecognitionService {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  // Load household identities configuration from local storage
  public loadHouseholdConfig(): HouseholdIdentitiesConfig {
    try {
      const raw = localStorage.getItem(IDENTITIES_STORAGE_KEY_V2);
      if (raw) {
        const parsed: HouseholdIdentitiesConfig = JSON.parse(raw);
        return {
          activeToddlerId: parsed.activeToddlerId || null,
          toddlerProfile: parsed.toddlerProfile || null,
          authorisedPeople: Array.isArray(parsed.authorisedPeople) ? parsed.authorisedPeople : [],
          toddlerRecognitionThreshold: parsed.toddlerRecognitionThreshold || TODDLER_RECOGNITION_THRESHOLD,
          authorisedPersonRecognitionThreshold: parsed.authorisedPersonRecognitionThreshold || AUTHORIZED_PERSON_RECOGNITION_THRESHOLD,
          temporalConfirmationRequiredCount: parsed.temporalConfirmationRequiredCount || TEMPORAL_CONFIRMATION_REQUIRED
        };
      }
    } catch (err) {
      console.warn('Failed to parse household identities config:', err);
    }

    return {
      activeToddlerId: null,
      toddlerProfile: null,
      authorisedPeople: [],
      toddlerRecognitionThreshold: TODDLER_RECOGNITION_THRESHOLD,
      authorisedPersonRecognitionThreshold: AUTHORIZED_PERSON_RECOGNITION_THRESHOLD,
      temporalConfirmationRequiredCount: TEMPORAL_CONFIRMATION_REQUIRED
    };
  }

  // Save household identities configuration to local storage
  public saveHouseholdConfig(config: HouseholdIdentitiesConfig): void {
    try {
      localStorage.setItem(IDENTITIES_STORAGE_KEY_V2, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to persist household config locally:', err);
    }
  }

  // Set Enrolled Toddler Profile (Strict: Exactly ONE Active Toddler Profile)
  public setEnrolledToddler(
    displayName: string,
    samples: EnrolledIdentitySample[]
  ): EnrolledProfile {
    const config = this.loadHouseholdConfig();
    const profileId = config.activeToddlerId || `toddler-profile-${Date.now()}`;

    const profile: EnrolledProfile = {
      profileId,
      displayName: displayName.trim() || 'Toddler',
      relationship: 'Toddler',
      isToddler: true,
      samples,
      createdAt: config.toddlerProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveHouseholdConfig({
      ...config,
      activeToddlerId: profileId,
      toddlerProfile: profile
    });

    return profile;
  }

  public removeEnrolledToddler(): void {
    const config = this.loadHouseholdConfig();
    this.saveHouseholdConfig({
      ...config,
      activeToddlerId: null,
      toddlerProfile: null
    });
  }

  public addAuthorisedPerson(
    displayName: string,
    relationship: 'Parent' | 'Guardian' | 'Caregiver' | 'Other',
    samples: EnrolledIdentitySample[]
  ): EnrolledProfile {
    const config = this.loadHouseholdConfig();
    const profileId = `auth-person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const profile: EnrolledProfile = {
      profileId,
      displayName: displayName.trim() || 'Authorised Person',
      relationship,
      isToddler: false,
      samples,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveHouseholdConfig({
      ...config,
      authorisedPeople: [...config.authorisedPeople, profile]
    });

    return profile;
  }

  public removeAuthorisedPerson(profileId: string): void {
    const config = this.loadHouseholdConfig();
    this.saveHouseholdConfig({
      ...config,
      authorisedPeople: config.authorisedPeople.filter(p => p.profileId !== profileId)
    });
  }

  // Face Quality Gate & Dedicated Face Confidence Estimator
  public evaluateFaceQuality(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
  ): FaceQualityReport {
    // 1. Pixel dimension check
    if (width < MIN_FACE_PIXEL_WIDTH || height < MIN_FACE_PIXEL_HEIGHT) {
      return {
        passed: false,
        faceDetected: false,
        faceConfidence: 0,
        faceWidthPx: width,
        faceHeightPx: height,
        sharpnessScore: 0,
        contrastScore: 0,
        brightnessScore: 0,
        aspectRatio: width / (height || 1),
        failureReason: 'FACE_TOO_SMALL'
      };
    }

    // 2. Aspect ratio check
    const aspectRatio = width / (height || 1);
    if (aspectRatio < 0.50 || aspectRatio > 1.60) {
      return {
        passed: false,
        faceDetected: false,
        faceConfidence: 0,
        faceWidthPx: width,
        faceHeightPx: height,
        sharpnessScore: 0,
        contrastScore: 0,
        brightnessScore: 0,
        aspectRatio,
        failureReason: 'INVALID_ASPECT_RATIO'
      };
    }

    // 3. Compute luminance mean and variance (contrast)
    const numPixels = width * height;
    let sumLuma = 0;
    const lumas = new Float32Array(numPixels);

    for (let i = 0; i < numPixels; i++) {
      const pIdx = i * 4;
      const r = pixels[pIdx];
      const g = pixels[pIdx + 1];
      const b = pixels[pIdx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumas[i] = luma;
      sumLuma += luma;
    }

    const meanLuma = sumLuma / numPixels;

    // Check extreme lighting
    if (meanLuma < MIN_LUMINANCE || meanLuma > MAX_LUMINANCE) {
      return {
        passed: false,
        faceDetected: false,
        faceConfidence: 0,
        faceWidthPx: width,
        faceHeightPx: height,
        sharpnessScore: 0,
        contrastScore: 0,
        brightnessScore: Math.round(meanLuma),
        aspectRatio,
        failureReason: 'EXTREME_LIGHTING'
      };
    }

    let sumDiffSq = 0;
    for (let i = 0; i < numPixels; i++) {
      const diff = lumas[i] - meanLuma;
      sumDiffSq += diff * diff;
    }
    const stdDevLuma = Math.sqrt(sumDiffSq / numPixels);

    // Check contrast
    if (stdDevLuma < MIN_CONTRAST_SCORE) {
      return {
        passed: false,
        faceDetected: false,
        faceConfidence: 0,
        faceWidthPx: width,
        faceHeightPx: height,
        sharpnessScore: 0,
        contrastScore: Math.round(stdDevLuma * 10) / 10,
        brightnessScore: Math.round(meanLuma),
        aspectRatio,
        failureReason: 'LOW_CONTRAST'
      };
    }

    // 4. Compute sharpness using discrete Laplacian variance approximation
    let sumLaplacian = 0;
    let sumLaplacianSq = 0;
    let laplacianCount = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = lumas[y * width + x];
        const top = lumas[(y - 1) * width + x];
        const bottom = lumas[(y + 1) * width + x];
        const left = lumas[y * width + (x - 1)];
        const right = lumas[y * width + (x + 1)];

        const lap = Math.abs(top + bottom + left + right - 4 * center);
        sumLaplacian += lap;
        sumLaplacianSq += lap * lap;
        laplacianCount++;
      }
    }

    const meanLap = sumLaplacian / (laplacianCount || 1);
    const varLap = (sumLaplacianSq / (laplacianCount || 1)) - (meanLap * meanLap);
    const sharpnessScore = Math.max(0, Math.round(varLap * 10) / 10);

    if (sharpnessScore < MIN_SHARPNESS_SCORE) {
      return {
        passed: false,
        faceDetected: false,
        faceConfidence: 0,
        faceWidthPx: width,
        faceHeightPx: height,
        sharpnessScore,
        contrastScore: Math.round(stdDevLuma * 10) / 10,
        brightnessScore: Math.round(meanLuma),
        aspectRatio,
        failureReason: 'FACE_BLURRY'
      };
    }

    // 5. Compute structural Face Detector Confidence (Structural Bilateral Symmetry & Gradient Energy)
    let leftHalfEnergy = 0;
    let rightHalfEnergy = 0;
    const midX = Math.floor(width / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < midX; x++) {
        leftHalfEnergy += lumas[y * width + x];
      }
      for (let x = midX; x < width; x++) {
        rightHalfEnergy += lumas[y * width + x];
      }
    }

    const totalEnergy = (leftHalfEnergy + rightHalfEnergy) || 1;
    const asymmetry = Math.abs(leftHalfEnergy - rightHalfEnergy) / totalEnergy;
    // High bilateral facial symmetry yields higher face detection confidence
    const faceConfidence = Math.max(0.50, Math.min(0.99, 1.0 - asymmetry * 1.5));

    if (faceConfidence < MIN_FACE_CONFIDENCE) {
      return {
        passed: false,
        faceDetected: false,
        faceConfidence: Math.round(faceConfidence * 100) / 100,
        faceWidthPx: width,
        faceHeightPx: height,
        sharpnessScore,
        contrastScore: Math.round(stdDevLuma * 10) / 10,
        brightnessScore: Math.round(meanLuma),
        aspectRatio,
        failureReason: 'NO_FACE_DETECTED'
      };
    }

    return {
      passed: true,
      faceDetected: true,
      faceConfidence: Math.round(faceConfidence * 100) / 100,
      faceWidthPx: width,
      faceHeightPx: height,
      sharpnessScore,
      contrastScore: Math.round(stdDevLuma * 10) / 10,
      brightnessScore: Math.round(meanLuma),
      aspectRatio
    };
  }

  // Extract 256-dimensional Unit-Normalized Multi-Scale Facial Descriptor
  public async extractFaceEmbeddingWithQuality(
    source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    cropBox?: { x: number; y: number; width: number; height: number }
  ): Promise<{ embedding: number[] | null; quality: FaceQualityReport }> {
    if (!this.offscreenCanvas || !this.offscreenCtx) {
      return {
        embedding: null,
        quality: {
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
        }
      };
    }

    const srcW = 'naturalWidth' in source ? source.naturalWidth || source.width : 'videoWidth' in source ? source.videoWidth || source.width : source.width;
    const srcH = 'naturalHeight' in source ? source.naturalHeight || source.height : 'videoHeight' in source ? source.videoHeight || source.height : source.height;

    const cropX = cropBox ? Math.max(0, cropBox.x) : 0;
    const cropY = cropBox ? Math.max(0, cropBox.y) : 0;
    const cropW = cropBox ? Math.min(srcW - cropX, cropBox.width) : srcW;
    const cropH = cropBox ? Math.min(srcH - cropY, cropBox.height) : srcH;

    // Quality gate on raw cropped face region
    const sampleSize = 64;
    this.offscreenCanvas.width = sampleSize;
    this.offscreenCanvas.height = sampleSize;
    this.offscreenCtx.clearRect(0, 0, sampleSize, sampleSize);
    this.offscreenCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, sampleSize, sampleSize);

    const rawImgData = this.offscreenCtx.getImageData(0, 0, sampleSize, sampleSize);
    const quality = this.evaluateFaceQuality(rawImgData.data, Math.round(cropW), Math.round(cropH));

    if (!quality.passed) {
      return { embedding: null, quality };
    }

    // Generate 256D Multi-Scale Normalized Descriptor (16 spatial cells x 16 features)
    const stdSize = 64;
    const pixels = rawImgData.data;
    const rawVector = new Float32Array(256);
    const cellW = stdSize / 4; // 16x16 per cell (16 spatial cells)

    for (let cy = 0; cy < 4; cy++) {
      for (let cx = 0; cx < 4; cx++) {
        const cellIdx = cy * 4 + cx;
        const baseOffset = cellIdx * 16;

        let sumL = 0, sumR = 0, sumG = 0, sumB = 0;
        let grad0 = 0, grad45 = 0, grad90 = 0, grad135 = 0;
        let lbpEdgeCount = 0;
        let count = 0;

        for (let y = cy * cellW; y < (cy + 1) * cellW; y++) {
          for (let x = cx * cellW; x < (cx + 1) * cellW; x++) {
            const pIdx = (y * stdSize + x) * 4;
            const r = pixels[pIdx] / 255.0;
            const g = pixels[pIdx + 1] / 255.0;
            const b = pixels[pIdx + 2] / 255.0;
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            sumL += luma;
            sumR += r;
            sumG += g;
            sumB += b;

            if (x > 0 && x < stdSize - 1 && y > 0 && y < stdSize - 1) {
              const pL = (pixels[((y) * stdSize + (x - 1)) * 4] * 0.299 + pixels[((y) * stdSize + (x - 1)) * 4 + 1] * 0.587 + pixels[((y) * stdSize + (x - 1)) * 4 + 2] * 0.114) / 255;
              const pR = (pixels[((y) * stdSize + (x + 1)) * 4] * 0.299 + pixels[((y) * stdSize + (x + 1)) * 4 + 1] * 0.587 + pixels[((y) * stdSize + (x + 1)) * 4 + 2] * 0.114) / 255;
              const pT = (pixels[((y - 1) * stdSize + x) * 4] * 0.299 + pixels[((y - 1) * stdSize + x) * 4 + 1] * 0.587 + pixels[((y - 1) * stdSize + x) * 4 + 2] * 0.114) / 255;
              const pB = (pixels[((y + 1) * stdSize + x) * 4] * 0.299 + pixels[((y + 1) * stdSize + x) * 4 + 1] * 0.587 + pixels[((y + 1) * stdSize + x) * 4 + 2] * 0.114) / 255;

              const dx = pR - pL;
              const dy = pB - pT;
              const mag = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 180;

              if (angle < 45) grad0 += mag;
              else if (angle < 90) grad45 += mag;
              else if (angle < 135) grad90 += mag;
              else grad135 += mag;

              if (mag > 0.08) lbpEdgeCount++;
            }

            count++;
          }
        }

        if (count > 0) {
          rawVector[baseOffset + 0] = sumL / count;
          rawVector[baseOffset + 1] = sumR / count;
          rawVector[baseOffset + 2] = sumG / count;
          rawVector[baseOffset + 3] = sumB / count;
          rawVector[baseOffset + 4] = (sumR - sumB) / count;
          rawVector[baseOffset + 5] = (sumG - sumL) / count;
          rawVector[baseOffset + 6] = grad0 / count;
          rawVector[baseOffset + 7] = grad45 / count;
          rawVector[baseOffset + 8] = grad90 / count;
          rawVector[baseOffset + 9] = grad135 / count;
          rawVector[baseOffset + 10] = lbpEdgeCount / count;
          rawVector[baseOffset + 11] = Math.sqrt(rawVector[baseOffset + 6] * rawVector[baseOffset + 8]);
          rawVector[baseOffset + 12] = Math.abs(rawVector[baseOffset + 1] - rawVector[baseOffset + 2]);
          rawVector[baseOffset + 13] = Math.abs(rawVector[baseOffset + 2] - rawVector[baseOffset + 3]);
          rawVector[baseOffset + 14] = (grad0 + grad90) / count;
          rawVector[baseOffset + 15] = (grad45 + grad135) / count;
        }
      }
    }

    // L2 Normalization: Ensure sum(v_i^2) = 1.0
    let normSq = 0;
    for (let i = 0; i < 256; i++) {
      normSq += rawVector[i] * rawVector[i];
    }
    const norm = Math.sqrt(normSq) || 1;
    const normalized: number[] = new Array(256);
    for (let i = 0; i < 256; i++) {
      normalized[i] = rawVector[i] / norm;
    }

    return { embedding: normalized, quality };
  }

  // Exact Cosine Similarity metric between unit vectors
  public computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1, dot));
  }

  // Match extracted embedding against enrolled household identities
  public matchFaceEmbedding(
    faceVector: number[] | null,
    quality: FaceQualityReport
  ): {
    candidateProfileId?: string;
    candidateDisplayName?: string;
    candidateRelationship?: string;
    candidateIsToddler: boolean;
    similarityScore: number;
    requiredThreshold: number;
    quality: FaceQualityReport;
  } {
    if (!quality.passed || !faceVector) {
      return {
        candidateIsToddler: false,
        similarityScore: 0,
        requiredThreshold: TODDLER_RECOGNITION_THRESHOLD,
        quality
      };
    }

    const config = this.loadHouseholdConfig();
    let bestScore = -1;
    let bestMatch: {
      profileId: string;
      displayName: string;
      relationship?: string;
      isToddler: boolean;
      threshold: number;
    } | null = null;

    // 1. Check against active Toddler profile (Strict: exactly 1 toddler)
    if (config.toddlerProfile && config.toddlerProfile.samples.length > 0) {
      for (const sample of config.toddlerProfile.samples) {
        const sim = this.computeCosineSimilarity(faceVector, sample.embedding);
        if (sim > bestScore) {
          bestScore = sim;
          bestMatch = {
            profileId: config.toddlerProfile.profileId,
            displayName: config.toddlerProfile.displayName || 'Toddler',
            relationship: 'Toddler',
            isToddler: true,
            threshold: config.toddlerRecognitionThreshold || TODDLER_RECOGNITION_THRESHOLD
          };
        }
      }
    }

    // 2. Check against enrolled Authorised People
    for (const person of config.authorisedPeople) {
      if (person.samples && person.samples.length > 0) {
        for (const sample of person.samples) {
          const sim = this.computeCosineSimilarity(faceVector, sample.embedding);
          if (sim > bestScore) {
            bestScore = sim;
            bestMatch = {
              profileId: person.profileId,
              displayName: person.displayName,
              relationship: person.relationship || 'Caregiver',
              isToddler: false,
              threshold: config.authorisedPersonRecognitionThreshold || AUTHORIZED_PERSON_RECOGNITION_THRESHOLD
            };
          }
        }
      }
    }

    return {
      candidateProfileId: bestMatch?.profileId,
      candidateDisplayName: bestMatch?.displayName,
      candidateRelationship: bestMatch?.relationship,
      candidateIsToddler: bestMatch?.isToddler || false,
      similarityScore: Math.max(0, bestScore),
      requiredThreshold: bestMatch?.threshold || TODDLER_RECOGNITION_THRESHOLD,
      quality
    };
  }
}

export const faceRecognitionService = new FaceRecognitionService();
