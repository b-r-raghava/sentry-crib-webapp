import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import { RawModelPrediction, BoundingBoxNormalized } from '../types/detection';

// 17 Dedicated Snake / Serpentes Species in ImageNet 1000 Dataset
export const SNAKE_SPECIES_KEYWORDS = [
  'thunder snake',
  'worm snake',
  'ringneck snake',
  'ring-necked snake',
  'ring snake',
  'hognose snake',
  'puff adder',
  'sand viper',
  'green snake',
  'grass snake',
  'king snake',
  'kingsnake',
  'garter snake',
  'water snake',
  'vine snake',
  'night snake',
  'boa constrictor',
  'rock python',
  'rock snake',
  'indian cobra',
  'cobra',
  'green mamba',
  'sea snake',
  'horned viper',
  'cerastes',
  'diamondback',
  'diamondback rattlesnake',
  'rattlesnake',
  'sidewinder',
  'viper',
  'python',
  'mamba',
  'constrictor'
] as const;

// Strict False-Positive Exclusion Keywords (Ropes, Cables, Belts, Non-Snake Objects)
export const NON_SNAKE_EXCLUSION_KEYWORDS = [
  'rope',
  'cable',
  'wire',
  'cord',
  'hose',
  'belt',
  'necklace',
  'tub',
  'chain',
  'strap',
  'leash',
  'shoelace',
  'electric ray',
  'conch',
  'snail',
  'slug',
  'whiptail',
  'alligator',
  'crocodile',
  'lizard',
  'chameleon',
  'iguana',
  'banded gecko',
  'agama'
] as const;

export interface SnakeDetectorMetadata {
  name: string;
  version: string;
  backend: string;
  dataset: string;
  supportedClasses: string[];
  isLoaded: boolean;
}

let globalMobileNetPromise: Promise<mobilenet.MobileNet> | null = null;
let globalMobileNetInstance: mobilenet.MobileNet | null = null;

export const getOrLoadMobileNet = async (): Promise<mobilenet.MobileNet> => {
  if (globalMobileNetInstance) return globalMobileNetInstance;
  if (!globalMobileNetPromise) {
    globalMobileNetPromise = (async () => {
      await tf.ready();
      const model = await mobilenet.load({
        version: 2,
        alpha: 1.0
      });
      globalMobileNetInstance = model;
      return model;
    })();
  }
  return globalMobileNetPromise;
};

