import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavScreen } from '../../types';

export const MobileBottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  const navItems: { id: NavScreen; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'live-monitor', label: 'Live', icon: 'videocam' },
    { id: 'alert-history', label: 'Alerts', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'about', label: 'About', icon: 'info' }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-outline-variant/40 shadow-lg px-2 py-1.5 flex justify-around items-center select-none">
      {navItems.map(item => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentScreen(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 ${
              isActive
                ? 'text-primary font-bold bg-primary-container/20 scale-105'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="font-caption text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
