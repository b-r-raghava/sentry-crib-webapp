import { RefObject } from 'react';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'connected'
  | 'permission_denied'
  | 'unavailable'
  | 'unsupported'
  | 'error';

export interface CameraError {
  type: CameraStatus;
  message: string;
}

export interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  cameraStatus: CameraStatus;
  isMonitoring: boolean;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  error: CameraError | null;
  cameraLabel: string;
}
