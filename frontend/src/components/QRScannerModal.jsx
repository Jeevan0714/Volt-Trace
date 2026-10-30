import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  CheckCircle2,
  BatteryCharging,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { fetchNetworkInfo } from '../api';

export default function QRScannerModal({
  isOpen,
  onClose,
  onSelectBattery,
  onOpenMobileIntake
}) {
  const [selectedBatteryId, setSelectedBatteryId] = useState('VT-1001');
  const [manualId, setManualId] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo().then((info) => {
        if (info && info.lan_ip) {
          setNetworkInfo(info);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const resolvedOrigin =
    isLocalhost && networkInfo?.lan_ip
      ? `http://${networkInfo.lan_ip}:${window.location.port || '5173'}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://volttrace.io';

  const mobileIntakeUrl = `${resolvedOrigin}/mobile-intake?id=${selectedBatteryId}`;

  const handleManualLookup = (e, mode = 'desktop') => {
    e.preventDefault();
    const target = (manualId || selectedBatteryId).trim().toUpperCase();
    if (!target) return;

    if (mode === 'mobile') {
      if (onOpenMobileIntake) {
        onOpenMobileIntake(target);
      } else {
        window.location.href = `/mobile-intake?id=${target}`;
      }
    } else {
      onSelectBattery(target);
    }
    onClose();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(mobileIntakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay animate-fade">
      <div className="modal-content" style={{ maxWidth: '560px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #0284c7'
              }}
            >
              <Smartphone size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Mobile Intake & QR Link
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
                Scan with smartphone camera to open field wizard or lookup directly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#cbd5e1'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', background: '#0f172a', color: '#f8fafc' }}>
          {/* Section 1: Phone QR Code */}
          <div
            style={{
              background: '#1e293b',
              border: '1.5px solid #334155',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              marginBottom: '1.25rem'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '0.6rem',
                borderRadius: '10px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <QRCodeSVG value={mobileIntakeUrl} size={135} level="H" includeMargin={false} />
              <span
                style={{
                  fontSize: '0.58rem',
                  color: '#0f172a',
                  fontWeight: 800,
                  marginTop: '0.35rem',
                  letterSpacing: '0.04em'
                }}
              >
                📱 SCAN WITH PHONE
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#38bdf8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Physical Battery QR Simulator
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                Open Field Intake on Your Phone
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem', lineHeight: 1.4 }}>
                Point your phone's native camera at this code. It opens the fast intake form for battery{' '}
                <strong style={{ color: '#38bdf8' }}>{selectedBatteryId}</strong>.
              </p>

              {/* Wi-Fi Host Info */}
              <div
                style={{
                  marginTop: '0.65rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mobileIntakeUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copied ? '#34d399' : '#38bdf8',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginLeft: '0.5rem'
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Switch Target Battery */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
              SELECT DEMO BATTERY PACK:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedBatteryId('VT-1001');
                }}
                style={{
                  background: selectedBatteryId === 'VT-1001' ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  border: `1.5px solid ${selectedBatteryId === 'VT-1001' ? '#38bdf8' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '0.65rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.85rem' }}>
                  <BatteryCharging size={16} color="#34d399" />
                  <span>VT-1001</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Pack-75-NMC • Active in Fleet
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedBatteryId('VT-1002');
                }}
                style={{
                  background: selectedBatteryId === 'VT-1002' ? 'rgba(239, 68, 68, 0.15)' : '#1e293b',
                  border: `1.5px solid ${selectedBatteryId === 'VT-1002' ? '#ef4444' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '0.65rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.85rem' }}>
                  <BatteryCharging size={16} color="#f87171" />
                  <span>VT-1002</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Blade-60-LFP • Tamper / Contradiction
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Manual Direct Lookup & Actions */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
              OR LOOK UP MANUALLY ON DESKTOP:
            </div>

            <form style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="e.g. VT-1001 or VT-1002"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="button"
                onClick={(e) => handleManualLookup(e, 'mobile')}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Smartphone size={14} /> Open Mobile Intake
              </button>
              <button
                type="button"
                onClick={(e) => handleManualLookup(e, 'desktop')}
                className="btn btn-secondary"
                style={{
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                Full Dossier <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
