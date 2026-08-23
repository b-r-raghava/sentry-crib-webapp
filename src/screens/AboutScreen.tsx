import React from 'react';

export const AboutScreen: React.FC = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-cream-container p-6 md:p-10 rounded-3xl border border-outline-variant/50 shadow-sm">
        <div className="md:col-span-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed text-on-primary-fixed rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            <span>Intelligent Infant Protection</span>
          </div>
          <h2 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-primary leading-tight">
            SentryCrib: Professional Safety for the Modern Parent.
          </h2>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Traditional monitors just stream video of your baby. SentryCrib actively analyzes real-time video frames to detect edge falls, airway blockages, and sharp objects before incidents happen.
          </p>
        </div>

        <div className="md:col-span-6 h-[320px] sm:h-[400px] rounded-2xl overflow-hidden shadow-md relative group border border-outline-variant/40">
          <img
            src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1200&q=80"
            alt="Modern Nursery with SentryCrib Monitor"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent flex items-end p-6">
            <span className="bg-surface/90 backdrop-blur-sm text-primary px-3.5 py-1.5 rounded-full font-label-sm text-xs font-bold border border-outline-variant/50 flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                visibility
              </span>
              <span>Always Watching, Always Private</span>
            </span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="space-y-6">
        <div className="border-b border-outline-variant/50 pb-3">
          <h3 className="font-headline-md text-xl md:text-2xl font-bold text-primary">
            How SentryCrib Works
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Engineered with a Safety-as-a-Service approach that couples nursery calm with medical-grade reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="space-y-4 flex flex-col justify-between">
            {/* Feature 1 */}
            <div className="bg-cream-container p-6 rounded-2xl border border-outline-variant/50 shadow-sm flex gap-4 items-start hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-xs">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <div>
                <h4 className="font-headline-md text-base font-bold text-primary">Edge-AI Vision</h4>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                  Advanced computer vision models run 100% on your local edge device. It continuously evaluates bounding coordinates for sharp items, crib edge breaches, and airway obstructions without transmitting sensitive baby video over the internet.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-cream-container p-6 rounded-2xl border border-outline-variant/50 shadow-sm flex gap-4 items-start hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-xs">
                <span className="material-symbols-outlined text-2xl">router</span>
              </div>
              <div>
                <h4 className="font-headline-md text-base font-bold text-primary">Software-Only Architecture</h4>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                  No proprietary, locked-in camera hardware required. SentryCrib connects natively to standard RTSP, ONVIF, or IP camera video streams, turning any high-definition camera into an intelligent safety sentinel.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-cream-container p-6 rounded-2xl border border-outline-variant/50 shadow-sm flex gap-4 items-start hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary-container shadow-xs">
                <span className="material-symbols-outlined text-2xl">lock</span>
              </div>
              <div>
                <h4 className="font-headline-md text-base font-bold text-primary">Absolute Local Privacy</h4>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                  Your nursery is private. Processing happens within your home network perimeter with zero cloud storage vulnerabilities, zero data harvesting, and sub-100ms instant local siren triggers.
                </p>
              </div>
            </div>
          </div>

          <div className="h-full min-h-[320px] rounded-2xl overflow-hidden shadow-sm border border-outline-variant/50 relative group">
            <img
              src="https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80"
              alt="SentryCrib Nursery Safety Monitoring Setup"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex flex-col justify-end p-6 text-white">
              <span className="text-xs font-semibold text-primary-fixed uppercase tracking-wider mb-1">
                Zero Cloud Dependence
              </span>
              <h5 className="text-lg font-bold">Reliable Protection Offline & Online</h5>
              <p className="text-xs text-white/80 mt-1">
                Even if internet connectivity drops, your local SentryCrib engine continues monitoring and dispatching sound sirens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* System Specifications Strip */}
      <section className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/40 shadow-xs">
        <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-4 font-semibold">
          System Specifications & Protocols
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
            <span className="text-xs text-on-surface-variant block">Input Stream</span>
            <span className="text-sm font-bold text-primary">RTSP / WebRTC / 1080p</span>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
            <span className="text-xs text-on-surface-variant block">Inference Engine</span>
            <span className="text-sm font-bold text-primary">Edge CV / ONNX Core</span>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
            <span className="text-xs text-on-surface-variant block">Alert Latency</span>
            <span className="text-sm font-bold text-primary">&lt; 85 milliseconds</span>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
            <span className="text-xs text-on-surface-variant block">Compliance</span>
            <span className="text-sm font-bold text-primary">100% On-Premises</span>
          </div>
        </div>
      </section>
    </div>
  );
};
