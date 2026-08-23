import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENT_BUILTIN_SHARP_CLASSES, PLANNED_CUSTOM_SHARP_CLASSES } from '../services/sharpObjectDetector';
import { faceRecognitionService, TODDLER_RECOGNITION_THRESHOLD, AUTHORIZED_PERSON_RECOGNITION_THRESHOLD } from '../services/faceRecognition';
import { safetyContextEngine } from '../services/safetyContextEngine';
import { EnrolledProfile, EnrolledIdentitySample, FaceQualityReport } from '../types/detection';

export const SafetySettingsScreen: React.FC = () => {
  const { safetySettings, updateSafetySettings, setDefineAreaModalOpen } = useApp();
  
  const [activeTab, setActiveTab] = useState<'detection' | 'people' | 'alerts' | 'general'>('people');
  const [localSettings, setLocalSettings] = useState(safetySettings);
  const [saveToast, setSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Safety configuration saved successfully.');

  // Enrolled Household Identities State (Local-first)
  const [toddlerProfile, setToddlerProfile] = useState<EnrolledProfile | null>(null);
  const [authorisedPeople, setAuthorisedPeople] = useState<EnrolledProfile[]>([]);
  const [proximityRadius, setProximityRadius] = useState<number>(30);

  // Enrollment Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollType, setEnrollType] = useState<'toddler' | 'authorised'>('toddler');
  const [enrollName, setEnrollName] = useState('');
  const [enrollRelationship, setEnrollRelationship] = useState<'Parent' | 'Guardian' | 'Caregiver' | 'Other'>('Parent');
  const [enrollImgSrc, setEnrollImgSrc] = useState<string | null>(null);
  const [isProcessingEnrollment, setIsProcessingEnrollment] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [lastQualityReport, setLastQualityReport] = useState<FaceQualityReport | null>(null);

  // Camera preview ref for live enrollment snap
  const enrollVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraSnapActive, setIsCameraSnapActive] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Load enrolled identities on mount
  useEffect(() => {
    const config = faceRecognitionService.loadHouseholdConfig();
    setToddlerProfile(config.toddlerProfile);
    setAuthorisedPeople(config.authorisedPeople);
    setProximityRadius(safetyContextEngine.getToddlerSafetyRadius());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
    }, 2500);
  };

  const handleSave = () => {
    updateSafetySettings(localSettings);
    safetyContextEngine.setToddlerSafetyRadius(proximityRadius);
    showToast('Safety configuration & proximity parameters saved.');
  };

  const handleDiscard = () => {
    setLocalSettings(safetySettings);
    setProximityRadius(safetyContextEngine.getToddlerSafetyRadius());
  };

  // Open modal for Toddler enrollment
  const openEnrollToddler = () => {
    setEnrollType('toddler');
    setEnrollName(toddlerProfile?.displayName || 'Toddler');
    setEnrollRelationship('Toddler' as unknown as 'Parent');
    setEnrollImgSrc(null);
    setEnrollError(null);
    setLastQualityReport(null);
    setIsCameraSnapActive(false);
    setEnrollModalOpen(true);
  };

  // Open modal for Authorised Person enrollment
  const openEnrollPerson = () => {
    setEnrollType('authorised');
    setEnrollName('');
    setEnrollRelationship('Parent');
    setEnrollImgSrc(null);
    setEnrollError(null);
    setLastQualityReport(null);
    setIsCameraSnapActive(false);
    setEnrollModalOpen(true);
  };

  // Handle image upload from file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setEnrollImgSrc(event.target.result);
        setEnrollError(null);
        setLastQualityReport(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Start temporary camera stream for live snap
  const startCameraSnap = async () => {
    try {
      setIsCameraSnapActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      localStreamRef.current = stream;
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to open camera for photo snap:', err);
      setEnrollError('Unable to access camera for snapshot.');
      setIsCameraSnapActive(false);
    }
  };

  // Capture frame from temporary camera stream
  const captureCameraPhoto = () => {
    if (!enrollVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = enrollVideoRef.current.videoWidth || 640;
    canvas.height = enrollVideoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(enrollVideoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setEnrollImgSrc(dataUrl);
    }
    stopCameraStream();
    setIsCameraSnapActive(false);
  };

  const stopCameraStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  };

  const closeEnrollModal = () => {
    stopCameraStream();
    setIsCameraSnapActive(false);
    setEnrollModalOpen(false);
  };

  // Process & Extract Local Face Embedding with Strict Quality Gate
  const handleConfirmEnrollment = async () => {
    if (!enrollName.trim()) {
      setEnrollError('Please enter a display name.');
      return;
    }
    if (!enrollImgSrc) {
      setEnrollError('Please upload a reference photo or capture a camera snapshot.');
      return;
    }

    setIsProcessingEnrollment(true);
    setEnrollError(null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = enrollImgSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Extract local normalized 256D feature embedding with Quality Gate
      const { embedding, quality } = await faceRecognitionService.extractFaceEmbeddingWithQuality(img);
      setLastQualityReport(quality);

      if (!quality.passed || !embedding) {
        let reasonMsg = 'Quality Gate Rejected: Image unsuitable for biometric matching.';
        if (quality.failureReason === 'FACE_TOO_SMALL') {
          reasonMsg = `Face image too small (${quality.faceWidthPx}×${quality.faceHeightPx}px). Minimum required: 48×48 actual pixels.`;
        } else if (quality.failureReason === 'FACE_BLURRY') {
          reasonMsg = `Face image is too blurry (sharpness score: ${quality.sharpnessScore} < 12.0). Please use a focused front-facing photo.`;
        } else if (quality.failureReason === 'LOW_CONTRAST') {
          reasonMsg = `Face image has low contrast (score: ${quality.contrastScore}). Please ensure clear lighting.`;
        } else if (quality.failureReason === 'EXTREME_LIGHTING') {
          reasonMsg = `Extreme lighting detected (brightness: ${quality.brightnessScore}). Avoid direct backlighting or dark rooms.`;
        } else if (quality.failureReason === 'INVALID_ASPECT_RATIO') {
          reasonMsg = `Invalid crop aspect ratio (${quality.aspectRatio.toFixed(2)}). Please crop closely around the face.`;
        }
        setEnrollError(reasonMsg);
        setIsProcessingEnrollment(false);
        return;
      }

      const sample: EnrolledIdentitySample = {
        id: `sample-${Date.now()}`,
        embedding,
        quality,
        createdAt: new Date().toISOString(),
        sourceType: isCameraSnapActive ? 'camera_capture' : 'upload'
      };

      if (enrollType === 'toddler') {
        const saved = faceRecognitionService.setEnrolledToddler(enrollName, [sample]);
        setToddlerProfile(saved);
        showToast(`Toddler Profile for "${saved.displayName}" enrolled locally.`);
      } else {
        const saved = faceRecognitionService.addAuthorisedPerson(enrollName, enrollRelationship, [sample]);
        setAuthorisedPeople(prev => [...prev, saved]);
        showToast(`Authorised Person "${saved.displayName}" added successfully.`);
      }

      closeEnrollModal();
    } catch (err) {
      console.error('Enrollment error:', err);
      setEnrollError('Error processing facial embedding.');
    } finally {
      setIsProcessingEnrollment(false);
    }
  };

  const handleRemoveToddler = () => {
    if (window.confirm('Are you sure you want to remove the enrolled Toddler profile?')) {
      faceRecognitionService.removeEnrolledToddler();
      setToddlerProfile(null);
      showToast('Toddler profile removed.');
    }
  };

  const handleRemovePerson = (profileId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove authorised person "${name}"?`)) {
      faceRecognitionService.removeAuthorisedPerson(profileId);
      setAuthorisedPeople(prev => prev.filter(p => p.profileId !== profileId));
      showToast(`Removed "${name}" from Authorised People.`);
    }
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
            Configure on-device AI recognition, toddler profiles, and spatial safety rules.
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
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Body with Side Nav & Panels */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Settings Navigation */}
        <aside className="w-full lg:w-52 shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className={`shrink-0 text-left px-4 py-2.5 rounded-2xl font-label-sm text-sm flex items-center gap-2.5 transition-all ${
                activeTab === 'people'
                  ? 'bg-surface-container font-bold text-on-surface border-l-4 border-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">badge</span>
              <span>Toddler & People</span>
            </button>

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
          {/* ================= TAB: TODDLER & AUTHORISED PEOPLE ================= */}
          {activeTab === 'people' && (
            <div className="space-y-6">
              {/* Privacy & Anti-Spoofing Banner */}
              <div className="p-4 bg-cream-container border border-primary/30 rounded-2xl space-y-2 text-xs text-on-surface">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <span className="material-symbols-outlined text-lg">lock</span>
                  <span>Local-First Biometric Privacy Architecture</span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">
                  Facial feature vectors are computed entirely on-device and stored in local memory. Camera feeds, photos, and biometric descriptors are <strong>never uploaded to Firebase or cloud servers</strong>.
                </p>
                <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-[11px] text-on-surface-variant flex items-start gap-2">
                  <span className="material-symbols-outlined text-outline text-base mt-0.5">info</span>
                  <span>
                    <strong>Anti-Spoofing Disclosure:</strong> Face recognition performs biometric feature matching on local video crops. It does not currently incorporate active hardware liveness detection; photos displayed on screens may be recognized.
                  </span>
                </div>
              </div>

              {/* 1. Toddler Profile Card (Strict: Exactly ONE Toddler) */}
              <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
                <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-xl">child_care</span>
                    <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold">Toddler Profile</h3>
                  </div>
                  {toddlerProfile ? (
                    <span className="px-2.5 py-0.5 bg-primary-fixed text-on-primary-fixed rounded-full text-xs font-bold font-mono">
                      1 Enrolled (Active)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-surface-container-high text-outline rounded-full text-xs font-bold">
                      Not Enrolled
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {toddlerProfile ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/40">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-xs">
                          {toddlerProfile.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-on-surface">{toddlerProfile.displayName}</h4>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Status: <span className="text-primary font-bold">Calibrated (Threshold: {TODDLER_RECOGNITION_THRESHOLD.toFixed(2)})</span> • {toddlerProfile.samples.length} reference sample(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openEnrollToddler}
                          className="px-3 py-1.5 bg-surface border border-outline-variant rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-all"
                        >
                          Update Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveToddler}
                          className="px-3 py-1.5 bg-error-container text-on-error-container border border-error/30 rounded-xl text-xs font-semibold hover:bg-error hover:text-on-error transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-2xl">child_care</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">No Toddler Profile Enrolled</h4>
                        <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
                          Enroll your infant or toddler with a high-quality reference photo so SentryCrib can distinguish your toddler from visitors and caregivers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openEnrollToddler}
                        className="px-5 py-2.5 bg-primary text-on-primary rounded-2xl font-label-sm text-xs font-bold hover:bg-primary-container transition-all shadow-sm flex items-center gap-2 mx-auto"
                      >
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        <span>Enroll Toddler Profile</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Authorised People Section */}
              <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
                <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                    <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold">Authorised People</h3>
                  </div>
                  <button
                    type="button"
                    onClick={openEnrollPerson}
                    className="px-3.5 py-1.5 bg-primary text-on-primary rounded-xl font-label-sm text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    <span>Add Person</span>
                  </button>
                </div>

                <div className="p-6">
                  {authorisedPeople.length > 0 ? (
                    <div className="space-y-3">
                      {authorisedPeople.map(person => (
                        <div
                          key={person.profileId}
                          className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-sm">
                              {person.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-on-surface">{person.displayName}</span>
                                <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant border border-outline-variant/30 rounded text-[10px] font-semibold">
                                  {person.relationship || 'Caregiver'}
                                </span>
                              </div>
                              <span className="text-[11px] text-on-surface-variant">
                                Status: <strong className="text-[#2a6b77]">RECOGNISED</strong> • {person.samples.length} vector sample(s) (Threshold: {AUTHORIZED_PERSON_RECOGNITION_THRESHOLD.toFixed(2)})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePerson(person.profileId, person.displayName)}
                            className="p-2 text-outline hover:text-error hover:bg-error-container/40 rounded-lg transition-colors"
                            title="Remove Person"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-on-surface-variant text-xs space-y-2">
                      <p>No authorised caregivers or family members enrolled yet.</p>
                      <p className="text-[11px] opacity-75">
                        Enrolled caregivers suppress stranger danger alerts when present with visitors near the toddler.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. Toddler Proximity Zone Configuration */}
              <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
                <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-xl">social_distance</span>
                    <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold">
                      Toddler Proximity Zone & Spatial Safety Rules
                    </h3>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-on-surface">Toddler Safety Radius (Image-Space Distance)</span>
                      <span className="text-primary font-bold font-mono">{proximityRadius}% of viewport</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="60"
                      step="5"
                      value={proximityRadius}
                      onChange={e => setProximityRadius(Number(e.target.value))}
                      className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
                    />
                    <p className="text-[11px] text-on-surface-variant">
                      Defines the circular spatial proximity zone around the toddler's bounding box center in camera coordinates.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/30 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 bg-error-container/30 border border-error/30 rounded-xl">
                      <span className="font-bold text-error block mb-1">CASE A — DANGER</span>
                      <p className="text-[11px] text-on-surface-variant font-sans">
                        Toddler + UNRECOGNISED person enters zone + NO recognised caregiver nearby.
                      </p>
                    </div>
                    <div className="p-3 bg-[#fef3c7] border border-[#d97706]/40 rounded-xl">
                      <span className="font-bold text-[#92400e] block mb-1">CASE B — ATTENTION</span>
                      <p className="text-[11px] text-on-surface-variant font-sans">
                        Toddler + UNRECOGNISED person + RECOGNISED caregiver nearby (Danger suppressed).
                      </p>
                    </div>
                    <div className="p-3 bg-primary-fixed/30 border border-primary/30 rounded-xl">
                      <span className="font-bold text-primary block mb-1">CASE C — SAFE</span>
                      <p className="text-[11px] text-on-surface-variant font-sans">
                        Toddler + RECOGNISED caregiver in attendance.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Section: AI Detection Models */}
          {activeTab === 'detection' && (
            <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
              <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  <span>AI Detection & Tracking Parameters</span>
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Fall Risk Sensitivity */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Fall Risk & Crib Edge Sensitivity</h4>
                      <p className="text-xs text-on-surface-variant">Buffer zone from crib perimeter before alert fires.</p>
                    </div>
                    <span className="font-label-sm text-sm font-bold text-primary font-mono">
                      {localSettings.fallRisk.bufferZoneCm} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
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
                    className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
                  />
                </div>

                {/* Sharp Object Detection Setting */}
                <div className="space-y-3 pt-4 border-t border-surface-variant">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Sharp Object Detection</h4>
                      <p className="text-xs text-on-surface-variant">Actively monitors for knives, scissors, and hazards.</p>
                    </div>
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
                      className="rounded text-primary focus:ring-primary w-4 h-4"
                    />
                  </div>
                </div>

                {/* Safe Zone Re-calibration */}
                <div className="pt-4 border-t border-surface-variant flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Safe Zone Perimeter</h4>
                    <p className="text-xs text-on-surface-variant">Re-calibrate crib boundaries with your camera feed.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDefineAreaModalOpen(true)}
                    className="px-4 py-2 bg-surface border border-outline-variant text-on-surface hover:bg-surface-container rounded-xl font-label-sm text-xs font-semibold transition-colors"
                  >
                    Calibrate Zone
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Section: Alert Behaviors */}
          {activeTab === 'alerts' && (
            <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
              <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">notifications_active</span>
                  <span>Alert Channels & Notification Settings</span>
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">volume_up</span>
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">Audible Browser Chimes</span>
                      <span className="text-xs text-on-surface-variant">Play audio chime on danger state</span>
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

          {/* Section: General & Model Capabilities */}
          {activeTab === 'general' && (
            <section className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden glass-panel">
              <div className="bg-surface-container px-6 py-3.5 border-b border-outline-variant/50 flex justify-between items-center">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  <span>Model Architecture & Vision Specifications</span>
                </h3>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-on-surface mb-2">Tracking & Confidence Smoothing</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                    Person, animal, and object detections are tracked across frames with Exponential Moving Average smoothing (EMA, α=0.35), multi-frame confirmation, and cosine face embedding matching.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                      <span className="text-on-surface-variant block">Tracking Algorithm</span>
                      <span className="font-bold text-primary">IoU + Centroid Proximity</span>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                      <span className="text-on-surface-variant block">Face Recognition</span>
                      <span className="font-bold text-primary">256D Cosine (≥{TODDLER_RECOGNITION_THRESHOLD.toFixed(2)})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-variant">
                  <h4 className="text-sm font-bold text-on-surface mb-2">Animal & Snake Detection Architecture</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                    General animals (Dog, Cat, Bird, Horse, etc.) are detected via COCO-SSD. Specialized reptile & snake hazards are classified via MobileNet-v2 with 17 ImageNet Serpentes classes and strict non-snake filtering.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-[#b7791f]/20 text-[#b7791f] rounded-lg font-bold text-xs">
                      ANIMAL — Dog
                    </span>
                    <span className="px-2.5 py-1 bg-[#b7791f]/20 text-[#b7791f] rounded-lg font-bold text-xs">
                      ANIMAL — Cat
                    </span>
                    <span className="px-2.5 py-1 bg-[#b7791f]/20 text-[#b7791f] rounded-lg font-bold text-xs">
                      ANIMAL — Bird
                    </span>
                    <span className="px-2.5 py-1 bg-[#b7791f]/30 text-[#b7791f] border border-[#b7791f]/40 rounded-lg font-bold text-xs">
                      ANIMAL — Snake (17 Species)
                    </span>
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

      {/* ================= ENROLLMENT MODAL ================= */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-3xl border border-outline-variant shadow-2xl max-w-md w-full p-6 text-on-surface relative space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {enrollType === 'toddler' ? 'child_care' : 'person_add'}
                </span>
                <h3 className="text-lg font-bold font-headline-md text-on-surface">
                  {enrollType === 'toddler' ? 'Enroll Toddler Profile' : 'Add Authorised Person'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEnrollModal}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Error banner */}
            {enrollError && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{enrollError}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface block">
                {enrollType === 'toddler' ? 'Toddler Display Name' : 'Person Full Name'}
              </label>
              <input
                type="text"
                value={enrollName}
                onChange={e => setEnrollName(e.target.value)}
                placeholder={enrollType === 'toddler' ? 'e.g. Leo' : 'e.g. Sarah Jenkins'}
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* Relationship Input (Authorised person only) */}
            {enrollType === 'authorised' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface block">Relationship</label>
                <select
                  value={enrollRelationship}
                  onChange={e => setEnrollRelationship(e.target.value as 'Parent')}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Caregiver">Caregiver</option>
                  <option value="Other">Other Family Member</option>
                </select>
              </div>
            )}

            {/* Photo Capture / Upload Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface block">Reference Photo (Quality Gated)</label>

              {isCameraSnapActive ? (
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <video ref={enrollVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="w-full py-2 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              ) : enrollImgSrc ? (
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/10 border border-outline-variant/50 flex items-center justify-center">
                    <img src={enrollImgSrc} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollImgSrc(null);
                        setLastQualityReport(null);
                      }}
                      className="flex-1 py-1.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="p-4 bg-surface-container-low border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-surface-container transition-colors text-center">
                    <span className="material-symbols-outlined text-primary text-2xl">upload_file</span>
                    <span className="text-xs font-semibold text-on-surface">Upload Photo</span>
                    <span className="text-[10px] text-on-surface-variant">JPG, PNG (Min 48×48px)</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={startCameraSnap}
                    className="p-4 bg-surface-container-low border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-surface-container transition-colors text-center"
                  >
                    <span className="material-symbols-outlined text-primary text-2xl">photo_camera</span>
                    <span className="text-xs font-semibold text-on-surface">Camera Snap</span>
                    <span className="text-[10px] text-on-surface-variant">Live Webcam</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quality gate disclosure */}
            <p className="text-[10px] text-on-surface-variant opacity-80 leading-tight">
              Quality Gate checks actual face resolution, sharpness, and contrast before saving. No biometric images leave your browser.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnrollment}
                disabled={isProcessingEnrollment}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isProcessingEnrollment ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Validating Face Quality...</span>
                  </>
                ) : (
                  <span>Save Enrollment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
