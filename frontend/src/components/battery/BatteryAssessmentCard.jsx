import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function BatteryAssessmentCard({ battery }) {
  const [showAssessmentDetails, setShowAssessmentDetails] = useState(false);

  if (!battery) return null;

  // Retrieve latest real diagnostic record
  const latestDiag = battery.diagnostics && battery.diagnostics.length > 0 ? battery.diagnostics[0] : null;
  const hasDiagRecord = latestDiag !== null && latestDiag.reported_soh !== undefined && latestDiag.reported_soh !== null;

  const unresolvedDiscrepancies = battery.discrepancies?.filter((d) => d.status === 'UNRESOLVED') || [];
  const triage = battery.triage || {};
  const suitability = triage.suitability || {};

  // Determine Assessment Status, Reason, and Next Step
  let assessmentStatus = '';
  let assessmentBadgeClass = '';
  let reason = '';
  let nextStep = '';

  if (unresolvedDiscrepancies.length > 0) {
    assessmentStatus = 'Further Review Required';
    assessmentBadgeClass = 'badge badge-amber';
    reason = 'Conflicting historical test results or file differences require resolution.';
    nextStep = 'Arrange an independent diagnostic assessment on an isolated test cycler.';
  } else if (!hasDiagRecord) {
    assessmentStatus = 'Not enough verified information to assess suitability.';
    assessmentBadgeClass = 'badge badge-neutral';
    reason = 'No registered diagnostic test records exist for this pack.';
    nextStep = 'Upload initial intake diagnostic report or perform Coulomb counting test.';
  } else if (battery.evidence_quality?.score < 50) {
    assessmentStatus = 'Not enough verified information to assess suitability.';
    assessmentBadgeClass = 'badge badge-amber';
    reason = 'Historical records lack sufficient documentation or verification signatures.';
    nextStep = 'Obtain missing service records and verify baseline specifications.';
  } else if (latestDiag.reported_soh >= 80) {
    assessmentStatus = 'Candidate for Routine Second-Life Assessment';
    assessmentBadgeClass = 'badge badge-green';
    reason = 'Diagnostic measurements and document records meet baseline requirements.';
    nextStep = 'Proceed to bench qualification for stationary energy storage.';
  } else {
    assessmentStatus = 'Recommend Material Recycling Evaluation';
    assessmentBadgeClass = 'badge badge-amber';
    reason = 'Measured health is below second-life stationary storage thresholds.';
    nextStep = 'Prepare pack for hydrometallurgical closed-loop recycling.';
  }

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Activity size={18} color="#4F46E5" />
          <span>Battery Assessment</span>
        </h2>

        <span className={assessmentBadgeClass} style={{ fontSize: '0.8rem' }}>
          {assessmentStatus}
        </span>
      </div>

      {/* Grid of 4 Key Assessment Fields */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Field 1: Measured Battery Health */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Measured Battery Health (SoH)
          </div>
          {hasDiagRecord ? (
            <div>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: latestDiag.reported_soh >= 80 ? '#15803D' : '#B45309'
              }}>
                {latestDiag.reported_soh}%
              </span>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                Tested: {new Date(latestDiag.test_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {latestDiag.testing_org ? ` • ${latestDiag.testing_org}` : ''}
              </div>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748B' }}>
                Not Tested
              </span>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                No diagnostic records on file
              </div>
            </div>
          )}
        </div>

        {/* Field 2: Assessment Status */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Assessment Status
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: '0.2rem' }}>
            {assessmentStatus}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
            Lifecycle Evaluation
          </div>
        </div>

        {/* Field 3: Primary Reason */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Reason
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {reason}
          </div>
        </div>

        {/* Field 4: Next Step */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Next Step
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4F46E5', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {nextStep}
          </div>
        </div>
      </div>

      {/* Distinction Note */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.78rem',
        color: '#64748B',
        lineHeight: 1.45,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem'
      }}>
        <AlertCircle size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <strong>Measurement vs. Recommendation:</strong> State of Health (SoH) is a measured laboratory capacity percentage. A high percentage does not by itself prove a battery is safe for second-life use; physical cell-balancing and thermal impedance tests must also be verified.
        </div>
      </div>

      {/* Expandable Assessment Details */}
      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setShowAssessmentDetails(!showAssessmentDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.45rem 0',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#4F46E5',
            cursor: 'pointer'
          }}
        >
          <span>{showAssessmentDetails ? 'Hide Assessment Details' : 'View Assessment Details'}</span>
          {showAssessmentDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAssessmentDetails && (
          <div style={{
            marginTop: '0.75rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontSize: '0.82rem'
          }}>
            {suitability.notes && (
              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '0.2rem' }}>Evaluation Summary:</strong>
                <p style={{ color: '#475569', margin: 0, lineHeight: 1.5 }}>{suitability.notes}</p>
              </div>
            )}

            {suitability.potential_applications_to_evaluate?.length > 0 && (
              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '0.35rem' }}>Potential Applications to Evaluate:</strong>
                <ul style={{ paddingLeft: '1.25rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  {suitability.potential_applications_to_evaluate.map((app, i) => (
                    <li key={i}>{app}</li>
                  ))}
                </ul>
              </div>
            )}

            {suitability.missing_evidence_checklist?.length > 0 && (
              <div>
                <strong style={{ color: '#B45309', display: 'block', marginBottom: '0.35rem' }}>Prerequisites Prior to Second-Life Deployment:</strong>
                <ul style={{ paddingLeft: '1.25rem', color: '#78350F', lineHeight: 1.5, margin: 0 }}>
                  {suitability.missing_evidence_checklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.65rem', fontSize: '0.75rem', color: '#64748B' }}>
              <strong>Standard:</strong> Evaluated against Indian Battery Waste Management Rules (BWMR 2022) & ISO 15118-20 Second-Life Triage Protocols.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
