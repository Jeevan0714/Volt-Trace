import React, { useRef } from 'react';
import {
  Heart,
  Battery,
  Zap,
  Calendar,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Wrench,
  FileText,
  Shield,
  TrendingDown,
  Info,
  ChevronRight,
  User,
  Truck,
  Activity
} from 'lucide-react';

/* ─────────── Helper: format date nicely ─────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/* ─────────── Helper: SoH colour ─────────── */
function sohColor(soh) {
  if (soh >= 80) return '#16a34a';
  if (soh >= 60) return '#d97706';
  return '#dc2626';
}

function sohBg(soh) {
  if (soh >= 80) return '#f0fdf4';
  if (soh >= 60) return '#fffbeb';
  return '#fef2f2';
}

function sohLabel(soh) {
  if (soh >= 80) return 'Good';
  if (soh >= 60) return 'Fair';
  return 'Poor';
}

/* ─────────── Helper: disposition label ─────────── */
function dispositionLabel(outcome) {
  const map = {
    SECOND_LIFE_READY: 'Second-Life Ready',
    RECYCLE: 'Recycle',
    QUARANTINE_HOLD: 'Under Review',
    ACTIVE_SERVICE: 'In Service'
  };
  return map[outcome] || outcome || 'Pending Assessment';
}

function dispositionColor(outcome) {
  if (outcome === 'SECOND_LIFE_READY' || outcome === 'ACTIVE_SERVICE') return '#16a34a';
  if (outcome === 'RECYCLE') return '#dc2626';
  return '#d97706';
}

import { generateBatteryPassportPDF } from '../../utils/pdfGenerator';


