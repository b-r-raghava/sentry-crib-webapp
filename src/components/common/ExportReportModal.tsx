import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const ExportReportModal: React.FC = () => {
  const { exportModalOpen, setExportModalOpen, alerts } = useApp();
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [downloading, setDownloading] = useState(false);

  if (!exportModalOpen) return null;

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setExportModalOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-surface rounded-3xl border border-outline-variant/60 shadow-2xl max-w-md w-full p-6 text-on-surface relative">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-outline-variant/40">
          <div className="p-3 bg-primary text-on-primary rounded-2xl">
            <span className="material-symbols-outlined text-2xl">description</span>
          </div>
          <div>
            <h3 className="font-headline-md text-lg font-bold text-on-surface">Export Safety Report</h3>
            <p className="font-caption text-xs text-on-surface-variant">Generate Incident Log Summary</p>
          </div>
        </div>

        <p className="font-body-md text-xs text-on-surface-variant mb-4">
          Export a comprehensive incident report for your pediatrician or personal records containing {alerts.length} logged incidents.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setFormat('pdf')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
              format === 'pdf'
                ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-xs'
                : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
            <span className="font-label-sm text-xs">PDF Document</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('csv')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
              format === 'csv'
                ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-xs'
                : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">table_view</span>
            <span className="font-label-sm text-xs">CSV Spreadsheet</span>
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-sm text-xs font-semibold hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-sm text-xs font-bold hover:bg-primary-container transition-all shadow-sm active:scale-98 flex items-center gap-2"
          >
            {downloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
