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
    trackedAnimals,
    safetyContext,
    modelStatus, 
    inferenceFps, 
    confidenceThreshold, 
    setConfidenceThreshold, 
    tiledInferenceEnabled,
    setTiledInferenceEnabled,
    sharpObjectMetadata, 
    snakeDetectorMetadata,
    diagnostics, 
    startDetection, 
    stopDetection, 
    testImageElement 
  } = objectDetection;

  const [sharpModalOpen, setSharpModalOpen] = useState(false);
  const [devDiagnosticsOpen, setDevDiagnosticsOpen] = useState(true);
  const [isCapturingDiag, setIsCapturingDiag] = useState(false);
  const [diagSnapshot, setDiagSnapshot] = useState<typeof diagnostics | null>(null);

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

  const handleCaptureLiveDiagnostics = async () => {
    if (!videoRef.current || !isMonitoring) return;
    setIsCapturingDiag(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const res = await testImageElement(canvas);
        if (res) setDiagSnapshot(res);
      }
    } finally {
      setIsCapturingDiag(false);
    }
  };

  const handleTestImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCapturingDiag(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          const res = await testImageElement(img);
          if (res) setDiagSnapshot(res);
        } finally {
          setIsCapturingDiag(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const displayDiag = diagSnapshot || diagnostics;

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
          {/* Safety Context State Live Banner */}
          {isMonitoring && (
            <div
              className={`p-3 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
                safetyContext.overallState === 'DANGER'
                  ? 'bg-error-container/90 border-error text-on-error-container animate-pulse'
                  : safetyContext.overallState === 'ATTENTION'
                  ? 'bg-[#fef3c7] border-[#d97706] text-[#92400e]'
                  : 'bg-primary-fixed/40 border-primary/30 text-on-primary-fixed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  safetyContext.overallState === 'DANGER'
                    ? 'bg-error text-on-error'
                    : safetyContext.overallState === 'ATTENTION'
                    ? 'bg-[#d97706] text-white'
                    : 'bg-primary text-on-primary'
                }`}>
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {safetyContext.overallState === 'DANGER' ? 'emergency' : safetyContext.overallState === 'ATTENTION' ? 'warning' : 'verified_user'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline-md text-xs sm:text-sm font-bold uppercase tracking-wider">
                      {safetyContext.overallState}
                    </span>
                    <span className="text-xs opacity-60">•</span>
                    <span className="font-label-sm text-xs sm:text-sm font-bold">
                      {safetyContext.statusHeadline}
                    </span>
                  </div>
                  <p className="font-body-md text-xs opacity-90 mt-0.5">
                    {safetyContext.statusDescription}
                  </p>
                </div>
              </div>

              {safetyContext.toddlerDetected && (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-surface/80 backdrop-blur-xs rounded-full border border-outline-variant/30 text-xs font-semibold shrink-0">
                  <span className="material-symbols-outlined text-sm text-primary">child_care</span>
                  <span>Toddler Calibrated</span>
                </div>
              )}
            </div>
          )}

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
                  const isAnimal = det.isAnimal;
                  const isPerson = det.className === 'person';
                  const idState = det.identity?.identityState;

                  // Determine box border styling based on exact specifications
                  let borderClass = 'border-[#3f484a] bg-black/10';
                  let badgeBgClass = 'bg-[#3f484a] text-white';
                  let icon = 'category';

                  if (isHazard) {
                    borderClass = 'border-[#ba1a1a] shadow-[0_0_16px_rgba(186,26,26,0.55)] bg-[#ba1a1a]/10';
                    badgeBgClass = 'bg-[#ba1a1a] text-white';
                    icon = 'warning';
                  } else if (isAnimal) {
                    borderClass = det.inProximityAttention 
                      ? 'border-[#d97706] shadow-[0_0_16px_rgba(217,119,6,0.45)] bg-[#d97706]/15'
                      : 'border-[#b7791f] shadow-sm bg-[#b7791f]/10';
                    badgeBgClass = 'bg-[#b7791f] text-white';
                    icon = 'pets';
                  } else if (isPerson) {
                    const idState = det.identity?.identityState;

                    if (idState === 'TODDLER') {
                      borderClass = 'border-primary shadow-[0_0_18px_rgba(3,83,94,0.6)] bg-primary/15';
                      badgeBgClass = 'bg-primary text-on-primary';
                      icon = 'child_care';
                    } else if (idState === 'RECOGNISED') {
                      borderClass = 'border-[#2a6b77] shadow-[0_0_14px_rgba(42,107,119,0.5)] bg-[#2a6b77]/15';
                      badgeBgClass = 'bg-[#2a6b77] text-white';
                      icon = 'verified_user';
                    } else if (idState === 'UNRECOGNISED') {
                      if (det.inProximityDanger) {
                        borderClass = 'border-[#ba1a1a] shadow-[0_0_18px_rgba(186,26,26,0.6)] bg-[#ba1a1a]/15 animate-pulse';
                        badgeBgClass = 'bg-[#ba1a1a] text-white';
                        icon = 'person_alert';
                      } else if (det.inProximityAttention) {
                        borderClass = 'border-[#d97706] shadow-[0_0_14px_rgba(217,119,6,0.5)] bg-[#d97706]/15';
                        badgeBgClass = 'bg-[#d97706] text-white';
                        icon = 'person';
                      } else {
                        borderClass = 'border-[#526063] shadow-xs bg-black/10';
                        badgeBgClass = 'bg-[#526063] text-white';
                        icon = 'person_outline';
                      }
                    } else {
                      // UNCONFIRMED or UNKNOWN (Low quality / no face match attempted)
                      borderClass = 'border-outline-variant/80 border-dashed bg-black/5';
                      badgeBgClass = 'bg-surface-container-high text-outline';
                      icon = 'help_outline';
                    }
                  }

                  return (
                    <div
                      key={det.trackingId}
                      className={`absolute border-2 rounded-lg pointer-events-none transition-all duration-75 ease-out z-20 ${borderClass}`}
                      style={{
                        top: `${det.box.top}%`,
                        left: `${det.box.left}%`,
                        width: `${det.box.width}%`,
                        height: `${det.box.height}%`
                      }}
                    >
                      {/* Top Label Pill with Stable Tracking ID & Smoothed Confidence */}
                      <div
                        className={`absolute -top-7 left-[-2px] font-label-sm text-xs px-2.5 py-0.5 rounded-t-md flex items-center gap-1.5 font-bold shadow-xs whitespace-nowrap ${badgeBgClass}`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {icon}
                        </span>
                        <span>
                          {det.displayName} ({det.confidencePct}%)
                        </span>
                      </div>

                      {/* Corner Accent Brackets */}
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-inherit" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-inherit" />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-inherit" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-inherit" />
                    </div>
                  );
                })}

                {/* Bottom Stream Telemetry Scrim */}
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-inverse-surface/95 via-inverse-surface/60 to-transparent flex items-end p-4 rounded-b-2xl z-20">
                  <div className="flex gap-6 sm:gap-10 w-full text-white">
                    <div className="flex flex-col">
                      <span className="font-caption text-[11px] text-outline-variant font-medium">Safety Engine</span>
                      <span className="font-status-display text-xs sm:text-sm font-bold text-primary-fixed">
                        {safetyContext.overallState} • {safetyContext.activeRuleCase}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-caption text-[11px] text-outline-variant font-medium">Tracked Objects</span>
                      <span className="font-status-display text-xs sm:text-sm font-bold text-white">
                        {trackedPersons.length} Person(s) • {trackedAnimals.length} Animal(s) • {sharpObjectDetections.length} Hazard(s)
                      </span>
                    </div>

                    <div className="flex flex-col ml-auto text-right">
                      <span className="font-caption text-[11px] text-outline-variant font-medium">Vision Strategy</span>
                      <span className="font-label-sm text-xs font-semibold text-secondary-container">
                        {tiledInferenceEnabled ? '2×2 Tiled High-Res + Face ID' : 'Full Frame Only'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Horizontal Environmental Data Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

      {/* ================= DEVELOPER CV DIAGNOSTICS INSTRUMENTATION ================= */}
      <div className="bg-cream-container border border-primary/40 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">developer_mode</span>
            <div>
              <h3 className="font-headline-md text-base font-bold text-primary">
                Developer CV Pipeline Diagnostics
              </h3>
              <p className="font-caption text-xs text-on-surface-variant">
                Live inspection of RAW Model Output vs. Sharp Filter vs. Multi-Object Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tiled Small-Object Mode Toggle */}
            <button
              type="button"
              onClick={() => setTiledInferenceEnabled(!tiledInferenceEnabled)}
              className={`px-3 py-1.5 font-label-sm text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                tiledInferenceEnabled
                  ? 'bg-primary-fixed text-on-primary-fixed border border-primary/30'
                  : 'bg-surface-container border border-outline-variant text-on-surface-variant'
              }`}
              title="Toggle 2x2 Tiled High-Resolution Slicing for Small & Distant Objects"
            >
              <span className="material-symbols-outlined text-[16px]">
                {tiledInferenceEnabled ? 'grid_view' : 'crop_free'}
              </span>
              <span>{tiledInferenceEnabled ? 'Tiled Slicing: ON' : 'Tiled Slicing: OFF'}</span>
            </button>

            {isMonitoring && (
              <button
                type="button"
                onClick={handleCaptureLiveDiagnostics}
                disabled={isCapturingDiag}
                className="px-3 py-1.5 bg-primary text-on-primary font-label-sm text-xs font-semibold rounded-xl hover:bg-primary-container transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>{isCapturingDiag ? 'Inspecting Frame...' : 'Capture Snapshot'}</span>
              </button>
            )}

            <label className="px-3 py-1.5 bg-surface-container border border-outline-variant text-on-surface font-label-sm text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Test Image File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleTestImageUpload}
                className="hidden"
              />
            </label>

            {diagSnapshot && (
              <button
                type="button"
                onClick={() => setDiagSnapshot(null)}
                className="px-2.5 py-1.5 text-xs text-primary font-bold hover:underline"
              >
                Resume Live Stream Diag
              </button>
            )}

            <button
              type="button"
              onClick={() => setDevDiagnosticsOpen(prev => !prev)}
              className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg"
              title={devDiagnosticsOpen ? 'Collapse Diagnostics' : 'Expand Diagnostics'}
            >
              <span className="material-symbols-outlined text-lg">
                {devDiagnosticsOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {devDiagnosticsOpen && (
          <div className="space-y-4 text-xs animate-fade-in">
            {/* Metadata Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 font-mono text-[11px]">
              <div>
                <span className="text-on-surface-variant block">DETECTOR MODEL:</span>
                <span className="font-bold text-primary">COCO-SSD + Local Face ID</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">CAMERA RESOLUTION:</span>
                <span className="font-bold text-on-surface">
                  {displayDiag.videoDimensions.width > 0
                    ? `${displayDiag.videoDimensions.width} × ${displayDiag.videoDimensions.height}`
                    : isMonitoring && videoRef.current && videoRef.current.videoWidth > 0
                    ? `${videoRef.current.videoWidth} × ${videoRef.current.videoHeight}`
                    : 'Stream Inactive'}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">DETECTION STRATEGY:</span>
                <span className="font-bold text-primary">
                  {tiledInferenceEnabled ? '2×2 Tiled High-Res + Face NMS' : 'Full Frame Only'}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">THRESHOLDS:</span>
                <span className="font-bold text-primary">
                  Sharp: 25% | Animal: 35% | Gen: {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">FPS / LATENCY:</span>
                <span className="font-bold text-primary">
                  {inferenceFps || '~11'} FPS ({displayDiag.inferenceLatencyMs || 0}ms)
                </span>
              </div>
            </div>

            {/* Safety & Identity Diagnostics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-cream-container p-3 rounded-xl border border-primary/20 font-mono text-[11px]">
              <div>
                <span className="text-on-surface-variant block">SAFETY ENGINE STATE:</span>
                <span className={`font-bold ${
                  displayDiag.safetyState === 'DANGER' ? 'text-error' : displayDiag.safetyState === 'ATTENTION' ? 'text-[#d97706]' : 'text-primary'
                }`}>
                  {displayDiag.safetyState}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">TODDLER & PERSONS:</span>
                <span className="font-bold text-on-surface">
                  {displayDiag.toddlerDetected ? 'Toddler: ACTIVE' : 'Toddler: NONE'} • {displayDiag.personsCount} Person(s)
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">RECOGNISED / STRANGER:</span>
                <span className="font-bold text-on-surface">
                  {displayDiag.recognisedPersonsCount} Recognised • {displayDiag.unrecognisedPersonsCount} Unrecognised
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">ANIMALS & PROXIMITY:</span>
                <span className="font-bold text-on-surface">
                  {displayDiag.animalsCount} Animal(s) • {displayDiag.toddlerPersonProximity !== 'N/A' ? displayDiag.toddlerPersonProximity : 'Proximity Clear'}
                </span>
              </div>
            </div>

            {/* 3 Pipeline Comparison Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: RAW MODEL DETECTIONS */}
              <div className="bg-surface rounded-xl border border-outline-variant/50 p-3.5 space-y-2 flex flex-col">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">blur_on</span>
                    <span className="font-bold font-label-sm text-xs text-on-surface">1. RAW DETECTIONS (NMS MERGED)</span>
                  </div>
                  <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    {displayDiag.rawPredictions.length} boxes
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  {tiledInferenceEnabled 
                    ? `Processed ${displayDiag.tilesProcessed} high-res tiles + global frame:` 
                    : 'Direct full-frame model output:'}
                </p>

                <div className="flex-1 overflow-y-auto custom-scroll max-h-[220px] space-y-1.5 pr-1">
                  {displayDiag.rawPredictions.length > 0 ? (
                    displayDiag.rawPredictions.map((pred, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-[11px] font-mono ${
                          pred.isSharpHazard
                            ? 'bg-error-container/60 border-error/50 text-on-error-container'
                            : pred.passedThreshold
                            ? 'bg-primary-fixed/30 border-primary/30 text-on-primary-fixed'
                            : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="capitalize">{pred.className}</span>
                          <span>{pred.confidencePct}% ({pred.confidence.toFixed(3)})</span>
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5 truncate">
                          bbox: [x:{Math.round(pred.bboxPixels[0])}, y:{Math.round(pred.bboxPixels[1])}, w:{Math.round(pred.bboxPixels[2])}, h:{Math.round(pred.bboxPixels[3])}]
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[9px]">
                          <span>{pred.isSharpHazard ? '⚠️ SHARP HAZARD' : 'Standard Class'}</span>
                          <span className={pred.passedThreshold ? 'text-primary font-bold' : 'text-outline'}>
                            {pred.passedThreshold ? '✓ Passed MinScore' : '✗ Below Threshold'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-outline text-[11px]">
                      {isMonitoring ? 'No candidates returned by COCO-SSD (even at score ≥ 0.01)' : 'Start camera or upload test image to inspect'}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: AFTER SHARP-OBJECT FILTER */}
              <div className="bg-surface rounded-xl border border-outline-variant/50 p-3.5 space-y-2 flex flex-col">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#894f3f] text-base">filter_alt</span>
                    <span className="font-bold font-label-sm text-xs text-on-surface">2. SHARP-OBJECT FILTER</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    displayDiag.rawSharpDetections.length > 0 ? 'bg-error text-on-error' : 'bg-surface-container'
                  }`}>
                    {displayDiag.rawSharpDetections.length} sharp hazard(s)
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  Matches model predictions against ['knife', 'scissors']:
                </p>

                <div className="flex-1 overflow-y-auto custom-scroll max-h-[220px] space-y-1.5 pr-1">
                  {displayDiag.rawSharpDetections.length > 0 ? (
                    displayDiag.rawSharpDetections.map((pred, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg border bg-error-container border-error text-on-error-container text-[11px] font-mono"
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="uppercase">{pred.className}</span>
                          <span>{pred.confidencePct}% ({pred.confidence.toFixed(3)})</span>
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          bbox: [x:{Math.round(pred.bboxPixels[0])}, y:{Math.round(pred.bboxPixels[1])}, w:{Math.round(pred.bboxPixels[2])}, h:{Math.round(pred.bboxPixels[3])}]
                        </div>
                        <div className="mt-1 text-[9px] font-bold">
                          {pred.passedThreshold ? '✓ Above Threshold → Sent to Tracker' : `✗ Below Threshold (${Math.round(confidenceThreshold * 85)}% required)`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-outline text-[11px]">
                      0 sharp hazards detected by model in current frame.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: AFTER TRACKER */}
              <div className="bg-surface rounded-xl border border-outline-variant/50 p-3.5 space-y-2 flex flex-col">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">track_changes</span>
                    <span className="font-bold font-label-sm text-xs text-on-surface">3. AFTER TRACKER</span>
                  </div>
                  <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    {displayDiag.afterTracker.length} tracked
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  Active objects with IoU tracking & EMA smoothed confidence:
                </p>

                <div className="flex-1 overflow-y-auto custom-scroll max-h-[220px] space-y-1.5 pr-1">
                  {displayDiag.afterTracker.length > 0 ? (
                    displayDiag.afterTracker.map(track => (
                      <div
                        key={track.trackingId}
                        className={`p-2 rounded-lg border text-[11px] font-mono ${
                          track.isSharpHazard
                            ? 'bg-error-container border-error text-on-error-container'
                            : 'bg-primary-fixed/30 border-primary/30 text-on-primary-fixed'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span>{track.displayName}</span>
                          <span>{track.confidencePct}% (Smoothed)</span>
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          Tracking ID: {track.trackingId} | Missed: {track.missedFrames}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-outline text-[11px]">
                      0 objects active in tracker meeting {Math.round(confidenceThreshold * 100)}% threshold.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Per-Person Identity & Face Quality Gate Diagnostics (Safety-Critical Telemetry) */}
            <div className="bg-surface rounded-xl border border-outline-variant/50 p-3.5 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">face</span>
                  <span className="font-bold font-label-sm text-xs text-on-surface">
                    4. PERSON IDENTITY STATE MACHINE & QUALITY GATE (FAIL-CLOSED)
                  </span>
                </div>
                <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  {displayDiag.personDiagnostics.length} Person Track(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="py-1.5 px-1.5 font-semibold">Track ID</th>
                      <th className="py-1.5 px-1.5 font-semibold">Person Conf</th>
                      <th className="py-1.5 px-1.5 font-semibold">Face Detected</th>
                      <th className="py-1.5 px-1.5 font-semibold">Face Conf</th>
                      <th className="py-1.5 px-1.5 font-semibold">Face Dimensions</th>
                      <th className="py-1.5 px-1.5 font-semibold">Face Quality</th>
                      <th className="py-1.5 px-1.5 font-semibold">Embedding</th>
                      <th className="py-1.5 px-1.5 font-semibold">Best Candidate</th>
                      <th className="py-1.5 px-1.5 font-semibold">Similarity / Req</th>
                      <th className="py-1.5 px-1.5 font-semibold">Temporal Count</th>
                      <th className="py-1.5 px-1.5 font-semibold">Final Identity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {displayDiag.personDiagnostics.length > 0 ? (
                      displayDiag.personDiagnostics.map((p, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/50">
                          <td className="py-1.5 px-1.5 font-bold text-primary">{p.trackingId}</td>
                          <td className="py-1.5 px-1.5">{Math.round(p.personConfidence * 100)}%</td>
                          <td className="py-1.5 px-1.5">
                            <span className={p.faceDetected ? 'text-[#15803d] font-bold' : 'text-outline'}>
                              {p.faceDetected ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5">{p.faceConfidence > 0 ? `${Math.round(p.faceConfidence * 100)}%` : 'N/A'}</td>
                          <td className="py-1.5 px-1.5">{p.faceDimensions}</td>
                          <td className="py-1.5 px-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              p.faceQuality === 'PASS' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-surface-container text-outline'
                            }`}>
                              {p.faceQuality}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5">
                            <span className={p.embeddingGenerated ? 'text-[#15803d] font-bold' : 'text-outline'}>
                              {p.embeddingGenerated ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5 font-semibold">{p.bestIdentityCandidate}</td>
                          <td className="py-1.5 px-1.5">
                            <span className={p.identitySimilarity >= p.recognitionThreshold ? 'text-[#15803d] font-bold' : 'text-on-surface-variant'}>
                              {p.identitySimilarity.toFixed(3)} / {p.recognitionThreshold.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5">{p.temporalConfirmationCount} / 3</td>
                          <td className="py-1.5 px-1.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              p.finalIdentityState === 'TODDLER'
                                ? 'bg-primary text-on-primary'
                                : p.finalIdentityState === 'RECOGNISED'
                                ? 'bg-[#2a6b77] text-white'
                                : p.finalIdentityState === 'UNRECOGNISED'
                                ? 'bg-[#526063] text-white'
                                : 'bg-surface-container-high text-outline'
                            }`}>
                              {p.finalIdentityState}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="py-3 text-center text-outline text-[11px]">
                          0 person tracks currently in frame.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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
                <h4 className="font-bold text-sm text-primary mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">pest_control</span>
                  <span>Snake & Reptile Detector ({snakeDetectorMetadata.version})</span>
                </h4>
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-on-surface">Dataset & Engine:</span>
                    <span className="font-mono text-primary font-bold">{snakeDetectorMetadata.dataset}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {snakeDetectorMetadata.supportedClasses.map(cls => (
                      <span key={cls} className="px-2 py-0.5 bg-[#b7791f]/20 text-[#b7791f] rounded text-[10px] font-semibold">
                        {cls}
                      </span>
                    ))}
                  </div>
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
                <strong>Accuracy Note:</strong> Snake detection uses a dedicated MobileNet-v2 ImageNet-1k Serpentes classifier with strict non-snake exclusion (ropes, cables, belts are filtered).
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
