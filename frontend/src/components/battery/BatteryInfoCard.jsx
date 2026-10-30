import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';

export default function BatteryInfoCard({ battery }) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!battery) return null;

  // Key fields for the 2-column grid (only show if has value)
  const infoItems = [
    { label: 'Manufacturer', value: battery.manufacturer },
    { label: 'Battery Chemistry', value: battery.chemistry },
    { label: 'Rated Capacity', value: battery.rated_capacity_kwh ? `${battery.rated_capacity_kwh} kWh` : null },
    { label: 'Nominal Voltage', value: battery.nominal_voltage ? `${battery.nominal_voltage} V` : null },
    { label: 'Manufacturing Date', value: battery.mfg_date },
    {
      label: 'Registration Date',
      value: battery.created_at ? new Date(battery.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
    },
    { label: 'Vehicle Reference', value: battery.vehicle_info },
    { label: 'Current Fleet / Owner', value: battery.current_owner }
  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Layers size={18} color="#4F46E5" />
          <span>Battery Information</span>
        </h2>
        {battery.model && (
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
            Model: {battery.model}
          </span>
        )}
      </div>

      {/* 2-Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        fontSize: '0.875rem'
      }}>
        {infoItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.75rem 1rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '0.2rem' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', wordBreak: 'break-word' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Technical Details (Expandable) */}
      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.45rem 0',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={15} />
            Additional Technical Details
          </span>
          {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showTechnicalDetails && (
          <div style={{
            marginTop: '0.75rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.85rem',
            fontSize: '0.8rem'
          }}>
            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '0.15rem' }}>Permanent Passport URN</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#0F172A', wordBreak: 'break-all', display: 'block', background: '#FFFFFF', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                {battery.uuid || 'urn:volttrace:battery:' + battery.id.toLowerCase()}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '0.15rem' }}>Passport Standard Compliance</span>
              <span style={{ fontWeight: 600, color: '#0F172A', display: 'block' }}>
                CIRPASS DPP • ISO 15118-20 • GS1 Digital Link
              </span>
            </div>

            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '0.15rem' }}>Last Database Synchronisation</span>
              <span style={{ color: '#0F172A', display: 'block' }}>
                {battery.updated_at ? new Date(battery.updated_at).toLocaleString() : 'Recent'}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '0.15rem' }}>Primary Cell Format</span>
              <span style={{ color: '#0F172A', display: 'block' }}>
                {battery.chemistry?.includes('LFP') ? 'Prismatic Blade Cell Format' : 'Cylindrical 21700 Pack Module'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
