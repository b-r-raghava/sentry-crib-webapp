import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LandingPageScreen: React.FC = () => {
  const { setCurrentPublicScreen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-soft-sand text-on-surface select-none font-sans antialiased">
      {/* ================= STICKY TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-40 bg-soft-sand/90 backdrop-blur-md border-b border-outline-variant/40 px-4 sm:px-8 py-4 transition-all shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <span className="font-headline-md text-xl font-bold text-primary tracking-tight">
              SentryCrib
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-label-sm text-on-surface-variant font-medium">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('hardware')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Hardware
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('privacy')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Privacy
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPublicScreen('login')}
              className="px-4 py-2 text-xs sm:text-sm font-label-sm font-semibold text-primary hover:bg-primary-fixed/30 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setCurrentPublicScreen('signup')}
              className="px-5 py-2.5 bg-primary text-on-primary font-label-sm text-xs sm:text-sm font-bold rounded-2xl hover:bg-primary-container transition-all shadow-sm active:scale-98"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-3 border-t border-outline-variant/30 mt-3 space-y-2 animate-fade-in">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('hardware')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              Hardware
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('privacy')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              Privacy
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCurrentPublicScreen('login')}
                className="w-full py-2.5 text-center text-sm font-bold text-primary border border-primary/30 rounded-xl"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setCurrentPublicScreen('signup')}
                className="w-full py-2.5 text-center text-sm font-bold bg-primary text-on-primary rounded-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative px-4 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary-fixed/70 text-on-primary-fixed rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs border border-primary/20">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield_with_heart
              </span>
              <span>Intelligent Nursery Safety</span>
            </div>

            <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold text-primary leading-tight tracking-tight">
              Safety, watching quietly.
            </h1>

            <p className="font-body-lg text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-xl mx-auto lg:mx-0">
              Turn the camera you already have into an intelligent infant safety monitor. SentryCrib helps caregivers identify potential hazards before they become emergencies.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCurrentPublicScreen('signup')}
                className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary font-label-sm text-sm sm:text-base font-bold rounded-2xl hover:bg-primary-container transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPublicScreen('login')}
                className="w-full sm:w-auto px-7 py-4 bg-surface text-primary border border-outline-variant/80 font-label-sm text-sm sm:text-base font-bold rounded-2xl hover:bg-surface-container transition-colors shadow-2xs"
              >
                Sign In
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-on-surface-variant font-medium">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">lock</span>
                <span>Local-first architecture</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">devices</span>
                <span>No proprietary hardware</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sophisticated Hero Conceptual Visual */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-outline-variant/60 bg-cream-container p-3 sm:p-4 group">
              {/* Top Monitoring Header Mock Bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-2xl mb-3 border border-outline-variant/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary pulse-green block" />
                  <span className="font-semibold text-primary font-status-display">SentryCrib Vigilance Active</span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-mono">Local Stream • 1080p</span>
              </div>

              {/* Nursery Visual with Subtle Safety Boundary Overlay */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-inverse-surface border border-outline-variant/40">
                <img
                  src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1200&q=80"
                  alt="Nursery with SentryCrib Safety Zone"
                  className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-102"
                />

                {/* Conceptual Calm Safe Boundary Overlay */}
                <div className="absolute inset-6 border border-primary-fixed/80 bg-primary-fixed/10 rounded-2xl pointer-events-none flex flex-col justify-between p-3.5 shadow-[0_0_24px_rgba(174,237,250,0.25)]">
                  <span className="bg-surface/95 backdrop-blur-xs text-primary text-[11px] font-bold px-2.5 py-1 rounded-lg self-start shadow-xs flex items-center gap-1.5 border border-primary/20">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                      crop_free
                    </span>
                    <span>Safe Space Calibrated</span>
                  </span>

                  <div className="flex items-center justify-between bg-surface/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-primary/20 text-[11px] text-primary self-stretch shadow-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      <span>Continuous Environment Analysis</span>
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant">Sub-100ms local trigger</span>
                  </div>
                </div>
              </div>

              {/* Bottom Monitoring Meta Badges */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <span className="text-[10px] text-on-surface-variant block">Awareness</span>
                  <span className="text-xs font-bold text-primary">Active</span>
                </div>
                <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <span className="text-[10px] text-on-surface-variant block">Boundary</span>
                  <span className="text-xs font-bold text-primary">Protected</span>
                </div>
                <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <span className="text-[10px] text-on-surface-variant block">Privacy</span>
                  <span className="text-xs font-bold text-primary">Local Stream</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. CORE VALUE PROPOSITION ================= */}
      <section className="px-4 sm:px-8 py-16 sm:py-20 bg-cream-container border-y border-outline-variant/40">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-bold text-primary tracking-widest uppercase font-label-sm">
            Simplicity & Accessibility
          </span>
          <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">
            One camera. A safer space.
          </h2>
          <p className="font-body-lg text-sm sm:text-base md:text-lg text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            SentryCrib is engineered to transform the hardware you already own into a dedicated safety guardian. Connect your laptop webcam, a standard USB camera, or an existing home device—no expensive proprietary hardware packages required.
          </p>
        </div>
      </section>

      {/* ================= 3. FOUR PREMIUM FEATURES ================= */}
      <section id="features" className="px-4 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-primary tracking-widest uppercase font-label-sm">
            Core Capabilities
          </span>
          <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">
            Purpose-built protective intelligence.
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Comprehensive nursery vigilance designed to support attentive caregivers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* FEATURE 1: Sharp Object Awareness */}
          <div className="bg-cream-container p-6 sm:p-8 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">content_cut</span>
              </div>
              <h3 className="font-headline-md text-xl font-bold text-on-surface">
                Sharp Object Awareness
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Identify potentially dangerous household objects and understand when they become a meaningful risk within the monitored area.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-outline-variant/30 flex items-center gap-2 text-xs font-semibold text-secondary">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>Contextual hazard classification</span>
            </div>
          </div>

          {/* FEATURE 2: Safety Boundary */}
          <div className="bg-cream-container p-6 sm:p-8 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">crop_free</span>
              </div>
              <h3 className="font-headline-md text-xl font-bold text-on-surface">
                Safety Boundary
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Define a safe area once and receive an alert when monitored movement crosses it, helping prevent crib falls and perimeter breaches.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-outline-variant/30 flex items-center gap-2 text-xs font-semibold text-primary">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>Custom perimeter calibration</span>
            </div>
          </div>

          {/* FEATURE 3: Face Obstruction */}
          <div className="bg-cream-container p-6 sm:p-8 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">visibility_off</span>
              </div>
              <h3 className="font-headline-md text-xl font-bold text-on-surface">
                Face Obstruction
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Monitor for prolonged face obstruction and alert caregivers when attention may be needed due to blankets, stuffed toys, or coverings.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-outline-variant/30 flex items-center gap-2 text-xs font-semibold text-tertiary">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span>Configurable time thresholds</span>
            </div>
          </div>

          {/* FEATURE 4: Animal Awareness */}
          <div className="bg-cream-container p-6 sm:p-8 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">pets</span>
              </div>
              <h3 className="font-headline-md text-xl font-bold text-on-surface">
                Animal Awareness
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Recognize when an animal enters the monitored space near your little one, keeping you informed of household pet interactions.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-outline-variant/30 flex items-center gap-2 text-xs font-semibold text-primary">
              <span className="material-symbols-outlined text-sm">notifications</span>
              <span>Proximity detection notices</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. HOW IT WORKS ================= */}
      <section id="how-it-works" className="px-4 sm:px-8 py-16 sm:py-24 bg-cream-container border-y border-outline-variant/40">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-primary tracking-widest uppercase font-label-sm">
              Setup in minutes
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">
              How SentryCrib Works
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Three simple steps to transform your nursery space.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-outline-variant/50 relative shadow-xs">
              <span className="font-headline-lg text-3xl sm:text-4xl font-black text-primary-fixed-dim/80 block mb-4">
                01
              </span>
              <h3 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface mb-2">
                Connect a camera
              </h3>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Position your device or webcam with an unobstructed view of the crib and launch SentryCrib directly in your browser.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-outline-variant/50 relative shadow-xs">
              <span className="font-headline-lg text-3xl sm:text-4xl font-black text-primary-fixed-dim/80 block mb-4">
                02
              </span>
              <h3 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface mb-2">
                Define your safe space
              </h3>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Use the intuitive boundary tool to calibrate the perimeter and sensitivity thresholds tailored to your nursery layout.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-outline-variant/50 relative shadow-xs">
              <span className="font-headline-lg text-3xl sm:text-4xl font-black text-primary-fixed-dim/80 block mb-4">
                03
              </span>
              <h3 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface mb-2">
                Let SentryCrib watch
              </h3>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Continuous local analysis monitors for potential hazards, alerting you immediately if attention is required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. PRIVACY SECTION ================= */}
      <section id="privacy" className="px-4 sm:px-8 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="bg-soft-sand border border-outline-variant/70 rounded-3xl p-6 sm:p-12 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed text-on-primary-fixed rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>Local-First Design</span>
            </div>
            <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-bold text-primary leading-tight">
              Your camera should belong to you.
            </h2>
            <p className="font-body-lg text-xs sm:text-sm md:text-base text-on-surface-variant leading-relaxed">
              SentryCrib is designed around local-first monitoring. The future vision pipeline is intended to process camera frames on the device rather than continuously uploading video to the cloud.
            </p>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant/90 leading-relaxed">
              We believe infant safety and family privacy should never be at odds. Video frames remain inside your home network perimeter for sub-100ms response times.
            </p>
          </div>

          <div className="md:col-span-5 bg-cream-container p-6 rounded-2xl border border-outline-variant/40 space-y-3.5 text-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl shrink-0">router</span>
              <div>
                <strong className="block text-on-surface">Local Device Inference</strong>
                <span className="text-on-surface-variant">Processing occurs on your computer</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl shrink-0">cloud_off</span>
              <div>
                <strong className="block text-on-surface">Zero Continuous Cloud Streaming</strong>
                <span className="text-on-surface-variant">No video storage on third-party servers</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl shrink-0">speed</span>
              <div>
                <strong className="block text-on-surface">Instant Siren Triggers</strong>
                <span className="text-on-surface-variant">Rapid response without internet latency</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. SOFTWARE-ONLY DIFFERENTIATOR ================= */}
      <section id="hardware" className="px-4 sm:px-8 py-16 sm:py-20 bg-cream-container border-y border-outline-variant/40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-4">
            <span className="text-xs font-bold text-primary tracking-widest uppercase font-label-sm">
              Hardware Independence
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">
              No proprietary camera required.
            </h2>
            <p className="font-body-lg text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Use the hardware you already have. SentryCrib is designed as a software-first solution, connecting to your existing devices without expensive hardware lock-in.
            </p>
          </div>

          <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface p-5 rounded-2xl border border-outline-variant/40 text-center space-y-2">
              <span className="material-symbols-outlined text-primary text-3xl">laptop_mac</span>
              <h4 className="font-label-sm text-sm font-bold text-on-surface">Laptop Webcam</h4>
              <p className="text-[11px] text-on-surface-variant">Built-in cameras on Windows and macOS</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-outline-variant/40 text-center space-y-2">
              <span className="material-symbols-outlined text-primary text-3xl">videocam</span>
              <h4 className="font-label-sm text-sm font-bold text-on-surface">USB Webcam</h4>
              <p className="text-[11px] text-on-surface-variant">Standard 1080p external USB cameras</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-outline-variant/40 text-center space-y-2">
              <span className="material-symbols-outlined text-primary text-3xl">smartphone</span>
              <h4 className="font-label-sm text-sm font-bold text-on-surface">Smartphone Camera</h4>
              <p className="text-[11px] text-on-surface-variant">Mobile browser video capture pipelines</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. FINAL CLOSING CTA ================= */}
      <section className="px-4 sm:px-8 py-20 sm:py-28 max-w-5xl mx-auto text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
        </div>
        <h2 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl font-bold text-primary tracking-tight">
          Start building a safer space.
        </h2>
        <p className="font-body-lg text-sm sm:text-base md:text-lg text-on-surface-variant max-w-xl mx-auto">
          Join caregivers turning existing cameras into calm, intelligent monitors for their little ones.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => setCurrentPublicScreen('signup')}
            className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary font-label-sm text-base font-bold rounded-2xl hover:bg-primary-container transition-all shadow-md active:scale-98"
          >
            Get Started
          </button>
          <button
            type="button"
            onClick={() => setCurrentPublicScreen('login')}
            className="w-full sm:w-auto px-7 py-4 bg-surface text-primary border border-outline-variant/80 font-label-sm text-base font-bold rounded-2xl hover:bg-surface-container transition-colors shadow-2xs"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* ================= 8. FOOTER ================= */}
      <footer className="bg-soft-sand border-t border-outline-variant/40 px-4 sm:px-8 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
              <span className="font-headline-md text-base font-bold text-primary">SentryCrib</span>
            </div>
            <p className="font-body-md text-xs text-on-surface-variant">
              Quietly watching. Ready when it matters.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-on-surface-variant">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('privacy')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setCurrentPublicScreen('login')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </nav>

          <span className="text-xs text-outline font-caption">
            © 2026 SentryCrib
          </span>
        </div>
      </footer>
    </div>
  );
};
