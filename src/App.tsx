import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/navigation/Sidebar';
import { Header } from './components/navigation/Header';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { EmergencyModal } from './components/common/EmergencyModal';
import { DefineAreaModal } from './components/common/DefineAreaModal';
import { AlertPlaybackModal } from './components/common/AlertPlaybackModal';
import { ExportReportModal } from './components/common/ExportReportModal';

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

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
