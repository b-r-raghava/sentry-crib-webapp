export type NavScreen = 'dashboard' | 'live-monitor' | 'alert-history' | 'settings' | 'about';
export type PublicScreen = 'landing' | 'login' | 'signup' | 'forgot-password';

export type AuthState = 
  | 'INITIALIZING'
  | 'SIGNED_OUT'
  | 'SIGNING_IN'
  | 'SIGNED_UP'
  | 'SIGNED_IN'
  | 'SIGNING_OUT'
  | 'ERROR';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export type AlertSeverity = 'critical' | 'medium' | 'low';

export type AlertType = 
  | 'edge_risk' 
  | 'sound' 
  | 'movement' 
  | 'breath' 
  | 'sharp_object' 
  | 'face_obstruction';

export interface AlertItem {
  id: string;
  timestamp: string;
  rawDate: string;
  type: AlertType;
  typeLabel: string;
  severity: AlertSeverity;
  duration: string;
  status: 'reviewed' | 'unreviewed' | 'dismissed';
  notes?: string;
  snapshotUrl?: string;
  videoClipUrl?: string;
}

export interface EventLogItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  isHighlighted?: boolean;
  opacity?: number;
}

export interface DetectionState {
  isInfantDetected: boolean;
  isFaceObstructed: boolean;
  isNearEdge: boolean;
  sharpObjectsDetected: string[];
}

export interface SafetySettingsState {
  sharpObject: {
    enabled: boolean;
    sensitivity: number; // 1 to 100
  };
  fallRisk: {
    enabled: boolean;
    bufferZoneCm: number;
    safeZoneDefined: boolean;
  };
  faceObstruction: {
    enabled: boolean;
    thresholdSeconds: number; // 5, 10, 30
  };
  notifications: {
    audioAlerts: boolean;
    smsAlerts: boolean;
    systemNotifications: boolean;
    emergencyContact: string;
  };
}

export interface SystemTelemetry {
  videoStreamQuality: string;
  aiPipelineStatus: string;
  streamLatency: string;
}
