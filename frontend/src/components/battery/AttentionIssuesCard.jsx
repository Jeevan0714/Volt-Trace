import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AttentionIssuesCard({
  battery,
  discrepancies = [],
  onNavigateTab
}) {
  const unresolved = discrepancies.filter((d) => d.status === 'UNRESOLVED');
  const recallMatches = battery?.recall_check?.matches || [];

  // Convert discrepancies into plain-language items
  const items = [];

  // 1. Process discrepancies
  unresolved.forEach((disc) => {
    if (disc.code === 'DISC_HASH_MISMATCH' || disc.code?.includes('HASH')) {
      items.push({
        id: disc.id,
        title: 'Report needs review',
        explanation: 'The uploaded file differs from the previously registered version.',
        severity: 'Review Required',
        severityLevel: 'critical', // Red
        actionLabel: 'View Details',
        actionTarget: 'issues'
      });
    } else if (disc.code === 'DISC_SOH_JUMP' || disc.code?.includes('SOH')) {
      items.push({
        id: disc.id,
        title: 'Test results do not match',
        explanation: 'The reported battery health differs from an earlier measurement without a recorded cell replacement.',
        severity: 'Attention',
        severityLevel: 'warning', // Amber
        actionLabel: 'Compare Results',
        actionTarget: 'reports'
      });
    } else {
      items.push({
        id: disc.id,
        title: disc.title ? disc.title.replace(/Fraud|Suspicious|Tampering/gi, 'Inconsistency') : 'Record inconsistency detected',
        explanation: disc.description || 'System detected an anomaly between registered records and field submissions.',
        severity: disc.severity === 'HIGH' ? 'Attention' : 'Notice',
        severityLevel: disc.severity === 'HIGH' ? 'warning' : 'info',
        actionLabel: 'View Details',
        actionTarget: 'issues'
      });
    }
  });

  // 2. Add recall bulletin if present and space allows
  if (recallMatches.length > 0 && items.length < 3) {
    items.push({
      id: 'recall-bulletin',
      title: 'Technical safety bulletin match',
      explanation: `${recallMatches[0].title}: ${recallMatches[0].description || 'Inspection recommended for this pack.'}`,
      severity: 'Advisory',
      severityLevel: 'warning',
      actionLabel: 'View Advisory',
      actionTarget: 'issues'
    });
  }

  const topItems = items.slice(0, 3);
  const totalCount = items.length;

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <AlertCircle size={18} color={totalCount > 0 ? '#B91C1C' : '#15803D'} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Items Requiring Attention
          </h2>
        </div>

        {totalCount > 0 ? (
          <span className="badge badge-amber">
            {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
          </span>
        ) : (
          <span className="badge badge-green">
            0 Items
          </span>
        )}
      </div>

      {/* Items list or Clean State */}
      {totalCount === 0 ? (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle2 size={20} color="#15803D" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#15803D' }}>
              No active issues detected
            </div>
            <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.15rem' }}>
              All uploaded document files match registered records, degradation curves are consistent, and no recall conflicts were found.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {topItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: item.severityLevel === 'critical' ? '#FEF2F2' : '#FFFBEB',
                border: `1px solid ${item.severityLevel === 'critical' ? '#FECACA' : '#FDE68A'}`,
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: item.severityLevel === 'critical' ? '#B91C1C' : '#B45309'
                  }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: item.severityLevel === 'critical' ? '#FEE2E2' : '#FEF3C7',
                      color: item.severityLevel === 'critical' ? '#991B1B' : '#92400E'
                    }}
                  >
                    {item.severity}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.82rem',
                  color: item.severityLevel === 'critical' ? '#7F1D1D' : '#78350F',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {item.explanation}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigateTab(item.actionTarget)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.75rem',
                    color: item.severityLevel === 'critical' ? '#B91C1C' : '#B45309',
                    borderColor: item.severityLevel === 'critical' ? '#FECACA' : '#FDE68A',
                    background: '#FFFFFF'
                  }}
                >
                  {item.actionLabel}
                </button>
              </div>
            </div>
          ))}

          {/* View All Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => onNavigateTab('issues')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>View All Issues ({totalCount})</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
