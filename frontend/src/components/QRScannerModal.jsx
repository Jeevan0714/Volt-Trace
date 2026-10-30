import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  BatteryCharging,
  ArrowRight,
  RefreshCw,
  FileImage,
  QrCode,
  Sparkles
} from 'lucide-react';

/**
 * Robust Battery ID extractor from raw scanned QR string or URL
 */
export function parseBatteryIdFromScan(rawText) {
  if (!rawText) return '';
  const text = rawText.trim();

  // 1. Try URL parsing
  try {
    const url = new URL(text);
    if (url.searchParams.has('id')) {
      return url.searchParams.get('id').trim().toUpperCase();
    }
    const pathParts = url.pathname.split('/').filter(Boolean);
    const passportIdx = pathParts.indexOf('passport');
    if (passportIdx !== -1 && pathParts[passportIdx + 1]) {
      return pathParts[passportIdx + 1].trim().toUpperCase();
    }
  } catch {
    // Not a URL, continue matching
  }

  // 2. Query param style string: "?id=VT-1001" or "id=VT-1001"
  const idMatch = text.match(/[?&]id=([A-Za-z0-9_-]+)/i);
  if (idMatch) {
    return idMatch[1].trim().toUpperCase();
  }

  // 3. Path style: "/passport/VT-1001"
  const passportMatch = text.match(/\/passport\/([A-Za-z0-9_-]+)/i);
  if (passportMatch) {
    return passportMatch[1].trim().toUpperCase();
  }

  // 4. URN style: "urn:volttrace:battery:vt-1001-nmc-2023"
  const urnMatch = text.match(/urn:volttrace:battery:([A-Za-z0-9]+-[0-9]+)/i);
  if (urnMatch) {
    return urnMatch[1].trim().toUpperCase();
  }

  // 5. JSON payload (e.g. {"id":"VT-1001"} or {"battery_id":"VT-1001"})
  try {
    const parsed = JSON.parse(text);
    if (parsed.id) return String(parsed.id).trim().toUpperCase();
    if (parsed.battery_id) return String(parsed.battery_id).trim().toUpperCase();
  } catch {
    // Not JSON
  }

  // 6. Direct Clean ID: strip whitespace and uppercase
  return text.toUpperCase();
}

