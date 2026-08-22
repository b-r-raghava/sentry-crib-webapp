import React from 'react';
import { useApp } from '../context/AppContext';

export const DashboardScreen: React.FC = () => {
  const { setCurrentScreen, camera, objectDetection, telemetry } = useApp();
  const { isMonitoring, cameraLabel } = camera;
  const { modelStatus, detections, inferenceFps, sharpObjectDetections } = objectDetection;

  const isDanger = sharpObjectDetections.length > 0 && isMonitoring;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-background">Dashboard</h2>
          <p className="text-sm text-on-surface-variant hidden sm:block">Real-time nursery safety overview & system status</p>
        </div>
        <div className="flex items-center gap-2 bg-soft-sand px-3.5 py-1.5 rounded-full border border-outline-variant/40 shadow-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? 'bg-primary-container pulse-green' : 'bg-outline'} block`} />
          <span className="font-caption text-xs font-semibold text-on-surface-variant">
            {isMonitoring ? (isDanger ? 'Hazard Detected' : 'Monitoring Active') : 'System Standby'}
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hero Status Card (Spans 8 columns on desktop) */}
        <div className="lg:col-span-8 bg-cream-container border border-outline-variant/40 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-2 font-semibold">
                  Overall Infant Status
                </p>
                <div className="font-headline-md text-2xl md:text-3xl text-on-surface flex flex-wrap items-center gap-3">
                  <span>Infant Status:</span>
                  <span className={`font-bold ${isDanger ? 'text-error' : isMonitoring ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {isDanger ? 'ATTENTION' : isMonitoring ? 'SAFE' : 'STANDBY'}
                  </span>
                  <span className={`material-symbols-outlined rounded-full p-1 text-2xl ${
                    isDanger 
                      ? 'text-error bg-error-container' 
                      : isMonitoring 
                      ? 'text-primary-container pulse-green bg-primary-fixed' 
                      : 'text-outline bg-surface-container'
                  }`}>
                    {isDanger ? 'warning' : isMonitoring ? 'shield' : 'shield_moon'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block font-medium">Inference Engine</span>
                <span className="text-sm font-bold text-primary font-status-display">
                  {modelStatus === 'detecting'
                    ? `COCO-SSD (${inferenceFps || '~11'} FPS)`
                    : modelStatus === 'loading'
                    ? 'Loading Model...'
                    : 'COCO-SSD Ready'}
                </span>
              </div>
              <div className="bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block font-medium">Active Detections</span>
                <span className="text-sm font-bold text-primary font-status-display">
                  {isMonitoring ? `${detections.length} Objects in View` : 'Stream Inactive'}
                </span>
              </div>
              <div className="bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block font-medium">Stream Latency</span>
                <span className="text-sm font-bold text-primary font-status-display">
                  {isMonitoring ? telemetry.streamLatency : '--'}
                </span>
              </div>
            </div>
          </div>

          <p className="font-body-md text-sm text-on-surface-variant mt-6 z-10">
            Hardware: <span className="font-semibold text-on-surface">{isMonitoring ? cameraLabel : 'Computer Webcam'}</span>
          </p>

          {/* Abstract visual placeholder for safety tech aesthetic */}
          <div
            className="absolute inset-0 z-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at right bottom, #aeedfa 0%, transparent 70%)' }}
          />
        </div>

        {/* Side Panel: Connection & Actions (Spans 4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Connection Status Card */}
          <div className="bg-cream-container border border-outline-variant/40 rounded-2xl p-6 shadow-sm">
            <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-4 font-semibold">
              System Connectivity
            </h4>
            <div className="flex items-center justify-between mb-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">videocam</span>
                <span className="font-body-md text-sm font-medium text-on-surface">Webcam</span>
              </div>
              <span className={`font-caption text-xs px-2.5 py-1 rounded-full font-semibold ${
                isMonitoring ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {isMonitoring ? 'Connected (Live)' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">psychology</span>
                <span className="font-body-md text-sm font-medium text-on-surface">CV Model</span>
              </div>
              <span className={`font-caption text-xs px-2.5 py-1 rounded-full font-semibold ${
                modelStatus === 'detecting'
                  ? 'bg-primary-fixed text-on-primary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {modelStatus === 'detecting' ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 flex-grow">
            <button
              type="button"
              onClick={() => setCurrentScreen('live-monitor')}
              className="bg-primary text-on-primary rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm active:scale-98"
            >
              <span className="material-symbols-outlined text-2xl">live_tv</span>
              <span className="font-label-sm text-sm font-semibold">Live Monitor</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('settings')}
              className="bg-cream-container border border-outline-variant/50 text-primary rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-all shadow-sm active:scale-98"
            >
              <span className="material-symbols-outlined text-2xl">tune</span>
              <span className="font-label-sm text-sm font-semibold">Safety Settings</span>
            </button>
          </div>
        </div>

        {/* Nursery Insights */}
        <div className="lg:col-span-12">
          <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-semibold">
            Nursery Insights
          </h4>
          <div className="bg-peach-accent/80 border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-5 relative overflow-hidden">
            <div className="bg-secondary-fixed p-3.5 rounded-full text-on-secondary-fixed z-10 shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">shield_with_heart</span>
            </div>
            <div className="z-10">
              <h5 className="font-headline-md text-lg font-bold text-on-secondary-container mb-1">
                Webcam Video Stream Architecture
              </h5>
              <p className="font-body-md text-sm text-on-secondary-container/90 leading-relaxed">
                Video is captured directly through your browser via the local MediaDevices pipeline without being sent to external cloud servers, ensuring total nursery privacy.
              </p>
            </div>
          </div>
        </div>

        {/* AI Detection Systems (3 Columns) */}
        <div className="lg:col-span-12">
          <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-semibold">
            Computer Vision Pipeline Status
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Sharp Object */}
            <div className="bg-cream-container border border-outline-variant/40 rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:border-primary/40 transition-colors">
              <div className="bg-surface-container-low p-3 rounded-xl text-primary shrink-0">
                <span className="material-symbols-outlined">content_cut</span>
              </div>
              <div>
                <h5 className="font-label-sm text-sm text-on-surface font-bold mb-1">Sharp Object Classification</h5>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary block" />
                  <span className="font-caption text-xs text-primary font-semibold">COCO-SSD Active</span>
                </div>
                <p className="font-body-md text-xs text-on-surface-variant font-medium">Detects knives & scissors with hazard highlighting</p>
              </div>
            </div>

            {/* Feature 2: Person Detection */}
            <div className="bg-cream-container border border-outline-variant/40 rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:border-primary/40 transition-colors">
              <div className="bg-surface-container-low p-3 rounded-xl text-primary shrink-0">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div>
                <h5 className="font-label-sm text-sm text-on-surface font-bold mb-1">Person Detection</h5>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary block" />
                  <span className="font-caption text-xs text-primary font-semibold">COCO-SSD Active</span>
                </div>
                <p className="font-body-md text-xs text-on-surface-variant font-medium">Real-time person tracking with live bounding coordinates</p>
              </div>
            </div>

            {/* Feature 3: Local Hardware Acceleration */}
            <div className="bg-cream-container border border-outline-variant/40 rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:border-primary/40 transition-colors">
              <div className="bg-surface-container-low p-3 rounded-xl text-primary shrink-0">
                <span className="material-symbols-outlined">speed</span>
              </div>
              <div>
                <h5 className="font-label-sm text-sm text-on-surface font-bold mb-1">WebGL / WASM Engine</h5>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary block" />
                  <span className="font-caption text-xs text-primary font-semibold">In-Browser Acceleration</span>
                </div>
                <p className="font-body-md text-xs text-on-surface-variant font-medium">Zero server latency, zero cloud streaming</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="lg:col-span-12">
          <div className="bg-cream-container border border-outline-variant/40 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-surface-container-low p-2 rounded-full border border-outline-variant/30 text-primary">
                <span className="material-symbols-outlined text-lg">check_circle</span>
              </div>
              <p className="font-body-md text-sm text-on-surface-variant">System initialized and ready for Live Monitor webcam streaming.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentScreen('alert-history')}
              className="font-label-sm text-sm text-primary hover:underline font-semibold"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
