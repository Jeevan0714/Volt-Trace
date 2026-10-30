import React from 'react';
import {
  ArrowLeft,
  QrCode,
  Wrench,
  AlertCircle,
  Upload,
  CheckCircle2,
  Download
} from 'lucide-react';
import { generateBatteryPassportPDF } from '../../utils/pdfGenerator';

export default function BatteryProfileHeader({
  battery,
  onBack,
  onOpenServiceModal,
  onOpenQRModal,
  onNavigateTab
}) {
  if (!battery) return null;

  // Determine dynamic plain-language situation summary
  const unresolvedIssues = battery.discrepancies?.filter((d) => d.status === 'UNRESOLVED') || [];
  const openWorkOrders = battery.service_orders?.filter((o) => o.status === 'OPEN') || [];
  const hasDiagnostics = battery.diagnostics && battery.diagnostics.length > 0;
  const isQuarantined = battery.status === 'quarantined' || battery.lifecycle_outcome === 'QUARANTINE_HOLD';

  let statusSummary = '';
  if (unresolvedIssues.length > 0) {
    statusSummary = 'Some records need attention before this battery can be assessed for its next use.';
  } else if (isQuarantined) {
    statusSummary = 'This battery is held for technical review before any further operational assignment.';
  } else if (openWorkOrders.length > 0) {
    statusSummary = 'A service work order is currently active and awaiting technician completion.';
  } else if (!hasDiagnostics) {
    statusSummary = 'Initial diagnostic intake test required to determine battery health.';
  } else {
    statusSummary = 'All records and diagnostic measurements are verified. Battery is in active operation.';
  }

  // Format Status Badge
  const getStatusBadge = () => {
    const rawStatus = (battery.status || '').toLowerCase();
    if (rawStatus === 'quarantined' || isQuarantined) {
      return {
        label: 'Under Review',
        className: 'badge badge-amber'
      };
    }
    if (rawStatus === 'active' || rawStatus === 'commissioned') {
      return {
        label: 'In Service',
        className: 'badge badge-green'
      };
    }
    if (rawStatus === 'degraded' || rawStatus === 'fault') {
      return {
        label: 'Attention Needed',
        className: 'badge badge-red'
      };
    }
    return {
      label: battery.status ? battery.status.toUpperCase() : 'UNKNOWN',
      className: 'badge badge-neutral'
    };
  };

  const statusBadge = getStatusBadge();

  // Determine the SINGLE primary action
  // Priority 1: Unresolved issues -> "Review Issues"
  // Priority 2: Open work order -> "Record Service"
  // Priority 3: No diagnostic records -> "Upload Test Report"
  // Priority 4: Default -> "Record Service"
  const renderPrimaryAction = () => {
    if (unresolvedIssues.length > 0) {
      return (
        <button
          onClick={() => onNavigateTab('issues')}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}
        >
          <AlertCircle size={16} />
          <span>Review Issues ({unresolvedIssues.length})</span>
        </button>
      );
    }

    if (openWorkOrders.length > 0) {
      return (
        <button
          onClick={onOpenServiceModal}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Wrench size={16} />
          <span>Record Service</span>
        </button>
      );
    }

    if (!hasDiagnostics) {
      return (
        <button
          onClick={() => onNavigateTab('reports')}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Upload size={16} />
          <span>Upload Test Report</span>
        </button>
      );
    }

    // Default primary action
    return (
      <button
        onClick={onOpenServiceModal}
        className="btn btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.6rem 1.15rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
        }}
      >
        <Wrench size={16} />
        <span>Record Service</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            padding: '0.4rem 0.8rem',
            color: '#64748B'
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Registry</span>
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        {/* Left: Titles, Identifiers, Summary */}
        <div style={{ flex: '1 1 500px', minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            Battery Details
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: 0
            }}>
              {battery.id}
            </h1>

            <span className={statusBadge.className} style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
              {statusBadge.label}
            </span>

            {battery.chemistry && (
              <span className="badge badge-neutral" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                {battery.chemistry}
              </span>
            )}

            {battery.rated_capacity_kwh && (
              <span className="badge badge-neutral" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                {battery.rated_capacity_kwh} kWh{battery.nominal_voltage ? ` (${battery.nominal_voltage}V)` : ''}
              </span>
            )}
          </div>

          {/* Model and Manufacturer line */}
          <div style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '0.35rem' }}>
            {battery.manufacturer && <span>{battery.manufacturer}</span>}
            {battery.manufacturer && battery.model && <span> • </span>}
            {battery.model && <span>Model: <strong style={{ color: '#0F172A' }}>{battery.model}</strong></span>}
            {battery.current_owner && <span> • Fleet: <strong>{battery.current_owner}</strong></span>}
          </div>

          {/* Plain Language Status Summary */}
          <div style={{
            marginTop: '0.85rem',
            fontSize: '0.875rem',
            color: unresolvedIssues.length > 0 ? '#B45309' : '#0F172A',
            background: unresolvedIssues.length > 0 ? '#FFFBEB' : '#F8FAFC',
            border: `1px solid ${unresolvedIssues.length > 0 ? '#FDE68A' : '#E2E8F0'}`,
            padding: '0.55rem 0.85rem',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            lineHeight: 1.4
          }}>
            {unresolvedIssues.length > 0 ? (
              <AlertCircle size={16} color="#B45309" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={16} color="#15803D" style={{ flexShrink: 0 }} />
            )}
            <span>{statusSummary}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onOpenQRModal}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 0.95rem',
              fontSize: '0.85rem',
              color: '#0F172A'
            }}
          >
            <QrCode size={16} color="#64748B" />
            <span>View QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => generateBatteryPassportPDF(battery)}
            className="btn btn-secondary"
            title="Download complete multi-page PDF Battery Passport"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 0.95rem',
              fontSize: '0.85rem',
              color: '#0F172A'
            }}
          >
            <Download size={16} color="#4F46E5" />
            <span>Export Full PDF</span>
          </button>

          {/* Contextual primary action */}
          {renderPrimaryAction()}
        </div>
      </div>
    </div>
  );
}