export default function QRScannerModal({ isOpen, onClose, onSelectBattery }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'initializing' | 'active' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [successBatteryId, setSuccessBatteryId] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [manualId, setManualId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileScanLoading, setFileScanLoading] = useState(false);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(false);

  // Handle successful scan
  const handleScanSuccess = useCallback((decodedText) => {
    const extractedId = parseBatteryIdFromScan(decodedText);
    if (!extractedId) return;

    setSuccessBatteryId(extractedId);

    // Stop camera immediately
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.getState() === 2) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
      } catch {
        // silent cleanup
      }
    }

    // Brief smooth feedback animation before navigating
    setTimeout(() => {
      onSelectBattery(extractedId);
      onClose();
    }, 450);
  }, [onSelectBattery, onClose]);

  // Clean stop helper
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.getState() === 2) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop error:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  }, []);

  // Initialize Camera Scanner
  useEffect(() => {
    mountedRef.current = true;

    if (!isOpen || activeTab !== 'camera' || successBatteryId) {
      stopScanner();
      return;
    }

    let isCancelled = false;

    const startCamera = async () => {
      setCameraStatus('initializing');
      setErrorMessage(null);

      // Clean existing instance
      await stopScanner();
      if (isCancelled) return;

      try {
        const qrCodeInstance = new Html5Qrcode('volttrace-qr-camera-region');
        html5QrCodeRef.current = qrCodeInstance;

        // Discover cameras
        let cameras = [];
        try {
          cameras = await Html5Qrcode.getCameras();
          if (mountedRef.current && cameras && cameras.length > 0) {
            setAvailableCameras(cameras);
            if (!selectedCameraId) {
              setSelectedCameraId(cameras[0].id);
            }
          }
        } catch (camErr) {
          console.warn('Camera discovery fallback:', camErr);
        }

        if (isCancelled) return;

        // Choose camera constraint
        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        await qrCodeInstance.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: 210, height: 210 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isCancelled) {
              handleScanSuccess(decodedText);
            }
          },
          () => {
            // Frame evaluation (ignore)
          }
        );

        if (!isCancelled && mountedRef.current) {
          setCameraStatus('active');
        }
      } catch (err) {
        if (!isCancelled && mountedRef.current) {
          console.warn('Camera startup failed:', err);
          setCameraStatus('error');
          const errorMsg =
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera permissions in your browser or switch to Image Upload.'
              : err.name === 'NotFoundError'
              ? 'No camera found on this device. You can upload a QR image or select a demo pack.'
              : 'Unable to start camera stream. You can upload an image file or enter the Battery ID below.';
          setErrorMessage(errorMsg);
        }
      }
    };

    const timer = setTimeout(startCamera, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, activeTab, selectedCameraId, successBatteryId, handleScanSuccess, stopScanner]);

  // Handle Scan from Image File
  const handleFileScan = async (file) => {
    if (!file) return;
    setFileScanLoading(true);
    setErrorMessage(null);

    try {
      // Ensure temp scanner element exists
      const tempId = 'volttrace-file-scanner-temp';
      let tempElem = document.getElementById(tempId);
      if (!tempElem) {
        tempElem = document.createElement('div');
        tempElem.id = tempId;
        tempElem.style.display = 'none';
        document.body.appendChild(tempElem);
      }

      const fileScanner = new Html5Qrcode(tempId);
      const decodedText = await fileScanner.scanFile(file, false);
      fileScanner.clear();

      if (decodedText) {
        handleScanSuccess(decodedText);
      } else {
        setErrorMessage('No readable QR code found in this image. Try another photo or a clearer screenshot.');
      }
    } catch (err) {
      console.warn('File scan failed:', err);
      setErrorMessage('Could not decode a valid QR code from the uploaded image. Please ensure the QR code is in focus.');
    } finally {
      setFileScanLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileScan(e.dataTransfer.files[0]);
    }
  };

  // Manual ID lookup
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      handleScanSuccess(manualId.trim());
    }
  };

  // Reset modal state on close
  useEffect(() => {
    if (!isOpen) {
      setSuccessBatteryId(null);
      setErrorMessage(null);
      setCameraStatus('idle');
      setManualId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '560px', width: '92%', overflow: 'hidden' }}>
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem', borderRadius: '8px' }}>
              <QrCode size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Scan Battery Placard QR
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Instant access to Digital Battery Passport & Triage Dossier
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {/* Success Banner */}
          {successBatteryId && (
            <div style={{ background: 'var(--verified-green-bg)', border: '1px solid var(--verified-green-border)', color: 'var(--verified-green)', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }} className="animate-fade">
              <CheckCircle2 size={24} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  QR Code Successfully Scanned!
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  Opening Digital Passport for <strong>{successBatteryId}</strong>...
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="qr-tab-nav">
            <button
              type="button"
              className={`qr-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => { setActiveTab('camera'); setErrorMessage(null); }}
            >
              <Camera size={15} />
              <span>Live Camera</span>
            </button>
            <button
              type="button"
              className={`qr-tab-btn ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => { setActiveTab('file'); setErrorMessage(null); stopScanner(); }}
            >
              <UploadCloud size={15} />
              <span>Upload QR Image</span>
            </button>
            <button
              type="button"
              className={`qr-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => { setActiveTab('manual'); setErrorMessage(null); stopScanner(); }}
            >
              <ArrowRight size={15} />
              <span>Quick Lookup</span>
            </button>
          </div>

          {/* TAB 1: LIVE CAMERA SCANNER */}
          {activeTab === 'camera' && (
            <div>
              <div className="scanner-viewport">
                {/* HTML5 QR target element */}
                <div id="volttrace-qr-camera-region" className="scanner-video-container"></div>

                {/* Styled Viewfinder Overlay */}
                {cameraStatus === 'active' && (
                  <div className="scanner-overlay">
                    <div className="scanner-box">
                      <div className="scanner-corner tl"></div>
                      <div className="scanner-corner tr"></div>
                      <div className="scanner-corner bl"></div>
                      <div className="scanner-corner br"></div>
                      <div className="scanner-laser"></div>
                    </div>
                  </div>
                )}

                {/* Camera Initializing Overlay */}
                {cameraStatus === 'initializing' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.6rem', background: '#090d16' }}>
                    <RefreshCw size={24} className="animate-spin" color="#38bdf8" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Accessing Camera...</span>
                  </div>
                )}

                {/* Camera Error Overlay */}
                {cameraStatus === 'error' && (
                  <div style={{ position: 'absolute', inset: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#f8fafc', background: '#090d16', gap: '0.75rem' }}>
                    <AlertCircle size={32} color="#f87171" />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Camera Stream Unavailable</div>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '340px', margin: 0 }}>
                      {errorMessage || 'Camera access was blocked or no camera was found.'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setActiveTab('file')}
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
                      >
                        <UploadCloud size={14} /> Upload QR Image Instead
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
                      >
                        Use Demo Preset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Switcher (if multiple cameras exist) */}
              {availableCameras.length > 1 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                  >
                    {availableCameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Camera ${cam.id.slice(0, 6)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem', marginBottom: 0 }}>
                Align the GS1 QR code on the physical battery placard inside the target frame.
              </p>
            </div>
          )}

          {/* TAB 2: UPLOAD / DRAG & DROP IMAGE */}
          {activeTab === 'file' && (
            <div>
              <div
                className={`qr-dropzone ${isDragging ? 'drag-active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileScan(e.target.files[0]);
                    }
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '50%' }}>
                    {fileScanLoading ? <RefreshCw size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {fileScanLoading ? 'Analyzing & Decoding QR Code...' : 'Click to Upload or Drag & Drop'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Supports PNG, JPG, JPEG, WEBP photos or screenshots of battery placards
                    </div>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-red-bg)', color: 'var(--danger-red)', padding: '0.65rem 0.85rem', borderRadius: '8px', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sample QR Placard Cards you can test scan in 1-click */}
              <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'var(--bg-app)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  <Sparkles size={13} color="var(--primary)" />
                  TEST SCAN REAL SAMPLE PLACARDS:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div
                    onClick={() => handleScanSuccess('VT-1001')}
                    style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                    className="hover-card"
                  >
                    <div style={{ padding: '0.25rem', background: '#f8fafc', borderRadius: '4px' }}>
                      <QRCodeSVG value="http://localhost:5173/?id=VT-1001" size={48} level="M" />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--verified-green)' }}>
                        ✓ VT-1001
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Clean Pack Sample
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => handleScanSuccess('VT-1002')}
                    style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                    className="hover-card"
                  >
                    <div style={{ padding: '0.25rem', background: '#f8fafc', borderRadius: '4px' }}>
                      <QRCodeSVG value="http://localhost:5173/?id=VT-1002" size={48} level="M" />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-red)' }}>
                        🚨 VT-1002
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Tamper Demo Sample
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK LOOKUP & MANUAL INPUT */}
          {activeTab === 'manual' && (
            <div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  placeholder="Enter Battery ID (e.g. VT-1001) or paste QR URL"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.15rem' }}>
                  Lookup <ArrowRight size={15} />
                </button>
              </form>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                FAST DEMO PRESETS:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleScanSuccess('VT-1001')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.85rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <BatteryCharging size={18} color="var(--verified-green)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>VT-1001 (Clean & Verified Pack)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>75 kWh NMC • Bitwise SHA-256 Match • ~10.5 hrs saved</div>
                    </div>
                  </div>
                  <ArrowRight size={15} color="var(--text-muted)" />
                </button>

                <button
                  type="button"
                  onClick={() => handleScanSuccess('VT-1002')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.85rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <AlertCircle size={18} color="var(--danger-red)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, color: 'var(--danger-red)' }}>VT-1002 (Tampered / Cheater Demo)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>60 kWh LFP • File Hash Mismatch • Impossible +10% SoH</div>
                    </div>
                  </div>
                  <ArrowRight size={15} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
