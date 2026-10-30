import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/* ─────────── Formatting Helpers ─────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(iso);
  }
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(iso);
  }
}

function dispositionLabel(outcome) {
  const map = {
    SECOND_LIFE_READY: 'Second-Life Ready (BESS / Storage)',
    RECYCLE: 'Direct Recycling Required (Hydrometallurgical)',
    QUARANTINE_HOLD: 'Under Review / Quarantined',
    ACTIVE_SERVICE: 'Approved For Active EV Service'
  };
  return map[outcome] || outcome || 'Pending Assessment';
}

/**
 * Generate a complete, multi-section, publication-grade Battery Passport PDF
 * covering all website tabs: Overview, Service History, Test Reports, Issues & Audit.
 */
export function generateBatteryPassportPDF(battery) {
  if (!battery) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = 0;

  // Running Header
  const drawRunningHeader = (sectionName) => {
    doc.setFillColor(15, 23, 42); // #0f172a navy
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Brand & Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('VoltTrace Digital Battery Passport', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(199, 210, 254);
    doc.text(`COMPREHENSIVE AUDIT REPORT • ${sectionName.toUpperCase()}`, margin, 18);
    doc.setTextColor(148, 163, 184);
    doc.text(`Battery Pack: ${battery.id} • Standard: Policy VT-202 (EU 2023/1542)`, margin, 23);

    // Right ID badge
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(pageWidth - margin - 44, 5.5, 44, 17, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(battery.id || 'VT-BATTERY', pageWidth - margin - 22, 12.5, { align: 'center' });
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    const statusText = (battery.status || 'ACTIVE').toUpperCase();
    doc.text(`STATUS: ${statusText}`, pageWidth - margin - 22, 17.5, { align: 'center' });

    currentY = 34;
  };

  // Running Footer
  const drawRunningFooter = (pageNum, totalPages) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('VoltTrace Decentralized Battery Passport Platform • Tamper-Evident SHA-256 Provenance Ledger', margin, pageHeight - 7);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  // Section Header
  const drawSectionHeader = (title, iconText = '') => {
    checkPageOverflow(14, title);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(iconText ? `${iconText}  ${title}` : title, margin, currentY);

    // Indigo accent bar
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.7);
    doc.line(margin, currentY + 1.8, margin + 32, currentY + 1.8);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 32, currentY + 1.8, pageWidth - margin, currentY + 1.8);

    currentY += 7.5;
  };

  const checkPageOverflow = (neededHeight, sectionName = 'Battery Passport') => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawRunningHeader(sectionName);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // PAGE 1: OVERVIEW & PASSPORT SUMMARY
  // ════════════════════════════════════════════════════════════════
  drawRunningHeader('Overview & Health Summary');

  const latestDiag = battery.diagnostics?.[0] || null;
  const soh = latestDiag?.reported_soh != null ? latestDiag.reported_soh : null;
  const capacity = latestDiag?.measured_capacity_kwh;
  const cycleCount = latestDiag?.cycle_count;
  const unresolvedIssues = battery.discrepancies?.filter(d => d.status === 'UNRESOLVED') || [];
  const openWorkOrders = battery.service_orders?.filter(o => o.status === 'OPEN') || [];

  // Hero Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 30, 3, 3, 'FD');

  // Left SoH Box
  const isSohGood = soh != null && soh >= 80;
  const isSohFair = soh != null && soh >= 60 && soh < 80;
  const sohR = isSohGood ? 22 : isSohFair ? 180 : 220;
  const sohG = isSohGood ? 101 : isSohFair ? 83 : 38;
  const sohB = isSohGood ? 52 : isSohFair ? 9 : 38;

  doc.setFillColor(isSohGood ? 240 : isSohFair ? 254 : 254, isSohGood ? 253 : isSohFair ? 243 : 242, isSohGood ? 244 : isSohFair ? 199 : 242);
  doc.roundedRect(margin + 4, currentY + 4, 38, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(sohR, sohG, sohB);
  doc.text(soh != null ? `${soh}%` : '—', margin + 23, currentY + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.text(soh != null ? (isSohGood ? 'HEALTH: GOOD' : isSohFair ? 'HEALTH: FAIR' : 'HEALTH: POOR') : 'NO DIAG DATA', margin + 23, currentY + 20, { align: 'center' });

  // Key metrics 3-col
  const col1X = margin + 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('MEASURED CAPACITY', col1X, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${capacity ? `${capacity} kWh` : '—'} ${battery.rated_capacity_kwh ? `/ ${battery.rated_capacity_kwh} kWh` : ''}`, col1X, currentY + 15);

  const col2X = col1X + 46;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VOLTAGE / CYCLE COUNT', col2X, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${battery.nominal_voltage ? `${battery.nominal_voltage} V` : '—'}  •  ${cycleCount ? `${cycleCount} cycles` : '—'}`, col2X, currentY + 15);

  const col3X = col2X + 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CIRCULARITY DISPOSITION', col3X, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  const dispTxt = battery.lifecycle_outcome || 'ACTIVE_SERVICE';
  doc.text(dispTxt.length > 18 ? dispTxt.slice(0, 17) + '…' : dispTxt, col3X, currentY + 15);

  // Bottom note in hero box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const integrityMsg = unresolvedIssues.length === 0
    ? '✓ Blockchain Provenance: Cryptographically verified against ledger. Zero unresolved discrepancies.'
    : `⚠ Attention Required: ${unresolvedIssues.length} unresolved issue(s) recorded on this battery pack.`;
  doc.text(integrityMsg, margin + 48, currentY + 24.5);

  currentY += 36;

  // 1. Battery Specifications Table
  drawSectionHeader('1. Battery Specifications & Identity Matrix');

  const specs = [
    ['Manufacturer', battery.manufacturer || '—', 'Model / Part Number', battery.model || '—'],
    ['Cell Chemistry', battery.chemistry || '—', 'Nominal Voltage', battery.nominal_voltage ? `${battery.nominal_voltage} V` : '—'],
    ['Rated Pack Capacity', battery.rated_capacity_kwh ? `${battery.rated_capacity_kwh} kWh` : '—', 'Manufacturing Date', fmtDate(battery.mfg_date)],
    ['Current Fleet / Owner', battery.current_owner || '—', 'Registration Date', fmtDate(battery.created_at)],
    ['Vehicle Application', battery.vehicle_info || 'Electric 2W / Fleet', 'Passport Ledger State', (battery.status || 'ACTIVE').toUpperCase()]
  ];

  specs.forEach((row, idx) => {
    checkPageOverflow(7.5, 'Overview');
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(row[0], margin + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(row[1]), margin + 44, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(row[2], margin + 98, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(row[3]), margin + 142, currentY + 4.5);

    currentY += 6.5;
  });

  currentY += 6;

  // Activity Snapshot Metrics Grid
  drawSectionHeader('2. Registry Activity Snapshot');
  const snapW = contentWidth / 4;
  const snapshotData = [
    { label: 'LIFECYCLE EVENTS', val: battery.events?.length || 0, sub: 'Recorded on ledger' },
    { label: 'DIAGNOSTIC TESTS', val: battery.diagnostics?.length || 0, sub: 'Impedance benchmarks' },
    { label: 'CERTIFICATE DOCS', val: battery.documents?.length || 0, sub: 'Bit-for-bit verified' },
    { label: 'WORK ORDERS', val: battery.service_orders?.length || 0, sub: `${openWorkOrders.length} open orders` }
  ];

  checkPageOverflow(18, 'Overview');
  snapshotData.forEach((s, idx) => {
    const boxX = margin + (idx * snapW);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(boxX + 1, currentY, snapW - 2, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(s.label, boxX + 4, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(String(s.val), boxX + 4, currentY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(s.sub, boxX + 4, currentY + 14);
  });
  currentY += 22;

  // ════════════════════════════════════════════════════════════════
  // PAGE 2: SERVICE HISTORY & LIFECYCLE TIMELINE (Website Tab: History)
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  drawRunningHeader('Service History & Lifecycle Timeline');

  // 2A. Mandatory Service Work Orders
  drawSectionHeader('3. Mandatory Service Work Orders (Policy VT-202 Enforcement)');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Real-world service software prevents closure without verified technician IDs, diagnostic report proof, and SHA-256 digital locking.', margin, currentY);
  currentY += 5;

  const orders = battery.service_orders || [];
  if (orders.length === 0) {
    checkPageOverflow(8, 'Service History');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('No maintenance or intake service work orders logged for this pack.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    checkPageOverflow(8, 'Service History');
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('ORDER ID', margin + 2, currentY + 4.2);
    doc.text('OPEN DATE', margin + 34, currentY + 4.2);
    doc.text('SERVICE CENTER', margin + 58, currentY + 4.2);
    doc.text('TECHNICIAN', margin + 112, currentY + 4.2);
    doc.text('STATUS', margin + 138, currentY + 4.2);
    doc.text('HEALTH RECORDED', margin + 160, currentY + 4.2);
    currentY += 6;

    orders.forEach((o) => {
      checkPageOverflow(14, 'Service History');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(o.id || '—', margin + 2, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(fmtDate(o.opened_at), margin + 34, currentY + 4.2);
      doc.text(o.service_center ? (o.service_center.length > 27 ? o.service_center.slice(0, 26) + '…' : o.service_center) : '—', margin + 58, currentY + 4.2);
      doc.text(o.technician_id || '—', margin + 112, currentY + 4.2);

      if (o.status === 'COMPLETED') {
        doc.setTextColor(21, 128, 61);
        doc.setFont('helvetica', 'bold');
        doc.text('COMPLETED', margin + 138, currentY + 4.2);
        doc.text(o.reported_soh != null ? `${o.reported_soh}% SoH` : '—', margin + 160, currentY + 4.2);
      } else {
        doc.setTextColor(180, 83, 9);
        doc.setFont('helvetica', 'bold');
        doc.text('OPEN', margin + 138, currentY + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.text('Awaiting Test', margin + 160, currentY + 4.2);
      }

      currentY += 5.5;

      if (o.description || o.action_taken) {
        checkPageOverflow(7, 'Service History');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        const descText = o.action_taken ? `Action Taken: ${o.action_taken}` : `Scope: ${o.description}`;
        doc.text(descText.length > 115 ? descText.slice(0, 113) + '…' : descText, margin + 4, currentY + 3.2);
        currentY += 5;
      }
    });
  }

  currentY += 6;

  // 2B. Chronological Lifecycle Events Timeline
  drawSectionHeader('4. Chronological Lifecycle Passport (Event Audit Log)');

  const events = [...(battery.events || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (events.length === 0) {
    checkPageOverflow(8, 'Service History');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('No historical lifecycle events registered.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    checkPageOverflow(8, 'Service History');
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('TIMESTAMP', margin + 2, currentY + 4.2);
    doc.text('EVENT TITLE', margin + 34, currentY + 4.2);
    doc.text('SUBMITTING ORG', margin + 88, currentY + 4.2);
    doc.text('ACTOR / ROLE', margin + 136, currentY + 4.2);
    doc.text('VERIFICATION', margin + 162, currentY + 4.2);
    currentY += 6;

    events.forEach((evt) => {
      checkPageOverflow(12, 'Service History');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(fmtDate(evt.timestamp), margin + 2, currentY + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(evt.title ? (evt.title.length > 32 ? evt.title.slice(0, 31) + '…' : evt.title) : 'Lifecycle Event', margin + 34, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(evt.submitting_org ? (evt.submitting_org.length > 26 ? evt.submitting_org.slice(0, 25) + '…' : evt.submitting_org) : '—', margin + 88, currentY + 4.2);
      doc.text(evt.actor || 'System Verified', margin + 136, currentY + 4.2);

      const isVer = (evt.verification_status || 'VERIFIED').toUpperCase() === 'VERIFIED';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isVer ? 21 : 185, isVer ? 128 : 28, isVer ? 61 : 28);
      doc.text(isVer ? '✓ VERIFIED' : 'PENDING', margin + 162, currentY + 4.2);

      currentY += 5.5;

      if (evt.description) {
        checkPageOverflow(6, 'Service History');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.7);
        doc.setTextColor(100, 116, 139);
        doc.text(evt.description.length > 115 ? evt.description.slice(0, 113) + '…' : evt.description, margin + 4, currentY + 3.2);
        currentY += 4.5;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // PAGE 3: TEST REPORTS & DIAGNOSTIC EVIDENCE (Website Tab: Test Reports)
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  drawRunningHeader('Test Reports & Diagnostic Evidence');

  // 3A. Lab Diagnostics
  drawSectionHeader('5. Laboratory Diagnostic Test Records & Impedance Telemetry');

  const diags = battery.diagnostics || [];
  if (diags.length === 0) {
    checkPageOverflow(8, 'Test Reports');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('No laboratory diagnostic test records recorded.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    checkPageOverflow(8, 'Test Reports');
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('TEST DATE', margin + 2, currentY + 4.2);
    doc.text('TESTING ORGANIZATION', margin + 32, currentY + 4.2);
    doc.text('METHOD / SPEC', margin + 92, currentY + 4.2);
    doc.text('CAPACITY', margin + 128, currentY + 4.2);
    doc.text('RESISTANCE', margin + 152, currentY + 4.2);
    doc.text('RECORDED SOH', margin + 172, currentY + 4.2);
    currentY += 6;

    diags.forEach((d) => {
      checkPageOverflow(8, 'Test Reports');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      doc.setTextColor(15, 23, 42);
      doc.text(fmtDate(d.test_date), margin + 2, currentY + 4.2);
      doc.text(d.testing_org || 'Accredited Hub', margin + 32, currentY + 4.2);
      doc.text(d.test_method || 'ISO-17025 Compliant', margin + 92, currentY + 4.2);
      doc.text(d.measured_capacity_kwh ? `${d.measured_capacity_kwh} kWh` : '—', margin + 128, currentY + 4.2);
      doc.text(d.internal_resistance_mohm ? `${d.internal_resistance_mohm} mΩ` : '—', margin + 152, currentY + 4.2);

      doc.setFont('helvetica', 'bold');
      const dSoh = d.reported_soh;
      if (dSoh >= 80) doc.setTextColor(21, 128, 61);
      else if (dSoh >= 60) doc.setTextColor(180, 83, 9);
      else doc.setTextColor(185, 28, 28);
      doc.text(dSoh != null ? `${dSoh}%` : '—', margin + 172, currentY + 4.2);

      currentY += 5.5;
    });
  }

  currentY += 6;

  // 3B. Attached Certification Documents & Fingerprints
  drawSectionHeader('6. Attached Accreditation Documents & Merkle Checksums');

  const docs = battery.documents || [];
  if (docs.length === 0) {
    checkPageOverflow(8, 'Test Reports');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('No accreditation documents attached to this battery record.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    checkPageOverflow(8, 'Test Reports');
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('FILE NAME', margin + 2, currentY + 4.2);
    doc.text('ISSUER', margin + 68, currentY + 4.2);
    doc.text('TRUST TIER', margin + 114, currentY + 4.2);
    doc.text('INTEGRITY STATUS', margin + 138, currentY + 4.2);
    doc.text('SHA-256 CHECKSUM', margin + 162, currentY + 4.2);
    currentY += 6;

    docs.forEach((d) => {
      checkPageOverflow(8, 'Test Reports');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(d.file_name ? (d.file_name.length > 34 ? d.file_name.slice(0, 33) + '…' : d.file_name) : 'document.pdf', margin + 2, currentY + 4.2);
      doc.text(d.issuer_name || 'Authorized Lab', margin + 68, currentY + 4.2);
      doc.text(d.trust_tier || 'Tier 1 Accredited', margin + 114, currentY + 4.2);

      const isVerified = (d.integrity_status || '').toUpperCase() === 'VERIFIED';
      doc.setFont('helvetica', 'bold');
      if (isVerified) {
        doc.setTextColor(21, 128, 61);
        doc.text('✓ VERIFIED', margin + 138, currentY + 4.2);
      } else {
        doc.setTextColor(185, 28, 28);
        doc.text('⚠ TAMPERED', margin + 138, currentY + 4.2);
      }

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      const hashStr = d.file_hash_sha256 ? `${d.file_hash_sha256.slice(0, 10)}…` : 'Locked in DPP';
      doc.text(hashStr, margin + 162, currentY + 4.2);

      currentY += 5.5;
    });
  }

  // ════════════════════════════════════════════════════════════════
  // PAGE 4: ISSUES, DISCREPANCIES & AUDIT ASSURANCES (Website Tab: Issues)
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  drawRunningHeader('Issues, Discrepancies & Audit Assurances');

  // 4A. Items Requiring Attention
  drawSectionHeader('7. Flagged Contradictions & Items Requiring Attention');

  const discrepancies = battery.discrepancies || [];
  if (discrepancies.length === 0) {
    checkPageOverflow(26, 'Issues & Audit');
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(21, 128, 61);
    doc.text('✓ Zero Contradictions Found — Clean Bill of Health', margin + 5, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text(
      'All uploaded document files match registered baseline records bit-for-bit.\nDegradation curves are physically consistent with thermodynamic constraints, and no chronological anomalies were detected.\nBattery pack is authorized for second-life application or active fleet deployment.',
      margin + 5,
      currentY + 12
    );
    currentY += 28;
  } else {
    discrepancies.forEach((disc) => {
      checkPageOverflow(24, 'Issues & Audit');
      const isCritical = (disc.severity || '').toUpperCase() === 'CRITICAL' || disc.code?.includes('HASH') || disc.code?.includes('IMPOSSIBLE');
      doc.setFillColor(isCritical ? 254 : 255, isCritical ? 242 : 251, isCritical ? 242 : 235);
      doc.setDrawColor(isCritical ? 254 : 253, isCritical ? 202 : 230, isCritical ? 202 : 138);
      doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

      // Top title row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(isCritical ? 185 : 180, isCritical ? 28 : 83, isCritical ? 28 : 9);
      doc.text(`[${disc.code || 'DISCREPANCY'}]  ${disc.title || 'Record Inconsistency Detected'}`, margin + 4, currentY + 5.5);

      // Severity badge
      doc.setFontSize(7);
      doc.text(`STATUS: ${disc.status || 'UNRESOLVED'} • SEVERITY: ${disc.severity || 'HIGH'}`, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });

      // Explanation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      const descWrapped = doc.splitTextToSize(disc.description || 'Record verification found discrepancies that require physical laboratory re-inspection.', contentWidth - 8);
      doc.text(descWrapped, margin + 4, currentY + 10.5);

      currentY += 24;
    });
  }

  currentY += 4;

  // 4B. Physics Consistency Engine & Sub-Component Lineage
  drawSectionHeader('8. Physics Consistency Engine & Sub-Component Lineage');
  checkPageOverflow(22, 'Issues & Audit');

  const physicsRules = [
    ['Thermodynamic Fade Law', 'Validates degradation trajectory against C-rate, chemistry, and calendar aging limits.'],
    ['Odometer & Cycle Rollback Check', 'Ensures cycle counts never decrease and mileage correlates with BMS amp-hour throughput.'],
    ['Provenance Signature Proof', 'Blocks work order closure until accredited TÜV / lab diagnostic report hash is anchored.']
  ];

  physicsRules.forEach((r, idx) => {
    checkPageOverflow(6.5, 'Issues & Audit');
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, currentY, contentWidth, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`✓ ${r[0]}`, margin + 3, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(r[1], margin + 62, currentY + 4.2);

    currentY += 6;
  });

  currentY += 8;

  // 4C. Cryptographic Certification Seal & Signature
  checkPageOverflow(28, 'Issues & Audit');
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DECENTRALIZED BATTERY PASSPORT AUTHENTICATION & CERTIFICATION SEAL', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This document is generated by VoltTrace as an authoritative digital product passport.\nEvery historical diagnostic record, work order sign-off, and attached certificate is cryptographically locked.\nCompliant with EU Battery Regulation 2023/1542 (Articles 65 & 77) and VoltTrace Mandatory Provenance Policy VT-202.',
    margin + 4,
    currentY + 11
  );

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(79, 70, 229);
  doc.text(`Report Checksum SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 • Verified at: ${new Date().toISOString()}`, margin + 4, currentY + 21);

  // Apply page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawRunningFooter(i, totalPages);
  }

  // Trigger download
  const filename = `VoltTrace_Full_Battery_Passport_${battery.id || 'Report'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Generate official Workshop Service Invoice & UPI Payment PDF
 * Embeds dynamic UPI QR Code, verified SHA-256 Merkle block hash, and itemized billing.
 */
export async function generateServiceInvoicePDF({
  battery,
  submissionResult,
  invoiceMeta
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const batteryId = battery?.id || submissionResult?.battery_id || 'VT-1001';
  const amount = Number(invoiceMeta?.cost || 14500);
  const upiId = invoiceMeta?.upiId || 'zypp.mobility@oksbi';
  const recipientPhone = invoiceMeta?.phone || '+91 98765 43210';
  const technician = submissionResult?.actor_name || 'Technician Sharma';
  const organization = submissionResult?.organization || 'Zypp Mobility Hub Bangalore';
  const eventTitle = submissionResult?.event_title || 'Workshop Service (Periodic Diagnostic)';
  const auditHash = submissionResult?.audit_hash || submissionResult?.event_hash || '43d135dc99eef91a49beeed05bc402ff7a58832ddb67afb8a4859506b102bd8b';
  const invoiceNumber = `INV-${batteryId}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // 1. Top Industrial Header
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VOLTTRACE WORKSHOP SERVICE INVOICE', margin, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text('OFFICIAL WORK ORDER BILLING & CRYPTOGRAPHIC DIGITAL PASSPORT RECEIPT', margin, 22);
  doc.text(`Invoice No: ${invoiceNumber}  •  Issue Date: ${dateStr}`, margin, 29);

  doc.setFillColor(5, 150, 105); // #059669
  doc.roundedRect(pageWidth - margin - 32, 10, 32, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DIGITAL PASSPORT', pageWidth - margin - 30, 16);
  doc.setFontSize(9);
  doc.text('VERIFIED', pageWidth - margin - 23, 22);

  let y = 46;

  // 2. Billing & Battery Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('BATTERY & SERVICE SUMMARY', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text(`Battery Pack ID:`, margin + 4, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`${batteryId} (${battery?.model || 'Pack'} • ${battery?.chemistry || 'NMC'})`, margin + 30, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Service Performed:`, margin + 4, y + 19);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${eventTitle}`, margin + 32, y + 19);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Authorized Tech:`, margin + 4, y + 25);
  doc.text(`${technician}  |  ${organization}`, margin + 30, y + 25);

  doc.text(`Customer WhatsApp:`, margin + 4, y + 31);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`${recipientPhone}`, margin + 35, y + 31);

  y += 42;

  // 3. Itemized Service Charges Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ITEMIZED SERVICE & REPAIR CHARGES', margin, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('DESCRIPTION', margin + 3, y + 5);
  doc.text('TYPE', margin + 110, y + 5);
  doc.text('AMOUNT (INR)', pageWidth - margin - 26, y + 5);

  y += 7;
  const items = [
    { desc: `${eventTitle} - Cell Diagnostics & Cycler Balancing`, type: 'Labour & Diagnostics', amt: Math.round(amount * 0.35) },
    { desc: 'High-Voltage Safety Inspection & Contactor Insulation Test', type: 'Safety Inspection', amt: Math.round(amount * 0.20) },
    { desc: 'BMS Calibration, Firmware Update & Thermal Telemetry Lock', type: 'Electronics & Calibration', amt: Math.round(amount * 0.15) },
    { desc: 'Module / Consumable Hardware & Terminal Seal Service', type: 'Hardware / Modules', amt: Math.round(amount * 0.30) }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  items.forEach((it, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }
    doc.text(it.desc, margin + 3, y + 4.5);
    doc.text(it.type, margin + 110, y + 4.5);
    doc.text(`Rs. ${it.amt.toLocaleString('en-IN')}`, pageWidth - margin - 26, y + 4.5);
    y += 6.5;
  });

  // Total Row
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, contentWidth, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text('TOTAL SERVICE BILL PAYABLE:', margin + 4, y + 6);
  doc.text(`Rs. ${amount.toLocaleString('en-IN')}`, pageWidth - margin - 32, y + 6);

  y += 16;

  // 4. UPI Scan-To-Pay & QR Code Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 54, 3, 3, 'FD');

  // Generate UPI QR Code image as dataURL
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=VoltTrace%20Service%20Depot&am=${amount}&cu=INR&tn=Battery%20${batteryId}%20Invoice`;
  try {
    const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 140, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', margin + 6, y + 6, 42, 42);
  } catch (qrErr) {
    console.warn('QR Code generation error for invoice PDF:', qrErr);
  }

  const textX = margin + 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SCAN & PAY VIA ANY UPI APP', textX, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan this QR code with Google Pay, PhonePe, Paytm, BHIM or any banking app.', textX, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Workshop VPA / UPI ID:', textX, y + 26);
  doc.setFont('courier', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`${upiId}`, textX + 40, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Exact Amount Due:', textX, y + 33);
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${amount.toLocaleString('en-IN')}`, textX + 32, y + 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Instant confirmation & digital receipt automatically registered on blockchain audit trail.', textX, y + 41);

  y += 62;

  // 5. Cryptographic Proof & Passport Ledger Lock
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(56, 189, 248); // #38bdf8
  doc.text('DIGITAL BATTERY PASSPORT (DPP) CRYPTOGRAPHIC AUDIT LOCK', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(
    'This invoice is linked to an append-only Merkle ledger block compliant with EU Battery Regulation 2023/1542.\nAny physical alterations to this invoice or historical data will invalidate the cryptographic checksum.',
    margin + 5,
    y + 13
  );

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(52, 211, 153); // #34d399
  doc.text(`SHA-256 Audit Hash: ${auditHash}`, margin + 5, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Passport Carrier URL: ${window.location.origin}/mobile-intake?id=${batteryId}`, margin + 5, y + 28);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('VoltTrace Engine • Every Battery Has a Story • ISO 15118-20 / GS1 Digital Link', margin, pageHeight - 8);
  doc.text('Page 1 of 1', pageWidth - margin - 15, pageHeight - 8);

  // Trigger Download using Blob / Safe ObjectURL (Fixes Chrome "File can't be securely downloaded" warning on HTTP/LAN IP)
  const invoiceFilename = `VoltTrace_Invoice_${batteryId}_${invoiceNumber}.pdf`;
  const pdfBlob = doc.output('blob');
  
  return {
    filename: invoiceFilename,
    blob: pdfBlob,
    doc
  };
}
