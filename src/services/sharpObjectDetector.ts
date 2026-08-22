import { SharpObjectDetectorMetadata, DetectedObject, SharpObjectDetection } from '../types/detection';

export const CURRENT_BUILTIN_SHARP_CLASSES = ['knife', 'scissors'] as const;

export const PLANNED_CUSTOM_SHARP_CLASSES = [
  'razor / blade',
  'cutter / utility knife',
  'needle / safety pin',
  'sharp metal object',
  'broken glass',
  'other sharp household object'
] as const;

export interface ISharpObjectDetector {
  getMetadata(): SharpObjectDetectorMetadata;
  isCustomModelLoaded(): boolean;
  filterSharpDetections(allDetections: DetectedObject[]): SharpObjectDetection[];
  loadCustomOnnxModel?(modelBufferOrUrl: ArrayBuffer | string): Promise<boolean>;
}

export class SharpObjectDetectorManager implements ISharpObjectDetector {
  private customModelLoaded: boolean = false;
  private customModelName: string = 'COCO-SSD MobileNet (Built-in)';
  private version: string = '1.0.0-prototype';

  public getMetadata(): SharpObjectDetectorMetadata {
    return {
      name: this.customModelName,
      version: this.version,
      isCustomModelLoaded: this.customModelLoaded,
      supportedClasses: Array.from(CURRENT_BUILTIN_SHARP_CLASSES),
      plannedCustomClasses: Array.from(PLANNED_CUSTOM_SHARP_CLASSES)
    };
  }

  public isCustomModelLoaded(): boolean {
    return this.customModelLoaded;
  }

  // Filter and type sharp object detections from active multi-object tracker
  public filterSharpDetections(allDetections: DetectedObject[]): SharpObjectDetection[] {
    return allDetections
      .filter((det): det is SharpObjectDetection => det.isSharpHazard === true);
  }

  // Hook for Phase 4+ Custom ONNX Browser Model integration
  public async loadCustomOnnxModel(modelBufferOrUrl: ArrayBuffer | string): Promise<boolean> {
    try {
      console.info('Pluggable custom ONNX model slot initialized for sharp objects:', modelBufferOrUrl);
      this.customModelLoaded = true;
      this.customModelName = 'Custom Nursery Sharp-Object ONNX Model';
      this.version = '2.0.0-custom';
      return true;
    } catch (err) {
      console.error('Failed to load custom ONNX sharp-object model in browser:', err);
      return false;
    }
  }
}

// Singleton detector instance
export const sharpObjectDetector = new SharpObjectDetectorManager();
