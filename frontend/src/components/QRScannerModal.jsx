import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, ArrowRight, BatteryCharging, AlertCircle } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onSelectBattery }) {
  const [manualId, setManualId] = useState('');
  const [scannerError, setScannerError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let scanner = null;
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { fps: 10, qrbox: { width: 220, height: 220 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            // Check if URL or raw battery ID
            let extractedId = decodedText.trim();
            if (extractedId.includes('id=')) {
              const urlParams = new URLSearchParams(extractedId.split('?')[1]);
              extractedId = urlParams.get('id') || extractedId;
            } else if (extractedId.includes('/passport/')) {
              extractedId = extractedId.split('/passport/')[1];
            }
            if (scanner) {
              scanner.clear().catch(() => {});
            }
            onSelectBattery(extractedId);
            onClose();
          },
          (error) => {
            // Scanner read frame attempt (silent)
          }
        );
        scannerRef.current = scanner;
      } catch (err) {
        setScannerError('Could not access camera. You can use Quick Demo selection below.');
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      onSelectBattery(manualId.trim());
      onClose();
    }
  };

  return (
    <div className="modal-overlay animate-fade">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scan Inbound Battery QR Code</h3>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Point your webcam or phone camera at the physical battery placard QR code to open its digital passport immediately.
          </p>

          <div
            id="qr-reader-container"
            style={{ width: '100%', minHeight: '260px', background: '#0f172a', borderRadius: '10px', overflow: 'hidden' }}
          ></div>

          {scannerError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--warning-amber-bg)', color: 'var(--warning-amber)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.75rem', fontSize: '0.8rem' }}>
              <AlertCircle size={16} />
              <span>{scannerError}</span>
            </div>
          )}

          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR ENTER MANUALLY</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="e.g. VT-1001 or VT-1002"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary">
              Lookup <ArrowRight size={15} />
            </button>
          </form>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              QUICK DEMO PRESETS:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { onSelectBattery('VT-1001'); onClose(); }}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem' }}
              >
                <BatteryCharging size={14} color="var(--verified-green)" />
                VT-1001 (Clean Demo)
              </button>
              <button
                type="button"
                onClick={() => { onSelectBattery('VT-1002'); onClose(); }}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem' }}
              >
                <AlertCircle size={14} color="var(--danger-red)" />
                VT-1002 (Tamper Demo)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
