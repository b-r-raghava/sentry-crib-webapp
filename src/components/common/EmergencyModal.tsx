import React from 'react';
import { useApp } from '../../context/AppContext';

export const EmergencyModal: React.FC = () => {
  const { emergencyModalOpen, setEmergencyModalOpen, safetySettings } = useApp();

  if (!emergencyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-surface rounded-3xl border border-outline-variant/60 shadow-2xl max-w-md w-full p-6 text-on-surface relative">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-outline-variant/40">
          <div className="p-3 bg-error text-on-error rounded-2xl">
            <span className="material-symbols-outlined text-2xl">emergency</span>
          </div>
          <div>
            <h3 className="font-headline-md text-lg font-bold text-error">Emergency Response</h3>
            <p className="font-caption text-xs text-on-surface-variant">Immediate Contact Dispatch</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <a
            href="tel:911"
            className="w-full p-4 bg-error text-on-error rounded-2xl flex items-center justify-between font-label-sm text-sm font-bold hover:bg-error/90 transition-all shadow-sm active:scale-98"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined">call</span>
              <span>Call 911 Emergency Services</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Fast Dial</span>
          </a>

          <a
            href={`tel:${safetySettings.notifications.emergencyContact}`}
            className="w-full p-4 bg-surface-container border border-outline-variant/60 rounded-2xl flex items-center justify-between font-label-sm text-sm font-bold text-on-surface hover:bg-surface-container-high transition-all active:scale-98"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">contact_phone</span>
              <span>Designated Caregiver</span>
            </div>
            <span className="font-caption text-xs text-on-surface-variant font-mono">
              {safetySettings.notifications.emergencyContact}
            </span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setEmergencyModalOpen(false)}
          className="w-full py-3 bg-surface-variant text-on-surface font-label-sm text-sm font-semibold rounded-2xl hover:bg-outline-variant/40 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
