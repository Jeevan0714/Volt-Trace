import React from 'react';
import { Clock, ArrowRight, Calendar } from 'lucide-react';

export default function RecentActivityCard({ events = [], onNavigateTab }) {
  // Sort events chronologically descending and take top 3
  const sortedEvents = [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);

  const getStatusBadge = (evt) => {
    const status = (evt.verification_status || '').toUpperCase();
    if (status === 'VERIFIED') {
      return {
        label: 'Verified',
        className: 'badge badge-green'
      };
    }
    if (status === 'FAILED') {
      return {
        label: 'Awaiting Review',
        className: 'badge badge-amber'
      };
    }
    return {
      label: 'Recorded',
      className: 'badge badge-neutral'
    };
  };

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Clock size={18} color="#4F46E5" />
          <span>Recent Activity</span>
        </h2>

        <button
          type="button"
          onClick={() => onNavigateTab('history')}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span>View Full History</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Events List */}
      {sortedEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>
          No recorded activity yet for this battery pack.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {sortedEvents.map((evt, idx) => {
            const badge = getStatusBadge(evt);
            const formattedDate = new Date(evt.timestamp).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div
                key={evt.id || idx}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                    {evt.title}
                  </span>
                  <span className={badge.className} style={{ fontSize: '0.72rem' }}>
                    {badge.label}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={13} />
                  <span>{formattedDate}</span>
                  {evt.actor && (
                    <span>• Logged by <strong>{evt.actor}</strong></span>
                  )}
                </div>

                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0.25rem 0 0', lineHeight: 1.45 }}>
                  {evt.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
