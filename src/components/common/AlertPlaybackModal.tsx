import React from 'react';
import { useApp } from '../../context/AppContext';

export const AlertPlaybackModal: React.FC = () => {
  const { playbackAlert, setPlaybackAlert } = useApp();

  if (!playbackAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-surface rounded-3xl border border-outline-variant/60 shadow-2xl max-w-xl w-full p-6 text-on-surface relative">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/40">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">videocam</span>
            <div>
              <h3 className="font-headline-md text-base font-bold text-on-surface">{playbackAlert.typeLabel}</h3>
              <p className="font-caption text-xs text-on-surface-variant">{playbackAlert.timestamp}</p>
            </div>
          </div>
          <button
            onClick={() => setPlaybackAlert(null)}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Video Simulation Canvas */}
        <div className="relative w-full aspect-video bg-inverse-surface rounded-2xl overflow-hidden mb-4 border border-outline flex items-center justify-center">
          <img
            src={playbackAlert.snapshotUrl}
            alt="Alert Snapshot"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
            <div className="text-white text-xs">
              <span className="font-mono bg-error px-2 py-0.5 rounded font-bold uppercase text-[10px] mr-2">
                {playbackAlert.severity}
              </span>
              <span>Recorded Duration: {playbackAlert.duration}</span>
            </div>
          </div>
        </div>

        {playbackAlert.notes && (
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 text-xs text-on-surface-variant mb-5">
            <strong>Notes:</strong> {playbackAlert.notes}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setPlaybackAlert(null)}
            className="px-5 py-2 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary-container transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
