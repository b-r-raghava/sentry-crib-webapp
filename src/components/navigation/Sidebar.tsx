import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NavScreen } from '../../types';

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen, setEmergencyModalOpen, camera } = useApp();
  const { user, logout } = useAuth();
  const { isMonitoring } = camera;

  const navItems: { id: NavScreen; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'live-monitor', label: 'Live Monitor', icon: 'videocam' },
    { id: 'alert-history', label: 'Alert History', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'about', label: 'About', icon: 'info' }
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 py-6 z-40 w-64 bg-soft-sand border-r border-outline-variant/40 shadow-md shadow-primary/5 transition-all select-none">
      {/* Brand Header */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2.5 mb-1.5 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
          <h1 className="font-headline-md text-xl font-bold text-primary tracking-tight">SentryCrib</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-primary-container pulse-green' : 'bg-outline'} block`} />
          <span className="font-caption text-xs text-nurturing-teal-dim font-medium">
            {isMonitoring ? 'Vigilance Active' : 'Monitoring Standby'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <ul className="flex flex-col gap-1.5 flex-grow w-full px-2 font-label-sm text-sm">
        {navItems.map(item => {
          const isActive = currentScreen === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setCurrentScreen(item.id)}
                className={`flex items-center gap-3.5 w-full rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm shadow-primary/10'
                    : 'text-on-surface-variant hover:bg-primary-container/15 hover:text-on-surface hover:translate-x-1'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Bottom Emergency Action & User Profile */}
      <div className="mt-auto px-4 pt-4 border-t border-outline-variant/30 space-y-3">
        <button
          type="button"
          onClick={() => setEmergencyModalOpen(true)}
          className="w-full bg-error text-on-error font-label-sm text-xs py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-error/90 active:scale-98 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">emergency</span>
          <span>Emergency Call</span>
        </button>

        {/* User profile with Sign Out */}
        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-xs font-bold shrink-0">
              {user?.displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user?.displayName || 'Caregiver'}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{user?.email || 'Authenticated'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
