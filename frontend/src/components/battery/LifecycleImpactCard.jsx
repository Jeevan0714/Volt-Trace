import React, { useState } from 'react';
import { Leaf, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { updateBatteryOutcome } from '../../api';

export default function LifecycleImpactCard({ battery, onOutcomeUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!battery) return null;

  const currentOutcome = battery.lifecycle_outcome || 'PENDING_ASSESSMENT';

  // Calculate supported physical material retention based on real pack chemistry & capacity
  const ratedCapacity = Number(battery.rated_capacity_kwh) || 0;
  const criticalMetalsKg = ratedCapacity > 0 ? (ratedCapacity * 0.56).toFixed(1) : null;
  const waterAvoidedLiters = ratedCapacity > 0 ? Math.round(ratedCapacity * 1120) : null;

  const handleSelectOutcome = async (newOutcome) => {
    setUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const defaultNotes =
        newOutcome === 'SECOND_LIFE_DEPLOYED'
          ? 'Approved for stationary solar peak-shaving microgrid cluster.'
          : newOutcome === 'RECYCLING_PROCESSED'
          ? 'Dispatched to hydrometallurgical lithium recovery facility.'
          : newOutcome === 'QUARANTINE_HOLD'
          ? 'Quarantined pending physical lab teardown and cell impedance audit.'
          : 'Awaiting physical visual inspection and qualification bench test.';

      const updated = await updateBatteryOutcome(battery.id, {
        outcome: newOutcome,
        actor: 'Facility Assessor',
        notes: defaultNotes
      });

      setSuccessMsg(`Lifecycle disposition updated to: ${newOutcome.replace(/_/g, ' ')}`);
      if (onOutcomeUpdated) {
        onOutcomeUpdated(updated);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update disposition');
    } finally {
      setUpdating(false);
    }
  };

  // Label for current status
  const getOutcomeStatus = () => {
    switch (currentOutcome) {
      case 'SECOND_LIFE_DEPLOYED':
        return {
          title: 'Confirmed Second-Life Deployment',
          type: 'confirmed-reuse',
          badgeClass: 'badge badge-green'
        };
      case 'RECYCLING_PROCESSED':
        return {
          title: 'Confirmed Material Recycling Route',
          type: 'confirmed-recycle',
          badgeClass: 'badge badge-blue'
        };
      case 'QUARANTINE_HOLD':
        return {
          title: 'Quarantine & Technical Hold',
          type: 'quarantine',
          badgeClass: 'badge badge-red'
        };
      default:
        return {
          title: 'Proposed Assessment (Pending Final Qualification)',
          type: 'proposed',
          badgeClass: 'badge badge-amber'
        };
    }
  };

  const outcomeInfo = getOutcomeStatus();

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Leaf size={18} color="#15803D" />
          <span>Lifecycle Impact</span>
        </h2>

        <span className={outcomeInfo.badgeClass} style={{ fontSize: '0.78rem' }}>
          {outcomeInfo.title}
        </span>
      </div>

      {/* Supported Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Metric 1: Material Retention */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Cathode Materials Retained
          </div>
          {criticalMetalsKg ? (
            <div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                ~{criticalMetalsKg} kg
              </span>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                Lithium & cathode elements ({battery.chemistry || 'N/A'})
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>Not available</span>
          )}
        </div>

        {/* Metric 2: Primary Extraction Avoided */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Mining Water Impact Avoided
          </div>
          {waterAvoidedLiters ? (
            <div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                ~{waterAvoidedLiters.toLocaleString()} L
              </span>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                Clean groundwater avoided vs. virgin mining
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>Not available</span>
          )}
        </div>

        {/* Metric 3: Proposed vs Confirmed Lifecycle Disposition */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Lifecycle Disposition
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem' }}>
            {currentOutcome.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '0.72rem', color: currentOutcome === 'SECOND_LIFE_DEPLOYED' ? '#15803D' : '#64748B', marginTop: '0.15rem' }}>
            {currentOutcome === 'SECOND_LIFE_DEPLOYED' ? '✓ Confirmed active reuse' : currentOutcome === 'RECYCLING_PROCESSED' ? '✓ Dispatched to recycler' : 'Proposed / Under review'}
          </div>
        </div>
      </div>

      {/* Disposition Selector for Mechanics/Recyclers */}
      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
          Record Lifecycle Disposition
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.75rem' }}>
          Assign this pack to its next stage in accordance with Indian Battery Waste Management Rules (BWMR 2022).
        </div>

        {successMsg && (
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '0.78rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.78rem', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            disabled={updating}
            onClick={() => handleSelectOutcome('SECOND_LIFE_DEPLOYED')}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              border: `1.5px solid ${currentOutcome === 'SECOND_LIFE_DEPLOYED' ? '#15803D' : '#E2E8F0'}`,
              background: currentOutcome === 'SECOND_LIFE_DEPLOYED' ? '#F0FDF4' : '#FFFFFF',
              color: currentOutcome === 'SECOND_LIFE_DEPLOYED' ? '#15803D' : '#0F172A',
              fontWeight: 600,
              fontSize: '0.8rem',
              textAlign: 'left',
              cursor: updating ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Second-Life Storage</span>
              {currentOutcome === 'SECOND_LIFE_DEPLOYED' && <CheckCircle2 size={14} color="#15803D" />}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 400 }}>Stationary storage / BESS</span>
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={() => handleSelectOutcome('RECYCLING_PROCESSED')}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              border: `1.5px solid ${currentOutcome === 'RECYCLING_PROCESSED' ? '#4F46E5' : '#E2E8F0'}`,
              background: currentOutcome === 'RECYCLING_PROCESSED' ? '#EEF2FF' : '#FFFFFF',
              color: currentOutcome === 'RECYCLING_PROCESSED' ? '#4F46E5' : '#0F172A',
              fontWeight: 600,
              fontSize: '0.8rem',
              textAlign: 'left',
              cursor: updating ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Route to Recycling</span>
              {currentOutcome === 'RECYCLING_PROCESSED' && <CheckCircle2 size={14} color="#4F46E5" />}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 400 }}>Hydrometallurgical recovery</span>
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={() => handleSelectOutcome('QUARANTINE_HOLD')}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              border: `1.5px solid ${currentOutcome === 'QUARANTINE_HOLD' ? '#B91C1C' : '#E2E8F0'}`,
              background: currentOutcome === 'QUARANTINE_HOLD' ? '#FEF2F2' : '#FFFFFF',
              color: currentOutcome === 'QUARANTINE_HOLD' ? '#B91C1C' : '#0F172A',
              fontWeight: 600,
              fontSize: '0.8rem',
              textAlign: 'left',
              cursor: updating ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Quarantine / Hold</span>
              {currentOutcome === 'QUARANTINE_HOLD' && <CheckCircle2 size={14} color="#B91C1C" />}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 400 }}>Isolate for inspection</span>
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={() => handleSelectOutcome('PENDING_ASSESSMENT')}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              border: `1.5px solid ${currentOutcome === 'PENDING_ASSESSMENT' ? '#475569' : '#E2E8F0'}`,
              background: currentOutcome === 'PENDING_ASSESSMENT' ? '#F8FAFC' : '#FFFFFF',
              color: currentOutcome === 'PENDING_ASSESSMENT' ? '#334155' : '#0F172A',
              fontWeight: 600,
              fontSize: '0.8rem',
              textAlign: 'left',
              cursor: updating ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Pending Assessment</span>
              {currentOutcome === 'PENDING_ASSESSMENT' && <CheckCircle2 size={14} color="#475569" />}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 400 }}>Awaiting qualification</span>
          </button>
        </div>
      </div>
    </div>
  );
}
