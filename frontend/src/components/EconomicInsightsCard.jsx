import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  Droplet,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  ArrowRight,
  RefreshCw,
  Building2,
  Recycle,
  Factory
} from 'lucide-react';
import { updateBatteryOutcome } from '../api';

export function EconomicInsightsCard({ battery, onOutcomeUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(battery.lifecycle_outcome || 'PENDING_ASSESSMENT');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [actorName, setActorName] = useState('Lead Assessor Roy');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const econ = battery.triage?.economic_insights || {
    testing_time_saved_hours: 0,
    testing_savings_label: 'Standard Laboratory Qualification Required',
    testing_savings_rationale: 'Reviewing diagnostic baseline and historical log consistency.',
    cycler_cost_saved_estimate: '₹0',
    critical_metals_kg: (battery.rated_capacity_kwh * 0.56).toFixed(1),
    water_avoided_liters: Math.round(battery.rated_capacity_kwh * 1120),
    second_life_extension_years: 0,
    current_outcome: battery.lifecycle_outcome || 'PENDING_ASSESSMENT',
  };

  const handleUpdateOutcome = async (newOutcome) => {
    setUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const defaultNotes =
        newOutcome === 'SECOND_LIFE_DEPLOYED'
          ? 'Approved for stationary solar peak-shaving microgrid cluster.'
          : newOutcome === 'RECYCLING_PROCESSED'
          ? 'Dispatched to ISO-14001 hydrometallurgical lithium recovery facility.'
          : newOutcome === 'QUARANTINE_HOLD'
          ? 'Quarantined pending physical lab teardown and cell impedance audit.'
          : 'Intake triage pending physical qualification.';

      const updated = await updateBatteryOutcome(battery.id, {
        outcome: newOutcome,
        actor: actorName || 'Facility Assessor',
        notes: outcomeNotes || defaultNotes,
      });

      setSelectedOutcome(newOutcome);
      setSuccessMsg(`Lifecycle outcome successfully updated: ${String(newOutcome || '').replace(/_/g, ' ')}`);
      if (onOutcomeUpdated) {
        onOutcomeUpdated(updated);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update outcome');
    } finally {
      setUpdating(false);
    }
  };

  const outcomeBadge = () => {
    switch (battery.lifecycle_outcome) {
      case 'SECOND_LIFE_DEPLOYED':
        return {
          label: 'Deployed in Second Life (Active)',
          color: '#059669',
          bg: '#ecfdf5',
          border: '#a7f3d0'
        };
      case 'RECYCLING_PROCESSED':
        return {
          label: 'Dispatched to Closed-Loop Recycling',
          color: '#0284c7',
          bg: '#f0f9ff',
          border: '#bae6fd'
        };
      case 'QUARANTINE_HOLD':
        return {
          label: 'Quarantine / Technical Hold',
          color: '#dc2626',
          bg: '#fef2f2',
          border: '#fecaca'
        };
      default:
        return {
          label: 'Pending Second-Life Triage Assessment',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a'
        };
    }
  };

  const badge = outcomeBadge();

  return (
    <div className="econ-container">
      {/* Header Bar */}
      <div className="econ-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>
              Economic Savings & Circular Resource Stewardship
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
              Realized cycler bench testing-time optimization, operating OpEx reduction, and finite mineral recovery metrics.
            </p>
          </div>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: badge.color }} />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* 4 Clean Indexed Metrics */}
      <div className="econ-metrics-grid">
        {/* Metric 01: Testing Time Saved */}
        <div className="econ-metric-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', letterSpacing: '0.04em' }}>
                [METRIC 01] • PROVENANCE EFFICIENCY
              </span>
              <Clock size={15} color="#16a34a" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>
              {econ.testing_time_saved_hours > 0 ? `${econ.testing_time_saved_hours} Hours` : 'Full Test Req.'}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginTop: '0.35rem' }}>
              {econ.testing_savings_label}
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#166534', marginTop: '0.75rem', lineHeight: 1.45 }}>
            {econ.testing_savings_rationale}
          </p>
        </div>

        {/* Metric 02: Bench OpEx Saved */}
        <div className="econ-metric-card" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#3730a3', letterSpacing: '0.04em' }}>
                [METRIC 02] • OPERATING OPEX
              </span>
              <Zap size={15} color="#4f46e5" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#312e81', lineHeight: 1.2 }}>
              {econ.cycler_cost_saved_estimate}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca', marginTop: '0.35rem' }}>
              Avoids {econ.testing_time_saved_hours}h cycler electrical draw
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#3730a3', marginTop: '0.75rem', lineHeight: 1.45 }}>
            Direct laboratory bench labor and cycler kilowatt-hour electricity avoided by relying on verified intake records.
          </p>
        </div>

        {/* Metric 03: Critical Minerals Conserved */}
        <div className="econ-metric-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.04em' }}>
                [METRIC 03] • FINITE ELEMENTS
              </span>
              <Recycle size={15} color="#d97706" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', lineHeight: 1.2 }}>
              ~{econ.critical_metals_kg} kg
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', marginTop: '0.35rem' }}>
              Cathode Elements ({battery.chemistry})
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#92400e', marginTop: '0.75rem', lineHeight: 1.45 }}>
            Finite virgin lithium, nickel, and cobalt retained within circular secondary storage or closed-loop hydrometallurgy.
          </p>
        </div>

        {/* Metric 04: Freshwater Mining Impact Avoided */}
        <div className="econ-metric-card" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#075985', letterSpacing: '0.04em' }}>
                [METRIC 04] • HYDRO FOOTPRINT
              </span>
              <Droplet size={15} color="#0284c7" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0c4a6e', lineHeight: 1.2 }}>
              ~{Number(econ.water_avoided_liters || 0).toLocaleString()} L
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', marginTop: '0.35rem' }}>
              Freshwater Extraction Avoided
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#075985', marginTop: '0.75rem', lineHeight: 1.45 }}>
            Conserves clean groundwater that would otherwise be consumed in primary spodumene and brine evaporation mining.
          </p>
        </div>
      </div>

      {/* Lifecycle Disposition Selector */}
      <div className="econ-disposition-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', margin: 0 }}>
              <Building2 size={16} style={{ color: 'var(--primary)' }} />
              Cascading Lifecycle Disposition Control
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
              Assign verified pack to its next stage. Updates the digital passport and appends a Merkle audit hash.
            </p>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Authorized Assessor: <strong>{actorName}</strong>
          </div>
        </div>

        {successMsg && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.85rem', background: 'var(--verified-green-bg)', border: '1px solid var(--verified-green-border)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--verified-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.85rem', background: 'var(--danger-red-bg)', border: '1px solid var(--danger-red-border)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--danger-red)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="econ-actions-grid">
          {/* Action 1: Second-Life Storage */}
          <button
            type="button"
            disabled={updating}
            onClick={() => handleUpdateOutcome('SECOND_LIFE_DEPLOYED')}
            className={`econ-action-card ${battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' ? 'active' : ''}`}
            style={{
              borderColor: battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' ? '#059669' : undefined,
              background: battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' ? '#ecfdf5' : undefined
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' ? '#065f46' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} color="#059669" />
                Second-Life Storage
              </span>
              {battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' && (
                <CheckCircle size={15} color="#059669" />
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Deploy in stationary solar BESS, telecom UPS, or microgrid peak-shaving.
            </p>
          </button>

          {/* Action 2: Route to Recycling */}
          <button
            type="button"
            disabled={updating}
            onClick={() => handleUpdateOutcome('RECYCLING_PROCESSED')}
            className={`econ-action-card ${battery.lifecycle_outcome === 'RECYCLING_PROCESSED' ? 'active' : ''}`}
            style={{
              borderColor: battery.lifecycle_outcome === 'RECYCLING_PROCESSED' ? '#0284c7' : undefined,
              background: battery.lifecycle_outcome === 'RECYCLING_PROCESSED' ? '#f0f9ff' : undefined
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: battery.lifecycle_outcome === 'RECYCLING_PROCESSED' ? '#075985' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Factory size={14} color="#0284c7" />
                Route to Recycling
              </span>
              {battery.lifecycle_outcome === 'RECYCLING_PROCESSED' && (
                <CheckCircle size={15} color="#0284c7" />
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Dispatch for hydrometallurgical closed-loop cathode metal recovery.
            </p>
          </button>

          {/* Action 3: Quarantine / Hold */}
          <button
            type="button"
            disabled={updating}
            onClick={() => handleUpdateOutcome('QUARANTINE_HOLD')}
            className={`econ-action-card ${battery.lifecycle_outcome === 'QUARANTINE_HOLD' ? 'active' : ''}`}
            style={{
              borderColor: battery.lifecycle_outcome === 'QUARANTINE_HOLD' ? '#dc2626' : undefined,
              background: battery.lifecycle_outcome === 'QUARANTINE_HOLD' ? '#fef2f2' : undefined
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: battery.lifecycle_outcome === 'QUARANTINE_HOLD' ? '#991b1b' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={14} color="#dc2626" />
                Quarantine / Hold
              </span>
              {battery.lifecycle_outcome === 'QUARANTINE_HOLD' && (
                <CheckCircle size={15} color="#dc2626" />
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Isolate pack for discrepancy investigation, hash review, or destructive testing.
            </p>
          </button>

          {/* Action 4: Pending Assessment */}
          <button
            type="button"
            disabled={updating}
            onClick={() => handleUpdateOutcome('PENDING_ASSESSMENT')}
            className={`econ-action-card ${battery.lifecycle_outcome === 'PENDING_ASSESSMENT' ? 'active' : ''}`}
            style={{
              borderColor: battery.lifecycle_outcome === 'PENDING_ASSESSMENT' ? '#475569' : undefined,
              background: battery.lifecycle_outcome === 'PENDING_ASSESSMENT' ? '#f8fafc' : undefined
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: battery.lifecycle_outcome === 'PENDING_ASSESSMENT' ? '#334155' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <RotateCcw size={14} color="#64748b" />
                Pending Assessment
              </span>
              {battery.lifecycle_outcome === 'PENDING_ASSESSMENT' && (
                <CheckCircle size={15} color="#475569" />
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Awaiting physical visual inspection and final qualification bench test.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
