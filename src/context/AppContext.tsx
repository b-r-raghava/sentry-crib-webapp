import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { 
  NavScreen, 
  AlertItem, 
  EventLogItem, 
  DetectionState, 
  SafetySettingsState,
  SystemTelemetry
} from '../types';
import { 
  INITIAL_TELEMETRY, 
  INITIAL_DETECTION_STATE, 
  INITIAL_SAFETY_SETTINGS, 
  MOCK_ALERTS, 
  MOCK_EVENT_LOGS 
} from '../data/mockData';
import { useCamera } from '../hooks/useCamera';
import { UseCameraReturn } from '../types/camera';
import { useObjectDetection } from '../hooks/useObjectDetection';
import { UseObjectDetectionReturn } from '../types/detection';

interface AppContextType {
  currentScreen: NavScreen;
  setCurrentScreen: (screen: NavScreen) => void;
  telemetry: SystemTelemetry;
  detectionState: DetectionState;
  safetySettings: SafetySettingsState;
  updateSafetySettings: (settings: Partial<SafetySettingsState>) => void;
  alerts: AlertItem[];
  eventLogs: EventLogItem[];
  camera: UseCameraReturn;
  objectDetection: UseObjectDetectionReturn;
  emergencyModalOpen: boolean;
  setEmergencyModalOpen: (val: boolean) => void;
  defineAreaModalOpen: boolean;
  setDefineAreaModalOpen: (val: boolean) => void;
  playbackAlert: AlertItem | null;
  setPlaybackAlert: (alert: AlertItem | null) => void;
  exportModalOpen: boolean;
  setExportModalOpen: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreenState] = useState<NavScreen>('dashboard');
  const [telemetry] = useState<SystemTelemetry>(INITIAL_TELEMETRY);
  const [detectionState] = useState<DetectionState>(INITIAL_DETECTION_STATE);
  const [safetySettings, setSafetySettings] = useState<SafetySettingsState>(INITIAL_SAFETY_SETTINGS);
  const [alerts] = useState<AlertItem[]>(MOCK_ALERTS);
  const [eventLogs] = useState<EventLogItem[]>(MOCK_EVENT_LOGS);
  
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [defineAreaModalOpen, setDefineAreaModalOpen] = useState<boolean>(false);
  const [playbackAlert, setPlaybackAlert] = useState<AlertItem | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Initialize camera and object detection hooks
  const camera = useCamera();
  const objectDetection = useObjectDetection();

  // Screen navigation with automatic cleanup when navigating away from live-monitor
  const setCurrentScreen = useCallback((newScreen: NavScreen) => {
    if (currentScreen === 'live-monitor' && newScreen !== 'live-monitor') {
      objectDetection.stopDetection();
      camera.stopCamera();
    }
    setCurrentScreenState(newScreen);
  }, [currentScreen, camera, objectDetection]);

  const updateSafetySettings = (newSettings: Partial<SafetySettingsState>) => {
    setSafetySettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        telemetry,
        detectionState,
        safetySettings,
        updateSafetySettings,
        alerts,
        eventLogs,
        camera,
        objectDetection,
        emergencyModalOpen,
        setEmergencyModalOpen,
        defineAreaModalOpen,
        setDefineAreaModalOpen,
        playbackAlert,
        setPlaybackAlert,
        exportModalOpen,
        setExportModalOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
