import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Info
} from 'lucide-react';

export default function StatusSummaryCard({ battery, onNavigateTab }) {
  if (!battery) return null;

  const unresolvedDiscrepancies = battery.discrepancies?.filter((d) => d.status === 'UNRESOLVED') || [];
  const hasFileMismatch = battery.documents?.some((doc) => doc.integrity_status === 'MISMATCH_DETECTED');
  const hasSoHJump = battery.discrepancies?.some((d) => d.code === 'DISC_SOH_JUMP' || d.code?.includes('SOH'));
  const hasOpenWorkOrder = battery.service_orders?.some((o) => o.status === 'OPEN');
  const hasIndependentTest = battery.diagnostics?.some((d) => d.source_label === 'INDEPENDENT_TEST');
  const hasRecalls = battery.recall_check?.matches_count > 0;

  // Build the list of key reasons
  const reasons = [];

  if (hasFileMismatch) {
    reasons.push({
      text: "A report's file integrity check failed.",
      type: 'critical' // Red
    });
  }

  if (hasSoHJump) {
    reasons.push({
      text: 'Two test records contain conflicting information.',
      type: 'warning' // Amber
    });
  }

  if (hasRecalls) {
    reasons.push({
      text: 'A manufacturer technical bulletin requires inspection.',
      type: 'warning'
    });
  }

  if (hasOpenWorkOrder) {
    reasons.push({
      text: 'A service work order is currently pending technician completion.',
      type: 'warning'
    });
  }

  if (!hasIndependentTest) {
    reasons.push({
      text: 'An independent assessment is still required.',
      type: 'info'
    });
  }

  // If clean, show confirmed positive reasons
  if (reasons.length === 0) {
    reasons.push({
      text: 'All registered document files matched baseline records.',
      type: 'success'
    });
    reasons.push({
      text: 'Historical diagnostic degradation curve is physically consistent.',
      type: 'success'
    });
    reasons.push({
      text: 'No manufacturer safety bulletins matched this battery model.',
      type: 'success'
    });
  }

  // Determine concise overall status headline
  let headlineStatus = 'Records verified';
  let badgeStyle = {
    bg: '#F0FDF4',
    border: '#BBF7D0',
    color: '#15803D',
    label: 'Verified & Ready'
  };

  const hasCritical = reasons.some((r) => r.type === 'critical');
  const hasWarning = reasons.some((r) => r.type === 'warning');

  if (hasCritical) {
    headlineStatus = 'Assessment needs review';
    badgeStyle = {
      bg: '#FEF2F2',
      border: '#FECACA',
      color: '#B91C1C',
      label: 'Review Required'
    };
  } else if (hasWarning) {
    headlineStatus = 'Assessment needs review';
    badgeStyle = {
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#B45309',
      label: 'Attention Needed'
    };
  } else if (!hasIndependentTest) {
    headlineStatus = 'Intake qualification pending';
    badgeStyle = {
      bg: '#EEF2FF',
      border: '#C7D2FE',
      color: '#4F46E5',
      label: 'Pending Intake Test'
    };
  }

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Current Status
          </h2>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: badgeStyle.color, marginTop: '0.25rem' }}>
            {headlineStatus}
          </div>
        </div>

        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            background: badgeStyle.bg,
            border: `1px solid ${badgeStyle.border}`,
            color: badgeStyle.color
          }}
        >
          {badgeStyle.label}
        </span>
      </div>

      {/* Reasons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
        {reasons.slice(0, 4).map((reason, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.875rem',
              color: '#0F172A',
              lineHeight: 1.4
            }}
          >
            {reason.type === 'critical' ? (
              <span style={{ color: '#B91C1C', display: 'flex', flexShrink: 0 }}>
                <AlertCircle size={17} />
              </span>
            ) : reason.type === 'warning' ? (
              <span style={{ color: '#B45309', display: 'flex', flexShrink: 0 }}>
                <AlertTriangle size={17} />
              </span>
            ) : reason.type === 'info' ? (
              <span style={{ color: '#4F46E5', display: 'flex', flexShrink: 0 }}>
                <HelpCircle size={17} />
              </span>
            ) : (
              <span style={{ color: '#15803D', display: 'flex', flexShrink: 0 }}>
                <CheckCircle2 size={17} />
              </span>
            )}
            <span>{reason.text}</span>
          </div>
        ))}
      </div>

      {/* Epistemic Boundary Note */}
      <div
        style={{
          marginTop: '0.5rem',
          padding: '0.75rem 0.85rem',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '0.78rem',
          color: '#64748B',
          lineHeight: 1.45,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}
      >
        <Info size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <strong>Note:</strong> Record problems reflect documentation and file consistency checks. They do not confirm physical battery health or defects. Physical testing is required before final suitability decisions.
        </div>
      </div>

      {/* Action footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
        {unresolvedDiscrepancies.length > 0 ? (
          <button
            type="button"
            onClick={() => onNavigateTab('issues')}
            className="btn btn-secondary"
            style={{
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#B91C1C',
              borderColor: '#FECACA'
            }}
          >
            <span>View Issues ({unresolvedDiscrepancies.length})</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="btn btn-secondary"
            style={{
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#4F46E5'
            }}
          >
            <span>View Diagnostic Records</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
