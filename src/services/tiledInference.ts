import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { BoundingBoxNormalized, BoundingBoxPixels, RawModelPrediction } from '../types/detection';
import { CURRENT_BUILTIN_SHARP_CLASSES } from './sharpObjectDetector';
import { computeIoU } from './tracker';

export const BUILTIN_ANIMAL_CLASSES = [
  'dog',
  'cat',
  'bird',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe'
] as const;

export interface TileRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TiledInferenceConfig {
  enabled: boolean;
  gridRows: number;
  gridCols: number;
  overlapRatio: number; // e.g. 0.20 for 20% overlap
  sharpObjectMinScore: number; // Lower threshold for sharp hazards (e.g. 0.25)
  animalMinScore: number; // Threshold for animal classes (e.g. 0.35)
  personMinScore: number; // Threshold for person detection (e.g. 0.40)
  generalObjectMinScore: number; // Standard threshold for general objects (e.g. 0.45)
  includeFullFrame: boolean;
  nmsIouThreshold: number; // IoU threshold for merging duplicates (e.g. 0.35)
  nmsContainmentThreshold: number; // Containment threshold for sub-box suppression (e.g. 0.50)
}

export const DEFAULT_TILED_CONFIG: TiledInferenceConfig = {
  enabled: true,
  gridRows: 2,
  gridCols: 2,
  overlapRatio: 0.20,
  sharpObjectMinScore: 0.25,
  animalMinScore: 0.35,
  personMinScore: 0.40,
  generalObjectMinScore: 0.45,
  includeFullFrame: true,
  nmsIouThreshold: 0.35,
  nmsContainmentThreshold: 0.50
};

// Compute Containment (Intersection over Minimum Area) between two normalized boxes
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

