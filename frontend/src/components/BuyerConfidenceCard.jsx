import React from 'react';
import { HelpCircle, AlertOctagon, TrendingDown, ShieldAlert, CheckSquare, Calendar, DollarSign, ArrowDownRight, Info } from 'lucide-react';

export function BuyerConfidenceCard({ battery }) {
  const buyerConf = battery?.triage?.buyer_confidence || {
    buyer_confidence_score: 92,
    confidence_tier: 'HIGH_CONFIDENCE',
    tier_label: 'Audited & Continuous Provenance',
    tier_color: '#059669',
    max_gap_days: 14,
    gap_window: 'Continuous',
    nominal_valuation_inr: '₹145,000',
    risk_adjusted_bid_inr: '₹145,000',
    escrow_discount_inr: '₹0',
    buyer_advice: 'Safe to transact at nominal valuation. Standard intake visual screening sufficient.',
    risk_factors: [],
    mandatory_safeguards: [
      'Standard visual chassis inspection and insulation resistance check (>100 MΩ).'
    ]
  };

  const isLowConfidence = buyerConf.buyer_confidence_score < 50;
  const isModerate = buyerConf.buyer_confidence_score >= 50 && buyerConf.buyer_confidence_score < 80;

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              HACKATHON HINT 3: HISTORY HOLES & BUYER RISK
            </span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} style={{ color: '#0284c7' }} />
              Buyer Grade Confidence & Epistemic Uncertainty Framework
            </h3>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            How sure should a second-life buyer be when history has holes? Quantifies unrecorded operational intervals and computes risk-adjusted bidding discounts.
          </p>
        </div>

        {/* Confidence Tier Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '8px',
          fontSize: '0.74rem',
          fontWeight: 800,
          background: isLowConfidence ? '#fef2f2' : isModerate ? '#fffbeb' : '#ecfdf5',
          color: buyerConf.tier_color,
          border: `1px solid ${isLowConfidence ? '#fecaca' : isModerate ? '#fde68a' : '#a7f3d0'}`
        }}>
          {isLowConfidence ? <AlertOctagon size={16} /> : <CheckSquare size={16} />}
          <span>{buyerConf.tier_label} ({buyerConf.buyer_confidence_score}% Confidence)</span>
        </div>
      </div>

      {/* 3 High-Impact Assessment Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Card 1: Confidence Gauge */}
        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            BUYER CERTAINTY INDEX
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: buyerConf.tier_color, lineHeight: 1.1 }}>
            {buyerConf.buyer_confidence_score}%
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '0.65rem', overflow: 'hidden' }}>
            <div style={{
              width: `${buyerConf.buyer_confidence_score}%`,
              height: '100%',
              background: buyerConf.tier_color,
              borderRadius: '3px'
            }} />
          </div>
          <p style={{ margin: '0.65rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {buyerConf.buyer_advice}
          </p>
        </div>

        {/* Card 2: Telematics Blackout Window */}
        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              TELEMATICS BLACKOUT GAP
            </span>
            <Calendar size={14} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: buyerConf.max_gap_days > 180 ? '#dc2626' : 'var(--text-primary)', lineHeight: 1.1 }}>
            {buyerConf.max_gap_days} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Days</span>
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: buyerConf.max_gap_days > 180 ? '#b91c1c' : 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Window: {buyerConf.gap_window}
          </div>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {buyerConf.max_gap_days > 180
              ? 'Zero logged CAN telemetry or service logs during this extended window. Unknown calendar degradation.'
              : 'Continuous operational monitoring without significant gaps in diagnostic logging.'}
          </p>
        </div>

        {/* Card 3: Risk-Adjusted Bid & Escrow Withholding */}
        <div style={{ background: isLowConfidence ? '#fff1f2' : '#f0fdf4', border: `1px solid ${isLowConfidence ? '#fca5a5' : '#bbf7d0'}`, borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isLowConfidence ? '#991b1b' : '#14532d', letterSpacing: '0.04em' }}>
              RISK-ADJUSTED FAIR BID
            </span>
            <DollarSign size={14} color={isLowConfidence ? '#dc2626' : '#16a34a'} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: isLowConfidence ? '#991b1b' : '#14532d', lineHeight: 1.1 }}>
            {buyerConf.risk_adjusted_bid_inr}
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: isLowConfidence ? '#dc2626' : '#15803d', marginTop: '0.5rem' }}>
            Nominal Value: {buyerConf.nominal_valuation_inr}
          </div>
          {isLowConfidence && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '0.2rem 0.45rem', borderRadius: '4px', display: 'inline-block' }}>
              Withhold {buyerConf.escrow_discount_inr} Escrow
            </div>
          )}
        </div>
      </div>

      {/* Uncertainty Factors Breakdown */}
      {buyerConf.risk_factors && buyerConf.risk_factors.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.65rem' }}>
            HISTORY HOLES & RISK PENALTIES ({buyerConf.risk_factors.length} DETECTED)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {buyerConf.risk_factors.map((rf, idx) => (
              <div key={idx} style={{
                background: '#ffffff',
                border: '1px solid #fed7aa',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldAlert size={14} />
                    <span>{rf.title}</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {rf.detail}
                  </p>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '4px', flexShrink: 0 }}>
                  {rf.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Buyer Safeguards */}
      <div>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
          MANDATORY BUYER PROTOCOLS TO CLOSE THE CERTAINTY GAP
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem' }}>
          {buyerConf.mandatory_safeguards.map((sg, idx) => (
            <div key={idx} style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <CheckSquare size={15} style={{ color: '#0284c7', marginTop: '0.1rem', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{sg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
