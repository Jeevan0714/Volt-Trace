import React, { useState, useEffect } from 'react';
import { Zap, QrCode, PlusCircle, ShieldCheck, ArrowLeft, RefreshCw, Wifi, Smartphone } from 'lucide-react';
import { fetchNetworkInfo } from '../api';

export default function Navbar({ onOpenScanner, onOpenRegister, activeBatteryId, onBackToDashboard, onRefresh }) {
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    fetchNetworkInfo().then((info) => {
      if (info?.lan_ip) setNetworkInfo(info);
    });
  }, []);

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
          {networkInfo?.lan_ip && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                padding: '0.35rem 0.65rem',
                borderRadius: '20px'
              }}
              title={`Mobile URL: http://${networkInfo.lan_ip}:5173`}
            >
              <Wifi size={13} color="var(--primary)" />
              <span className="hide-mobile">Phone: <strong>{networkInfo.lan_ip}:5173</strong></span>
            </div>
          )}

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
