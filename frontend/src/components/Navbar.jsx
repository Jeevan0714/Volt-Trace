import React from 'react';
import { Zap, QrCode, PlusCircle, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

export default function Navbar({ onOpenScanner, onOpenRegister, activeBatteryId, onBackToDashboard, onRefresh }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {activeBatteryId && (
            <button
              onClick={onBackToDashboard}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem' }}
              title="Return to Battery Registry"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div 
            className="brand-logo" 
            style={{ cursor: 'pointer' }}
            onClick={onBackToDashboard}
          >
            <div className="brand-icon-wrapper">
              <Zap size={22} strokeWidth={2.5} />
            </div>
            <div className="brand-text">
              <h1>
                VoltTrace <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>v1.0</span>
              </h1>
              <p>Every Battery Has a Story • DPP & Triage Engine</p>
            </div>
          </div>
        </div>

        <div className="nav-actions">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn btn-secondary"
              title="Refresh Data"
            >
              <RefreshCw size={15} />
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className="btn btn-secondary"
            title="Scan QR Code with Camera"
          >
            <QrCode size={16} /> Scan Battery QR
          </button>

          <button
            onClick={onOpenRegister}
            className="btn btn-primary"
            title="Register a New Battery"
          >
            <PlusCircle size={16} /> Register Battery
          </button>
        </div>
      </div>
    </header>
  );
}
