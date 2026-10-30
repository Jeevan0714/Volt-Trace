import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import BatteryDetail from './pages/BatteryDetail';
import MobileIntake from './pages/MobileIntake';
import QRScannerModal from './components/QRScannerModal';
import RegisterBatteryModal from './components/RegisterBatteryModal';

export default function App() {
  const [activeBatteryId, setActiveBatteryId] = useState(null);
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile-intake'
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync route and query parameters on mount & popstate
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      const isMobilePath =
        window.location.pathname.startsWith('/mobile-intake') ||
        params.get('mode') === 'mobile-intake' ||
        params.get('view') === 'mobile-intake';

      if (idParam) {
        setActiveBatteryId(idParam);
      }

      if (isMobilePath) {
        setViewMode('mobile-intake');
      } else {
        setViewMode('desktop');
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, []);

  const handleSelectBattery = (id) => {
    setActiveBatteryId(id);
    setViewMode('desktop');
    const url = new URL(window.location);
    url.pathname = '/';
    url.searchParams.set('id', id);
    url.searchParams.delete('mode');
    window.history.pushState({}, '', url);
  };

  const handleOpenMobileIntake = (id) => {
    const targetId = id || activeBatteryId || 'VT-1001';
    setActiveBatteryId(targetId);
    setViewMode('mobile-intake');
    const url = new URL(window.location);
    url.pathname = '/mobile-intake';
    url.searchParams.set('id', targetId);
    window.history.pushState({}, '', url);
  };

  const handleBackToDashboard = () => {
    setActiveBatteryId(null);
    setViewMode('desktop');
    const url = new URL(window.location);
    url.pathname = '/';
    url.searchParams.delete('id');
    url.searchParams.delete('mode');
    window.history.pushState({}, '', url);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // If in Mobile Intake Mode, render dedicated lightweight workflow
  if (viewMode === 'mobile-intake') {
    return (
      <div style={{ minHeight: '100vh', background: '#0b1120' }}>
        <MobileIntake
          key={`${activeBatteryId || 'VT-1001'}-${refreshKey}`}
          batteryId={activeBatteryId || 'VT-1001'}
          onOpenScanner={() => setIsScannerOpen(true)}
          onViewFullPassport={handleSelectBattery}
          onBackToDashboard={handleBackToDashboard}
        />

        {/* QR Scanner Modal available within Mobile View */}
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSelectBattery={(id) => {
            setActiveBatteryId(id);
            const url = new URL(window.location);
            url.searchParams.set('id', id);
            window.history.pushState({}, '', url);
          }}
          onOpenMobileIntake={handleOpenMobileIntake}
        />
      </div>
    );
  }

  // Standard Enterprise Desktop View
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenMobileIntake={() => handleOpenMobileIntake(activeBatteryId || 'VT-1001')}
        activeBatteryId={activeBatteryId}
        onBackToDashboard={handleBackToDashboard}
        onRefresh={handleRefresh}
      />

      <main style={{ flex: 1 }}>
        {activeBatteryId ? (
          <BatteryDetail
            key={`${activeBatteryId}-${refreshKey}`}
            batteryId={activeBatteryId}
            onBack={handleBackToDashboard}
            onOpenMobileIntake={() => handleOpenMobileIntake(activeBatteryId)}
          />
        ) : (
          <Dashboard
            key={refreshKey}
            onSelectBattery={handleSelectBattery}
            onOpenMobileIntake={handleOpenMobileIntake}
          />
        )}
      </main>

      {/* Industrial Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', borderTop: '1px solid #334155', padding: '2rem 1.5rem', marginTop: '3rem', fontSize: '0.8rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
              VoltTrace — Every Battery Has a Story
            </div>
            <div style={{ marginTop: '0.2rem' }}>
              A Digital Battery Passport & Triage Platform for EV Second-Life Applications.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => handleOpenMobileIntake(activeBatteryId || 'VT-1001')}
              style={{ background: '#1e293b', border: '1px solid #0284c7', color: '#38bdf8', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              📱 Mobile QR Intake Mode
            </button>
            <span>EU Regulation 2023/1542</span>
            <span>CIRPASS DPP Standard</span>
            <span>India BWMR 2022</span>
            <span>Ed25519 & SHA-256 Verified</span>
          </div>
        </div>
      </footer>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectBattery={handleSelectBattery}
        onOpenMobileIntake={handleOpenMobileIntake}
      />

      {/* Register Battery Modal */}
      <RegisterBatteryModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onCreated={(battery) => handleSelectBattery(battery.id)}
      />
    </div>
  );
}
