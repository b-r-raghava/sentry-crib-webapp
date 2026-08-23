import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/navigation/Sidebar';
import { Header } from './components/navigation/Header';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { EmergencyModal } from './components/common/EmergencyModal';
import { DefineAreaModal } from './components/common/DefineAreaModal';
import { AlertPlaybackModal } from './components/common/AlertPlaybackModal';
import { ExportReportModal } from './components/common/ExportReportModal';

import { LandingPageScreen } from './screens/LandingPageScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';

import { DashboardScreen } from './screens/DashboardScreen';
import { LiveMonitorScreen } from './screens/LiveMonitorScreen';
import { SafetySettingsScreen } from './screens/SafetySettingsScreen';
import { AlertHistoryScreen } from './screens/AlertHistoryScreen';
import { AboutScreen } from './screens/AboutScreen';

const MainLayout: React.FC = () => {
  const { currentScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'live-monitor':
        return <LiveMonitorScreen />;
      case 'alert-history':
        return <AlertHistoryScreen />;
      case 'settings':
        return <SafetySettingsScreen />;
      case 'about':
        return <AboutScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface dot-pattern-bg">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Header for Mobile & Desktop Context */}
      <Header />

      {/* Main Screen Content Canvas */}
      <main className="flex-1 ml-0 md:ml-64 pt-20 md:pt-20 pb-20 md:pb-8 h-full overflow-y-auto px-4 md:px-8 bg-transparent">
        {renderScreen()}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Action Modals */}
      <EmergencyModal />
      <DefineAreaModal />
      <AlertPlaybackModal />
      <ExportReportModal />
    </div>
  );
};

const RootAppRouter: React.FC = () => {
  const { user, authState, currentPublicScreen } = useAuth();

  // Initializing session state
  if (authState === 'INITIALIZING') {
    return (
      <div className="min-h-screen bg-soft-sand flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center mb-4 shadow-md">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
        </div>
        <h2 className="font-headline-md text-xl font-bold text-primary tracking-tight mb-2">
          SentryCrib
        </h2>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public Unauthenticated Entry Flow
  if (!user) {
    switch (currentPublicScreen) {
      case 'login':
        return <LoginScreen />;
      case 'signup':
        return <SignUpScreen />;
      case 'landing':
      default:
        return <LandingPageScreen />;
    }
  }

  // Authenticated Protected Monitoring Dashboard
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <RootAppRouter />
    </AuthProvider>
  );
}

export default App;