export class TiledInferenceEngine {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: false });
    }
  }

  // Generate 2x2 overlapping tile coordinates
  public computeTileRegions(frameWidth: number, frameHeight: number, config: TiledInferenceConfig): TileRegion[] {
    const tiles: TileRegion[] = [];
    const { gridRows, gridCols, overlapRatio } = config;

    // Tile dimensions covering the frame with overlap
    const tileW = Math.ceil(frameWidth / (gridCols - overlapRatio * (gridCols - 1)));
    const tileH = Math.ceil(frameHeight / (gridRows - overlapRatio * (gridRows - 1)));
    const stepX = Math.round(tileW * (1 - overlapRatio));
    const stepY = Math.round(tileH * (1 - overlapRatio));

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        let x = c * stepX;
        let y = r * stepY;

        // Clamp to frame boundary
        if (x + tileW > frameWidth) x = Math.max(0, frameWidth - tileW);
        if (y + tileH > frameHeight) y = Math.max(0, frameHeight - tileH);

        const w = Math.min(tileW, frameWidth - x);
        const h = Math.min(tileH, frameHeight - y);

        tiles.push({
          id: `tile-${r}-${c}`,
          name: `Tile [R${r + 1}, C${c + 1}]`,
          x,
          y,
          width: w,
          height: h
        });
      }
    }

    return tiles;
  }

  // Run full frame or tiled inference with coordinate transformation and rigorous duplicate suppression
  public async executeInference(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    model: cocoSsd.ObjectDetection,
    config: TiledInferenceConfig,
    baseThreshold: number
  ): Promise<{
    predictions: RawModelPrediction[];
    tilesProcessed: number;
    rawDetectionCount: number;
    tiledDetections: RawModelPrediction[];
    fullFrameDetections: RawModelPrediction[];
  }> {
    const frameW = 'naturalWidth' in source ? source.naturalWidth || source.width : 'videoWidth' in source ? source.videoWidth || source.width : source.width;
    const frameH = 'naturalHeight' in source ? source.naturalHeight || source.height : 'videoHeight' in source ? source.videoHeight || source.height : source.height;

    if (frameW <= 0 || frameH <= 0) {
      return {
        predictions: [],
        tilesProcessed: 0,
        rawDetectionCount: 0,
        tiledDetections: [],
        fullFrameDetections: []
      };
    }

    const effectiveSharpMinScore = Math.min(config.sharpObjectMinScore, baseThreshold * 0.65);
    const effectiveAnimalMinScore = Math.min(config.animalMinScore, baseThreshold * 0.75);
    const effectivePersonMinScore = Math.min(config.personMinScore, baseThreshold * 0.80);
    const effectiveGeneralMinScore = Math.min(config.generalObjectMinScore, baseThreshold * 0.85);

    const allCandidates: RawModelPrediction[] = [];
    const fullFrameDetections: RawModelPrediction[] = [];
    const tiledDetections: RawModelPrediction[] = [];
    let tilesCount = 0;

    // 1. Run Full Frame Inference (Primary detector for Person, Animals, and Scene Objects)
    if (config.includeFullFrame || !config.enabled) {
      try {
        const rawFull = await model.detect(source, 20, 0.01);
        for (const pred of rawFull) {
          const [x, y, w, h] = pred.bbox;
          const className = pred.class.toLowerCase();
          const isSharpHazard = CURRENT_BUILTIN_SHARP_CLASSES.includes(
            className as (typeof CURRENT_BUILTIN_SHARP_CLASSES)[number]
          );
          const isAnimal = BUILTIN_ANIMAL_CLASSES.includes(
            className as (typeof BUILTIN_ANIMAL_CLASSES)[number]
          );
          const isPerson = className === 'person';
          const animalClass = isAnimal ? className.charAt(0).toUpperCase() + className.slice(1) : undefined;

          let minReqScore = effectiveGeneralMinScore;
          if (isSharpHazard) minReqScore = effectiveSharpMinScore;
          else if (isAnimal) minReqScore = effectiveAnimalMinScore;
          else if (isPerson) minReqScore = effectivePersonMinScore;

          const passedThreshold = pred.score >= minReqScore;

          const top = Math.max(0, Math.min(100, (y / frameH) * 100));
          const left = Math.max(0, Math.min(100, (x / frameW) * 100));
          const boxWidth = Math.max(0.5, Math.min(100 - left, (w / frameW) * 100));
          const boxHeight = Math.max(0.5, Math.min(100 - top, (h / frameH) * 100));

          const item: RawModelPrediction = {
            className,
            confidence: pred.score,
            confidencePct: Math.round(pred.score * 100),
            bboxPixels: [x, y, w, h],
            bboxNormalized: { top, left, width: boxWidth, height: boxHeight },
            isSharpHazard,
            isAnimal,
            animalClass,
            passedThreshold
          };

          fullFrameDetections.push(item);
          if (passedThreshold) {
            allCandidates.push(item);
          }
        }
      } catch (err) {
        console.warn('Full-frame inference error:', err);
      }
    }

    // 2. Run Tiled Inference (Targeted specifically for small/far sharp objects and small animals)
    // IMPORTANT: Sub-tile slicing is designed for small hazards (scissors, knife) that are tiny in full frame.
    // Person detections are already captured in full frame; sub-tile person crops produce partial torso/head duplicates.
    if (config.enabled && this.offscreenCanvas && this.offscreenCtx) {
      const tiles = this.computeTileRegions(frameW, frameH, config);
      tilesCount = tiles.length;

      for (const tile of tiles) {
        try {
          this.offscreenCanvas.width = tile.width;
          this.offscreenCanvas.height = tile.height;

          this.offscreenCtx.drawImage(
            source,
            tile.x,
            tile.y,
            tile.width,
            tile.height,
            0,
            0,
            tile.width,
            tile.height
          );

          // Detect on high-resolution tile crop
          const rawTile = await model.detect(this.offscreenCanvas, 15, 0.01);

          for (const pred of rawTile) {
            const [localX, localY, localW, localH] = pred.bbox;
            const className = pred.class.toLowerCase();
            const isSharpHazard = CURRENT_BUILTIN_SHARP_CLASSES.includes(
              className as (typeof CURRENT_BUILTIN_SHARP_CLASSES)[number]
            );
            const isAnimal = BUILTIN_ANIMAL_CLASSES.includes(
              className as (typeof BUILTIN_ANIMAL_CLASSES)[number]
            );
            const isPerson = className === 'person';
            const animalClass = isAnimal ? className.charAt(0).toUpperCase() + className.slice(1) : undefined;

            // Global frame coordinates
            const globalX = tile.x + localX;
            const globalY = tile.y + localY;
            const globalW = localW;
            const globalH = localH;

            let minReqScore = effectiveGeneralMinScore;
            if (isSharpHazard) minReqScore = effectiveSharpMinScore;
            else if (isAnimal) minReqScore = effectiveAnimalMinScore;
            else if (isPerson) minReqScore = effectivePersonMinScore;

            const passedThreshold = pred.score >= minReqScore;

            const top = Math.max(0, Math.min(100, (globalY / frameH) * 100));
            const left = Math.max(0, Math.min(100, (globalX / frameW) * 100));
            const boxWidth = Math.max(0.5, Math.min(100 - left, (globalW / frameW) * 100));
            const boxHeight = Math.max(0.5, Math.min(100 - top, (globalH / frameH) * 100));

            const item: RawModelPrediction = {
              className,
              confidence: pred.score,
              confidencePct: Math.round(pred.score * 100),
              bboxPixels: [globalX, globalY, globalW, globalH],
              bboxNormalized: { top, left, width: boxWidth, height: boxHeight },
              isSharpHazard,
              isAnimal,
              animalClass,
              passedThreshold
            };

            tiledDetections.push(item);

            // Only forward tiled detections if passed threshold
            // For Person, if full frame already ran, only forward if high confidence and not a small fragment
            if (passedThreshold) {
              if (isPerson) {
                // Ignore tiny partial tile crops (< 15% of frame height) when full frame is active
                if (boxHeight >= 15 || !config.includeFullFrame) {
                  allCandidates.push(item);
                }
              } else {
                allCandidates.push(item);
              }
            }
          }
        } catch (tileErr) {
          console.warn(`Tile inference error on ${tile.id}:`, tileErr);
        }
      }
    }

    // 3. Rigorous Class-Aware Non-Maximum Suppression (IoU + Containment Deduplication)
    const mergedPredictions = this.applyNMS(
      allCandidates,
      config.nmsIouThreshold,
      config.nmsContainmentThreshold
    );

    return {
      predictions: mergedPredictions,
      tilesProcessed: tilesCount,
      rawDetectionCount: fullFrameDetections.length + tiledDetections.length,
      tiledDetections,
      fullFrameDetections
    };
  }

  // Rigorous Non-Maximum Suppression with both IoU and Containment (IoM) checks per class
  public applyNMS(
    candidates: RawModelPrediction[],
    iouThreshold: number = 0.35,
    containmentThreshold: number = 0.50
  ): RawModelPrediction[] {
    if (candidates.length <= 1) return candidates;

    // Sort descending by confidence score
    const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
    const selected: RawModelPrediction[] = [];
    const suppressed = new Set<number>();

    for (let i = 0; i < sorted.length; i++) {
      if (suppressed.has(i)) continue;

      const current = sorted[i];
      selected.push(current);

      for (let j = i + 1; j < sorted.length; j++) {
        if (suppressed.has(j)) continue;

        const candidate = sorted[j];

        // Class-specific deduplication (NEVER suppress across different object classes, e.g. Person vs Knife)
        const isSameClass = current.className === candidate.className;
        const isBothSharp = current.isSharpHazard && candidate.isSharpHazard;
        const isBothAnimal = current.isAnimal && candidate.isAnimal;

        if (isSameClass || isBothSharp || isBothAnimal) {
          const iou = computeIoU(current.bboxNormalized, candidate.bboxNormalized);
          const containment = computeContainment(current.bboxNormalized, candidate.bboxNormalized);

          // For Person: Suppress if IoU >= 0.30 OR one box is >= 50% contained in the other
          if (current.className === 'person') {
            if (iou >= 0.30 || containment >= containmentThreshold) {
              suppressed.add(j);
            }
          } else {
            // For general objects / sharp hazards
            if (iou >= iouThreshold || containment >= 0.70) {
              suppressed.add(j);
            }
          }
        }
      }
    }

    return selected;
  }
}

export const tiledInferenceEngine = new TiledInferenceEngine();