export class SnakeDetectorService {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private minSnakeConfidence: number = 0.35;
  private lastInferenceTime: number = 0;
  private isModelReady: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: false });
    }
  }

  public getMetadata(): SnakeDetectorMetadata {
    return {
      name: 'SentryCrib Snake & Reptile Detector',
      version: 'MobileNet-v2 (ImageNet-1k Serpentes Classifier)',
      backend: 'TensorFlow.js / WebGL',
      dataset: 'ImageNet (1000 classes with 17 Dedicated Serpentes Species)',
      supportedClasses: [
        'Indian Cobra',
        'Boa Constrictor',
        'Rock Python',
        'Green Mamba',
        'Diamondback Rattlesnake',
        'Sidewinder',
        'Horned Viper',
        'Garter Snake',
        'King Snake',
        'Green / Grass Snake',
        'Hognose Snake',
        'Water Snake',
        'Vine Snake',
        'Night Snake',
        'Ringneck Snake',
        'Thunder / Worm Snake',
        'Sea Snake'
      ],
      isLoaded: Boolean(globalMobileNetInstance)
    };
  }

  // Pre-load MobileNet model
  public async init(): Promise<void> {
    try {
      await getOrLoadMobileNet();
      this.isModelReady = true;
    } catch (err) {
      console.warn('Failed to pre-load MobileNet for Snake Detection:', err);
    }
  }

  // Inspect classification predictions to determine if a snake is present
  private evaluateSnakeMatch(predictions: Array<{ className: string; probability: number }>): {
    isSnake: boolean;
    speciesLabel: string;
    confidence: number;
  } {
    if (!predictions || predictions.length === 0) {
      return { isSnake: false, speciesLabel: '', confidence: 0 };
    }

    const top = predictions[0];
    const topLower = top.className.toLowerCase();

    // Check if top prediction is an explicitly excluded non-snake object (e.g. rope, cable, hose)
    for (const excl of NON_SNAKE_EXCLUSION_KEYWORDS) {
      if (topLower.includes(excl) && top.probability >= 0.20) {
        return { isSnake: false, speciesLabel: '', confidence: 0 };
      }
    }

    // Check for Snake species match
    for (const pred of predictions) {
      const pLower = pred.className.toLowerCase();

      for (const snakeKw of SNAKE_SPECIES_KEYWORDS) {
        if (pLower.includes(snakeKw) && pred.probability >= this.minSnakeConfidence) {
          // Format clean species label
          let species = 'Snake';
          if (pLower.includes('cobra')) species = 'Cobra';
          else if (pLower.includes('python')) species = 'Python';
          else if (pLower.includes('boa')) species = 'Boa';
          else if (pLower.includes('rattlesnake')) species = 'Rattlesnake';
          else if (pLower.includes('viper')) species = 'Viper';
          else if (pLower.includes('mamba')) species = 'Mamba';
          else if (pLower.includes('garter')) species = 'Garter Snake';
          else if (pLower.includes('king')) species = 'King Snake';
          else if (pLower.includes('green')) species = 'Green Snake';
          else if (pLower.includes('water')) species = 'Water Snake';

          return {
            isSnake: true,
            speciesLabel: species,
            confidence: pred.probability
          };
        }
      }
    }

    return { isSnake: false, speciesLabel: '', confidence: 0 };
  }

  // Spatial Multi-Scale Localized Candidate Region Search for Snakes
  public async detectSnakes(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    baseConfidenceThreshold: number = 0.40
  ): Promise<RawModelPrediction[]> {
    try {
      const model = await getOrLoadMobileNet();
      this.isModelReady = true;

      const srcW = 'naturalWidth' in source ? source.naturalWidth || source.width : 'videoWidth' in source ? source.videoWidth || source.width : source.width;
      const srcH = 'naturalHeight' in source ? source.naturalHeight || source.height : 'videoHeight' in source ? source.videoHeight || source.height : source.height;

      if (srcW <= 0 || srcH <= 0 || !this.offscreenCanvas || !this.offscreenCtx) {
        return [];
      }

      const results: RawModelPrediction[] = [];

      // Candidate spatial search regions (Global Frame + 4 Quadrant Regions + Center Region)
      interface SearchRegion {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }

      const halfW = Math.round(srcW / 2);
      const halfH = Math.round(srcH / 2);
      const quarterW = Math.round(srcW / 4);
      const quarterH = Math.round(srcH / 4);

      const regions: SearchRegion[] = [
        // 1. Global full frame
        { id: 'global', x: 0, y: 0, width: srcW, height: srcH },
        // 2. Center focus zone (50% center of frame)
        { id: 'center', x: quarterW, y: quarterH, width: halfW, height: halfH },
        // 3. Four quadrant zones (with 15% overlap)
        { id: 'top-left', x: 0, y: 0, width: Math.min(srcW, halfW + quarterW / 2), height: Math.min(srcH, halfH + quarterH / 2) },
        { id: 'top-right', x: Math.max(0, halfW - quarterW / 2), y: 0, width: Math.min(srcW, halfW + quarterW / 2), height: Math.min(srcH, halfH + quarterH / 2) },
        { id: 'bottom-left', x: 0, y: Math.max(0, halfH - quarterH / 2), width: Math.min(srcW, halfW + quarterW / 2), height: Math.min(srcH, halfH + quarterH / 2) },
        { id: 'bottom-right', x: Math.max(0, halfW - quarterW / 2), y: Math.max(0, halfH - quarterH / 2), width: Math.min(srcW, halfW + quarterW / 2), height: Math.min(srcH, halfH + quarterH / 2) }
      ];

      for (const reg of regions) {
        this.offscreenCanvas.width = 224;
        this.offscreenCanvas.height = 224;
        this.offscreenCtx.clearRect(0, 0, 224, 224);

        this.offscreenCtx.drawImage(
          source,
          reg.x,
          reg.y,
          reg.width,
          reg.height,
          0,
          0,
          224,
          224
        );

        const predictions = await model.classify(this.offscreenCanvas, 5);
        const match = this.evaluateSnakeMatch(predictions);

        if (match.isSnake && match.confidence >= Math.min(this.minSnakeConfidence, baseConfidenceThreshold * 0.80)) {
          const top = Math.max(0, Math.min(100, (reg.y / srcH) * 100));
          const left = Math.max(0, Math.min(100, (reg.x / srcW) * 100));
          const boxWidth = Math.max(0.5, Math.min(100 - left, (reg.width / srcW) * 100));
          const boxHeight = Math.max(0.5, Math.min(100 - top, (reg.height / srcH) * 100));

          results.push({
            className: 'snake',
            confidence: match.confidence,
            confidencePct: Math.round(match.confidence * 100),
            bboxPixels: [reg.x, reg.y, reg.width, reg.height],
            bboxNormalized: { top, left, width: boxWidth, height: boxHeight },
            isSharpHazard: false,
            isAnimal: true,
            animalClass: 'Snake',
            passedThreshold: true
          });
        }
      }

      // Merge and deduplicate spatial snake candidate boxes (Keep highest confidence region)
      return this.deduplicateSnakeBoxes(results);
    } catch (err) {
      console.warn('Snake detection error:', err);
      return [];
    }
  }

  // Deduplicate overlapping snake detections to ensure 1 Snake = 1 Detection
  private deduplicateSnakeBoxes(candidates: RawModelPrediction[]): RawModelPrediction[] {
    if (candidates.length <= 1) return candidates;

    candidates.sort((a, b) => b.confidence - a.confidence);
    const selected: RawModelPrediction[] = [];
    const suppressed = new Set<number>();

    for (let i = 0; i < candidates.length; i++) {
      if (suppressed.has(i)) continue;
      const current = candidates[i];
      selected.push(current);

      for (let j = i + 1; j < candidates.length; j++) {
        if (suppressed.has(j)) continue;
        const other = candidates[j];

        // If boxes overlap heavily, keep the most confident one
        const xA = Math.max(current.bboxNormalized.left, other.bboxNormalized.left);
        const yA = Math.max(current.bboxNormalized.top, other.bboxNormalized.top);
        const xB = Math.min(current.bboxNormalized.left + current.bboxNormalized.width, other.bboxNormalized.left + other.bboxNormalized.width);
        const yB = Math.min(current.bboxNormalized.top + current.bboxNormalized.height, other.bboxNormalized.top + other.bboxNormalized.height);

        const interWidth = Math.max(0, xB - xA);
        const interHeight = Math.max(0, yB - yA);
        const interArea = interWidth * interHeight;

        const areaA = current.bboxNormalized.width * current.bboxNormalized.height;
        const areaB = other.bboxNormalized.width * other.bboxNormalized.height;
        const minArea = Math.min(areaA, areaB);

        if (minArea > 0 && interArea / minArea >= 0.35) {
          suppressed.add(j);
        }
      }
    }

    return selected;
  }
}

export const snakeDetectorService = new SnakeDetectorService();
