import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

export const LiveMonitorScreen: React.FC = () => {
  const { 
    camera, 
    objectDetection,
    eventLogs, 
    setExportModalOpen, 
    telemetry
  } = useApp();

  const { videoRef, cameraStatus, startCamera, stopCamera, error: cameraError, cameraLabel, isMonitoring } = camera;
  const { 
    detections, 
    trackedPersons,
    sharpObjectDetections,
    modelStatus, 
    inferenceFps, 
    confidenceThreshold, 
    setConfidenceThreshold,
    sharpObjectMetadata,
    startDetection, 
    stopDetection 
  } = objectDetection;

  const [sharpModalOpen, setSharpModalOpen] = useState(false);

  // Track if we started detection for current stream
  const hasStartedDetectionRef = useRef(false);

  // Automatically start object detection when camera becomes connected & video element is mounted
  useEffect(() => {
    if (isMonitoring && videoRef.current && !hasStartedDetectionRef.current) {
      hasStartedDetectionRef.current = true;
      startDetection(videoRef.current);
    } else if (!isMonitoring) {
      hasStartedDetectionRef.current = false;
      stopDetection();
    }
  }, [isMonitoring, videoRef, startDetection, stopDetection]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopDetection();
      stopCamera();
    };
  }, [stopDetection, stopCamera]);

  const handleStartMonitoring = async () => {
    const success = await startCamera();
    if (success && videoRef.current) {
      startDetection(videoRef.current);
    }
  };

  const handleStopMonitoring = () => {
    stopDetection();
    stopCamera();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">Live Monitor</h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Real-time local computer vision with stabilized tracking & sharp object classification.
          </p>
        </div>

        {/* Status Indicators Pill */}
        <div className="flex items-center gap-2">
          {/* AI Model Status Badge */}
          <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/40 shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                modelStatus === 'detecting'
                  ? 'bg-primary pulse-green'
                  : modelStatus === 'loading'
                  ? 'bg-[#f59e0b] animate-pulse'
                  : modelStatus === 'error'
                  ? 'bg-error'
                  : 'bg-outline'
              }`}
            />
            <span className="font-caption text-xs font-semibold text-on-surface">
              {modelStatus === 'detecting'
                ? `AI Tracking (${inferenceFps || '~11'} FPS)`
                : modelStatus === 'loading'
                ? 'Model Loading...'
                : modelStatus === 'error'
                ? 'AI Error'
                : 'AI Ready'}
            </span>
          </div>

          {/* Camera Status Badge */}
          <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/40 shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-primary-container pulse-green' : 'bg-outline'} block`} />
            <span className="font-caption text-xs font-semibold text-on-surface">
              {isMonitoring ? 'Camera Connected' : 'Camera Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Camera Feed (8 Columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Video Player & Detection Canvas Container */}
          <div className="relative w-full aspect-video bg-inverse-surface rounded-2xl overflow-hidden border border-outline-variant shadow-md shadow-primary/5 group select-none flex items-center justify-center">
            {/* HTML5 Real Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                isMonitoring ? 'opacity-100' : 'hidden'
              }`}
            />

            {/* Requesting Permission State */}
            {cameraStatus === 'requesting' && (
              <div className="absolute inset-0 bg-inverse-surface/95 flex flex-col items-center justify-center p-6 text-center text-white z-30 animate-fade-in">
                <div className="w-12 h-12 border-3 border-primary-fixed border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold mb-1">Requesting Camera Permission</h3>
                <p className="text-xs text-white/70 max-w-sm">
                  Please click <strong>"Allow"</strong> on your browser's camera permission prompt to connect your nursery webcam.
                </p>
              </div>
            )}

            {/* Permission Denied Error State */}
            {cameraStatus === 'permission_denied' && (
              <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center p-6 text-center text-on-surface z-30 animate-fade-in">
                <div className="w-14 h-14 bg-error-container text-on-error-container rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                  <span className="material-symbols-outlined text-3xl text-error">videocam_off</span>
                </div>
                <h3 className="text-lg font-bold text-error mb-1.5 font-headline-md">Camera Access Denied</h3>
                <p className="text-xs text-on-surface-variant max-w-md mb-4 leading-relaxed">
                  {cameraError?.message || 'Camera access was denied. Please allow camera permission in your browser settings.'}
                </p>
                <button
                  type="button"
                  onClick={handleStartMonitoring}
                  className="px-5 py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary-container transition-all shadow-sm active:scale-98"
                >
                  Retry Camera Access
                </button>
              </div>
            )}

            {/* Unavailable / Device Not Found Error State */}
            {cameraStatus === 'unavailable' && (
              <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center p-6 text-center text-on-surface z-30 animate-fade-in">
                <div className="w-14 h-14 bg-surface-container text-on-surface rounded-2xl flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-3xl text-primary">no_photography</span>
                </div>
                <h3 className="text-lg font-bold mb-1.5 font-headline-md">Webcam Unavailable</h3>
                <p className="text-xs text-on-surface-variant max-w-md mb-4 leading-relaxed">
                  {cameraError?.message || 'No camera device found on this computer. Please connect a webcam.'}
                </p>
                <button
                  type="button"
                  onClick={handleStartMonitoring}
                  className="px-5 py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary-container transition-all shadow-sm active:scale-98"
                >
                  Check Again
                </button>
              </div>
            )}

            {/* Standby / Idle State */}
            {cameraStatus === 'idle' && (
              <div className="absolute inset-0 bg-gradient-to-b from-inverse-surface to-[#1e2022] flex flex-col items-center justify-center p-6 text-center text-white z-20 select-none">
                <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center mb-4 border border-white/10 shadow-lg">
                  <span className="material-symbols-outlined text-4xl text-primary-fixed">videocam</span>
                </div>
                <h3 className="text-xl font-bold font-headline-md mb-1 text-white">Nursery Live Feed Standby</h3>
                <p className="text-xs text-white/70 max-w-sm mb-6 leading-relaxed">
                  Click "Start Monitoring" to activate stabilized object tracking and sharp item detection.
                </p>
                <button
                  type="button"
                  onClick={handleStartMonitoring}
                  className="px-6 py-3 bg-primary text-on-primary font-label-sm text-sm font-bold rounded-xl hover:bg-primary-container transition-all shadow-md active:scale-98 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">play_circle</span>
                  <span>Start Monitoring</span>
                </button>
              </div>
            )}

            {/* Active Live & AI Overlays */}
            {isMonitoring && (
              <>
                {/* Top Left: Live Status Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-inverse-surface/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/30 shadow-sm z-20">
                  <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                  <span className="font-label-sm text-xs text-white tracking-wider uppercase font-semibold">
                    Live Stream
                  </span>
                </div>

                {/* Top Right: Camera Identifier & Inference Rate */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                  <div className="bg-inverse-surface/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/30 text-white text-xs shadow-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary-fixed">psychology</span>
                    <span className="font-caption font-bold text-primary-fixed">
                      {inferenceFps ? `${inferenceFps} FPS (Smoothed)` : 'Tracking'}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 bg-inverse-surface/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/30 text-white/90 text-xs shadow-sm max-w-[180px] truncate">
                    <span className="material-symbols-outlined text-[15px] shrink-0">videocam</span>
                    <span className="font-caption font-medium truncate">{cameraLabel}</span>
                  </div>
                </div>

                {/* Reference Safe Zone Perimeter Guideline */}
                <div className="absolute inset-8 border border-primary/30 bg-primary/5 rounded-2xl pointer-events-none flex flex-col justify-end p-3 z-10">
                  <span className="font-caption text-[10px] text-primary font-bold bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded w-fit shadow-xs">
                    Safe Zone Calibrated
                  </span>
                </div>

                {/* ================= SMOOTHED TRACKED BOUNDING BOXES ================= */}
                {detections.map(det => {
                  const isHazard = det.isSharpHazard;
                  return (
                    <div
                      key={det.trackingId}
                      className={`absolute border-2 rounded-lg pointer-events-none transition-all duration-75 ease-out z-20 ${
                        isHazard
                          ? 'border-[#ba1a1a] shadow-[0_0_16px_rgba(186,26,26,0.55)] bg-[#ba1a1a]/10'
                          : det.className === 'person'
                          ? 'border-primary shadow-[0_0_16px_rgba(3,83,94,0.45)] bg-primary/10'
                          : 'border-[#3f484a] shadow-sm bg-black/10'
                      }`}
                      style={{
                        top: `${det.box.top}%`,
                        left: `${det.box.left}%`,
                        width: `${det.box.width}%`,
                        height: `${det.box.height}%`
                      }}
                    >
                      {/* Top Label Pill with Stable Tracking ID & Smoothed Confidence */}
                      <div
                        className={`absolute -top-7 left-[-2px] font-label-sm text-xs px-2.5 py-0.5 rounded-t-md flex items-center gap-1.5 font-bold shadow-xs whitespace-nowrap ${
                          isHazard
                            ? 'bg-[#ba1a1a] text-white'
                            : det.className === 'person'
                            ? 'bg-primary text-on-primary'
                            : 'bg-[#3f484a] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {isHazard ? 'warning' : det.className === 'person' ? 'person' : 'category'}
                        </span>
                        <span>
                          {det.displayName} ({det.confidencePct}%)
                        </span>
                      </div>

                      {/* Corner Accent Brackets */}
                      <div
                        className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${
                          isHazard ? 'border-[#ba1a1a]' : det.className === 'person' ? 'border-primary' : 'border-[#3f484a]'
                        }`}
                      />
                      <div
                        className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 ${
                          isHazard ? 'border-[#ba1a1a]' : det.className === 'person' ? 'border-primary' : 'border-[#3f484a]'
                        }`}
                      />
                      <div
                        className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 ${
                          isHazard ? 'border-[#ba1a1a]' : det.className === 'person' ? 'border-primary' : 'border-[#3f484a]'
                        }`}
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${
                          isHazard ? 'border-[#ba1a1a]' : det.className === 'person' ? 'border-primary' : 'border-[#3f484a]'
                        }`}
                      />
                    </div>
                  );
                })}

                {/* Bottom Stream Telemetry Scrim */}
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-inverse-surface/95 via-inverse-surface/60 to-transparent flex items-end p-4 rounded-b-2xl z-20">
                  <div className="flex gap-6 sm:gap-10 w-full text-white">
                    <div className="flex flex-col">
                      <span className="font-caption text-[11px] text-outline-variant font-medium">Tracking Pipeline</span>
                      <span className="font-status-display text-xs sm:text-sm font-bold text-primary-fixed">
                        IoU Tracker + EMA (α=0.30)
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-caption text-[11px] text-outline-variant font-medium">Tracked Objects</span>
                      <span className="font-status-display text-xs sm:text-sm font-bold text-white">
                        {trackedPersons.length} Person(s) • {sharpObjectDetections.length} Sharp Hazard(s)
                      </span>
                    </div>

                    <div className="flex flex-col ml-auto text-right">
                      <span className="font-caption text-[11px] text-outline-variant font-medium">Sharp Model</span>
                      <span className="font-label-sm text-xs font-semibold text-secondary-container">
                        Knife & Scissors Active
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Horizontal Environmental Data Strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-surface transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-nurturing-teal-dim text-2xl">person</span>
                <span className="font-label-sm text-xs sm:text-sm font-semibold text-on-surface">Tracked People</span>
              </div>
              <span className="bg-primary-fixed text-on-primary-fixed font-caption text-xs font-bold px-2.5 py-1 rounded-full">
                {trackedPersons.length} Active
              </span>
            </div>

            <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-surface transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-nurturing-teal-dim text-2xl">tune</span>
                <span className="font-label-sm text-xs sm:text-sm font-semibold text-on-surface">Threshold</span>
              </div>
              <span className="font-label-sm text-xs sm:text-sm text-on-surface font-bold">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>

            <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-surface transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-nurturing-teal-dim text-2xl">content_cut</span>
                <span className="font-label-sm text-xs sm:text-sm font-semibold text-on-surface">Sharp Hazards</span>
              </div>
              <span className={`font-caption text-xs font-bold px-2.5 py-1 rounded-full ${
                sharpObjectDetections.length > 0 ? 'bg-error text-on-error' : 'bg-primary-fixed text-on-primary-fixed'
              }`}>
                {sharpObjectDetections.length > 0 ? `${sharpObjectDetections.length} Detected` : '0 Hazards'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Panel (4 Columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Controls & Status Card */}
          <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div>
              <p className="font-caption text-xs text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
                System State
              </p>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-primary animate-pulse' : 'bg-outline'}`} />
                <h2 className="font-headline-md text-lg font-bold text-on-surface">
                  {isMonitoring ? 'Monitoring Active' : 'Not Monitoring'}
                </h2>
              </div>
            </div>

            <div className="flex gap-2">
              {isMonitoring ? (
                <button
                  type="button"
                  onClick={handleStopMonitoring}
                  className="flex-1 bg-error text-on-error font-label-sm text-xs py-2.5 rounded-xl hover:bg-error/90 transition-colors font-bold active:scale-98 shadow-sm"
                >
                  STOP MONITORING
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartMonitoring}
                  disabled={cameraStatus === 'requesting'}
                  className="flex-1 bg-primary text-on-primary font-label-sm text-xs py-2.5 rounded-xl hover:bg-primary-container transition-all shadow-sm font-bold active:scale-98 disabled:opacity-50"
                >
                  START MONITORING
                </button>
              )}
            </div>

            {/* Confidence Threshold Slider */}
            <div className="pt-2 border-t border-outline-variant/30">
              <div className="flex justify-between items-center mb-1 text-xs text-on-surface-variant">
                <span>Detection Sensitivity</span>
                <span className="font-bold text-primary">{Math.round(confidenceThreshold * 100)}% min score</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.85"
                step="0.05"
                value={confidenceThreshold}
                onChange={e => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-surface-variant rounded-2xl appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* ================= MODEL TIERS & CAPABILITY PANEL ================= */}
          <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-label-sm text-sm text-on-surface font-bold">Detection Model Architecture</h3>
              <button
                type="button"
                onClick={() => setSharpModalOpen(true)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View Classes</span>
                <span className="material-symbols-outlined text-[13px]">info</span>
              </button>
            </div>

            {/* Person Detection Status */}
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-body-md text-xs font-semibold text-on-surface">Person Detection</span>
              </div>
              <span className="bg-primary-fixed text-on-primary-fixed font-caption text-[11px] px-2 py-0.5 rounded-full font-bold">
                Active (EMA)
              </span>
            </div>

            {/* Built-in Sharp Object Detection Status */}
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-body-md text-xs font-semibold text-on-surface">Sharp Object Detection</span>
              </div>
              <span className="bg-primary-fixed text-on-primary-fixed font-caption text-[11px] px-2 py-0.5 rounded-full font-bold">
                Knife / Scissors Active
              </span>
            </div>

            {/* Planned Custom Sharp Object Model */}
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="w-2 h-2 rounded-full border border-outline bg-transparent" />
                <span className="font-body-md text-xs text-on-surface-variant">Custom Sharp ONNX Model</span>
              </div>
              <span className="bg-surface-container-high text-on-surface-variant font-caption text-[11px] px-2 py-0.5 rounded-full">
                Not Installed Yet
              </span>
            </div>
          </div>

          {/* ================= REAL-TIME DETECTIONS SUMMARY ================= */}
          <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-label-sm text-sm text-on-surface font-bold">Live Tracked Detections</h3>
              <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
                {detections.length} Tracked
              </span>
            </div>

            {isMonitoring ? (
              detections.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scroll pr-1">
                  {detections.map(det => (
                    <div
                      key={det.trackingId}
                      className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${
                        det.isSharpHazard
                          ? 'bg-error-container/40 border-error/40 text-on-error-container'
                          : det.className === 'person'
                          ? 'bg-primary-fixed/40 border-primary/30 text-on-primary-fixed'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">
                          {det.isSharpHazard ? 'warning' : det.className === 'person' ? 'person' : 'category'}
                        </span>
                        <span className="font-label-sm text-xs font-bold tracking-wide">
                          {det.displayName}
                        </span>
                        {det.isSharpHazard && (
                          <span className="text-[9px] bg-error text-on-error px-1.5 py-0.5 rounded font-bold uppercase">
                            Hazard
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-status-display text-xs font-bold block">
                          {det.confidencePct}%
                        </span>
                        <span className="font-caption text-[10px] opacity-70">
                          (raw: {det.rawConfidencePct}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-center">
                  <span className="material-symbols-outlined text-outline text-2xl mb-1">radar</span>
                  <p className="text-xs text-on-surface-variant">
                    No objects detected above threshold ({Math.round(confidenceThreshold * 100)}%).
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-center">
                <p className="text-xs text-on-surface-variant">
                  Start webcam monitoring to view real-time detections.
                </p>
              </div>
            )}
          </div>

          {/* Live Event Log */}
          <div className="bg-cream-container border border-outline-variant/50 rounded-2xl p-5 shadow-sm flex-1 flex flex-col min-h-[180px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-label-sm text-sm text-on-surface font-bold">Event Log</h3>
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="text-primary font-caption text-xs font-semibold hover:underline"
              >
                Export
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pr-1 flex flex-col gap-2 max-h-[130px]">
              {eventLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 transition-opacity"
                  style={log.opacity ? { opacity: log.opacity } : {}}
                >
                  <span className="font-caption text-xs text-outline font-mono mt-0.5 shrink-0">
                    {log.time}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-label-sm text-xs font-semibold ${log.isHighlighted ? 'text-primary' : 'text-on-surface'}`}>
                      {log.title}
                    </p>
                    {log.description && (
                      <p className="font-caption text-[11px] text-on-surface-variant leading-tight mt-0.5">
                        {log.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sharp Object Capabilities Transparency Modal */}
      {sharpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-3xl border border-outline-variant shadow-2xl max-w-lg w-full p-6 text-on-surface relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-container text-on-primary-container rounded-xl">
                  <span className="material-symbols-outlined text-2xl">content_cut</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline-md text-on-surface">Sharp Object Architecture</h3>
                  <p className="text-xs text-on-surface-variant">Active Model vs Planned Custom Classes</p>
                </div>
              </div>
              <button
                onClick={() => setSharpModalOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-sm text-primary mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Supported by Current Model (COCO-SSD)</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {sharpObjectMetadata.supportedClasses.map(cls => (
                    <div key={cls} className="p-2.5 bg-primary-fixed/30 rounded-xl border border-primary/20 flex items-center gap-2 font-semibold capitalize">
                      <span className="material-symbols-outlined text-primary text-sm">verified</span>
                      <span>{cls}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-on-surface-variant mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-outline">pending</span>
                  <span>Planned Custom ONNX Browser Model</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {sharpObjectMetadata.plannedCustomClasses.map(cls => (
                    <div key={cls} className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center gap-2 text-on-surface-variant capitalize">
                      <span className="material-symbols-outlined text-outline text-sm">radio_button_unchecked</span>
                      <span>{cls}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface-variant leading-relaxed">
                <strong>Accuracy Note:</strong> The current prototype strictly classifies objects verified by the real model predictions. We do not pretend unsupported items are detected.
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSharpModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-sm text-xs font-bold hover:bg-primary-container transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
