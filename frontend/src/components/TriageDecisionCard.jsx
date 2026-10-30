import React from 'react';
import { Sun, Radio, Truck, Zap, Recycle, AlertTriangle, ShieldCheck, Clock, Sparkles } from 'lucide-react';

export default function TriageDecisionCard({ triage, valuation }) {
  if (!triage) return null;

  const getStreamBadge = (stream) => {
    if (stream?.includes('Stream A')) {
      return <span className="badge badge-green"><ShieldCheck size={13} /> {stream}</span>;
    }
    if (stream?.includes('Stream B')) {
      return <span className="badge badge-amber"><Clock size={13} /> {stream}</span>;
    }
    return <span className="badge badge-red"><AlertTriangle size={13} /> {stream}</span>;
  };

  const getIcon = (code) => {
    switch (code) {
      case 'COMMERCIAL_BESS':
        return <Sun size={28} color="#059669" />;
      case 'TELECOM_UPS_BACKUP':
        return <Radio size={28} color="#0284c7" />;
      case 'LOW_SPEED_EV':
        return <Truck size={28} color="#d97706" />;
      case 'SOLAR_STREETLIGHT':
        return <Zap size={28} color="#2563eb" />;
      default:
        return <Recycle size={28} color="#dc2626" />;
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SECOND-LIFE APPLICATION MATCHING & TRIAGE
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {triage.title}
          </h2>
        </div>
        {getStreamBadge(triage.stream)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
            {getIcon(triage.category_code)}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Application</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{triage.target_application}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projected 2nd-Life Span</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
            {triage.projected_life_years > 0 ? `${triage.projected_life_years} Years` : '0 (End-of-Life)'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Safety Clearance Status</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: triage.safety_status.includes('APPROVED') ? 'var(--verified-green)' : 'var(--danger-red)' }}>
            {triage.safety_status.replace(/_/g, ' ')}
          </div>
        </div>

        {valuation && (
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Indicative Value Band</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: valuation.status === 'VALUATION_ON_HOLD' ? 'var(--danger-red)' : 'var(--text-primary)' }}>
              {valuation.formatted_range}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{valuation.confidence_label}</div>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
          ENGINEERING RATIONALE & SAFETY PROTOCOL
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {triage.rationale}
        </p>
      </div>

      {triage.ai_advisory && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
            <Sparkles size={16} />
            <span>AI Techno-Economic Advisory ({triage.ai_advisory.mode})</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', fontStyle: 'italic' }}>
            "{triage.ai_advisory.executive_summary}"
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', background: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '8px', padding: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Technical Considerations
              </div>
              <ul style={{ fontSize: '0.78rem', color: '#4c1d95', paddingLeft: '1rem', lineHeight: 1.5 }}>
                {triage.ai_advisory.technical_considerations?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Economic & Environmental Payback
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>
                {triage.ai_advisory.economic_projection}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7e22ce' }}>
                🌿 Estimated Carbon Avoidance: <strong>{triage.ai_advisory.carbon_offset_kg_co2} kg CO₂</strong> vs manufacturing new pack.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
