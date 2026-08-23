import { AlertItem, EventLogItem, SafetySettingsState, DetectionState, SystemTelemetry } from '../types';

export const INITIAL_TELEMETRY: SystemTelemetry = {
  videoStreamQuality: '1080p (WebRTC/Local)',
  aiPipelineStatus: 'Local COCO-SSD Ready',
  streamLatency: '< 30ms (In-Browser)'
};

export const INITIAL_DETECTION_STATE: DetectionState = {
  isInfantDetected: true,
  isFaceObstructed: false,
  isNearEdge: false,
  sharpObjectsDetected: []
};

export const INITIAL_SAFETY_SETTINGS: SafetySettingsState = {
  sharpObject: {
    enabled: true,
    sensitivity: 85
  },
  fallRisk: {
    enabled: true,
    bufferZoneCm: 15,
    safeZoneDefined: true
  },
  faceObstruction: {
    enabled: true,
    thresholdSeconds: 10
  },
  notifications: {
    audioAlerts: true,
    smsAlerts: false,
    systemNotifications: true,
    emergencyContact: '+1 (555) 019-2834'
  }
};

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'alt-01',
    timestamp: 'Today, 2:14 PM',
    rawDate: '2026-08-22',
    type: 'sharp_object',
    typeLabel: 'Sharp Object Nearby',
    severity: 'critical',
    duration: '0:12s',
    status: 'unreviewed',
    notes: 'Scissors detected near crib perimeter with 84% confidence.',
    snapshotUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'alt-02',
    timestamp: 'Today, 11:30 AM',
    rawDate: '2026-08-22',
    type: 'edge_risk',
    typeLabel: 'Edge Proximity Risk',
    severity: 'medium',
    duration: '0:45s',
    status: 'reviewed',
    notes: 'Infant approached within 10cm of the designated crib boundary.',
    snapshotUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'alt-03',
    timestamp: 'Yesterday, 8:45 PM',
    rawDate: '2026-08-21',
    type: 'sound',
    typeLabel: 'Acoustic Distress (Cry)',
    severity: 'medium',
    duration: '1:10s',
    status: 'reviewed',
    notes: 'Continuous infant crying acoustic pattern recognized.',
    snapshotUrl: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'alt-04',
    timestamp: 'Yesterday, 1:20 PM',
    rawDate: '2026-08-21',
    type: 'movement',
    typeLabel: 'Sudden Rollover Movement',
    severity: 'low',
    duration: '0:05s',
    status: 'dismissed',
    notes: 'Standard sleep position repositioning detected.',
    snapshotUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'alt-05',
    timestamp: 'Aug 20, 10:15 PM',
    rawDate: '2026-08-20',
    type: 'face_obstruction',
    typeLabel: 'Blanket Airway Coverage',
    severity: 'critical',
    duration: '0:22s',
    status: 'reviewed',
    notes: 'Blanket partially obstructing visual facial landmark perimeter.',
    snapshotUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&auto=format&fit=crop&q=80'
  }
];

export const MOCK_EVENT_LOGS: EventLogItem[] = [
  {
    id: 'log-1',
    time: '18:42:10',
    title: 'Safe boundary verified',
    isHighlighted: true
  },
  {
    id: 'log-2',
    time: '18:36:00',
    title: 'Routine scan complete: No hazards'
  },
  {
    id: 'log-3',
    time: '18:30:15',
    title: 'Webcam video stream connected'
  },
  {
    id: 'log-4',
    time: '18:22:40',
    title: 'Monitoring session initialized'
  }
];
