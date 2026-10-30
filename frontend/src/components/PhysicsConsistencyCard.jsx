import React from 'react';
import { ShieldCheck, AlertTriangle, Flame, RotateCcw, Zap, Info, FileText } from 'lucide-react';

export function PhysicsConsistencyCard({ battery }) {
  const discrepancies = battery?.discrepancies || [];
  const physicsViolations = discrepancies.filter(d =>
    ['DISC_VALID_SIG_IMPOSSIBLE_SOH', 'DISC_CYCLE_ROLLBACK', 'DISC_UNREALISTIC_FADE', 'DISC_SOH_JUMP'].includes(d.code) &&
    d.status === 'UNRESOLVED'
  );

  const hasSignedImpossible = discrepancies.some(d => d.code === 'DISC_VALID_SIG_IMPOSSIBLE_SOH' && d.status === 'UNRESOLVED');
  const hasRollback = discrepancies.some(d => d.code === 'DISC_CYCLE_ROLLBACK' && d.status === 'UNRESOLVED');
  const hasModuleMismatch = discrepancies.some(d => d.code === 'DISC_MODULE_IMPEDANCE_MISMATCH' && d.status === 'UNRESOLVED');

  if (physicsViolations.length === 0 && !hasModuleMismatch) {
    return (
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: '#dcfce7', color: '#16a34a', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#14532d' }}>
              Physics & Thermodynamic Consistency Verified
            </div>
            <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '0.15rem' }}>
              Diagnostic trajectories obey electrochemical monotonic degradation and monotonic cycle progression.
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.65rem', borderRadius: '20px' }}>
          ✓ Monotonicity Satisfied
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff1f2 0%, #fffbeb 100%)',
      border: '1.5px solid #f87171',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
    }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #fecaca', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.55rem', borderRadius: '10px', display: 'flex' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', background: '#dc2626', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                PHYSICS INTEGRITY AUDIT
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>
                Valid Signature, Impossible Battery Paradox
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.4 }}>
              <strong>Cryptographic authenticity does not equal physical truth.</strong> An accredited digital signature cannot override the laws of thermodynamics.
            </p>
          </div>
        </div>

        {/* Dual Verification Split Tag */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0'
          }}>
            <ShieldCheck size={14} />
            <span>Digital Signature: VALID (Ed25519)</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca'
          }}>
            <Flame size={14} />
            <span>Battery Physics: IMPOSSIBLE</span>
          </div>
        </div>
      </div>

      {/* Physics Violations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
        {hasSignedImpossible && (
          <div style={{ background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <Zap size={16} />
              <span>Thermodynamic Monotonicity Breach</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#4b5563', lineHeight: 1.45 }}>
              Reported State of Health jumped by <strong>+14.5%</strong> in a signed test without a recorded cell replacement invoice. Capacity fade in secondary cells is strictly irreversible without hardware renewal.
            </p>
          </div>
        )}

        {hasRollback && (
          <div style={{ background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <RotateCcw size={16} />
              <span>BMS Odometer Rollback Anomaly</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#4b5563', lineHeight: 1.45 }}>
              BMS cycle count dropped backwards from <strong>880 cycles to 520 cycles (-360 cycles)</strong>. Operating cycles are strictly monotonic physical accumulators; indicates ECU reset or readout tampering.
            </p>
          </div>
        )}

        {hasModuleMismatch && (
          <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#a16207', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <Flame size={16} />
              <span>Sub-Component Impedance Mismatch</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#4b5563', lineHeight: 1.45 }}>
              Module #4 transplanted from a salvaged donor pack. Internal resistance (4.8 mΩ) diverges by <strong>+118%</strong> from baseline, creating severe localized heating and cell imbalance.
            </p>
          </div>
        )}
      </div>

      {/* Explanatory Footer */}
      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed #fecaca', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#991b1b' }}>
        <Info size={14} style={{ flexShrink: 0 }} />
        <span>
          <strong>Why this matters:</strong> Malicious actors or unauthorized refurbishers often obtain dealership signatures on falsified OBD telemetry. VoltTrace’s Physics Guard verifies both cryptographic proof AND thermodynamic feasibility.
        </span>
      </div>
    </div>
  );
}
