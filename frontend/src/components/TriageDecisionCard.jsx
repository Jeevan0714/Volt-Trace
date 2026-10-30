import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  ArrowRight,
  ListChecks,
  AlertCircle
} from 'lucide-react';

export default function TriageDecisionCard({ triage, valuation }) {
  if (!triage) return null;

  const { record_integrity, evidence_quality, next_action, suitability } = triage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 3-PILLAR DECISION FRAMEWORK */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Activity size={14} />
            EVIDENCE-BASED TESTING & TRIAGE DECISION
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            The 3-Pillar Assessment
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Independent evaluation of document validity, historical completeness, and operational next steps.
          </p>
        </div>

        {/* The 3 Pillars Grid - Vertical Columns */}
        <div className="pillars-grid">
          {/* PILLAR 1: RECORD INTEGRITY */}
          <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Pillar 1: Record Integrity
                </span>
                <span className={`badge ${record_integrity.badge_class}`}>
                  {record_integrity.status === 'VERIFIED_MATCH' ? <CheckCircle2 size={12} /> : record_integrity.status === 'MISMATCH_DETECTED' ? <XCircle size={12} /> : <HelpCircle size={12} />}
                  {record_integrity.status?.replace(/_/g, ' ') || 'STATUS'}
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                {record_integrity.label}
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {record_integrity.details}
              </p>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Verified via bitwise SHA-256 & Ed25519 signature checks
            </div>
          </div>

          {/* PILLAR 2: EVIDENCE QUALITY */}
          <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Pillar 2: Evidence Quality
                </span>
                <span className={`badge ${evidence_quality.badge_class}`}>
                  {evidence_quality.label}
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                {evidence_quality.label}
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {evidence_quality.summary}
              </p>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Evaluates chronological consistency, missing invoices & anomalies
            </div>
          </div>

          {/* PILLAR 3: RECOMMENDED NEXT ACTION */}
          <div style={{ background: next_action.urgency === 'CRITICAL' ? 'var(--danger-red-bg)' : next_action.urgency === 'ATTENTION' ? 'var(--warning-amber-bg)' : 'var(--verified-green-bg)', border: `1px solid ${next_action.urgency === 'CRITICAL' ? 'var(--danger-red-border)' : next_action.urgency === 'ATTENTION' ? 'var(--warning-amber-border)' : 'var(--verified-green-border)'}`, borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: next_action.urgency === 'CRITICAL' ? 'var(--danger-red)' : next_action.urgency === 'ATTENTION' ? 'var(--warning-amber)' : 'var(--verified-green)', textTransform: 'uppercase' }}>
                  Pillar 3: Action
                </span>
                <span className={`badge ${next_action.badge_class}`}>
                  {next_action.urgency}
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: next_action.urgency === 'CRITICAL' ? '#7f1d1d' : next_action.urgency === 'ATTENTION' ? '#78350f' : '#065f46', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                {next_action.label}
              </div>

              <p style={{ fontSize: '0.8rem', color: next_action.urgency === 'CRITICAL' ? '#991b1b' : next_action.urgency === 'ATTENTION' ? '#92400e' : '#047857', lineHeight: 1.5 }}>
                {next_action.instruction}
              </p>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.68rem', fontWeight: 600, color: next_action.urgency === 'CRITICAL' ? '#b91c1c' : '#065f46' }}>
              Action required before commercial transfer or second-life deployment
            </div>
          </div>
        </div>
      </div>

      {/* SECOND-LIFE SUITABILITY ASSESSMENT (CONDITIONAL) */}
      {suitability && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SECOND-LIFE SUITABILITY ASSESSMENT
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {suitability.label}
              </h3>
            </div>

            <span className={`badge ${suitability.status?.includes('CANDIDATE') ? 'badge-green' : suitability.status?.includes('NOT_DETERMINED') ? 'badge-red' : 'badge-amber'}`}>
              {suitability.status?.replace(/_/g, ' ') || 'NOT DETERMINED'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.15rem' }}>
            {suitability.notes}
          </p>

          {(!suitability.potential_applications_to_evaluate?.length && !suitability.missing_evidence_checklist?.length) ? (
            <div style={{ background: 'var(--danger-red-bg)', border: '1px solid var(--danger-red-border)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#991b1b', fontWeight: 800, fontSize: '0.85rem' }}>
                <AlertTriangle size={16} color="var(--danger-red)" />
                <span>Mandatory Second-Life Investigation Protocol (VT-701)</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#7f1d1d', margin: 0, lineHeight: 1.45 }}>
                Pack is barred from stationary storage or commercial sale until physical evidence is reconciled:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', marginTop: '0.2rem' }}>
                <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--danger-red-border)', fontSize: '0.74rem', color: '#7f1d1d' }}>
                  <strong>1. Physical Bench Test:</strong> Independent Coulomb counting test on isolated cycler.
                </div>
                <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--danger-red-border)', fontSize: '0.74rem', color: '#7f1d1d' }}>
                  <strong>2. Teardown Inspection:</strong> Cell block physical check for thermal or mechanical strain.
                </div>
                <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--danger-red-border)', fontSize: '0.74rem', color: '#7f1d1d' }}>
                  <strong>3. Ledger Reconciliation:</strong> Corrective Merkle audit hash submission required.
                </div>
              </div>
            </div>
          ) : (
            <div className="suitability-grid">
              {/* Potential Applications to Evaluate */}
              {suitability.potential_applications_to_evaluate?.length > 0 && (
                <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ArrowRight size={14} /> Potential Applications to Evaluate (Not Pre-Approved)
                  </div>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                    {suitability.potential_applications_to_evaluate.map((app, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{app}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Evidence / Pre-requisite Checklist */}
              {suitability.missing_evidence_checklist?.length > 0 && (
                <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning-amber)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ListChecks size={14} /> Outstanding Tests Required Prior to Second-Life Deployment
                  </div>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                    {suitability.missing_evidence_checklist.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <AlertCircle size={15} color="var(--text-muted)" />
            <span>{suitability.disclaimer}</span>
          </div>
        </div>
      )}

      {/* SYNTHETIC VALUATION BENCHMARK (CLEARLY LABELED AS ILLUSTRATIVE) */}
      {valuation && (
        <div className="card" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                OPTIONAL SYNTHETIC MARKET BENCHMARK (ILLUSTRATIVE ONLY)
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: valuation.status === 'VALUATION_ON_HOLD' ? 'var(--danger-red)' : 'var(--text-primary)', marginTop: '0.1rem' }}>
                {valuation.formatted_range}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{valuation.confidence_label}</div>
            </div>

            <div style={{ maxWidth: '480px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Notice:</strong> {valuation.notes} {valuation.disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
