import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const DefineAreaModal: React.FC = () => {
  const { defineAreaModalOpen, setDefineAreaModalOpen, updateSafetySettings, safetySettings, camera } = useApp();
  const { videoRef, isMonitoring } = camera;

  const [bufferDistance, setBufferDistance] = useState<number>(safetySettings.fallRisk.bufferZoneCm);

  if (!defineAreaModalOpen) return null;

  const handleSave = () => {
    updateSafetySettings({
      fallRisk: {
        ...safetySettings.fallRisk,
        bufferZoneCm: bufferDistance,
        safeZoneDefined: true
      }
    });
    setDefineAreaModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-surface rounded-3xl border border-outline-variant/60 shadow-2xl max-w-2xl w-full p-6 text-on-surface relative">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/40">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">crop_free</span>
            <h3 className="font-headline-md text-lg font-bold text-on-surface">Calibrate Safe Zone Area</h3>
          </div>
          <button
            onClick={() => setDefineAreaModalOpen(false)}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="font-body-md text-xs text-on-surface-variant mb-4">
          Adjust the visual safety perimeter and buffer zone over your nursery camera view.
        </p>

        {/* Visual Camera Preview / Perimeter Calibration Canvas */}
        <div className="relative w-full aspect-video bg-inverse-surface rounded-2xl overflow-hidden mb-5 border border-outline flex items-center justify-center">
          {isMonitoring && videoRef.current ? (
            <video autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="text-center text-white/60 p-6">
              <span className="material-symbols-outlined text-4xl mb-2 text-primary-fixed">videocam</span>
              <p className="text-xs">Camera Reference Feed</p>
            </div>
          )}

          {/* Interactive Defined Safe Zone Overlay */}
          <div className="absolute inset-8 border-2 border-primary-fixed bg-primary-fixed/15 rounded-2xl flex flex-col justify-between p-3 pointer-events-none shadow-[0_0_20px_rgba(174,237,250,0.3)]">
            <span className="font-caption text-[11px] text-primary font-bold bg-white/90 px-2 py-0.5 rounded self-start shadow-xs">
              Safe Zone Calibrated
            </span>
            <span className="font-caption text-[10px] text-white/80 self-end font-mono">
              Buffer: {bufferDistance}cm
            </span>
          </div>
        </div>

        {/* Buffer Distance Slider */}
        <div className="mb-6 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/40">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-sm text-xs font-semibold text-on-surface">Edge Buffer Sensitivity</span>
            <span className="font-status-display text-xs font-bold text-primary">{bufferDistance} cm</span>
          </div>
          <input
            type="range"
            min="5"
            max="40"
            value={bufferDistance}
            onChange={e => setBufferDistance(parseInt(e.target.value))}
            className="w-full h-1.5 bg-surface-variant rounded-2xl appearance-none cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setDefineAreaModalOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-sm text-xs font-semibold hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-sm text-xs font-bold hover:bg-primary-container transition-all shadow-sm active:scale-98"
          >
            Save Calibration
          </button>
        </div>
      </div>
    </div>
  );
};
