import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENT_BUILTIN_SHARP_CLASSES, PLANNED_CUSTOM_SHARP_CLASSES } from '../services/sharpObjectDetector';

export const SafetySettingsScreen: React.FC = () => {
  const { safetySettings, updateSafetySettings, setDefineAreaModalOpen } = useApp();
  
  const [activeTab, setActiveTab] = useState<'detection' | 'alerts' | 'general'>('detection');
  const [localSettings, setLocalSettings] = useState(safetySettings);
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    updateSafetySettings(localSettings);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
    }, 2000);
  };

  const handleDiscard = () => {
    setLocalSettings(safetySettings);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-outline-variant/60 pb-4 gap-4">
        <div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-background mb-1">
            Safety Settings
          </h2>
          <p className="text-on-surface-variant font-body-md text-sm">
            Configure AI detection parameters and alert behaviors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-4 py-2 rounded-2xl text-primary border border-primary/50 hover:bg-primary-fixed/40 transition-colors font-label-sm text-sm font-semibold"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-2xl bg-primary text-on-primary hover:bg-primary-container transition-all shadow-sm font-label-sm text-sm font-bold active:scale-98"
          >
            Save Changes
          </button>
        </div>
      </header>

      {/* Save Toast */}
      {saveToast && (
        <div className="p-3.5 bg-primary-fixed text-on-primary-fixed rounded-2xl border border-primary/30 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <span>Safety configuration saved successfully.</span>
          </div>
        </div>
      )}

      {/* Body with Side Nav & Panels */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Settings Navigation (In-page) */}
        <aside className="w-full lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('detection')}
              className={`shrink-0 text-left px-4 py-2.5 rounded-2xl font-label-sm text-sm flex items-center gap-2.5 transition-all ${
                activeTab === 'detection'
                  ? 'bg-surface-container font-bold text-on-surface border-l-4 border-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">radar</span>
              <span>Detection</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`shrink-0 text-left px-4 py-2.5 rounded-2xl font-label-sm text-sm flex items-center gap-2.5 transition-all ${
                activeTab === 'alerts'
                  ? 'bg-surface-container font-bold text-on-surface border-l-4 border-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              <span>Alerts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`shrink-0 text-left px-4 py-2.5 rounded-2xl font-label-sm text-sm flex items-center gap-2.5 transition-all ${
                activeTab === 'general'
                  ? 'bg-surface-container font-bold text-on-surface border-l-4 border-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
              <span>General</span>
            </button>
          </nav>
        </aside>

        {/* Settings Panels */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          {/* Section: AI Detection Models */}
          {activeTab === 'detection' && (
            <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
              <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  <span>AI Detection & Tracking Parameters</span>
                </h3>
              </div>

              <div className="p-6 flex flex-col gap-6">
                {/* Sharp Object Detection */}
                <div className="flex flex-col gap-3 pb-6 border-b border-surface-variant">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-label-sm text-sm font-bold text-on-surface mb-0.5">
                        Sharp Object Detection (Active: Knife & Scissors)
                      </h4>
                      <p className="font-caption text-xs text-on-surface-variant">
                        Identifies potentially dangerous objects (scissors, pens, hard toys) entering the crib area.
                      </p>
                    </div>

                    {/* Custom Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={localSettings.sharpObject.enabled}
                        onChange={e =>
                          setLocalSettings({
                            ...localSettings,
                            sharpObject: {
                              ...localSettings.sharpObject,
                              enabled: e.target.checked
                            }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  <div className="mt-2">
                    <div className="font-caption text-xs text-on-surface-variant flex justify-between mb-1.5 font-medium">
                      <span>Sensitivity Level</span>
                      <span className="font-label-sm text-xs text-primary font-bold">
                        {localSettings.sharpObject.sensitivity >= 80 ? 'High' : localSettings.sharpObject.sensitivity >= 50 ? 'Medium' : 'Low'} ({localSettings.sharpObject.sensitivity}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={localSettings.sharpObject.sensitivity}
                      onChange={e =>
                        setLocalSettings({
                          ...localSettings,
                          sharpObject: {
                            ...localSettings.sharpObject,
                            sensitivity: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full h-1 bg-surface-variant rounded-2xl appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Fall / Edge Warning */}
                <div className="flex flex-col gap-3 pb-6 border-b border-surface-variant">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-label-sm text-sm font-bold text-on-surface mb-0.5">
                        Fall & Edge Warning
                      </h4>
                      <p className="font-caption text-xs text-on-surface-variant">
                        Alerts if movement breaches the defined safe perimeter.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={localSettings.fallRisk.enabled}
                        onChange={e =>
                          setLocalSettings({
                            ...localSettings,
                            fallRisk: {
                              ...localSettings.fallRisk,
                              enabled: e.target.checked
                            }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  <div className="mt-2 flex items-center justify-between bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/50">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-xl">crop_free</span>
                      <span className="font-label-sm text-xs sm:text-sm font-semibold text-on-surface">Safe Zone Perimeter</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDefineAreaModalOpen(true)}
                      className="px-3.5 py-1.5 bg-primary-container text-on-primary-container font-label-sm text-xs rounded-xl hover:bg-primary transition-all shadow-xs flex items-center gap-1 font-semibold active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Define Area</span>
                    </button>
                  </div>

                  <div className="mt-2">
                    <div className="font-caption text-xs text-on-surface-variant flex justify-between mb-1.5 font-medium">
                      <span>Boundary Buffer Zone</span>
                      <span className="font-label-sm text-xs text-on-surface font-bold">{localSettings.fallRisk.bufferZoneCm}cm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={localSettings.fallRisk.bufferZoneCm}
                      onChange={e =>
                        setLocalSettings({
                          ...localSettings,
                          fallRisk: {
                            ...localSettings.fallRisk,
                            bufferZoneCm: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full h-1 bg-surface-variant rounded-2xl appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Face Obstruction (Critical) */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-label-sm text-sm font-bold text-on-surface mb-0.5 flex items-center gap-2">
                        <span>Face Obstruction</span>
                        <span className="bg-soft-rose text-[#7a1c1c] px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                          Critical
                        </span>
                      </h4>
                      <p className="font-caption text-xs text-on-surface-variant">
                        Monitors for blankets or items covering the breathing airway.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-not-allowed shrink-0" title="Critical safety layer cannot be disabled">
                      <input
                        type="checkbox"
                        checked={localSettings.faceObstruction.enabled}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-soft-rose opacity-90 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5" />
                    </label>
                  </div>

                  <div className="mt-2">
                    <label className="font-caption text-xs text-on-surface-variant block mb-2 font-medium">
                      Alert Threshold (Time obstructed before audible warning)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 30].map(seconds => {
                        const isSelected = localSettings.faceObstruction.thresholdSeconds === seconds;
                        return (
                          <button
                            key={seconds}
                            type="button"
                            onClick={() =>
                              setLocalSettings({
                                ...localSettings,
                                faceObstruction: {
                                  ...localSettings.faceObstruction,
                                  thresholdSeconds: seconds
                                }
                              })
                            }
                            className={`text-center py-2 px-1 rounded-2xl border font-label-sm text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-primary-container text-on-primary-container border-primary shadow-xs'
                                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                            }`}
                          >
                            {seconds} Seconds
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section: Alert Configuration */}
          {activeTab === 'alerts' && (
            <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
              <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">notifications</span>
                  <span>Alert Notification Preferences</span>
                </h3>
                <span className="text-caption text-xs text-on-surface-variant">Active Channels</span>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">volume_up</span>
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">Audible Siren on Device</span>
                      <span className="text-xs text-on-surface-variant">Sound local chime during critical alerts</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.audioAlerts}
                    onChange={e =>
                      setLocalSettings({
                        ...localSettings,
                        notifications: {
                          ...localSettings.notifications,
                          audioAlerts: e.target.checked
                        }
                      })
                    }
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">sms</span>
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">SMS Emergency Dispatch</span>
                      <span className="text-xs text-on-surface-variant">Target: {localSettings.notifications.emergencyContact}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.smsAlerts}
                    onChange={e =>
                      setLocalSettings({
                        ...localSettings,
                        notifications: {
                          ...localSettings.notifications,
                          smsAlerts: e.target.checked
                        }
                      })
                    }
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section: General & Model Capabilities Architecture */}
          {activeTab === 'general' && (
            <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
              <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  <span>Model Architecture & Capability Specifications</span>
                </h3>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-on-surface mb-2">Tracking & Confidence Smoothing</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                    Person and object confidence scores are stabilized across consecutive video frames using an Exponential Moving Average (EMA, α=0.30), eliminating visually distracting confidence jitter while maintaining authentic model predictions.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                      <span className="text-on-surface-variant block">Tracking Algorithm</span>
                      <span className="font-bold text-primary">IoU + Centroid Proximity</span>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                      <span className="text-on-surface-variant block">Coordinate Smoothing</span>
                      <span className="font-bold text-primary">EMA (α=0.35)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-variant">
                  <h4 className="text-sm font-bold text-on-surface mb-2">Active vs. Planned Sharp Object Classes</h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-primary block mb-1.5">Actively Classified by Built-in Model:</span>
                      <div className="flex flex-wrap gap-2">
                        {CURRENT_BUILTIN_SHARP_CLASSES.map(cls => (
                          <span key={cls} className="px-2.5 py-1 bg-primary-fixed/40 text-on-primary-fixed rounded-lg font-bold capitalize">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-on-surface-variant block mb-1.5">Planned for Custom Browser ONNX Model:</span>
                      <div className="flex flex-wrap gap-2">
                        {PLANNED_CUSTOM_SHARP_CLASSES.map(cls => (
                          <span key={cls} className="px-2.5 py-1 bg-surface-container-low text-on-surface-variant rounded-lg border border-outline-variant/30 capitalize">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
