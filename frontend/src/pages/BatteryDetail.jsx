import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  PlusCircle,
  Lock,
  Download,
  AlertCircle,
  HelpCircle,
  FileCheck,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';

import {
  fetchBatteryDetail,
  uploadDocument,
  addDiagnosticRecord,
  verifyAuditChainIntegrity
} from '../api';

import BatteryPlacard from '../components/BatteryPlacard';
import TriageDecisionCard from '../components/TriageDecisionCard';
import SoHTimelineChart from '../components/SoHTimelineChart';
import TamperSimulator from '../components/TamperSimulator';

export default function BatteryDetail({ batteryId, onBack }) {
  const [battery, setBattery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [chainVerifyResult, setChainVerifyResult] = useState(null);

  // New diagnostic test form state
  const [showDiagForm, setShowDiagForm] = useState(false);
  const [diagForm, setDiagForm] = useState({
    measured_capacity_kwh: '',
    reported_soh: '',
    testing_org: 'EcoTrace Independent Refurbisher Lab',
    test_method: 'Coulomb Counting C/3 + EIS',
    source_label: 'INDEPENDENT_TEST',
    internal_resistance_mohm: '18.5',
    ambient_temp_c: '25.0',
    cycle_count: '650',
    notes: 'Intake test at second-life transfer depot.'
  });

  // Upload document form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    document_type: 'DIAGNOSTIC_REPORT',
    issuer_name: 'Authorized Inspection Body',
    file: null
  });

  const loadBattery = async () => {
    try {
      const data = await fetchBatteryDetail(batteryId);
      setBattery(data);
    } catch (err) {
      alert(err.message || 'Failed to load battery');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBattery();
  }, [batteryId]);

  const handleAuditVerify = async () => {
    try {
      const res = await verifyAuditChainIntegrity();
      setChainVerifyResult(res);
    } catch (err) {
      alert('Verification failed: ' + err.message);
    }
  };

  const handleDiagSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDiagnosticRecord(batteryId, {
        ...diagForm,
        measured_capacity_kwh: parseFloat(diagForm.measured_capacity_kwh),
        reported_soh: parseFloat(diagForm.reported_soh),
        internal_resistance_mohm: parseFloat(diagForm.internal_resistance_mohm || 18),
        ambient_temp_c: parseFloat(diagForm.ambient_temp_c || 25),
        cycle_count: parseInt(diagForm.cycle_count || 0)
      });
      setShowDiagForm(false);
      loadBattery();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      alert('Please select a file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('document_type', uploadData.document_type);
    formData.append('issuer_name', uploadData.issuer_name);

    try {
      await uploadDocument(batteryId, formData);
      setShowUploadForm(false);
      loadBattery();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading comprehensive battery dossier...
      </div>
    );
  }

  if (!battery) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h3>Battery not found</h3>
        <button onClick={onBack} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const latestDiag = battery.diagnostics[0];

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {battery.id}
            </span>
            <span className={`badge ${battery.status === 'active' ? 'badge-green' : 'badge-red'}`}>
              {battery.status.toUpperCase()}
            </span>
            <span className="badge badge-neutral">
              {battery.chemistry}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {battery.manufacturer} • Model: <strong>{battery.model}</strong> • Owner: <strong>{battery.current_owner}</strong>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-app)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidence Quality</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: battery.evidence_quality.score >= 80 ? 'var(--verified-green)' : battery.evidence_quality.score >= 50 ? 'var(--warning-amber)' : 'var(--danger-red)' }}>
              {battery.evidence_quality.score}/100
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Latest SoH</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: latestDiag ? (latestDiag.reported_soh > 80 ? 'var(--verified-green)' : 'var(--warning-amber)') : 'var(--text-muted)' }}>
              {latestDiag ? `${latestDiag.reported_soh}%` : 'Untested'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Issues</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: battery.discrepancies.length > 0 ? 'var(--danger-red)' : 'var(--verified-green)' }}>
              {battery.discrepancies.filter(d => d.status === 'UNRESOLVED').length}
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Indicative Value</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: battery.valuation.status === 'VALUATION_ON_HOLD' ? 'var(--danger-red)' : 'var(--text-primary)' }}>
              {battery.valuation.formatted_range}
            </div>
          </div>
        </div>
      </div>

      {/* 9-Section Navigation Tabs */}
      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview & Placard
        </button>
        <button className={`tab-btn ${activeTab === 'triage' ? 'active' : ''}`} onClick={() => setActiveTab('triage')}>
          3-Pillar Assessment & Triage
        </button>
        <button className={`tab-btn ${activeTab === 'passport' ? 'active' : ''}`} onClick={() => setActiveTab('passport')}>
          Timeline Events ({battery.events?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          Documents & SHA-256 ({battery.documents?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`} onClick={() => setActiveTab('diagnostics')}>
          Diagnostic Health ({battery.diagnostics?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'discrepancies' ? 'active' : ''}`} onClick={() => setActiveTab('discrepancies')}>
          Discrepancies ({battery.discrepancies?.filter(d => d.status === 'UNRESOLVED').length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'recalls' ? 'active' : ''}`} onClick={() => setActiveTab('recalls')}>
          Recall Matching ({battery.recall_check?.matches_count || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          Merkle Audit Trail
        </button>
        <button className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
          Evidence Quality Report
        </button>
      </div>

      {/* TAB 1: OVERVIEW & INDUSTRIAL PLACARD */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div>
            <BatteryPlacard battery={battery} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.85rem' }}>
                Technical Identity & Lineage
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Rated Capacity:</span>
                  <div style={{ fontWeight: 700 }}>{battery.rated_capacity_kwh} kWh</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Nominal Voltage:</span>
                  <div style={{ fontWeight: 700 }}>{battery.nominal_voltage} V</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Manufacturing Date:</span>
                  <div style={{ fontWeight: 700 }}>{battery.mfg_date}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cell Chemistry:</span>
                  <div style={{ fontWeight: 700 }}>{battery.chemistry}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vehicle Reference:</span>
                  <div style={{ fontWeight: 600 }}>{battery.vehicle_info || 'Not linked to specific vehicle chassis'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Permanent Passport URN:</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
                    {battery.uuid}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Triage Summary Card */}
            <TriageDecisionCard triage={battery.triage} valuation={battery.valuation} />
          </div>
        </div>
      )}

      {/* TAB 2: SECOND-LIFE TRIAGE & VALUATION */}
      {activeTab === 'triage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TriageDecisionCard triage={battery.triage} valuation={battery.valuation} />

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Indicative Residual Valuation Mechanics
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              VoltTrace applies an explicit, transparent residual pricing method calibrated to current Indian recycling and second-life commercial storage markets.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valuation Status</span>
                <div style={{ fontWeight: 800, color: battery.valuation.status === 'VALUATION_ON_HOLD' ? 'var(--danger-red)' : 'var(--verified-green)' }}>
                  {battery.valuation.status}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spread Band</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{battery.valuation.formatted_range}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence Spread</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{battery.valuation.confidence_label}</div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong>Notice:</strong> {battery.valuation.notes}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PASSPORT TIMELINE EVENTS */}
      {activeTab === 'passport' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Chronological Digital Battery Passport</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Immutable historical event records registered throughout this battery's first-life operation.
              </p>
            </div>
            <span className="badge badge-neutral">{battery.events.length} Recorded Milestones</span>
          </div>

          <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {battery.events.map((evt, idx) => (
              <div key={evt.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-1.95rem', top: '0.2rem', width: '12px', height: '12px', borderRadius: '50%', background: evt.verification_status === 'VERIFIED' ? 'var(--verified-green)' : evt.verification_status === 'FAILED' ? 'var(--danger-red)' : 'var(--primary)', border: '2px solid #ffffff' }}></div>

                <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{evt.title}</span>
                    <span className={`badge ${evt.verification_status === 'VERIFIED' ? 'badge-green' : evt.verification_status === 'FAILED' ? 'badge-red' : 'badge-neutral'}`}>
                      {evt.verification_status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {evt.description}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Organization: <strong>{evt.submitting_org}</strong> • Actor: <strong>{evt.actor}</strong> • Timestamp: {new Date(evt.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS & SHA-256 INTEGRITY */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tamper Simulator Tool */}
          <TamperSimulator
            batteryId={battery.id}
            documents={battery.documents}
            onVerificationComplete={loadBattery}
          />

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registered Supporting Documents</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Files stored in Content-Addressable Storage with registered SHA-256 hashes and digital signatures.
                </p>
              </div>

              <button onClick={() => setShowUploadForm(!showUploadForm)} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                <Upload size={15} /> Upload Supporting Document
              </button>
            </div>

            {/* Upload Modal / Form */}
            {showUploadForm && (
              <form onSubmit={handleUploadSubmit} style={{ background: 'var(--bg-card-subtle)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Document Type *</label>
                  <select
                    value={uploadData.document_type}
                    onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  >
                    <option value="DIAGNOSTIC_REPORT">Diagnostic Health Report</option>
                    <option value="SERVICE_INVOICE">Service & Maintenance Invoice</option>
                    <option value="MODULE_REPLACEMENT">Module / Cell Replacement Record</option>
                    <option value="BIRTH_CERTIFICATE">OEM Birth Certificate</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Submitting Authority / Lab *</label>
                  <input
                    type="text"
                    required
                    value={uploadData.issuer_name}
                    onChange={(e) => setUploadData({ ...uploadData, issuer_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select PDF / Image File *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                    style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem', fontSize: '0.8rem' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowUploadForm(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Upload & Calculate SHA-256
                  </button>
                </div>
              </form>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Submitting Authority</th>
                    <th>Trust Tier</th>
                    <th>SHA-256 Checksum</th>
                    <th>Digital Signature</th>
                    <th>Integrity</th>
                    <th style={{ textAlign: 'right' }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {battery.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={16} color="var(--primary)" />
                          {doc.file_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{doc.document_type}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{doc.issuer_name}</div>
                      </td>
                      <td>
                        <span className={`badge ${doc.trust_tier.includes('TIER_2') ? 'badge-green' : 'badge-neutral'}`}>
                          {doc.trust_tier.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--primary)' }}>
                          {doc.file_hash_sha256.slice(0, 14)}...
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${doc.signature_status === 'VALID_TRUSTED_ISSUER' ? 'badge-green' : doc.signature_status === 'INVALID_SIGNATURE' ? 'badge-red' : 'badge-neutral'}`}>
                          {doc.signature_status === 'VALID_TRUSTED_ISSUER' ? 'Ed25519 Verified' : doc.signature_status}
                        </span>
                      </td>
                      <td>
                        {doc.integrity_status === 'MATCHED' ? (
                          <span className="badge badge-green"><CheckCircle2 size={12} /> Matched</span>
                        ) : (
                          <span className="badge badge-red"><XCircle size={12} /> Mismatch</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a
                          href={`/api/v1/batteries/${battery.id}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                        >
                          <Download size={13} /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DIAGNOSTICS & TIMELINE */}
      {activeTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Historical Diagnostic Health Timeline</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Dated SoH degradation curve with preserved testing conditions, equipment, and sources.
                </p>
              </div>

              <button onClick={() => setShowDiagForm(!showDiagForm)} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                <PlusCircle size={15} /> Enter New Intake Diagnostic Test
              </button>
            </div>

            <SoHTimelineChart diagnostics={battery.diagnostics} />

            {/* Diagnostic Intake Form */}
            {showDiagForm && (
              <form onSubmit={handleDiagSubmit} style={{ background: 'var(--bg-card-subtle)', padding: '1.25rem', borderRadius: '10px', marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Measured Capacity (kWh) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagForm.measured_capacity_kwh}
                    onChange={(e) => setDiagForm({ ...diagForm, measured_capacity_kwh: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Measured SoH (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagForm.reported_soh}
                    onChange={(e) => setDiagForm({ ...diagForm, reported_soh: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Testing Organisation *</label>
                  <input
                    type="text"
                    required
                    value={diagForm.testing_org}
                    onChange={(e) => setDiagForm({ ...diagForm, testing_org: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Source Trust Classification *</label>
                  <select
                    value={diagForm.source_label}
                    onChange={(e) => setDiagForm({ ...diagForm, source_label: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  >
                    <option value="INDEPENDENT_TEST">Independently Measured (Intake Qualification)</option>
                    <option value="USER_ENTERED">User-Entered Test Result</option>
                    <option value="SELLER_REPORTED">Seller-Reported Claim</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ambient Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={diagForm.ambient_temp_c}
                    onChange={(e) => setDiagForm({ ...diagForm, ambient_temp_c: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Internal Resistance (mΩ)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={diagForm.internal_resistance_mohm}
                    onChange={(e) => setDiagForm({ ...diagForm, internal_resistance_mohm: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowDiagForm(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Record Test & Run Consistency Engine
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem' }}>
              Historical Measurement Logs
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test Date</th>
                    <th>Reported SoH</th>
                    <th>Capacity</th>
                    <th>Testing Org</th>
                    <th>Test Method</th>
                    <th>Ambient Temp</th>
                    <th>Source Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {battery.diagnostics.map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.test_date).toLocaleDateString()}</td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: d.reported_soh > 80 ? 'var(--verified-green)' : 'var(--warning-amber)' }}>
                          {d.reported_soh}%
                        </span>
                      </td>
                      <td>{d.measured_capacity_kwh} kWh</td>
                      <td>{d.testing_org}</td>
                      <td>{d.test_method}</td>
                      <td>{d.ambient_temp_c}°C</td>
                      <td>
                        <span className={`badge ${d.source_label === 'INDEPENDENT_TEST' ? 'badge-green' : 'badge-neutral'}`}>
                          {d.source_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DISCREPANCIES & CONTRADICTIONS */}
      {activeTab === 'discrepancies' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Rules-Based Consistency & Discrepancy Engine</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Multi-point heuristic analysis comparing chronological records, hash verification, and reported metrics.
              </p>
            </div>
            <span className={`badge ${battery.discrepancies.length > 0 ? 'badge-red' : 'badge-green'}`}>
              {battery.discrepancies.length} Discrepancies Found
            </span>
          </div>

          {battery.discrepancies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--verified-green)' }}>
              <CheckCircle2 size={42} style={{ margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Zero Contradictions Found</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0.25rem auto 0 auto' }}>
                All uploaded document hashes match registered fingerprints, degradation curves are physically plausible, and no chronological anomalies were detected.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {battery.discrepancies.map((disc) => (
                <div key={disc.id} style={{ background: 'var(--danger-red-bg)', border: '1px solid var(--danger-red-border)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} color="var(--danger-red)" />
                      <span style={{ fontWeight: 800, color: 'var(--danger-red)', fontSize: '0.95rem' }}>
                        {disc.title}
                      </span>
                    </div>
                    <span className="badge badge-red">{disc.severity} SEVERITY</span>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#7f1d1d', lineHeight: 1.6, marginTop: '0.25rem' }}>
                    {disc.description}
                  </p>

                  <div style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: '0.65rem' }}>
                    Detected on {new Date(disc.detected_at).toLocaleString()} • Code: <strong>{disc.code}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: RECALL MATCHING */}
      {activeTab === 'recalls' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Configured Safety Recall Dataset Match</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cross-references battery ID and model specifications against known technical bulletins.
              </p>
            </div>
            <span className={`badge ${battery.recall_check.status.includes('MATCH') ? 'badge-amber' : 'badge-green'}`}>
              {battery.recall_check.status}
            </span>
          </div>

          {battery.recall_check.matches_count === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--verified-green)' }}>
              <ShieldCheck size={38} style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 700 }}>No Safety Recalls Found in Demonstration Dataset</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Identifier {battery.id} has no matching recalls in the current MoRTH / NHTSA database snapshot.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {battery.recall_check.matches.map((rec, idx) => (
                <div key={idx} style={{ background: 'var(--warning-amber-bg)', border: '1px solid var(--warning-amber-border)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} color="var(--warning-amber)" />
                      <span style={{ fontWeight: 800, color: 'var(--warning-amber)' }}>{rec.title}</span>
                    </div>
                    <span className="badge badge-amber">{rec.code}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '0.5rem', lineHeight: 1.5 }}>
                    {rec.description}
                  </p>
                  <div style={{ fontSize: '0.72rem', color: '#92400e', marginTop: '0.5rem' }}>
                    Source: {rec.source} • Bulletin Date: {rec.updated_at}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'var(--bg-card-subtle)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <strong>Mandatory Legal Limitation:</strong> {battery.recall_check.disclaimer}
          </div>
        </div>
      )}

      {/* TAB 8: MERKLE AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cryptographic Append-Only Merkle Audit Trail</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Every lifecycle update is chained to the previous hash: H(Data + Timestamp + PrevHash).
              </p>
            </div>

            <button onClick={handleAuditVerify} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
              <ShieldCheck size={15} color="var(--primary)" />
              Verify Chain Integrity Live
            </button>
          </div>

          {chainVerifyResult && (
            <div style={{ padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', background: chainVerifyResult.is_tamper_free ? 'var(--verified-green-bg)' : 'var(--danger-red-bg)', border: `1px solid ${chainVerifyResult.is_tamper_free ? 'var(--verified-green-border)' : 'var(--danger-red-border)'}` }}>
              <div style={{ fontWeight: 700, color: chainVerifyResult.is_tamper_free ? 'var(--verified-green)' : 'var(--danger-red)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {chainVerifyResult.is_tamper_free ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {chainVerifyResult.message}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
                Total Blocks Verified: {chainVerifyResult.total_blocks} • Latest Hash: {chainVerifyResult.latest_block_hash}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Audit events are stored in the append-only ledger and linked mathematically to prevent undetected database tampering.
          </div>
        </div>
      )}

      {/* TAB 9: EVIDENCE QUALITY REPORT */}
      {activeTab === 'report' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Evidence-Quality & Verifiability Dossier</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Comprehensive audit summary of historical evidence completeness and verifiability.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: battery.evidence_quality.score >= 80 ? 'var(--verified-green)' : battery.evidence_quality.score >= 50 ? 'var(--warning-amber)' : 'var(--danger-red)' }}>
                {battery.evidence_quality.score} / 100
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{battery.evidence_quality.level}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {battery.evidence_quality.summary}
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Evidence Scoring Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {battery.evidence_quality.breakdown.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-app)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <span>{item.item}</span>
                <span style={{ fontWeight: 700, color: item.points.startsWith('+') ? 'var(--verified-green)' : item.points.startsWith('-') ? 'var(--danger-red)' : 'var(--text-muted)' }}>
                  {item.points}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>Legal Notice & Epistemic Boundary:</strong> {battery.evidence_quality.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