export default function OverviewTab({ battery, onNavigateTab, onOpenServiceModal }) {
  if (!battery) return null;

  const latestDiag = battery.diagnostics?.[0] || null;
  const soh = latestDiag?.reported_soh;
  const capacity = latestDiag?.measured_capacity_kwh;
  const unresolvedIssues = battery.discrepancies?.filter(d => d.status === 'UNRESOLVED') || [];
  const openWorkOrders = battery.service_orders?.filter(o => o.status === 'OPEN') || [];
  const totalEvents = battery.events?.length || 0;
  const totalDocs = battery.documents?.length || 0;
  const totalDiags = battery.diagnostics?.length || 0;

  // Latest event
  const latestEvent = battery.events?.length
    ? [...battery.events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    : null;

  // Hackathon Hurdle Detection (3 Pillars)
  const hasPhysicsIssue = battery.discrepancies?.some(d =>
    ['DISC_VALID_SIG_IMPOSSIBLE_SOH', 'DISC_CYCLE_ROLLBACK', 'DISC_UNREALISTIC_FADE', 'DISC_SOH_JUMP'].includes(d.code) &&
    d.status === 'UNRESOLVED'
  ) || battery.has_physics_violation;

  const hasModuleSwap = battery.has_module_replacement || battery.modules?.some(m => m.is_replaced) || battery.discrepancies?.some(d =>
    d.code === 'DISC_MODULE_IMPEDANCE_MISMATCH' && d.status === 'UNRESOLVED'
  );

  const buyerConf = battery.buyer_confidence || battery.triage?.buyer_confidence;
  const hasHistoryHoles = (buyerConf?.max_gap_days > 90) || (buyerConf?.buyer_confidence_score < 60);
  const isHurdleFlagship = hasPhysicsIssue || hasModuleSwap || hasHistoryHoles;

  return (
    <div className="overview-clean">
      {/* ── SECTION 1: Health at a Glance ── */}
      <div className="overview-hero">
        <div className="overview-hero-left">
          {/* Big SoH Ring */}
          <div className="soh-ring" style={{ '--soh-color': soh != null ? sohColor(soh) : '#94a3b8' }}>
            <svg viewBox="0 0 120 120" className="soh-ring-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={soh != null ? sohColor(soh) : '#94a3b8'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(soh || 0) * 3.267} 326.7`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <div className="soh-ring-center">
              <span className="soh-ring-value">{soh != null ? `${soh}%` : '—'}</span>
              <span className="soh-ring-label">
                {soh != null ? sohLabel(soh) : 'No data'}
              </span>
            </div>
          </div>
        </div>

        <div className="overview-hero-right">
          <div className="overview-hero-title">Battery Health</div>
          
          {/* Key metrics row */}
          <div className="overview-metrics-grid">
            <div className="overview-metric">
              <div className="overview-metric-icon" style={{ color: '#6366f1', background: '#eef2ff' }}>
                <Battery size={16} />
              </div>
              <div>
                <div className="overview-metric-label">Capacity</div>
                <div className="overview-metric-value">
                  {capacity ? `${capacity} kWh` : '—'}
                  {battery.rated_capacity_kwh && capacity ? (
                    <span className="overview-metric-sub"> / {battery.rated_capacity_kwh}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="overview-metric">
              <div className="overview-metric-icon" style={{ color: '#0891b2', background: '#ecfeff' }}>
                <Zap size={16} />
              </div>
              <div>
                <div className="overview-metric-label">Voltage</div>
                <div className="overview-metric-value">
                  {battery.nominal_voltage ? `${battery.nominal_voltage} V` : '—'}
                </div>
              </div>
            </div>

            <div className="overview-metric">
              <div className="overview-metric-icon" style={{ color: '#7c3aed', background: '#f5f3ff' }}>
                <Activity size={16} />
              </div>
              <div>
                <div className="overview-metric-label">Cycle Count</div>
                <div className="overview-metric-value">
                  {latestDiag?.cycle_count || '—'}
                </div>
              </div>
            </div>

            <div className="overview-metric">
              <div className="overview-metric-icon" style={{
                color: dispositionColor(battery.lifecycle_outcome),
                background: sohBg(soh || 80)
              }}>
                <TrendingDown size={16} />
              </div>
              <div>
                <div className="overview-metric-label">Disposition</div>
                <div className="overview-metric-value" style={{ color: dispositionColor(battery.lifecycle_outcome) }}>
                  {dispositionLabel(battery.lifecycle_outcome)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Hackathon Hurdle & Integrity Alerts ── */}
      {(unresolvedIssues.length > 0 || isHurdleFlagship) && (
        <div style={{
          background: isHurdleFlagship ? '#fff1f2' : '#fffbeb',
          border: `1.5px solid ${isHurdleFlagship ? '#fca5a5' : '#fde68a'}`,
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: isHurdleFlagship ? '#fee2e2' : '#fef3c7',
                color: isHurdleFlagship ? '#dc2626' : '#d97706',
                padding: '0.55rem',
                borderRadius: '8px',
                display: 'flex'
              }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isHurdleFlagship && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#dc2626', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      HACKATHON HURDLE AUDIT ACTIVE
                    </span>
                  )}
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: isHurdleFlagship ? '#991b1b' : '#92400e' }}>
                    {isHurdleFlagship
                      ? 'Valid Signature, Impossible Battery & Provenance Anomaly Detected'
                      : `${unresolvedIssues.length} issue${unresolvedIssues.length > 1 ? 's' : ''} require attention`
                    }
                  </h3>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: isHurdleFlagship ? '#7f1d1d' : '#b45309', lineHeight: 1.45 }}>
                  {isHurdleFlagship
                    ? 'Cryptographic authenticity cannot override the laws of thermodynamics. This battery contains signed data describing physically impossible behavior, unrecorded telematics gaps, or mismatched sub-components.'
                    : 'Review recorded discrepancies and complete physical verification before authorizing second-life assignment.'
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigateTab('issues')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: '#991b1b', borderColor: '#fca5a5' }}
            >
              All Issues ({unresolvedIssues.length})
            </button>
          </div>

          {/* 3 Hurdle Pill Action Links */}
          {isHurdleFlagship && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.65rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              {hasPhysicsIssue && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('issues')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626' }}>
                      1. PHYSICS PARADOX
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#1e293b', fontWeight: 600 }}>
                      Impossible SoH / Rollback
                    </div>
                  </div>
                  <ChevronRight size={15} color="#dc2626" />
                </button>
              )}

              {hasModuleSwap && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('history')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #c4b5fd',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6d28d9' }}>
                      2. SUB-COMPONENT LINEAGE
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#1e293b', fontWeight: 600 }}>
                      Swapped Module #4 (+118% IR)
                    </div>
                  </div>
                  <ChevronRight size={15} color="#6d28d9" />
                </button>
              )}

              {hasHistoryHoles && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('issues')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369a1' }}>
                      3. BUYER CONFIDENCE
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#1e293b', fontWeight: 600 }}>
                      {buyerConf?.max_gap_days || 420}-Day Telematics Hole
                    </div>
                  </div>
                  <ChevronRight size={15} color="#0369a1" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 3: Quick Facts Grid ── */}
      <div className="overview-section-title">
        <Info size={15} />
        Quick Facts
      </div>
      <div className="overview-facts-grid">
        {[
          { icon: <User size={15} />, label: 'Manufacturer', value: battery.manufacturer },
          { icon: <Battery size={15} />, label: 'Chemistry', value: battery.chemistry },
          { icon: <Truck size={15} />, label: 'Owner / Fleet', value: battery.current_owner || '—' },
          { icon: <Calendar size={15} />, label: 'Manufactured', value: fmtDate(battery.mfg_date) },
          { icon: <FileText size={15} />, label: 'Model', value: battery.model || '—' },
          { icon: <Calendar size={15} />, label: 'Registered', value: fmtDate(battery.created_at) },
        ].filter(f => f.value && f.value !== '—').map((fact, i) => (
          <div key={i} className="overview-fact-item">
            <div className="overview-fact-icon">{fact.icon}</div>
            <div>
              <div className="overview-fact-label">{fact.label}</div>
              <div className="overview-fact-value">{fact.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 4: Activity Snapshot ── */}
      <div className="overview-section-title">
        <Clock size={15} />
        Activity Snapshot
      </div>
      <div className="overview-activity-row">
        <div className="overview-stat-card">
          <div className="overview-stat-number" style={{ color: '#4f46e5' }}>{totalEvents}</div>
          <div className="overview-stat-label">Total Events</div>
        </div>
        <div className="overview-stat-card">
          <div className="overview-stat-number" style={{ color: '#0891b2' }}>{totalDiags}</div>
          <div className="overview-stat-label">Diagnostics</div>
        </div>
        <div className="overview-stat-card">
          <div className="overview-stat-number" style={{ color: '#7c3aed' }}>{totalDocs}</div>
          <div className="overview-stat-label">Documents</div>
        </div>
        <div className="overview-stat-card">
          <div className="overview-stat-number" style={{
            color: openWorkOrders.length > 0 ? '#d97706' : '#16a34a'
          }}>
            {openWorkOrders.length}
          </div>
          <div className="overview-stat-label">Open Orders</div>
        </div>
      </div>

      {/* Latest event mini-timeline */}
      {latestEvent && (
        <div className="overview-latest-event">
          <div className="overview-latest-dot" />
          <div className="overview-latest-content">
            <div className="overview-latest-title">{latestEvent.title}</div>
            <div className="overview-latest-meta">
              {fmtDate(latestEvent.timestamp)}
              {latestEvent.submitting_org && ` · ${latestEvent.submitting_org}`}
            </div>
          </div>
          <button
            type="button"
            className="overview-link-btn"
            onClick={() => onNavigateTab('history')}
          >
            View all <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* ── SECTION 5: Quick Actions ── */}
      <div className="overview-actions-bar">
        <button
          type="button"
          className="overview-action-btn overview-action-primary"
          onClick={() => generateBatteryPassportPDF(battery)}
        >
          <Download size={16} />
          Download Report (PDF)
        </button>

        <button
          type="button"
          className="overview-action-btn overview-action-secondary"
          onClick={() => onNavigateTab('reports')}
        >
          <FileText size={16} />
          Test Reports
        </button>

        <button
          type="button"
          className="overview-action-btn overview-action-secondary"
          onClick={onOpenServiceModal}
        >
          <Wrench size={16} />
          Record Service
        </button>

        <button
          type="button"
          className="overview-action-btn overview-action-secondary"
          onClick={() => onNavigateTab('issues')}
        >
          <Shield size={16} />
          Physics & Issues
        </button>
      </div>
    </div>
  );
}
