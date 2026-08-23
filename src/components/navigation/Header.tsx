import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { currentScreen, setCurrentScreen, setEmergencyModalOpen, camera, alerts } = useApp();
  const { logout } = useAuth();
  const { isMonitoring, startCamera, stopCamera } = camera;

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      stopCamera();
    } else {
      if (currentScreen !== 'live-monitor') {
        setCurrentScreen('live-monitor');
      }
      await startCamera();
    }
  };

  const unreviewedCount = alerts.filter(a => a.status === 'unreviewed').length;

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/40 z-30 px-4 md:px-8 flex items-center justify-between shadow-xs">
      {/* Left Mobile Brand / Title */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
          <span className="material-symbols-outlined text-primary text-[24px]">security</span>
          <span className="font-headline-md text-base font-bold text-primary">SentryCrib</span>
        </div>
        <div className="hidden md:block">
          <span className="font-caption text-xs uppercase tracking-wider text-outline font-semibold">
            {currentScreen === 'dashboard' && 'Nursery Safety Overview'}
            {currentScreen === 'live-monitor' && 'Live Computer Vision Stream'}
            {currentScreen === 'alert-history' && 'Historical Events & Logs'}
            {currentScreen === 'settings' && 'AI Thresholds & Controls'}
            {currentScreen === 'about' && 'System Specs & Architecture'}
          </span>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Monitoring Action */}
        <button
          type="button"
          onClick={handleToggleMonitoring}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-label-sm text-xs font-bold transition-all shadow-xs active:scale-98 ${
            isMonitoring
              ? 'bg-error text-on-error hover:bg-error/90'
              : 'bg-primary text-on-primary hover:bg-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isMonitoring ? 'stop_circle' : 'videocam'}
          </span>
          <span className="hidden sm:inline">
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          type="button"
          onClick={() => setCurrentScreen('alert-history')}
          className="relative p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
          title="View Alerts"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unreviewedCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
          )}
        </button>

        {/* Mobile Emergency Button */}
        <button
          type="button"
          onClick={() => setEmergencyModalOpen(true)}
          className="md:hidden p-2 rounded-full bg-error-container text-on-error-container hover:bg-error/20 transition-colors"
          title="Emergency Call"
        >
          <span className="material-symbols-outlined text-[20px] text-error">emergency</span>
        </button>

        {/* Mobile Sign Out Button */}
        <button
          type="button"
          onClick={logout}
          className="md:hidden p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
};
