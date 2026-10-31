import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BatteryCharging,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Factory,
  Wrench,
  Briefcase,
  Recycle,
  Sparkles,
  Camera,
  QrCode,
  Lock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  User,
  Download,
  ChevronDown,
  FileCheck,
  Phone,
  MessageSquare,
  IndianRupee,
  Share2
} from 'lucide-react';
import { fetchBatteryDetail, submitRoleIntake, fetchBatteries, uploadDocument } from '../api';
import { generateServiceInvoicePDF } from '../utils/pdfGenerator';

/**
 * Fast client-side SHA-256 for instant verification badge
 */
async function computeSha256Hex(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

export default function MobileIntake({
  batteryId: initialBatteryId,
  onOpenScanner,
  onViewFullPassport,
  onBackToDashboard
}) {
  const [currentBatteryId, setCurrentBatteryId] = useState(initialBatteryId || 'VT-1001');
  const [battery, setBattery] = useState(null);
  const [loadingBattery, setLoadingBattery] = useState(true);
  const [batteryError, setBatteryError] = useState(null);

  // Workflow Step: 'SELECT_ROLE' | 'FORM' | 'CONFIRMATION'
  const [step, setStep] = useState('SELECT_ROLE');
  const [selectedRole, setSelectedRole] = useState(null); // 'MANUFACTURER' | 'ASSEMBLER' | 'SELLER' | 'RECYCLER'

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  // Global payment & invoice metadata for confirmation view
  const [lastInvoiceMeta, setLastInvoiceMeta] = useState({
    cost: '14500',
    phone: '+91 98765 43210',
    upiId: 'zypp.mobility@oksbi'
  });
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Quick battery search dropdown for field testing
  const [showBatteryPicker, setShowBatteryPicker] = useState(false);
  const [availableBatteries, setAvailableBatteries] = useState([]);

  // Field Operator / Logged-in User State (persisted across QR scans)
  const getInitialOperator = () => {
    try {
      const saved = localStorage.getItem('volttrace_operator');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      name: 'Technician Sharma',
      id: 'TECH-409',
      organization: 'Zypp Mobility Hub Bangalore',
      phone: '+91 98765 43210',
      upi_id: 'zypp.mobility@oksbi'
    };
  };

  const [operator, setOperator] = useState(getInitialOperator);
  const [operatorSavedToast, setOperatorSavedToast] = useState(false);
  const [showRecentDocs, setShowRecentDocs] = useState(false);

  // Direct Mobile PDF Upload State
  const [directPdf, setDirectPdf] = useState({
    file: null,
    fileName: '',
    fileSize: '',
    fileHash: '',
    documentType: 'DIAGNOSTIC_REPORT',
    uploading: false,
    uploadSuccess: null,
    uploadError: null
  });

  // Role 1: Manufacturer Form State
  const [mfgForm, setMfgForm] = useState({
    actor_name: operator.name || 'Lead Engineer Patel',
    organization: operator.organization || 'VoltTrace Certified Gigafactory',
    factory_serial_number: 'VT-SN-2023-8891',
    cell_lot_id: 'LOT-NMC-B44',
    chemistry: 'NMC 811',
    rated_capacity_kwh: '75.0',
    nominal_voltage: '400.0',
    cell_manufacturer: 'CATL Ningde Facility',
    plant_location: 'VoltTrace Plant #2 Pune',
    file: null,
    file_name: '',
    file_base64: '',
    file_hash: '',
    notes: 'Standard production quality benchmark and cell impedance screening passed.'
  });

  // Role 2: Assembler / Technician Form State
  const [assemblerForm, setAssemblerForm] = useState({
    actor_name: 'Technician Sharma',
    organization: 'Zypp Mobility Central Hub Bangalore',
    technician_id: 'TECH-409',
    action_type: 'Periodic Diagnostic',
    reported_soh: '86.5',
    cell_variance_mv: '12.0',
    measured_capacity_kwh: '64.8',
    repair_cost: '14500',
    customer_phone: '+91 98765 43210',
    module_replaced: false,
    new_module_serial: 'MOD-2026-NMC-99',
    cells_replaced_count: '12',
    oem_compatibility_cert: 'OEM-CERT-VT-2026-90',
    file: null,
    file_name: '',
    file_base64: '',
    file_hash: '',
    notes: 'Mandatory Policy VT-202 diagnostic check completed with calibrated cycler.'
  });

  // Role 3: Seller / Fleet Owner Form State
  const [sellerForm, setSellerForm] = useState({
    actor_name: 'Fleet Manager Verma',
    organization: 'Zypp Fleet Logistics Ltd',
    vehicle_info: 'Tata Nexon EV Max (Chassis #NEV-9081)',
    odometer_km: '68000',
    decommission_reason: 'Fleet retirement and vehicle fleet upgrade',
    accident_or_thermal_history: false,
    submersion_history: false,
    reported_soh: '80.0', // change to 85.0 to trigger anti-fraud
    file: null,
    file_name: '',
    file_base64: '',
    file_hash: '',
    notes: 'Scheduled fleet decommission. Normal city delivery duty cycle.'
  });

  // Role 4: Recycler / Inspector Form State
  const [recyclerForm, setRecyclerForm] = useState({
    actor_name: 'Inspector Kulkarni',
    organization: 'EcoTrace Qualified Depot #4',
    swelling_detected: false,
    corrosion_detected: false,
    leak_detected: false,
    reported_soh: '78.5',
    measured_capacity_kwh: '58.8',
    internal_resistance_mohm: '19.2',
    ambient_temp_c: '24.5',
    disposition: 'SECOND_LIFE_BESS', // SECOND_LIFE_BESS | REPAIR_REQUIRED | RECYCLING_PROCESSED
    file: null,
    file_name: '',
    file_base64: '',
    file_hash: '',
    notes: 'Inbound physical triage completed. Pack structural enclosure in good condition.'
  });

  // Load battery detail
  const loadBattery = async (id) => {
    setLoadingBattery(true);
    setBatteryError(null);
    try {
      const data = await fetchBatteryDetail(id);
      setBattery(data);

      // Auto update form defaults based on current battery
      if (data) {
        setMfgForm(prev => ({
          ...prev,
          chemistry: data.chemistry || prev.chemistry,
          rated_capacity_kwh: String(data.rated_capacity_kwh || prev.rated_capacity_kwh),
          nominal_voltage: String(data.nominal_voltage || prev.nominal_voltage)
        }));
        setSellerForm(prev => ({
          ...prev,
          organization: data.current_owner || prev.organization,
          vehicle_info: data.vehicle_info || prev.vehicle_info
        }));
      }
    } catch (err) {
      setBatteryError(err.message || 'Failed to load battery information');
    } finally {
      setLoadingBattery(false);
    }
  };

  useEffect(() => {
    if (initialBatteryId) {
      setCurrentBatteryId(initialBatteryId);
      loadBattery(initialBatteryId);
    } else {
      loadBattery('VT-1001');
    }

    // Load available batteries for quick field picker
    fetchBatteries().then(list => {
      if (Array.isArray(list)) setAvailableBatteries(list);
    }).catch(() => {});
  }, [initialBatteryId]);

  const handleSelectDifferentBattery = (newId) => {
    setCurrentBatteryId(newId);
    setShowBatteryPicker(false);
    setStep('SELECT_ROLE');
    setSubmissionResult(null);
    loadBattery(newId);

    // Update URL param
    const url = new URL(window.location);
    url.searchParams.set('id', newId);
    window.history.pushState({}, '', url);
  };

  const handleSaveOperator = (e) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem('volttrace_operator', JSON.stringify(operator));
    } catch {}
    setOperatorSavedToast(true);
    setTimeout(() => setOperatorSavedToast(false), 2500);

    // Sync into role forms
    setMfgForm(prev => ({ ...prev, actor_name: operator.name, organization: operator.organization }));
    setAssemblerForm(prev => ({ ...prev, actor_name: operator.name, technician_id: operator.id, organization: operator.organization }));
    setSellerForm(prev => ({ ...prev, actor_name: operator.name, organization: operator.organization }));
    setRecyclerForm(prev => ({ ...prev, actor_name: operator.name, organization: operator.organization }));
  };

  const handleDirectPdfChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const hash = await computeSha256Hex(file);
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      setDirectPdf(prev => ({
        ...prev,
        file,
        fileName: file.name,
        fileSize: sizeStr,
        fileHash: hash,
        uploadSuccess: null,
        uploadError: null
      }));
    } catch (err) {
      setDirectPdf(prev => ({
        ...prev,
        uploadError: 'Error reading file: ' + err.message
      }));
    }
  };

  const handleDirectPdfUpload = async (e) => {
    e.preventDefault();
    if (!directPdf.file) {
      setDirectPdf(prev => ({ ...prev, uploadError: 'Please choose a PDF file first.' }));
      return;
    }

    setDirectPdf(prev => ({ ...prev, uploading: true, uploadError: null, uploadSuccess: null }));
    try {
      const formData = new FormData();
      formData.append('file', directPdf.file);
      formData.append('document_type', directPdf.documentType);
      formData.append('issuer_name', `${operator.name} (${operator.organization})`);

      const res = await uploadDocument(currentBatteryId, formData);
      setDirectPdf(prev => ({
        ...prev,
        uploading: false,
        file: null,
        fileName: '',
        fileSize: '',
        fileHash: '',
        uploadSuccess: `Document "${res.file_name}" uploaded & cryptographically registered to ${currentBatteryId}! SHA-256: ${res.file_hash_sha256.slice(0, 16)}...`
      }));
      // Reload battery details so uploaded document appears in passport immediately
      loadBattery(currentBatteryId);
    } catch (err) {
      setDirectPdf(prev => ({
        ...prev,
        uploading: false,
        uploadError: err.message || 'PDF upload failed. Please try again.'
      }));
    }
  };

  const handleFileUpload = async (e, formType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const hash = await computeSha256Hex(file);
      const b64 = await fileToBase64(file);
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const updateData = {
        file,
        file_name: file.name,
        file_size: sizeStr,
        file_base64: b64,
        file_hash: hash
      };

      if (formType === 'mfg') setMfgForm(p => ({ ...p, ...updateData }));
      else if (formType === 'assembler') setAssemblerForm(p => ({ ...p, ...updateData }));
      else if (formType === 'seller') setSellerForm(p => ({ ...p, ...updateData }));
      else if (formType === 'recycler') setRecyclerForm(p => ({ ...p, ...updateData }));
    } catch (err) {
      alert('Error reading attachment: ' + err.message);
    }
  };

  // Submit Handler
  const handleSubmitIntake = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    let payload = {
      role: selectedRole,
    };
    let selectedFormFile = null;
    let docTypeForRole = 'DIAGNOSTIC_REPORT';

    if (selectedRole === 'MANUFACTURER') {
      selectedFormFile = mfgForm.file;
      docTypeForRole = 'BIRTH_CERTIFICATE';
      payload = {
        ...payload,
        actor_name: mfgForm.actor_name,
        organization: mfgForm.organization,
        factory_serial_number: mfgForm.factory_serial_number,
        cell_lot_id: mfgForm.cell_lot_id,
        chemistry: mfgForm.chemistry,
        rated_capacity_kwh: parseFloat(mfgForm.rated_capacity_kwh) || undefined,
        nominal_voltage: parseFloat(mfgForm.nominal_voltage) || undefined,
        cell_manufacturer: mfgForm.cell_manufacturer,
        plant_location: mfgForm.plant_location,
        file_name: mfgForm.file_name,
        file_base64: mfgForm.file_base64,
        file_hash_sha256: mfgForm.file_hash,
        notes: mfgForm.notes
      };
      setLastInvoiceMeta({
        cost: '18500',
        phone: operator.phone || '+91 98765 43210',
        upiId: operator.upi_id || 'zypp.mobility@oksbi'
      });
    } else if (selectedRole === 'ASSEMBLER') {
      selectedFormFile = assemblerForm.file;
      const isReplacement = assemblerForm.action_type === 'Module Replacement' || assemblerForm.module_replaced;
      docTypeForRole = isReplacement ? 'MODULE_REPLACEMENT' : 'DIAGNOSTIC_REPORT';
      setLastInvoiceMeta({
        cost: assemblerForm.repair_cost || '14500',
        phone: assemblerForm.customer_phone || operator.phone || '+91 98765 43210',
        upiId: operator.upi_id || 'zypp.mobility@oksbi'
      });
      payload = {
        ...payload,
        actor_name: `${assemblerForm.actor_name} (${assemblerForm.technician_id})`,
        organization: assemblerForm.organization,
        action_type: assemblerForm.action_type,
        reported_soh: parseFloat(assemblerForm.reported_soh),
        cell_variance_mv: parseFloat(assemblerForm.cell_variance_mv) || undefined,
        measured_capacity_kwh: parseFloat(assemblerForm.measured_capacity_kwh) || undefined,
        module_replaced: isReplacement,
        new_module_serial: isReplacement ? assemblerForm.new_module_serial : undefined,
        cells_replaced_count: isReplacement ? parseInt(assemblerForm.cells_replaced_count) : undefined,
        oem_compatibility_cert: isReplacement ? assemblerForm.oem_compatibility_cert : undefined,
        file_name: assemblerForm.file_name,
        file_base64: assemblerForm.file_base64,
        file_hash_sha256: assemblerForm.file_hash,
        notes: (assemblerForm.notes || '') + (assemblerForm.repair_cost ? ` [Repair Bill: ₹${assemblerForm.repair_cost}]` : '')
      };
    } else if (selectedRole === 'SELLER') {
      selectedFormFile = sellerForm.file;
      docTypeForRole = 'SERVICE_INVOICE';
      setLastInvoiceMeta({
        cost: '4500',
        phone: operator.phone || '+91 98765 43210',
        upiId: operator.upi_id || 'zypp.mobility@oksbi'
      });
      payload = {
        ...payload,
        actor_name: sellerForm.actor_name,
        organization: sellerForm.organization,
        vehicle_info: sellerForm.vehicle_info,
        odometer_km: parseInt(sellerForm.odometer_km) || undefined,
        decommission_reason: sellerForm.decommission_reason,
        accident_or_thermal_history: sellerForm.accident_or_thermal_history,
        submersion_history: sellerForm.submersion_history,
        physical_damage_detected: sellerForm.accident_or_thermal_history || sellerForm.submersion_history,
        reported_soh: parseFloat(sellerForm.reported_soh),
        file_name: sellerForm.file_name,
        file_base64: sellerForm.file_base64,
        file_hash_sha256: sellerForm.file_hash,
        notes: sellerForm.notes
      };
    } else if (selectedRole === 'RECYCLER') {
      selectedFormFile = recyclerForm.file;
      docTypeForRole = 'INSPECTION_REPORT';
      setLastInvoiceMeta({
        cost: '6800',
        phone: operator.phone || '+91 98765 43210',
        upiId: operator.upi_id || 'zypp.mobility@oksbi'
      });
      const hasDefects = recyclerForm.swelling_detected || recyclerForm.corrosion_detected || recyclerForm.leak_detected;
      payload = {
        ...payload,
        actor_name: recyclerForm.actor_name,
        organization: recyclerForm.organization,
        swelling_detected: recyclerForm.swelling_detected,
        corrosion_detected: recyclerForm.corrosion_detected,
        leak_detected: recyclerForm.leak_detected,
        physical_damage_detected: hasDefects,
        reported_soh: parseFloat(recyclerForm.reported_soh),
        measured_capacity_kwh: parseFloat(recyclerForm.measured_capacity_kwh) || undefined,
        internal_resistance_mohm: parseFloat(recyclerForm.internal_resistance_mohm) || undefined,
        ambient_temp_c: parseFloat(recyclerForm.ambient_temp_c) || undefined,
        disposition: recyclerForm.disposition,
        file_name: recyclerForm.file_name,
        file_base64: recyclerForm.file_base64,
        file_hash_sha256: recyclerForm.file_hash,
        notes: recyclerForm.notes
      };
    }

    try {
      const response = await submitRoleIntake(currentBatteryId, payload);
      
      // If a file was attached, also upload to official document repository
      if (selectedFormFile) {
        try {
          const docFormData = new FormData();
          docFormData.append('file', selectedFormFile);
          docFormData.append('document_type', docTypeForRole);
          docFormData.append('issuer_name', `${operator.name} (${operator.organization})`);
          await uploadDocument(currentBatteryId, docFormData);
        } catch (uploadErr) {
          console.warn('Attached document repository upload notice:', uploadErr);
        }
      }

      setSubmissionResult(response);
      setStep('CONFIRMATION');
      // Refresh current battery data in background
      loadBattery(currentBatteryId);
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Top Navigation & Identity Bar */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0.85rem 1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BatteryCharging size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                VoltTrace Mobile Intake
                <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                  QR FIELD
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                GS1 Data Carrier Portal • CIRPASS & DPP Ready
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                title="Scan GS1 QR Code"
              >
                <Camera size={14} /> Scan
              </button>
            )}
            {onViewFullPassport && (
              <button
                onClick={() => onViewFullPassport(currentBatteryId)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}
                title="View Full Enterprise Dossier"
              >
                <ExternalLink size={13} /> Full Dossier
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div style={{ flex: 1, padding: '1rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        {/* Step 1: Battery Identified Card */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                🔋 Battery Identified via QR
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em' }}>
                  {currentBatteryId}
                </span>
                {battery && (
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
                    ({battery.model || 'Pack'} • {battery.chemistry || 'NMC'} • {battery.rated_capacity_kwh || 75} kWh)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '20px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background:
                    battery?.status === 'quarantined'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(16, 185, 129, 0.2)',
                  color: battery?.status === 'quarantined' ? '#f87171' : '#34d399',
                  border: `1px solid ${battery?.status === 'quarantined' ? '#dc2626' : '#059669'}`
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: battery?.status === 'quarantined' ? '#ef4444' : '#10b981' }}></span>
                {battery?.status === 'quarantined' ? 'Quarantined / Hold' : 'Active in Fleet'}
              </span>

              <button
                type="button"
                onClick={() => setShowBatteryPicker(!showBatteryPicker)}
                style={{ background: 'none', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '0.2rem 0.45rem', fontSize: '0.68rem', cursor: 'pointer' }}
              >
                Switch ID
              </button>
            </div>
          </div>

          {/* Quick Battery Picker Modal / Dropdown */}
          {showBatteryPicker && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                Select Battery to Test Intake:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {availableBatteries.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectDifferentBattery(b.id)}
                    style={{
                      background: b.id === currentBatteryId ? '#0284c7' : '#0f172a',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: b.id === currentBatteryId ? 700 : 500
                    }}
                  >
                    {b.id} ({b.chemistry})
                  </button>
                ))}
              </div>
            </div>
          )}

          {batteryError && (
            <div style={{ marginTop: '0.6rem', color: '#f87171', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={14} /> {batteryError}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* OPERATOR SESSION CARD (Who is Logged In)                 */}
        {/* ======================================================== */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                  Field Operator Identity (Who is Logged In)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Technician / Inspector credentials recorded on this passport
                </div>
              </div>
            </div>

            {operatorSavedToast && (
              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={13} /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveOperator} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                Logged-in Technician / User *
              </label>
              <input
                type="text"
                required
                value={operator.name}
                onChange={e => setOperator({ ...operator, name: e.target.value })}
                placeholder="e.g. Technician Sharma"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.45rem 0.65rem', color: '#ffffff', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                Technician ID / Badge #
              </label>
              <input
                type="text"
                value={operator.id}
                onChange={e => setOperator({ ...operator, id: e.target.value })}
                placeholder="e.g. TECH-409"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.45rem 0.65rem', color: '#ffffff', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', fontWeight: 600 }}>
                <Phone size={11} /> WhatsApp Number (For Invoices)
              </label>
              <input
                type="text"
                value={operator.phone || ''}
                onChange={e => setOperator({ ...operator, phone: e.target.value })}
                placeholder="+91 98765 43210"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '6px', padding: '0.45rem 0.65rem', color: '#ffffff', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', fontWeight: 600 }}>
                <IndianRupee size={11} /> Default Workshop UPI ID
              </label>
              <input
                type="text"
                value={operator.upi_id || ''}
                onChange={e => setOperator({ ...operator, upi_id: e.target.value })}
                placeholder="zypp.mobility@oksbi"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #059669', borderRadius: '6px', padding: '0.45rem 0.65rem', color: '#ffffff', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                Service Hub / Workshop / Depot *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  required
                  value={operator.organization}
                  onChange={e => setOperator({ ...operator, organization: e.target.value })}
                  placeholder="e.g. Zypp Mobility Hub Bangalore"
                  style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.45rem 0.65rem', color: '#ffffff', fontSize: '0.82rem' }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Save Identity
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* DIRECT PDF / DOCUMENT UPLOAD CARD                        */}
        {/* ======================================================== */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={16} color="#34d399" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                  Upload Battery Report (PDF)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Upload diagnostic test report, cycler trace, or invoice
                </div>
              </div>
            </div>

            {battery?.documents && battery.documents.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRecentDocs(!showRecentDocs)}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>{battery.documents.length} Saved</span>
                <ChevronDown size={13} style={{ transform: showRecentDocs ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
              </button>
            )}
          </div>

          <form onSubmit={handleDirectPdfUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Document Classification *
              </label>
              <select
                value={directPdf.documentType}
                onChange={e => setDirectPdf({ ...directPdf, documentType: e.target.value })}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: '#ffffff', fontSize: '0.82rem' }}
              >
                <option value="DIAGNOSTIC_REPORT">Diagnostic Health Report (OBD / Cycler)</option>
                <option value="SERVICE_INVOICE">Service & Maintenance Invoice</option>
                <option value="MODULE_REPLACEMENT">Module / Cell Replacement Record</option>
                <option value="INSPECTION_REPORT">Depot Inbound Inspection Triage</option>
                <option value="BIRTH_CERTIFICATE">OEM Birth Certificate</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Select File (PDF, Images, CSV) *
              </label>
              <div style={{
                background: '#0f172a',
                border: '1.5px dashed #475569',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                position: 'relative'
              }}>
                <input
                  type="file"
                  required
                  accept=".pdf,application/pdf,.png,.jpg,.jpeg,.csv"
                  onChange={handleDirectPdfChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', pointerEvents: 'none' }}>
                  <Upload size={24} color="#38bdf8" />
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    {directPdf.fileName ? directPdf.fileName : 'Tap to Choose PDF / Document'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    {directPdf.fileSize ? `Size: ${directPdf.fileSize} • Tap to change` : 'Supports PDF reports, scan photos, and cycler traces up to 15MB'}
                  </div>
                </div>
              </div>
            </div>

            {directPdf.fileHash && (
              <div style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '6px', padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: '#94a3b8' }}>SHA-256 Fingerprint:</span>
                <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>
                  {directPdf.fileHash.slice(0, 16)}...{directPdf.fileHash.slice(-8)}
                </span>
              </div>
            )}

            {directPdf.uploadSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '6px', padding: '0.6rem', color: '#34d399', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                <span>{directPdf.uploadSuccess}</span>
              </div>
            )}

            {directPdf.uploadError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.6rem', color: '#f87171', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} />
                <span>{directPdf.uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={directPdf.uploading || !directPdf.file}
              style={{
                background: directPdf.uploading || !directPdf.file ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.7rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: directPdf.uploading || !directPdf.file ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                boxShadow: directPdf.file ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              <Upload size={16} />
              <span>{directPdf.uploading ? 'Uploading & Calculating Checksum...' : 'Upload PDF to Battery Passport'}</span>
            </button>
          </form>

          {showRecentDocs && battery?.documents && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Saved Passport Documents ({battery.documents.length}):
              </div>
              {battery.documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>{doc.file_name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                      {doc.document_type?.replace(/_/g, ' ')} • {doc.issuer_name}
                    </div>
                  </div>
                  <a
                    href={`/api/v1/batteries/${battery.id}/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    <Download size={12} /> View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* STEP 2: ROLE SELECTION ("Who are you?")                   */}
        {/* ======================================================== */}
        {step === 'SELECT_ROLE' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 1 of 2
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '0.15rem' }}>
                Role-Based Intake Workflows
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Select an operational role below to record certified service, transfers, or triage.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
              {/* Role 1: Manufacturer (Frozen for already registered battery) */}
              {battery ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={14} color="#38bdf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>
                        🏭 Factory Birth Certificate Locked & Certified
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        Original baseline minted by {battery.manufacturer || 'OEM'} ({battery.mfg_date})
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('MANUFACTURER');
                      setStep('FORM');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    OEM Revision
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('MANUFACTURER');
                    setStep('FORM');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1.5px solid #334155',
                    borderRadius: '12px',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#38bdf8'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Factory size={26} color="#38bdf8" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                        🏭 Manufacturer (OEM / Cell Producer)
                      </span>
                      <span style={{ fontSize: '0.65rem', background: '#0369a1', color: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        MINT SPECS
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Mint factory birth certificate, lot reference & freeze original baseline hash.
                    </div>
                  </div>
                  <ArrowRight size={18} color="#64748b" />
                </button>
              )}

              {/* Role 2: Assembler / Technician */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ASSEMBLER');
                  setStep('FORM');
                }}
                style={{
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1.5px solid #334155',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Wrench size={26} color="#34d399" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      🔧 Assembler / Workshop Technician
                    </span>
                    <span style={{ fontSize: '0.65rem', background: '#047857', color: '#d1fae5', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                      SERVICE LOG
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Record periodic diagnostics, cell variance, module swap & attach OBD test logs.
                  </div>
                </div>
                <ArrowRight size={18} color="#64748b" />
              </button>

              {/* Role 3: Seller / Fleet Owner */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('SELLER');
                  setStep('FORM');
                }}
                style={{
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1.5px solid #334155',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Briefcase size={26} color="#fbbf24" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      💼 Seller / Fleet Operator / Broker
                    </span>
                    <span style={{ fontSize: '0.65rem', background: '#b45309', color: '#fef3c7', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                      TRANSFER
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Disclose vehicle odometer, trauma history & claimed SoH for secondary resale.
                  </div>
                </div>
                <ArrowRight size={18} color="#64748b" />
              </button>

              {/* Role 4: Recycler / Refurbisher */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('RECYCLER');
                  setStep('FORM');
                }}
                style={{
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1.5px solid #334155',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#ec4899'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Recycle size={26} color="#f472b6" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      ♻️ Recycler / Refurbisher / Second-Life Buyer
                    </span>
                    <span style={{ fontSize: '0.65rem', background: '#be185d', color: '#fce7f3', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                      SAFETY TRIAGE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Inspect physical swelling, leaks, run quick bench test & assign 2nd-life fate.
                  </div>
                </div>
                <ArrowRight size={18} color="#64748b" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: ROLE-SPECIFIC INPUT FORM                         */}
        {/* ======================================================== */}
        {step === 'FORM' && (
          <div>
            {/* Top Bar with Role Badge & Back Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep('SELECT_ROLE')}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                <ArrowLeft size={16} /> Change Role
              </button>

              <span style={{ fontSize: '0.72rem', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                {selectedRole === 'MANUFACTURER' && '🏭 OEM / Cell Producer'}
                {selectedRole === 'ASSEMBLER' && '🔧 Assembler / Tech'}
                {selectedRole === 'SELLER' && '💼 Seller / Fleet Operator'}
                {selectedRole === 'RECYCLER' && '♻️ Recycler / Triage'}
              </span>
            </div>

            <form onSubmit={handleSubmitIntake} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {selectedRole === 'MANUFACTURER' && 'Factory Birth & Specifications Form'}
                  {selectedRole === 'ASSEMBLER' && 'Service & Module Replacement Form'}
                  {selectedRole === 'SELLER' && 'Transfer & Condition Disclosure Form'}
                  {selectedRole === 'RECYCLER' && 'Intake Triage & Physical Test Result Form'}
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {selectedRole === 'MANUFACTURER' && 'Mints the initial Digital Birth Certificate and freezes baseline SHA-256 reference.'}
                  {selectedRole === 'ASSEMBLER' && 'Records certified maintenance milestone and enforces diagnostic policy VT-202.'}
                  {selectedRole === 'SELLER' && 'Prepares battery for secondary market transfer with odometer & trauma disclosure.'}
                  {selectedRole === 'RECYCLER' && 'Depot triage for swelling, corrosion, bench readings, and next-life disposition.'}
                </p>
              </div>

              {/* ---------------------------------------------------- */}
              {/* ROLE 1: MANUFACTURER FORM FIELDS                    */}
              {/* ---------------------------------------------------- */}
              {selectedRole === 'MANUFACTURER' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Plant Location / OEM Org *
                      </label>
                      <input
                        type="text"
                        required
                        value={mfgForm.organization}
                        onChange={e => setMfgForm({ ...mfgForm, organization: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Operator / Engineer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={mfgForm.actor_name}
                        onChange={e => setMfgForm({ ...mfgForm, actor_name: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Factory Serial Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={mfgForm.factory_serial_number}
                        onChange={e => setMfgForm({ ...mfgForm, factory_serial_number: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Cell Lot ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={mfgForm.cell_lot_id}
                        onChange={e => setMfgForm({ ...mfgForm, cell_lot_id: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Cell Chemistry
                      </label>
                      <select
                        value={mfgForm.chemistry}
                        onChange={e => setMfgForm({ ...mfgForm, chemistry: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      >
                        <option value="NMC 811">NMC 811</option>
                        <option value="LFP">LFP</option>
                        <option value="Sodium-Ion">Sodium-Ion</option>
                        <option value="NCA">NCA</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Rated Capacity (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={mfgForm.rated_capacity_kwh}
                        onChange={e => setMfgForm({ ...mfgForm, rated_capacity_kwh: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Voltage (V)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={mfgForm.nominal_voltage}
                        onChange={e => setMfgForm({ ...mfgForm, nominal_voltage: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Cell Manufacturer & Facility
                    </label>
                    <input
                      type="text"
                      value={mfgForm.cell_manufacturer}
                      onChange={e => setMfgForm({ ...mfgForm, cell_manufacturer: e.target.value })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Attachment */}
                  <div style={{ background: '#0f172a', border: '1px dashed #475569', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} color="#38bdf8" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                          Attachment: OEM Factory Test Certificate (PDF)
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={e => handleFileUpload(e, 'mfg')}
                        style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '200px' }}
                      />
                    </div>
                    {mfgForm.file_name && (
                      <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span>📄 {mfgForm.file_name} ({mfgForm.file_size})</span>
                        <span style={{ color: '#34d399', fontFamily: 'monospace' }}>
                          ✅ SHA-256: {mfgForm.file_hash.slice(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ---------------------------------------------------- */}
              {/* ROLE 2: ASSEMBLER / WORKSHOP TECHNICIAN FIELDS      */}
              {/* ---------------------------------------------------- */}
              {selectedRole === 'ASSEMBLER' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Technician ID & Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={assemblerForm.actor_name}
                        onChange={e => setAssemblerForm({ ...assemblerForm, actor_name: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Workshop / Service Center *
                      </label>
                      <input
                        type="text"
                        required
                        value={assemblerForm.organization}
                        onChange={e => setAssemblerForm({ ...assemblerForm, organization: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Action Performed *
                    </label>
                    <select
                      value={assemblerForm.action_type}
                      onChange={e => setAssemblerForm({
                        ...assemblerForm,
                        action_type: e.target.value,
                        module_replaced: e.target.value === 'Module Replacement'
                      })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                    >
                      <option value="Periodic Diagnostic">Periodic Diagnostic Inspection</option>
                      <option value="Module Replacement">Module Replacement (Cell Replacement)</option>
                      <option value="BMS Firmware Update">BMS Firmware Update</option>
                      <option value="Cell Balancing">Cell Balancing & Thermal Recalibration</option>
                    </select>
                  </div>

                  {/* Conditional Module Replacement Fields */}
                  {(assemblerForm.action_type === 'Module Replacement' || assemblerForm.module_replaced) && (
                    <div style={{ background: '#0f172a', border: '1px solid #059669', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Wrench size={14} /> Certified Module Replacement Details
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                            New Module Serial Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={assemblerForm.new_module_serial}
                            onChange={e => setAssemblerForm({ ...assemblerForm, new_module_serial: e.target.value })}
                            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.45rem', color: '#ffffff', fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                            Cells Replaced Count
                          </label>
                          <input
                            type="number"
                            value={assemblerForm.cells_replaced_count}
                            onChange={e => setAssemblerForm({ ...assemblerForm, cells_replaced_count: e.target.value })}
                            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.45rem', color: '#ffffff', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                          OEM Compatibility Certificate #
                        </label>
                        <input
                          type="text"
                          value={assemblerForm.oem_compatibility_cert}
                          onChange={e => setAssemblerForm({ ...assemblerForm, oem_compatibility_cert: e.target.value })}
                          style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.45rem', color: '#ffffff', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Current Measured SoH (%) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={assemblerForm.reported_soh}
                        onChange={e => setAssemblerForm({ ...assemblerForm, reported_soh: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.95rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Cell Voltage Variance (mV) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={assemblerForm.cell_variance_mv}
                        onChange={e => setAssemblerForm({ ...assemblerForm, cell_variance_mv: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* WhatsApp Invoice & Repair Billing Block */}
                  <div style={{ background: '#0f172a', border: '1px solid #059669', borderRadius: '8px', padding: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IndianRupee size={14} /> Service Billing & WhatsApp Invoice
                      </span>
                      <span style={{ fontSize: '0.65rem', background: '#064e3b', color: '#6ee7b7', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        UPI READY
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                        Total Repair Cost (₹)
                      </label>
                      <input
                        type="number"
                        value={assemblerForm.repair_cost || ''}
                        onChange={e => setAssemblerForm({ ...assemblerForm, repair_cost: e.target.value })}
                        placeholder="14500"
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                        Customer WhatsApp Number
                      </label>
                      <input
                        type="text"
                        value={assemblerForm.customer_phone || ''}
                        onChange={e => setAssemblerForm({ ...assemblerForm, customer_phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: '#38bdf8', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>

                  {/* Attachment */}
                  <div style={{ background: '#0f172a', border: '1px dashed #475569', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Upload size={16} color="#10b981" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                            Mandatory Diagnostic Test Report / OBD Log (Policy VT-202)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                          Attach diagnostic PDF, CSV or cycler trace for Merkle hash locking.
                        </div>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.csv,.json,.txt,.png,.jpg"
                        onChange={e => handleFileUpload(e, 'assembler')}
                        style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '200px' }}
                      />
                    </div>
                    {assemblerForm.file_name && (
                      <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span>📄 {assemblerForm.file_name} ({assemblerForm.file_size})</span>
                        <span style={{ color: '#34d399', fontFamily: 'monospace' }}>
                          ✅ SHA-256: {assemblerForm.file_hash.slice(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ---------------------------------------------------- */}
              {/* ROLE 3: SELLER / FLEET OPERATOR FIELDS              */}
              {/* ---------------------------------------------------- */}
              {selectedRole === 'SELLER' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Seller Organization / Fleet Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={sellerForm.organization}
                        onChange={e => setSellerForm({ ...sellerForm, organization: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Fleet Manager / Broker Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={sellerForm.actor_name}
                        onChange={e => setSellerForm({ ...sellerForm, actor_name: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Vehicle Model / Chassis *
                      </label>
                      <input
                        type="text"
                        required
                        value={sellerForm.vehicle_info}
                        onChange={e => setSellerForm({ ...sellerForm, vehicle_info: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Odometer (km) *
                      </label>
                      <input
                        type="number"
                        required
                        value={sellerForm.odometer_km}
                        onChange={e => setSellerForm({ ...sellerForm, odometer_km: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Reason for Decommission *
                    </label>
                    <select
                      value={sellerForm.decommission_reason}
                      onChange={e => setSellerForm({ ...sellerForm, decommission_reason: e.target.value })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                    >
                      <option value="Fleet retirement and vehicle fleet upgrade">Fleet retirement / normal end of life</option>
                      <option value="Vehicle chassis decommission">Vehicle chassis decommission</option>
                      <option value="Insurance total write-off">Insurance total write-off</option>
                      <option value="End of operational lease transfer">End of operational lease transfer</option>
                    </select>
                  </div>

                  {/* Trauma Disclosure Checkbox */}
                  <div style={{ background: sellerForm.accident_or_thermal_history ? 'rgba(239, 68, 68, 0.15)' : '#0f172a', border: `1px solid ${sellerForm.accident_or_thermal_history ? '#ef4444' : '#334155'}`, borderRadius: '8px', padding: '0.85rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={sellerForm.accident_or_thermal_history}
                        onChange={e => setSellerForm({ ...sellerForm, accident_or_thermal_history: e.target.checked })}
                        style={{ marginTop: '0.25rem', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: sellerForm.accident_or_thermal_history ? '#f87171' : '#f8fafc' }}>
                          ⚠️ Mandatory Trauma Disclosure
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          Did this pack ever experience water submersion, flood, severe collision impact, or thermal runaway event?
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Claimed Health & Anti-fraud Demo Helper */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Claimed Battery Health (%) *
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setSellerForm({ ...sellerForm, reported_soh: '80.0' })}
                          style={{ fontSize: '0.65rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #059669', padding: '0.15rem 0.4rem', borderRadius: '4px' }}
                        >
                          Normal: 80%
                        </button>
                        <button
                          type="button"
                          onClick={() => setSellerForm({ ...sellerForm, reported_soh: '85.0' })}
                          style={{ fontSize: '0.65rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #dc2626', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}
                          title="Simulate fraud attempt to test engine detection"
                        >
                          🚨 Test Inversion: 85%
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={sellerForm.reported_soh}
                      onChange={e => setSellerForm({ ...sellerForm, reported_soh: e.target.value })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {battery?.diagnostics?.[0] && (
                        <span>Verified prior diagnostic on file: <strong>{battery.diagnostics[0].reported_soh}%</strong> ({battery.diagnostics[0].testing_org})</span>
                      )}
                    </div>
                  </div>

                  {/* Attachment */}
                  <div style={{ background: '#0f172a', border: '1px dashed #475569', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} color="#fbbf24" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                          Attachment: Sales Bill / Transfer of Custody Receipt (PDF)
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={e => handleFileUpload(e, 'seller')}
                        style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '200px' }}
                      />
                    </div>
                    {sellerForm.file_name && (
                      <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span>📄 {sellerForm.file_name} ({sellerForm.file_size})</span>
                        <span style={{ color: '#34d399', fontFamily: 'monospace' }}>
                          ✅ SHA-256: {sellerForm.file_hash.slice(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ---------------------------------------------------- */}
              {/* ROLE 4: RECYCLER / SECOND-LIFE BUYER FIELDS         */}
              {/* ---------------------------------------------------- */}
              {selectedRole === 'RECYCLER' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Depot Intake Inspector ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={recyclerForm.actor_name}
                        onChange={e => setRecyclerForm({ ...recyclerForm, actor_name: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Depot / Recycling Facility *
                      </label>
                      <input
                        type="text"
                        required
                        value={recyclerForm.organization}
                        onChange={e => setRecyclerForm({ ...recyclerForm, organization: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Visual Physical Inspection Checkboxes */}
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔍 Visual Physical Inspection
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: recyclerForm.swelling_detected ? '#f87171' : '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={recyclerForm.swelling_detected}
                          onChange={e => setRecyclerForm({ ...recyclerForm, swelling_detected: e.target.checked })}
                        />
                        <span>Swollen pouch cells detected? (Pack swelling)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: recyclerForm.corrosion_detected ? '#f87171' : '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={recyclerForm.corrosion_detected}
                          onChange={e => setRecyclerForm({ ...recyclerForm, corrosion_detected: e.target.checked })}
                        />
                        <span>Terminal corrosion or electrical arc flash marks?</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: recyclerForm.leak_detected ? '#f87171' : '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={recyclerForm.leak_detected}
                          onChange={e => setRecyclerForm({ ...recyclerForm, leak_detected: e.target.checked })}
                        />
                        <span>Coolant or electrolyte leak detected?</span>
                      </label>
                    </div>
                  </div>

                  {/* Quick Bench Test Readings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Bench SoH (%) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={recyclerForm.reported_soh}
                        onChange={e => setRecyclerForm({ ...recyclerForm, reported_soh: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#f472b6', fontWeight: 700, fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Impedance (mΩ)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={recyclerForm.internal_resistance_mohm}
                        onChange={e => setRecyclerForm({ ...recyclerForm, internal_resistance_mohm: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                        Temp (°C)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={recyclerForm.ambient_temp_c}
                        onChange={e => setRecyclerForm({ ...recyclerForm, ambient_temp_c: e.target.value })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.55rem', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Next-Life Disposition Decision */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                      Next-Life Disposition Decision *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        background: recyclerForm.disposition === 'SECOND_LIFE_BESS' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                        border: `1px solid ${recyclerForm.disposition === 'SECOND_LIFE_BESS' ? '#38bdf8' : '#334155'}`,
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="disposition"
                          value="SECOND_LIFE_BESS"
                          checked={recyclerForm.disposition === 'SECOND_LIFE_BESS'}
                          onChange={e => setRecyclerForm({ ...recyclerForm, disposition: e.target.value })}
                        />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                            🔋 Send for Second-Life BESS
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            Stationary energy storage qualification bench
                          </div>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        background: recyclerForm.disposition === 'REPAIR_REQUIRED' ? 'rgba(245, 158, 11, 0.15)' : '#0f172a',
                        border: `1px solid ${recyclerForm.disposition === 'REPAIR_REQUIRED' ? '#f59e0b' : '#334155'}`,
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="disposition"
                          value="REPAIR_REQUIRED"
                          checked={recyclerForm.disposition === 'REPAIR_REQUIRED'}
                          onChange={e => setRecyclerForm({ ...recyclerForm, disposition: e.target.value })}
                        />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                            🔧 Send for Module Repair / Re-balancing
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            Quarantine pack for teardown and cell level replacement
                          </div>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        background: recyclerForm.disposition === 'RECYCLING_PROCESSED' ? 'rgba(236, 72, 153, 0.15)' : '#0f172a',
                        border: `1px solid ${recyclerForm.disposition === 'RECYCLING_PROCESSED' ? '#ec4899' : '#334155'}`,
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="disposition"
                          value="RECYCLING_PROCESSED"
                          checked={recyclerForm.disposition === 'RECYCLING_PROCESSED'}
                          onChange={e => setRecyclerForm({ ...recyclerForm, disposition: e.target.value })}
                        />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                            ♻️ Direct to Hydrometallurgical Recycling
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            Shredding & black mass metal recovery (Lithium, Nickel, Cobalt)
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Recycler Attachment */}
                  <div style={{ background: '#0f172a', border: '1px dashed #475569', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} color="#ec4899" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                          Attachment: Depot Triage & Inspection Sheet (PDF / Image)
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.csv"
                        onChange={e => handleFileUpload(e, 'recycler')}
                        style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '200px' }}
                      />
                    </div>
                    {recyclerForm.file_name && (
                      <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span>📄 {recyclerForm.file_name} ({recyclerForm.file_size})</span>
                        <span style={{ color: '#34d399', fontFamily: 'monospace' }}>
                          ✅ SHA-256: {recyclerForm.file_hash.slice(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Error Message banner */}
              {errorMessage && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem', color: '#f87171', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    background: submitting
                      ? '#475569'
                      : 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.9rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Verifying & Hashing into Merkle Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      <span>Submit Battery Record</span>
                    </>
                  )}
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b', marginTop: '0.45rem' }}>
                  Cryptographically hashes inputs with SHA-256 and links to append-only DPP ledger.
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: MOBILE CONFIRMATION SCREEN                       */}
        {/* ======================================================== */}
        {step === 'CONFIRMATION' && submissionResult && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {/* Header Icon & Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: submissionResult.anti_fraud_alert
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(16, 185, 129, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                border: `2px solid ${submissionResult.anti_fraud_alert ? '#ef4444' : '#10b981'}`
              }}>
                {submissionResult.anti_fraud_alert ? (
                  <AlertTriangle size={32} color="#ef4444" />
                ) : (
                  <CheckCircle2 size={32} color="#10b981" />
                )}
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                {submissionResult.anti_fraud_alert
                  ? 'Event Recorded & Anomaly Flagged!'
                  : 'Event Successfully Recorded & Locked!'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Append-only Merkle ledger block minted with SHA-256 audit fingerprint.
              </p>
            </div>

            {/* Anti-Fraud Banner (if detected) */}
            {submissionResult.anti_fraud_alert && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1.5px solid #dc2626',
                borderRadius: '10px',
                padding: '0.85rem',
                marginBottom: '1rem',
                color: '#fca5a5',
                fontSize: '0.82rem',
                lineHeight: 1.45
              }}>
                <div style={{ fontWeight: 800, color: '#f87171', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={16} /> Anti-Fraud Rules Engine Alert
                </div>
                {submissionResult.anti_fraud_alert}
              </div>
            )}

            {/* Receipt Details Card */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Battery ID:</span>
                <span style={{ fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em' }}>
                  {submissionResult.battery_id}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Event Type:</span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {submissionResult.event_title}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Logged By:</span>
                <span style={{ fontWeight: 600, color: '#cbd5e1' }}>
                  {submissionResult.actor_name || submissionResult.actor || 'Technician Sharma'} {submissionResult.organization ? `(${submissionResult.organization})` : ''}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Passport Status:</span>
                <span style={{
                  fontWeight: 700,
                  color:
                    submissionResult.passport_status === 'FLAGGED_SOH_INVERSION' || submissionResult.passport_status === 'QUARANTINED' || submissionResult.discrepancy_flagged
                      ? '#f87171'
                      : '#34d399'
                }}>
                  {submissionResult.passport_status === 'FLAGGED_SOH_INVERSION' ? '🚨 FLAGGED: SoH Inversion' :
                   submissionResult.passport_status === 'FLAGGED_INSPECTION_REQUIRED' ? '⚠️ Inspection Required' :
                   submissionResult.passport_status === 'QUARANTINED' ? '🔴 Quarantined / Hold' :
                   '🟢 Up to Date'}
                </span>
              </div>

              {/* Cryptographic SHA-256 Audit Hash */}
              <div style={{ paddingTop: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Audit Chain Block Hash (SHA-256):</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(submissionResult.audit_hash)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.68rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    {copiedHash ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                    {copiedHash ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ background: '#1e293b', padding: '0.4rem 0.6rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8', wordBreak: 'break-all', border: '1px solid #334155' }}>
                  {submissionResult.audit_hash || submissionResult.event_hash}
                </div>
              </div>

              {/* Attachment Hash if present */}
              {submissionResult.file_hash_sha256 && (
                <div style={{ paddingTop: '0.2rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                    Document Checksum ({submissionResult.file_name || 'Attachment'}):
                  </div>
                  <div style={{ background: '#1e293b', padding: '0.4rem 0.6rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.7rem', color: '#34d399', wordBreak: 'break-all', border: '1px solid #334155' }}>
                    {submissionResult.file_hash_sha256}
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* WHATSAPP INVOICE & UPI PAYMENT CARD                      */}
            {/* ======================================================== */}
            <div style={{ background: '#0f172a', border: '1.5px solid #059669', borderRadius: '12px', padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(5, 150, 105, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={18} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
                      Send Invoice & Collect Payment
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Instant WhatsApp dispatch with verified Merkle hash
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', background: 'rgba(5, 150, 105, 0.2)', padding: '0.2rem 0.65rem', borderRadius: '6px', border: '1px solid #059669' }}>
                    ₹{Number(lastInvoiceMeta.cost || 14500).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* UPI QR Code & Payment Details */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <QRCodeSVG
                    value={`upi://pay?pa=${encodeURIComponent(lastInvoiceMeta.upiId)}&pn=VoltTrace%20Service%20Depot&am=${lastInvoiceMeta.cost || 14500}&cu=INR&tn=Battery%20${submissionResult.battery_id}%20Service`}
                    size={96}
                    level="M"
                    includeMargin={false}
                  />
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem', letterSpacing: '0.04em' }}>
                    SCAN & PAY UPI
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: '180px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem', marginBottom: '0.1rem' }}>Demo Workshop UPI ID:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                        {lastInvoiceMeta.upiId}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lastInvoiceMeta.upiId);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        style={{
                          background: copiedUpi ? '#059669' : '#334155',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '4px',
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        {copiedUpi ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem', marginBottom: '0.15rem' }}>
                      Customer WhatsApp Phone:
                    </label>
                    <input
                      type="text"
                      value={lastInvoiceMeta.phone}
                      onChange={e => setLastInvoiceMeta({ ...lastInvoiceMeta, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{
                        width: '100%',
                        background: '#0f172a',
                        border: '1px solid #38bdf8',
                        borderRadius: '6px',
                        padding: '0.35rem 0.55rem',
                        color: '#f8fafc',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ GPay • PhonePe • Paytm • BHIM • Any UPI App
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp + Download PDF */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                {/* 1. Direct WhatsApp Share with Direct PDF Link & Native File Share */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // 1. Generate PDF with embedded UPI QR Code
                      const res = await generateServiceInvoicePDF({
                        battery,
                        submissionResult,
                        invoiceMeta: lastInvoiceMeta
                      });
                      
                      const file = new File([res.blob], res.filename, { type: 'application/pdf' });

                      // 2. Upload to server for instant 1-click download link
                      let serverDownloadUrl = '';
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('filename', res.filename);
                        const upRes = await fetch(`/api/v1/batteries/${submissionResult.battery_id}/documents/save-invoice`, {
                          method: 'POST',
                          body: formData
                        });
                        if (upRes.ok) {
                          const upData = await upRes.json();
                          serverDownloadUrl = `${window.location.protocol}//${window.location.host}${upData.download_url}`;
                        }
                      } catch (upErr) {
                        console.warn('Invoice server save notice:', upErr);
                      }

                      if (!serverDownloadUrl) {
                        serverDownloadUrl = `${window.location.protocol}//${window.location.host}/api/v1/batteries/${submissionResult.battery_id}/documents/invoices/${res.filename}`;
                      }

                      // 3. Try Native Android / iOS Web Share first (if supported by mobile browser)
                      let sharedSuccessfully = false;
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                          await navigator.share({
                            files: [file],
                            title: `VoltTrace Invoice - ${submissionResult.battery_id}`,
                            text: `Official VoltTrace Service Invoice for Battery ${submissionResult.battery_id}. Amount: ₹${Number(lastInvoiceMeta.cost || 14500).toLocaleString('en-IN')}. Scan UPI QR code inside to pay.`
                          });
                          sharedSuccessfully = true;
                        } catch (sErr) {
                          if (sErr.name !== 'AbortError') console.warn('Share error:', sErr);
                        }
                      }

                      // 4. Direct WhatsApp URL fallback with 1-click PDF link & UPI Pay Link
                      if (!sharedSuccessfully) {
                        const cleanPhone = (lastInvoiceMeta.phone || '').replace(/[^0-9]/g, '');
                        
                        const rawMsg = `*VOLTTRACE OFFICIAL SERVICE INVOICE & BATTERY PASSPORT*\n` +
                          `━━━━━━━━━━━━━━━━━━━━━━\n` +
                          `🔋 *Battery ID:* ${submissionResult.battery_id}\n` +
                          `🔧 *Service:* ${submissionResult.event_title}\n` +
                          `👨‍🔧 *Technician:* ${submissionResult.actor_name || 'Technician Sharma'} (${submissionResult.organization || 'Zypp Mobility Hub'})\n` +
                          `💰 *Total Amount:* Rs. ${Number(lastInvoiceMeta.cost || 14500).toLocaleString('en-IN')}\n` +
                          `💳 *Demo UPI ID:* ${lastInvoiceMeta.upiId}\n` +
                          `📲 *UPI Instant Pay Link:* upi://pay?pa=${lastInvoiceMeta.upiId}&pn=VoltTrace%20Service%20Depot&am=${lastInvoiceMeta.cost || 14500}&cu=INR&tn=Battery%20${submissionResult.battery_id}%20Service\n` +
                          `🟢 *Status:* ${submissionResult.passport_status === 'UP_TO_DATE' ? 'Verified & Up to Date' : 'Flagged / Monitored'}\n` +
                          `🔐 *SHA-256 Hash:* ${(submissionResult.audit_hash || '').slice(0, 24)}...\n` +
                          `━━━━━━━━━━━━━━━━━━━━━━\n` +
                          `📥 *DOWNLOAD OFFICIAL PDF INVOICE (WITH UPI QR CODE):*\n` +
                          `${serverDownloadUrl}\n\n` +
                          `📄 *View Live Battery Passport Dossier:*\n` +
                          `${window.location.origin}/mobile-intake?id=${submissionResult.battery_id}`;

                        const encodedMsg = encodeURIComponent(rawMsg);
                        const waTarget = cleanPhone.length >= 10
                          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
                          : `https://api.whatsapp.com/send?text=${encodedMsg}`;

                        window.open(waTarget, '_blank');
                      }
                    } catch (err) {
                      console.error('Share process error:', err);
                    }
                  }}
                  style={{
                    width: '100%',
                    background: '#16a34a',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)'
                  }}
                >
                  <Share2 size={18} />
                  <span>Send PDF Invoice to WhatsApp ({lastInvoiceMeta.phone})</span>
                </button>

                {/* 2. Direct Instant WhatsApp Chat Button */}
                {(() => {
                  const cleanPhone = (lastInvoiceMeta.phone || '').replace(/[^0-9]/g, '');
                  const rawMsg = `*VOLTTRACE OFFICIAL SERVICE INVOICE & BATTERY PASSPORT*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🔋 *Battery ID:* ${submissionResult.battery_id}\n` +
                    `🔧 *Action Logged:* ${submissionResult.event_title}\n` +
                    `👨‍🔧 *Technician:* ${submissionResult.actor_name || 'Technician Sharma'} (${submissionResult.organization || 'Zypp Mobility Hub'})\n` +
                    `💰 *Total Amount:* Rs. ${Number(lastInvoiceMeta.cost || 14500).toLocaleString('en-IN')}\n` +
                    `💳 *Demo UPI ID:* ${lastInvoiceMeta.upiId}\n` +
                    `📲 *Pay via UPI:* upi://pay?pa=${lastInvoiceMeta.upiId}&pn=VoltTrace%20Service%20Depot&am=${lastInvoiceMeta.cost || 14500}&cu=INR&tn=Battery%20${submissionResult.battery_id}%20Service\n` +
                    `🟢 *Passport Status:* ${submissionResult.passport_status === 'UP_TO_DATE' ? 'Verified & In Fleet' : 'Flagged / Monitored'}\n` +
                    `🔐 *SHA-256 Ledger Hash:* ${(submissionResult.audit_hash || '').slice(0, 24)}...\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📄 *View Official Digital Passport:*\n` +
                    `${window.location.origin}/mobile-intake?id=${submissionResult.battery_id}`;

                  const encodedMsg = encodeURIComponent(rawMsg);
                  const waUrl = cleanPhone.length >= 10
                    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
                    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #059669',
                        color: '#34d399',
                        borderRadius: '8px',
                        padding: '0.7rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        textDecoration: 'none'
                      }}
                    >
                      <MessageSquare size={16} color="#34d399" />
                      <span>Open Direct WhatsApp Chat with Invoice & UPI</span>
                    </a>
                  );
                })()}

                {/* 3. Direct Safe Download Button (Uses ObjectURL Blob so Chrome doesn't flag as insecure) */}
                <button
                  type="button"
                  onClick={async () => {
                    const res = await generateServiceInvoicePDF({
                      battery,
                      submissionResult,
                      invoiceMeta: lastInvoiceMeta
                    });
                    const blobUrl = URL.createObjectURL(res.blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = res.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                  }}
                  style={{
                    width: '100%',
                    background: '#0284c7',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0.72rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Download size={15} />
                  <span>Download PDF Invoice File (Offline Copy with UPI QR)</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Scan Another | View Full Dossier */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep('SELECT_ROLE');
                    setSubmissionResult(null);
                    if (onOpenScanner) onOpenScanner();
                  }}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Camera size={16} /> Scan Another
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('SELECT_ROLE');
                    setSubmissionResult(null);
                  }}
                  style={{
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Sparkles size={15} color="#38bdf8" /> Log More Events
                </button>
              </div>

              {onViewFullPassport && (
                <button
                  type="button"
                  onClick={() => onViewFullPassport(submissionResult.battery_id)}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #475569',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.7rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <ExternalLink size={14} /> View Full Passport Dossier (10-Tab Desktop View)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Industrial Mobile Footer */}
      <div style={{ background: '#0a0f1d', borderTop: '1px solid #1e293b', padding: '0.85rem 1rem', marginTop: 'auto', textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
        <div>VoltTrace GS1 Digital Battery Passport Intake Portal</div>
        <div style={{ marginTop: '0.2rem', color: '#475569' }}>
          EU Regulation 2023/1542 • CIRPASS DPP Standard • Cryptographic SHA-256 Ledger
        </div>
      </div>
    </div>
  );
}

