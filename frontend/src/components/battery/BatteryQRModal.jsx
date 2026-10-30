import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Copy, Check, Shield, Smartphone, ExternalLink } from 'lucide-react';
import { fetchNetworkInfo } from '../../api';

export default function BatteryQRModal({ battery, isOpen, onClose }) {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [useNetworkIp, setUseNetworkIp] = useState(true);
  const [qrTarget, setQrTarget] = useState('mobile'); // 'mobile' | 'desktop'
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

  if (!isOpen || !battery) return null;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const resolvedOrigin =
    isLocalhost && networkInfo?.lan_ip && useNetworkIp
      ? `http://${networkInfo.lan_ip}:${window.location.port || '5173'}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://volttrace.io';

  const passportUrl =
    qrTarget === 'mobile'
      ? `${resolvedOrigin}/mobile-intake?id=${battery.id}`
      : `${resolvedOrigin}/?id=${battery.id}&view=desktop`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(passportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', borderRadius: '12px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Battery QR Code
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              Digital identity for {battery.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', border: 'none', borderRadius: '6px' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          {/* Target selector */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '0.25rem',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '360px'
          }}>
            <button
              type="button"
              onClick={() => setQrTarget('mobile')}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: qrTarget === 'mobile' ? '#FFFFFF' : 'transparent',
                color: qrTarget === 'mobile' ? '#4F46E5' : '#64748B',
                boxShadow: qrTarget === 'mobile' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Smartphone size={14} /> Mobile Field Intake
            </button>
            <button
              type="button"
              onClick={() => setQrTarget('desktop')}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: qrTarget === 'desktop' ? '#FFFFFF' : 'transparent',
                color: qrTarget === 'desktop' ? '#4F46E5' : '#64748B',
                boxShadow: qrTarget === 'desktop' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <ExternalLink size={14} /> Full Record View
            </button>
          </div>

          {/* QR Code Container */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <QRCodeSVG
              value={passportUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.02em', display: 'block' }}>
                {battery.id}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {battery.manufacturer ? `${battery.manufacturer} • ` : ''}{battery.model || battery.chemistry}
              </span>
            </div>
          </div>

          {/* Network IP switch (for local testing with real phones) */}
          {isLocalhost && networkInfo?.lan_ip && (
            <div style={{
              fontSize: '0.75rem',
              color: '#64748B',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Network: <strong>{useNetworkIp ? `Wi-Fi (${networkInfo.lan_ip})` : 'localhost'}</strong></span>
              <button
                type="button"
                onClick={() => setUseNetworkIp(!useNetworkIp)}
                style={{ color: '#4F46E5', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'underline' }}
              >
                Switch to {useNetworkIp ? 'localhost' : 'Wi-Fi IP'}
              </button>
            </div>
          )}

          {/* Read-Only Security Notice */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.78rem',
            color: '#64748B',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            lineHeight: 1.45
          }}>
            <Shield size={16} color="#64748B" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <strong style={{ color: '#0F172A' }}>Read-only identifier:</strong> Scanning this QR code opens this battery's public passport records. It does not grant permission to edit or alter records.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            {copied ? <Check size={14} color="#15803D" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem' }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
