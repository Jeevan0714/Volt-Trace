import React, { useState } from 'react';
import { Layers, ShieldAlert, CheckCircle, AlertTriangle, Fingerprint, RefreshCw, Cpu, Zap, ArrowRight } from 'lucide-react';

export function ModuleLineageCard({ battery }) {
  const modules = battery?.modules || [];
  const [selectedModule, setSelectedModule] = useState(modules.find(m => m.is_replaced) || modules[0] || null);

  const hasSwappedModule = modules.some(m => m.is_replaced);
  const nominalModules = modules.filter(m => !m.is_replaced && m.internal_resistance_mohm);
  const baselineIr = nominalModules.length > 0
    ? nominalModules.reduce((acc, m) => acc + m.internal_resistance_mohm, 0) / nominalModules.length
    : 2.2;

  if (!modules || modules.length === 0) {
    return (
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Layers size={18} style={{ color: 'var(--text-secondary)' }} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Sub-Component Module Inventory</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Module-level telemetry is pending registration by authorized disassembly depot.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              HACKATHON HINT 2: SUB-COMPONENT PROVENANCE
            </span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} style={{ color: '#7c3aed' }} />
              Sub-Component Lineage & Pack Identity Map
            </h3>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            EV battery packs are modular assemblies. Swapping a single sub-module shifts the pack's composite Merkle identity and introduces donor cell lineage.
          </p>
        </div>

        {/* Pack Composite Identity Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '8px',
          fontSize: '0.74rem',
          fontWeight: 800,
          background: hasSwappedModule ? '#fff7ed' : '#ecfdf5',
          color: hasSwappedModule ? '#c2410c' : '#059669',
          border: `1px solid ${hasSwappedModule ? '#fdba74' : '#a7f3d0'}`
        }}>
          {hasSwappedModule ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
          <span>{hasSwappedModule ? 'Composite Identity Fractured (Donor Swap)' : 'OEM Sealed Pack Identity (Verified)'}</span>
        </div>
      </div>

      {/* Merkle Root Hash Display */}
      <div style={{
        background: 'var(--bg-app)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.65rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Fingerprint size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Pack Composite Merkle Root:</span>
          <code style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)', background: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            {battery?.pack_composite_merkle_root || 'urn:pack:merkle:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
          </code>
        </div>
        <span style={{ fontSize: '0.7rem', color: hasSwappedModule ? '#c2410c' : 'var(--text-muted)', fontWeight: 600 }}>
          {hasSwappedModule ? '⚠️ Hash diverges from Factory OEM Root' : '✓ Matches Factory Manifest Root'}
        </span>
      </div>

      {/* 8-Module Physical Topology Grid */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            PACK TOPOLOGY ({modules.length} SERIES MODULES IN STRINGS)
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Click any module to inspect serial lineage & impedance
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
          {modules.map((mod) => {
            const isSelected = selectedModule?.id === mod.id;
            const isMismatched = mod.status === 'IMPEDANCE_MISMATCH_HAZARD';
            const isReplaced = mod.is_replaced;

            let cardBg = '#ffffff';
            let cardBorder = 'var(--border-color)';
            if (isMismatched) {
              cardBg = isSelected ? '#fef2f2' : '#fff1f2';
              cardBorder = '#f87171';
            } else if (isReplaced) {
              cardBg = isSelected ? '#fffbeb' : '#fefce8';
              cardBorder = '#facc15';
            } else if (isSelected) {
              cardBg = '#eff6ff';
              cardBorder = '#3b82f6';
            }

            return (
              <div
                key={mod.id}
                onClick={() => setSelectedModule(mod)}
                style={{
                  background: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  borderRadius: '8px',
                  padding: '0.75rem 0.65rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  position: 'relative'
                }}
              >
                {/* Module Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isMismatched ? '#b91c1c' : 'var(--text-primary)' }}>
                    MOD #{mod.module_index}
                  </span>
                  {isMismatched ? (
                    <AlertTriangle size={13} color="#dc2626" />
                  ) : isReplaced ? (
                    <RefreshCw size={13} color="#d97706" />
                  ) : (
                    <CheckCircle size={13} color="#16a34a" />
                  )}
                </div>

                {/* Health & IR */}
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isMismatched ? '#991b1b' : 'var(--text-primary)' }}>
                  {mod.soh_percent.toFixed(1)}% <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>SoH</span>
                </div>

                <div style={{ fontSize: '0.72rem', color: isMismatched ? '#dc2626' : 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 600 }}>
                  {mod.internal_resistance_mohm.toFixed(1)} mΩ
                  {isMismatched && <span style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 800 }}> (+118%)</span>}
                </div>

                {/* Origin Tag */}
                <div style={{
                  marginTop: '0.45rem',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.35rem',
                  borderRadius: '3px',
                  textAlign: 'center',
                  background: isMismatched ? '#fee2e2' : isReplaced ? '#fef3c7' : '#f1f5f9',
                  color: isMismatched ? '#991b1b' : isReplaced ? '#92400e' : '#475569'
                }}>
                  {isReplaced ? 'DONOR PART' : 'ORIGINAL OEM'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Module Detail Inspector */}
      {selectedModule && (
        <div style={{
          background: selectedModule.is_replaced ? '#fff7ed' : '#f8fafc',
          border: `1px solid ${selectedModule.is_replaced ? '#fed7aa' : 'var(--border-color)'}`,
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16} style={{ color: selectedModule.is_replaced ? '#c2410c' : 'var(--primary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Module #{selectedModule.module_index} Detail: <code style={{ fontFamily: 'monospace' }}>{selectedModule.serial_number}</code>
              </span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.2rem 0.55rem',
              borderRadius: '20px',
              background: selectedModule.is_replaced ? '#ffedd5' : '#e2e8f0',
              color: selectedModule.is_replaced ? '#9a3412' : '#334155'
            }}>
              Provenance: {selectedModule.replacement_origin.replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.75rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Cell Chemistry:</span> <strong>{selectedModule.cell_chemistry} (40.0V Nominal)</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Operating Cycles:</span> <strong>{selectedModule.cycle_count} cycles</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Internal Resistance:</span>{' '}
              <strong style={{ color: selectedModule.status === 'IMPEDANCE_MISMATCH_HAZARD' ? '#dc2626' : 'inherit' }}>
                {selectedModule.internal_resistance_mohm.toFixed(1)} mΩ ({((selectedModule.internal_resistance_mohm - baselineIr) / baselineIr * 100) > 0 ? '+' : ''}{((selectedModule.internal_resistance_mohm - baselineIr) / baselineIr * 100).toFixed(0)}% vs Pack)
              </strong>
            </div>
            {selectedModule.donor_battery_id && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Donor Pack Origin:</span>{' '}
                <strong style={{ color: '#c2410c' }}>{selectedModule.donor_battery_id}</strong>
              </div>
            )}
          </div>

          {selectedModule.donor_notes && (
            <div style={{ fontSize: '0.72rem', color: '#9a3412', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fdba74' }}>
              <strong>Donor Lineage Audit Note:</strong> {selectedModule.donor_notes}
            </div>
          )}

          {/* Weakest Link Principle Callout */}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.5rem' }}>
            <Zap size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>Weakest Link Principle:</strong> In series-connected EV battery packs, charging current and discharge throughput are governed by the highest resistance cell. A mismatched donor module bottlenecks the entire pack.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
