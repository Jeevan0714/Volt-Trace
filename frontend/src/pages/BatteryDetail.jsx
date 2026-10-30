import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  PlusCircle,
  Download,
  Wrench,
  RefreshCw,
  ShieldCheck,
  Activity,
  Layers,
  XCircle
} from 'lucide-react';

import {
  fetchBatteryDetail,
  uploadDocument,
  addDiagnosticRecord,
  verifyAuditChainIntegrity
} from '../api';

import BatteryProfileHeader from '../components/battery/BatteryProfileHeader';
import BatteryQRModal from '../components/battery/BatteryQRModal';
import OverviewTab from '../components/battery/OverviewTab';

import { PhysicsConsistencyCard } from '../components/PhysicsConsistencyCard';
import { ModuleLineageCard } from '../components/ModuleLineageCard';
import { BuyerConfidenceCard } from '../components/BuyerConfidenceCard';

import SoHTimelineChart from '../components/SoHTimelineChart';
import TamperSimulator from '../components/TamperSimulator';
import { ServiceWorkOrderModal } from '../components/ServiceWorkOrderModal';

export default function BatteryDetail({ batteryId, onBack, onOpenMobileIntake }) {
  const [battery, setBattery] = useState(null);
  const [loading, setLoading] = useState(true);

  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam) return tabParam;
    }
    return 'overview';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
    }
  };

  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [chainVerifyResult, setChainVerifyResult] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

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
    notes: 'Intake qualification test.'
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="battery-page-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ color: '#64748B', fontSize: '0.95rem' }}>
          Loading battery details...
        </div>
      </div>
    );
  }

  if (!battery) {
    return (
      <div className="battery-page-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Battery not found</h3>
        <button onClick={onBack} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Battery Registry
        </button>
      </div>
    );
  }

  const unresolvedDiscrepancies = battery.discrepancies?.filter((d) => d.status === 'UNRESOLVED') || [];
  const openWorkOrders = battery.service_orders?.filter((o) => o.status === 'OPEN') || [];
  const isMoreTabActive = activeTab.startsWith('more_');

  const moreSubnavOptions = [
    { key: 'more_verification', label: 'Verification Details' },
    { key: 'more_history', label: 'Change History' },
    { key: 'more_recalls', label: 'Recall Checks' },
    { key: 'more_evidence', label: 'Evidence Quality' },
    { key: 'more_advanced_diag', label: 'Advanced Diagnostics' },
    { key: 'more_lineage', label: 'Sub-Component Lineage' },
    { key: 'more_buyer_conf', label: 'Buyer Risk Analysis' },
    { key: 'more_physics', label: 'Physics Consistency' },
    { key: 'more_valuation', label: 'Valuation Benchmark' }
  ];

  return (
    <div className="battery-page-container">
      {/* 1. Battery Profile Header */}
      <BatteryProfileHeader
        battery={battery}
        onBack={onBack}
        onOpenServiceModal={() => setShowServiceModal(true)}
        onOpenQRModal={() => setShowQRModal(true)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 2. Simplified 5-Tab Navigation Bar */}
      <div className="tabs-nav" style={{ position: 'relative' }}>
        {/* Tab 1: Overview */}
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={16} />
          <span>Overview</span>
        </button>

        {/* Tab 2: Service History */}
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={16} />
          <span>Service History</span>
          {openWorkOrders.length > 0 && (
            <span className="badge badge-amber tab-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
              {openWorkOrders.length}
            </span>
          )}
        </button>

        {/* Tab 3: Test Reports */}
        <button
          type="button"
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={16} />
          <span>Test Reports</span>
          <span className="badge badge-neutral tab-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
            {(battery.diagnostics?.length || 0) + (battery.documents?.length || 0)}
          </span>
        </button>

        {/* Tab 4: Issues */}
        <button
          type="button"
          className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          <AlertCircle size={16} color={unresolvedDiscrepancies.length > 0 ? '#B91C1C' : undefined} />
          <span>Issues</span>
          {unresolvedDiscrepancies.length > 0 && (
            <span className="badge badge-red tab-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
              {unresolvedDiscrepancies.length}
            </span>
          )}
        </button>

        {/* Tab 5: More (Dropdown) */}
        <div className="tab-more-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className={`tab-btn ${isMoreTabActive ? 'active' : ''}`}
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>More</span>
            <ChevronDown size={14} style={{ transform: moreDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {moreDropdownOpen && (
            <div className="tab-dropdown-menu">
              {moreSubnavOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`tab-dropdown-item ${activeTab === opt.key ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(opt.key);
                    setMoreDropdownOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subnav pill bar when inside "More" sections */}
      {isMoreTabActive && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '0.4rem 0.6rem',
          marginTop: '-0.75rem',
          marginBottom: '0.5rem'
        }}>
          {moreSubnavOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveTab(opt.key)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: activeTab === opt.key ? '#FFFFFF' : 'transparent',
                color: activeTab === opt.key ? '#4F46E5' : '#64748B',
                boxShadow: activeTab === opt.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW (70% MAIN CONTENT + 30% SIDE PANEL)      */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <OverviewTab
          battery={battery}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenServiceModal={() => setShowServiceModal(true)}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 2: SERVICE HISTORY (WORK ORDERS & PASSPORT TIMELINE) */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section A: Mandatory Service Work Orders */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Wrench size={18} color="#4F46E5" />
                  <span>Service Work Orders</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Technicians record cell variance, diagnostic test findings, and service sign-offs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowServiceModal(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.95rem' }}
              >
                <PlusCircle size={15} />
                <span>Open / Close Work Order</span>
              </button>
            </div>

            {/* Work orders grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {(battery.service_orders || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', gridColumn: '1 / -1' }}>
                  No service work orders recorded for this pack yet. Click "Open / Close Work Order" above to initiate intake.
                </div>
              ) : (
                (battery.service_orders || []).map((order) => (
                  <div
                    key={order.id}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{order.id}</span>
                      <span className={`badge ${order.status === 'COMPLETED' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                        {order.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                      {order.description}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                      <div>Hub: <strong style={{ color: '#0F172A' }}>{order.service_center}</strong></div>
                      <div>Technician: <strong style={{ color: '#0F172A' }}>{order.technician_id}</strong></div>
                      <div>Health (SoH): <strong style={{ color: order.reported_soh ? '#15803D' : '#B45309' }}>{order.reported_soh ? `${order.reported_soh}%` : 'Pending'}</strong></div>
                      <div>Cell Variance: <strong style={{ color: '#0F172A' }}>{order.cell_variance_mv ? `${order.cell_variance_mv} mV` : 'N/A'}</strong></div>
                    </div>

                    {order.action_taken && (
                      <div style={{ fontSize: '0.78rem', padding: '0.5rem 0.65rem', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#475569' }}>
                        <strong>Action Taken:</strong> {order.action_taken}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chronological Passport Events */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Clock size={18} color="#4F46E5" />
                  <span>Chronological Lifecycle Passport</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Historical operational events registered throughout this battery's lifecycle.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={loadBattery}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RefreshCw size={13} />
                  <span>Sync / Refresh</span>
                </button>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  {battery.events?.length || 0} Events
                </span>
              </div>
            </div>

            {/* Timeline display */}
            <div style={{
              position: 'relative',
              paddingLeft: '1.5rem',
              borderLeft: '2px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {[...(battery.events || [])]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((evt, idx) => (
                  <div key={evt.id || idx} style={{ position: 'relative' }}>
                    {/* Circle marker */}
                    <div style={{
                      position: 'absolute',
                      left: '-1.95rem',
                      top: '0.35rem',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: evt.verification_status === 'VERIFIED' ? '#15803D' : evt.verification_status === 'FAILED' ? '#B91C1C' : '#4F46E5',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 0 0 2px #E2E8F0'
                    }} />

                    <div style={{
                      background: '#F8FAFC',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: idx === 0 ? '1.5px solid #4F46E5' : '1px solid #E2E8F0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                            {evt.title}
                          </span>
                          {idx === 0 && (
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                              Latest Entry
                            </span>
                          )}
                          {(evt.event_type?.includes('INTAKE') || evt.event_type?.includes('SERVICE')) && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                              📱 Mobile Intake
                            </span>
                          )}
                        </div>

                        <span className={`badge ${evt.verification_status === 'VERIFIED' ? 'badge-green' : evt.verification_status === 'FAILED' ? 'badge-red' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                          {evt.verification_status === 'VERIFIED' ? 'Verified' : evt.verification_status === 'FAILED' ? 'Review Needed' : evt.verification_status}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.35rem 0 0.5rem', lineHeight: 1.45 }}>
                        {evt.description}
                      </p>

                      <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <span>Organization: <strong>{evt.submitting_org}</strong></span>
                        {evt.actor && <span>Actor: <strong>{evt.actor}</strong></span>}
                        <span>Date: {new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: TEST REPORTS (DIAGNOSTICS & SUPPORTING DOCUMENTS)  */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Diagnostics Section */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Activity size={18} color="#4F46E5" />
                  <span>Diagnostic Health Records</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Historical State of Health (SoH) degradation curve and test measurements.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDiagForm(!showDiagForm)}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.95rem' }}
              >
                <PlusCircle size={15} />
                <span>{showDiagForm ? 'Cancel Entry' : 'Enter New Diagnostic Test'}</span>
              </button>
            </div>

            {/* Diagnostic Intake Form */}
            {showDiagForm && (
              <form
                onSubmit={handleDiagSubmit}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Measured Capacity (kWh) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagForm.measured_capacity_kwh}
                    onChange={(e) => setDiagForm({ ...diagForm, measured_capacity_kwh: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Measured SoH (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagForm.reported_soh}
                    onChange={(e) => setDiagForm({ ...diagForm, reported_soh: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Testing Organisation *
                  </label>
                  <input
                    type="text"
                    required
                    value={diagForm.testing_org}
                    onChange={(e) => setDiagForm({ ...diagForm, testing_org: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Trust Classification *
                  </label>
                  <select
                    value={diagForm.source_label}
                    onChange={(e) => setDiagForm({ ...diagForm, source_label: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="INDEPENDENT_TEST">Independent Qualification Test</option>
                    <option value="USER_ENTERED">Service Technician OBD Readout</option>
                    <option value="SELLER_REPORTED">Seller Self-Reported</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowDiagForm(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Record Test
                  </button>
                </div>
              </form>
            )}

            {/* Degradation Chart */}
            <div style={{ marginBottom: '1.5rem' }}>
              <SoHTimelineChart diagnostics={battery.diagnostics || []} />
            </div>

            {/* Diagnostics Table */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Historical Test Results
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test Date</th>
                    <th>Measured SoH</th>
                    <th>Capacity</th>
                    <th>Testing Body</th>
                    <th>Method</th>
                    <th>Source Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {(battery.diagnostics || []).map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.test_date).toLocaleDateString()}</td>
                      <td>
                        <strong style={{ color: d.reported_soh >= 80 ? '#15803D' : '#B45309' }}>
                          {d.reported_soh}%
                        </strong>
                      </td>
                      <td>{d.measured_capacity_kwh} kWh</td>
                      <td>{d.testing_org}</td>
                      <td>{d.test_method}</td>
                      <td>
                        <span className={`badge ${d.source_label === 'INDEPENDENT_TEST' ? 'badge-green' : 'badge-neutral'}`}>
                          {d.source_label === 'INDEPENDENT_TEST' ? 'Independent' : d.source_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supporting Documents Section */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FileText size={18} color="#4F46E5" />
                  <span>Supporting Documents & Verification</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Registered test reports, invoices, and certificates with file verification status.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.95rem' }}
              >
                <Upload size={15} />
                <span>{showUploadForm ? 'Cancel Upload' : 'Upload Document'}</span>
              </button>
            </div>

            {/* Document Upload Form */}
            {showUploadForm && (
              <form
                onSubmit={handleUploadSubmit}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Document Type *
                  </label>
                  <select
                    value={uploadData.document_type}
                    onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="DIAGNOSTIC_REPORT">Diagnostic Health Report</option>
                    <option value="SERVICE_INVOICE">Service & Maintenance Invoice</option>
                    <option value="MODULE_REPLACEMENT">Module / Cell Replacement Record</option>
                    <option value="BIRTH_CERTIFICATE">OEM Birth Certificate</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Submitting Body *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadData.issuer_name}
                    onChange={(e) => setUploadData({ ...uploadData, issuer_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '0.25rem' }}>
                    Select PDF / Image File *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowUploadForm(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Upload & Verify
                  </button>
                </div>
              </form>
            )}

            {/* Documents Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Submitting Body</th>
                    <th>File Verification</th>
                    <th>Trust Level</th>
                    <th style={{ textAlign: 'right' }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {(battery.documents || []).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <FileText size={16} color="#4F46E5" />
                          <span>{doc.file_name}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {doc.document_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{doc.issuer_name}</td>
                      <td>
                        {doc.integrity_status === 'MATCHED' ? (
                          <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                            <CheckCircle2 size={12} /> File Verified
                          </span>
                        ) : (
                          <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>
                            <XCircle size={12} /> Needs Review
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {doc.trust_tier?.replace(/_/g, ' ') || 'Standard'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a
                          href={`/api/v1/batteries/${battery.id}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tamper Simulator Tool */}
          <TamperSimulator
            batteryId={battery.id}
            documents={battery.documents || []}
            onVerificationComplete={loadBattery}
          />

          {/* Live Ledger Verification */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={18} color="#4F46E5" />
                  <span>Audit Trail Integrity Verification</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Mathematically validates record sequence to verify no historical database tampering occurred.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAuditVerify}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.95rem' }}
              >
                <ShieldCheck size={15} color="#4F46E5" />
                <span>Verify Live Chain</span>
              </button>
            </div>

            {chainVerifyResult && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: chainVerifyResult.is_tamper_free ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${chainVerifyResult.is_tamper_free ? '#BBF7D0' : '#FECACA'}`,
                  marginBottom: '1rem'
                }}
              >
                <div style={{ fontWeight: 700, color: chainVerifyResult.is_tamper_free ? '#15803D' : '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {chainVerifyResult.is_tamper_free ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{chainVerifyResult.message}</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginTop: '0.35rem', color: '#64748B' }}>
                  Blocks Verified: {chainVerifyResult.total_blocks} • Latest Block Fingerprint: {chainVerifyResult.latest_block_hash}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
              VoltTrace applies an append-only audit trail where every lifecycle transaction is linked to previous event records. This guarantees that test reports, ownership transfers, and service orders cannot be altered retroactively without detection.
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: ISSUES (DISCREPANCIES & RECALL ADVISORIES)         */}
      {/* ======================================================== */}
      {activeTab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Physical Consistency & Signature Paradox (Huddle 1) */}
          <PhysicsConsistencyCard battery={battery} />

          {/* Epistemic Buyer Confidence & History Holes (Huddle 3) */}
          <BuyerConfidenceCard battery={battery} />

          {/* Main Issues Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <AlertCircle size={18} color="#B91C1C" />
                  <span>Items Requiring Attention</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Plain-language explanations of recorded inconsistencies and required actions.
                </p>
              </div>

              <span className={`badge ${unresolvedDiscrepancies.length > 0 ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.8rem' }}>
                {unresolvedDiscrepancies.length} {unresolvedDiscrepancies.length === 1 ? 'Issue' : 'Issues'}
              </span>
            </div>

            {unresolvedDiscrepancies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={36} color="#15803D" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#15803D' }}>
                  Zero Contradictions Found
                </div>
                <p style={{ fontSize: '0.85rem', color: '#166534', maxWidth: '460px', margin: '0.35rem auto 0', lineHeight: 1.5 }}>
                  All uploaded document files match registered baseline records, degradation curves are physically consistent, and no chronological anomalies were detected.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {unresolvedDiscrepancies.map((disc) => {
                  const isFileIssue = disc.code === 'DISC_HASH_MISMATCH' || disc.code?.includes('HASH');
                  const isSoHIssue = disc.code === 'DISC_SOH_JUMP' || disc.code?.includes('SOH');

                  let plainTitle = disc.title || 'Record inconsistency detected';
                  let plainExplanation = disc.description || '';
                  let actionButtonText = 'Resolve Issue';
                  let actionHandler = () => setActiveTab('reports');

                  if (isFileIssue) {
                    plainTitle = 'Report needs review';
                    plainExplanation = 'The uploaded file differs from the previously registered version. An updated or corrected report from the issuing authority is recommended.';
                    actionButtonText = 'Upload Corrected Report';
                    actionHandler = () => {
                      setActiveTab('reports');
                      setShowUploadForm(true);
                    };
                  } else if (isSoHIssue) {
                    plainTitle = 'Test results do not match';
                    plainExplanation = 'The reported battery health differs from an earlier measurement without any recorded module or cell replacement invoice. An independent physical diagnostic test is required.';
                    actionButtonText = 'Record Service Test';
                    actionHandler = () => setShowServiceModal(true);
                  }

                  return (
                    <div
                      key={disc.id}
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={18} color="#B91C1C" />
                          <span style={{ fontWeight: 800, color: '#B91C1C', fontSize: '0.95rem' }}>
                            {plainTitle}
                          </span>
                        </div>
                        <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>
                          {disc.severity || 'HIGH'} PRIORITY
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#7F1D1D', margin: 0, lineHeight: 1.55 }}>
                        {plainExplanation}
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#991B1B',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid #FEE2E2'
                      }}>
                        <span>Detected on: {new Date(disc.detected_at).toLocaleString()}</span>

                        <button
                          type="button"
                          onClick={actionHandler}
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', background: '#B91C1C' }}
                        >
                          {actionButtonText}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Safety Recalls Section */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={18} color="#4F46E5" />
                  <span>Manufacturer Safety Bulletin Checks</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Cross-referenced against registered technical safety advisories.
                </p>
              </div>

              <span className={`badge ${battery.recall_check?.matches_count > 0 ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: '0.8rem' }}>
                {battery.recall_check?.matches_count > 0 ? 'Advisory Match' : 'Zero Recalls'}
              </span>
            </div>

            {(!battery.recall_check?.matches || battery.recall_check.matches.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0', color: '#15803D' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No Safety Recalls Found</div>
                <p style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.25rem' }}>
                  Battery ID {battery.id} has no matching recalls in the current demonstration safety dataset.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {battery.recall_check.matches.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#B45309', fontSize: '0.92rem' }}>
                        {rec.title}
                      </span>
                      <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                        {rec.code}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                      {rec.description}
                    </p>

                    <div style={{ fontSize: '0.75rem', color: '#92400E', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #FEF3C7' }}>
                      <span>Source: {rec.source}</span>
                      <span>Bulletin Date: {rec.updated_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '1rem', padding: '0.75rem 0.85rem', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.75rem', color: '#64748B', lineHeight: 1.45 }}>
              <strong>Notice:</strong> Recall matching checks against configured demonstration safety records. Absence of a match is not proof of defect-free status.
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MORE (ADVANCED FEATURES & TECHNICAL TOOLS)        */}
      {/* ======================================================== */}

      {/* 5-Lineage: Sub-Component Provenance & Module Merkle Map */}
      {activeTab === 'more_lineage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ModuleLineageCard battery={battery} />
        </div>
      )}

      {/* 5-Buyer: Epistemic Buyer Confidence & History Holes */}
      {activeTab === 'more_buyer_conf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <BuyerConfidenceCard battery={battery} />
        </div>
      )}

      {/* 5-Physics: Physical Consistency & Signature Paradox */}
      {activeTab === 'more_physics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <PhysicsConsistencyCard battery={battery} />
        </div>
      )}

      {/* 5A. Verification Details */}
      {activeTab === 'more_verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tamper Simulator Tool */}
          <TamperSimulator
            batteryId={battery.id}
            documents={battery.documents || []}
            onVerificationComplete={loadBattery}
          />

          {/* Live Ledger Verification */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={18} color="#4F46E5" />
                  <span>Audit Trail Integrity Verification</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                  Mathematically validates record sequence to verify no historical database tampering occurred.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAuditVerify}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.95rem' }}
              >
                <ShieldCheck size={15} color="#4F46E5" />
                <span>Verify Live Chain</span>
              </button>
            </div>

            {chainVerifyResult && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: chainVerifyResult.is_tamper_free ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${chainVerifyResult.is_tamper_free ? '#BBF7D0' : '#FECACA'}`,
                  marginBottom: '1rem'
                }}
              >
                <div style={{ fontWeight: 700, color: chainVerifyResult.is_tamper_free ? '#15803D' : '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {chainVerifyResult.is_tamper_free ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{chainVerifyResult.message}</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginTop: '0.35rem', color: '#64748B' }}>
                  Blocks Verified: {chainVerifyResult.total_blocks} • Latest Block Fingerprint: {chainVerifyResult.latest_block_hash}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
              VoltTrace applies an append-only audit trail where every lifecycle transaction is linked to previous event records. This guarantees that test reports, ownership transfers, and service orders cannot be altered retroactively without detection.
            </div>
          </div>
        </div>
      )}

      {/* 5B. Change History */}
      {activeTab === 'more_history' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Complete Change History
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                Full chronological ledger of all registration, intake, and status transitions.
              </p>
            </div>
            <span className="badge badge-neutral">
              {battery.events?.length || 0} Registered Entries
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Title</th>
                  <th>Submitting Body</th>
                  <th>Actor</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {[...(battery.events || [])]
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((evt, idx) => (
                    <tr key={evt.id || idx}>
                      <td>{new Date(evt.timestamp).toLocaleString()}</td>
                      <td>
                        <strong style={{ color: '#0F172A' }}>{evt.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{evt.description}</div>
                      </td>
                      <td>{evt.submitting_org}</td>
                      <td>{evt.actor}</td>
                      <td>
                        <span className={`badge ${evt.verification_status === 'VERIFIED' ? 'badge-green' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                          {evt.verification_status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5C. Recall Checks */}
      {activeTab === 'more_recalls' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
            Safety Recall Bulletin Dataset
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '1.25rem' }}>
            Automated technical safety bulletin matching across Ministry of Road Transport and Highways (MoRTH) & ARAI datasets.
          </p>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', fontSize: '0.82rem', color: '#475569' }}>
            <div>Dataset Reference: <strong>{battery.recall_check?.dataset_source || 'MoRTH / ARAI Technical Bulletins'}</strong></div>
            <div style={{ marginTop: '0.25rem' }}>Last Snapshot Date: <strong>{battery.recall_check?.last_updated || '2026-10-15'}</strong></div>
            <div style={{ marginTop: '0.25rem' }}>Status: <strong>{battery.recall_check?.status || 'Zero Recalls'}</strong></div>
          </div>
        </div>
      )}

      {/* 5D. Evidence Quality Dossier */}
      {activeTab === 'more_evidence' && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Evidence-Quality & Verifiability Dossier
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
                Objective rating of documentation completeness, cryptographic signatures, and historical consistency.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: (battery.evidence_quality?.score || 0) >= 80 ? '#15803D' : (battery.evidence_quality?.score || 0) >= 50 ? '#B45309' : '#B91C1C'
              }}>
                {battery.evidence_quality?.score || 0} / 100
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                {battery.evidence_quality?.level || 'EVIDENCE SCORE'}
              </div>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
            {battery.evidence_quality?.summary || 'Standard documentation checks completed.'}
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Scoring Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(battery.evidence_quality?.breakdown || []).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.82rem'
                }}
              >
                <span style={{ color: '#0F172A' }}>{item.item}</span>
                <span style={{
                  fontWeight: 700,
                  color: item.points.startsWith('+') ? '#15803D' : item.points.startsWith('-') ? '#B91C1C' : '#64748B'
                }}>
                  {item.points}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', fontSize: '0.75rem', color: '#64748B', lineHeight: 1.5 }}>
            <strong>Legal Notice:</strong> {battery.evidence_quality?.disclaimer || 'Evidence score measures document completeness only and is not a physical safety warranty.'}
          </div>
        </div>
      )}

      {/* 5E. Advanced Diagnostics */}
      {activeTab === 'more_advanced_diag' && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Advanced Engineering Diagnostics
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
            Detailed electrical and environmental parameters from registered test records.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Test Date</th>
                  <th>Cell Variance</th>
                  <th>Internal Resistance</th>
                  <th>Ambient Temp</th>
                  <th>Cycle Count</th>
                  <th>Test Notes</th>
                </tr>
              </thead>
              <tbody>
                {(battery.diagnostics || []).map((d) => (
                  <tr key={d.id}>
                    <td>{new Date(d.test_date).toLocaleDateString()}</td>
                    <td>{d.fault_codes || 'Normal (<15 mV)'}</td>
                    <td>{d.internal_resistance_mohm ? `${d.internal_resistance_mohm} mΩ` : 'N/A'}</td>
                    <td>{d.ambient_temp_c ? `${d.ambient_temp_c} °C` : 'N/A'}</td>
                    <td>{d.cycle_count ? `${d.cycle_count} cycles` : 'N/A'}</td>
                    <td>{d.notes || 'Routine intake'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5F. Optional Valuation Benchmark (Moved from main view per prompt Section 10) */}
      {activeTab === 'more_valuation' && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Optional Market Reference
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
              Indicative Residual Valuation Benchmark
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.25rem 0 0' }}>
              Optional, secondary market benchmark based on Indian commercial storage pricing.
            </p>
          </div>

          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase' }}>Valuation Status</span>
              <div style={{
                fontWeight: 800,
                color: battery.valuation?.status === 'VALUATION_ON_HOLD' ? '#B91C1C' : '#15803D',
                fontSize: '1rem',
                marginTop: '0.2rem'
              }}>
                {battery.valuation?.status || 'Active'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase' }}>Indicative Range</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '0.1rem' }}>
                {battery.valuation?.formatted_range || 'Not available'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase' }}>Confidence Spread</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginTop: '0.2rem' }}>
                {battery.valuation?.confidence_label || 'Standard Reference'}
              </div>
            </div>
          </div>

          <div style={{
            padding: '0.85rem',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '6px',
            fontSize: '0.78rem',
            color: '#78350F',
            lineHeight: 1.5
          }}>
            <strong>Important Epistemic Disclaimer:</strong> This valuation is an illustrative synthetic estimate for second-life commercial storage planning. It is not an appraisal, verified condition guarantee, or warranty.
          </div>
        </div>
      )}


      {/* Mandatory Service Work Order Modal (Policy VT-202) */}
      <ServiceWorkOrderModal
        battery={battery}
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onOrderUpdated={() => loadBattery()}
      />

      {/* Clean Battery QR Modal */}
      <BatteryQRModal
        battery={battery}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onOpenMobileIntake={onOpenMobileIntake}
      />
    </div>
  );
}
