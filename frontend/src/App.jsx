import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import BatteryDetail from './pages/BatteryDetail';
import QRScannerModal from './components/QRScannerModal';
import RegisterBatteryModal from './components/RegisterBatteryModal';

export default function App() {
  const [activeBatteryId, setActiveBatteryId] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check URL parameters on mount (e.g., when scanned via phone QR code)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      setActiveBatteryId(idParam);
    }
  }, []);

  const handleSelectBattery = (id) => {
    setActiveBatteryId(id);
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    window.history.pushState({}, '', url);
  };

  const handleBackToDashboard = () => {
    setActiveBatteryId(null);
    const url = new URL(window.location);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
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
          />
        ) : (
          <Dashboard
            key={refreshKey}
            onSelectBattery={handleSelectBattery}
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

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
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
