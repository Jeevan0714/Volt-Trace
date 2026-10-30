import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  QrCode,
  FileText
} from 'lucide-react';

export default function BatterySidePanel({
  battery,
  onOpenServiceModal,
  onOpenQRModal,
  onNavigateTab
}) {
  if (!battery) return null;

  const unresolvedDiscrepancies = battery.discrepancies?.filter((d) => d.status === 'UNRESOLVED') || [];
  const openWorkOrders = battery.service_orders?.filter((o) => o.status === 'OPEN') || [];
  const latestDiag = battery.diagnostics && battery.diagnostics.length > 0 ? battery.diagnostics[0] : null;
  const latestEvent = battery.events && battery.events.length > 0
    ? [...battery.events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    : null;

  // Determine Next Recommended Action
  let nextAction = {
    title: 'Routine Qualification',
    instruction: 'Battery records verified. Schedule standard intake physical inspection.',
    urgency: 'normal',
    buttonText: 'Record Service',
    onClick: onOpenServiceModal
  };

  if (unresolvedDiscrepancies.length > 0) {
    nextAction = {
      title: 'Resolve Record Discrepancies',
      instruction: 'Resolve document differences or conflicting measurements before releasing pack.',
      urgency: 'critical',
      buttonText: 'Review Issues',
      onClick: () => onNavigateTab('issues')
    };
  } else if (openWorkOrders.length > 0) {
    nextAction = {
      title: 'Complete Open Work Order',
      instruction: `Order #${openWorkOrders[0].id} is open at ${openWorkOrders[0].service_center}. Record service findings.`,
      urgency: 'warning',
      buttonText: 'Update Work Order',
      onClick: onOpenServiceModal
    };
  } else if (!latestDiag) {
    nextAction = {
      title: 'Record Diagnostic Test',
      instruction: 'Upload or record baseline SoH measurement to establish battery health.',
      urgency: 'normal',
      buttonText: 'Upload Report',
      onClick: () => onNavigateTab('reports')
    };
  }

  // Missing Records Checklist
  const missingRecords = [];
  if (!battery.diagnostics || battery.diagnostics.length === 0) {
    missingRecords.push('Diagnostic health report');
  }
  if (!battery.documents?.some((d) => d.document_type === 'BIRTH_CERTIFICATE' || d.document_type === 'OEM_CERTIFICATE')) {
    missingRecords.push('OEM birth certificate');
  }
  if (battery.service_orders?.length === 0) {
    missingRecords.push('Prior maintenance service record');
  }
  if (!battery.diagnostics?.some((d) => d.source_label === 'INDEPENDENT_TEST')) {
    missingRecords.push('Independent qualification test');
  }

  // Latest service date
  const latestServiceDate = latestEvent?.timestamp
    ? new Date(latestEvent.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : latestDiag?.test_date
    ? new Date(latestDiag.test_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'No service logged';

  // QR Code URL (clean read-only public passport URL)
  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/mobile-intake?id=${battery.id}`
    : `https://volttrace.io/mobile-intake?id=${battery.id}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Next Recommended Action Card */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          borderLeft: `4px solid ${nextAction.urgency === 'critical' ? '#B91C1C' : nextAction.urgency === 'warning' ? '#B45309' : '#4F46E5'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: nextAction.urgency === 'critical' ? '#B91C1C' : nextAction.urgency === 'warning' ? '#B45309' : '#4F46E5'
          }}>
            Recommended Next Step
          </span>
          <span
            className={`badge ${nextAction.urgency === 'critical' ? 'badge-red' : nextAction.urgency === 'warning' ? 'badge-amber' : 'badge-neutral'}`}
            style={{ fontSize: '0.68rem' }}
          >
            {nextAction.urgency === 'critical' ? 'Action Required' : nextAction.urgency === 'warning' ? 'Pending' : 'Standard'}
          </span>
        </div>

        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
          {nextAction.title}
        </div>

        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
          {nextAction.instruction}
        </p>

        <button
          type="button"
          onClick={nextAction.onClick}
          className="btn btn-primary"
          style={{
            marginTop: '0.25rem',
            width: '100%',
            fontSize: '0.82rem',
            padding: '0.55rem 0.85rem'
          }}
        >
          <span>{nextAction.buttonText}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 2. Key Service & Maintenance Milestones */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={16} color="#4F46E5" />
          <span>Service Status</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ color: '#64748B' }}>Latest Service Date:</span>
            <strong style={{ color: '#0F172A' }}>{latestServiceDate}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ color: '#64748B' }}>Open Work Orders:</span>
            <strong style={{ color: openWorkOrders.length > 0 ? '#B45309' : '#15803D' }}>
              {openWorkOrders.length} {openWorkOrders.length === 1 ? 'Order' : 'Orders'}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
            <span style={{ color: '#64748B' }}>Recorded Milestones:</span>
            <strong style={{ color: '#0F172A' }}>{battery.events?.length || 0} events</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('history')}
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#4F46E5',
            padding: '0.25rem 0',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer'
          }}
        >
          <span>View complete service history</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 3. Missing Records Notice */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={16} color="#B45309" />
            <span>Missing Records</span>
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {missingRecords.length} pending
          </span>
        </div>

        {missingRecords.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={15} />
            <span>All primary records registered</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {missingRecords.map((item, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.78rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#B45309' }}></span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.2rem', lineHeight: 1.4 }}>
          Upload missing reports to improve documentation completeness and second-life verifiability.
        </div>
      </div>

      {/* 4. Compact Battery Identity & QR Card */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Battery Identity
          </span>
          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
            Read-Only
          </span>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '0.65rem',
          display: 'flex',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <QRCodeSVG
            value={qrUrl}
            size={110}
            level="M"
            includeMargin={false}
          />
        </div>

        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
            {battery.id}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            {battery.model ? `${battery.model} • ` : ''}{battery.chemistry}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenQRModal}
          className="btn btn-secondary"
          style={{
            width: '100%',
            fontSize: '0.8rem',
            padding: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <QrCode size={14} />
          <span>View or Print QR</span>
        </button>
      </div>
    </div>
  );
}
