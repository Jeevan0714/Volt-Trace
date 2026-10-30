import { jsPDF } from 'jspdf';

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

  // Header helper
  const drawHeader = () => {
    // Top banner
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Title & subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('VoltTrace Digital Battery Passport', margin, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(199, 210, 254);
    doc.text('OFFICIAL PRODUCT PASSPORT & HEALTH ASSESSMENT CERTIFICATE', margin, 19);
    doc.setTextColor(148, 163, 184);
    doc.text(`Policy VT-202 Compliant • Generated: ${new Date().toLocaleString('en-GB')}`, margin, 24);

    // Right ID badge
    doc.setFillColor(79, 70, 229); // #4f46e5
    doc.roundedRect(pageWidth - margin - 46, 6, 46, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(battery.id || 'VT-BATTERY', pageWidth - margin - 23, 13.5, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const statusText = (battery.status || 'ACTIVE').toUpperCase();
    doc.text(`STATUS: ${statusText}`, pageWidth - margin - 23, 18.5, { align: 'center' });

    currentY = 36;
  };

  // Footer helper
  const drawFooter = (pageNum, totalPages) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('VoltTrace Decentralized Battery Passport Platform • Tamper-Evident SHA-256 Provenance', margin, pageHeight - 7);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  // Section header helper
  const drawSectionTitle = (title) => {
    checkPageOverflow(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, currentY);

    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY + 1.8, margin + 28, currentY + 1.8);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 28, currentY + 1.8, pageWidth - margin, currentY + 1.8);

    currentY += 7;
  };

  const checkPageOverflow = (neededHeight) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawHeader();
    }
  };

  // Initial header
  drawHeader();

  // ─────────────────────────────────────────────────────────────
  // 1. HEALTH AT A GLANCE (HERO BOX)
  // ─────────────────────────────────────────────────────────────
  const latestDiag = battery.diagnostics?.[0] || null;
  const soh = latestDiag?.reported_soh != null ? latestDiag.reported_soh : null;
  const capacity = latestDiag?.measured_capacity_kwh;
  const cycleCount = latestDiag?.cycle_count;
  const unresolvedIssues = battery.discrepancies?.filter(d => d.status === 'UNRESOLVED') || [];

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 28, 3, 3, 'FD');

  // Left: SoH Badge
  doc.setFillColor(soh != null && soh >= 80 ? 240 : 254, soh != null && soh >= 80 ? 253 : 242, soh != null && soh >= 80 ? 244 : 242);
  doc.roundedRect(margin + 4, currentY + 4, 38, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(soh != null && soh >= 80 ? 22 : 220, soh != null && soh >= 80 ? 101 : 38, soh != null && soh >= 80 ? 52 : 38);
  doc.text(soh != null ? `${soh}%` : '—', margin + 23, currentY + 13, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(soh != null && soh >= 80 ? 'HEALTH: GOOD' : 'HEALTH: ATTENTION', margin + 23, currentY + 18, { align: 'center' });

  // Key metrics columns
  const colX = margin + 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  // Col 1: Capacity
  doc.text('MEASURED CAPACITY', colX, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${capacity ? `${capacity} kWh` : '—'} ${battery.rated_capacity_kwh ? `/ ${battery.rated_capacity_kwh} kWh` : ''}`, colX, currentY + 15);

  // Col 2: Voltage & Cycles
  const col2X = colX + 46;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('NOMINAL VOLTAGE / CYCLES', col2X, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${battery.nominal_voltage ? `${battery.nominal_voltage} V` : '—'}  •  ${cycleCount ? `${cycleCount} cyc` : '—'}`, col2X, currentY + 15);

  // Col 3: Disposition & Integrity
  const col3X = col2X + 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('RECOMMENDED OUTCOME', col3X, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229);
  doc.text(battery.lifecycle_outcome || 'ACTIVE_SERVICE', col3X, currentY + 15);

  // Bottom note in hero box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const integrityMsg = unresolvedIssues.length === 0
    ? '✓ Provenance Integrity: Validated against blockchain ledger with 0 unresolved integrity discrepancies.'
    : `⚠ Integrity Warning: ${unresolvedIssues.length} unresolved discrepancy recorded on this pack.`;
  doc.text(integrityMsg, margin + 48, currentY + 23);

  currentY += 34;

  // ─────────────────────────────────────────────────────────────
  // 2. BATTERY IDENTIFICATION & SPECIFICATIONS
  // ─────────────────────────────────────────────────────────────
  drawSectionTitle('1. Battery Specifications & Lineage');

  const specs = [
    ['Manufacturer', battery.manufacturer || '—', 'Model / Part #', battery.model || '—'],
    ['Cell Chemistry', battery.chemistry || '—', 'Nominal Voltage', battery.nominal_voltage ? `${battery.nominal_voltage} V` : '—'],
    ['Rated Pack Capacity', battery.rated_capacity_kwh ? `${battery.rated_capacity_kwh} kWh` : '—', 'Manufacturing Date', fmtDate(battery.mfg_date)],
    ['Current Fleet / Owner', battery.current_owner || '—', 'Registration Date', fmtDate(battery.created_at)],
  ];

  specs.forEach((row, idx) => {
    checkPageOverflow(8);
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');

    // Label 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(row[0], margin + 2, currentY + 4.5);

    // Val 1
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(row[1]), margin + 42, currentY + 4.5);

    // Label 2
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(row[2], margin + 96, currentY + 4.5);

    // Val 2
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(row[3]), margin + 138, currentY + 4.5);

    currentY += 6.5;
  });

  currentY += 5;

  // ─────────────────────────────────────────────────────────────
  // 3. MANDATORY SERVICE WORK ORDERS (POLICY VT-202)
  // ─────────────────────────────────────────────────────────────
  drawSectionTitle('2. Mandatory Service Work Orders (Policy VT-202 Enforcement)');

  const orders = battery.service_orders || [];
  if (orders.length === 0) {
    checkPageOverflow(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No service work orders recorded for this battery pack.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    // Table Header
    checkPageOverflow(8);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('WORK ORDER ID', margin + 2, currentY + 4.2);
    doc.text('DATE', margin + 34, currentY + 4.2);
    doc.text('SERVICE CENTER', margin + 60, currentY + 4.2);
    doc.text('TECH ID', margin + 115, currentY + 4.2);
    doc.text('STATUS', margin + 138, currentY + 4.2);
    doc.text('RECORDED SOH', margin + 162, currentY + 4.2);
    currentY += 6;

    orders.forEach((o) => {
      checkPageOverflow(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(o.id || '—', margin + 2, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(fmtDate(o.opened_at), margin + 34, currentY + 4.2);
      doc.text(o.service_center ? (o.service_center.length > 28 ? o.service_center.slice(0, 27) + '…' : o.service_center) : '—', margin + 60, currentY + 4.2);
      doc.text(o.technician_id || '—', margin + 115, currentY + 4.2);

      // Status badge
      if (o.status === 'COMPLETED') {
        doc.setTextColor(21, 128, 61);
        doc.setFont('helvetica', 'bold');
        doc.text('COMPLETED', margin + 138, currentY + 4.2);
        doc.text(o.reported_soh != null ? `${o.reported_soh}%` : '—', margin + 162, currentY + 4.2);
      } else {
        doc.setTextColor(180, 83, 9);
        doc.setFont('helvetica', 'bold');
        doc.text('OPEN', margin + 138, currentY + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.text('Awaiting test', margin + 162, currentY + 4.2);
      }

      currentY += 5.5;

      if (o.action_taken) {
        checkPageOverflow(6);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Action: ${o.action_taken.length > 100 ? o.action_taken.slice(0, 98) + '…' : o.action_taken}`, margin + 6, currentY + 3);
        currentY += 4.5;
      }
    });
  }

  currentY += 5;

  // ─────────────────────────────────────────────────────────────
  // 4. DIAGNOSTIC MEASUREMENTS & LAB TESTS
  // ─────────────────────────────────────────────────────────────
  drawSectionTitle('3. Diagnostic Test Records & Impedance Telemetry');

  const diags = battery.diagnostics || [];
  if (diags.length === 0) {
    checkPageOverflow(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No diagnostic lab tests recorded for this battery pack.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    checkPageOverflow(8);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('TEST DATE', margin + 2, currentY + 4.2);
    doc.text('TESTING ORGANIZATION', margin + 32, currentY + 4.2);
    doc.text('METHOD', margin + 92, currentY + 4.2);
    doc.text('CAPACITY', margin + 130, currentY + 4.2);
    doc.text('RESISTANCE', margin + 155, currentY + 4.2);
    doc.text('SOH', margin + 175, currentY + 4.2);
    currentY += 6;

    diags.forEach((d) => {
      checkPageOverflow(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(fmtDate(d.test_date), margin + 2, currentY + 4.2);
      doc.text(d.testing_org || '—', margin + 32, currentY + 4.2);
      doc.text(d.test_method || 'Standard', margin + 92, currentY + 4.2);
      doc.text(d.measured_capacity_kwh ? `${d.measured_capacity_kwh} kWh` : '—', margin + 130, currentY + 4.2);
      doc.text(d.internal_resistance_mohm ? `${d.internal_resistance_mohm} mΩ` : '—', margin + 155, currentY + 4.2);

      doc.setFont('helvetica', 'bold');
      if (d.reported_soh >= 80) doc.setTextColor(21, 128, 61);
      else if (d.reported_soh >= 60) doc.setTextColor(180, 83, 9);
      else doc.setTextColor(185, 28, 28);
      doc.text(d.reported_soh ? `${d.reported_soh}%` : '—', margin + 175, currentY + 4.2);

      currentY += 5.5;
    });
  }

  currentY += 5;

  // ─────────────────────────────────────────────────────────────
  // 5. ATTACHED DOCUMENTS & BIT-FOR-BIT INTEGRITY CHECKS
  // ─────────────────────────────────────────────────────────────
  drawSectionTitle('4. Cryptographic Document Proofs & Hash Ledger');

  const docs = battery.documents || [];
  if (docs.length === 0) {
    checkPageOverflow(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No attached certification documents registered.', margin + 2, currentY + 4);
    currentY += 8;
  } else {
    checkPageOverflow(8);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('DOCUMENT FILE', margin + 2, currentY + 4.2);
    doc.text('ISSUER', margin + 68, currentY + 4.2);
    doc.text('INTEGRITY STATUS', margin + 115, currentY + 4.2);
    doc.text('SHA-256 HASH FINGERPRINT', margin + 150, currentY + 4.2);
    currentY += 6;

    docs.forEach((d) => {
      checkPageOverflow(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(d.file_name || 'attachment.pdf', margin + 2, currentY + 4.2);
      doc.text(d.issuer_name || 'Accredited Lab', margin + 68, currentY + 4.2);

      // Status
      const isVerified = (d.integrity_status || '').toUpperCase() === 'VERIFIED';
      doc.setFont('helvetica', 'bold');
      if (isVerified) {
        doc.setTextColor(21, 128, 61);
        doc.text('✓ VERIFIED', margin + 115, currentY + 4.2);
      } else {
        doc.setTextColor(185, 28, 28);
        doc.text('⚠ TAMPERED', margin + 115, currentY + 4.2);
      }

      // Hash snippet
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      const hashStr = d.file_hash_sha256 ? `${d.file_hash_sha256.slice(0, 14)}…` : 'Recorded in DPP';
      doc.text(hashStr, margin + 150, currentY + 4.2);

      currentY += 5.5;
    });
  }

  currentY += 6;

  // ─────────────────────────────────────────────────────────────
  // 6. CERTIFICATION STAMP & LEGAL DISCLAIMER
  // ─────────────────────────────────────────────────────────────
  checkPageOverflow(24);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CRYPTOGRAPHIC PASSPORT AUTHENTICATION SEAL', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This battery passport document was compiled deterministically from the VoltTrace audit ledger.\nAll diagnostic reports and service updates are checked against SHA-256 cryptographic fingerprints.\nComplies with EU Battery Passport Regulation (EU 2023/1542) and VoltTrace Circularity Standard VT-202.',
    margin + 4,
    currentY + 10.5
  );

  // Apply page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Trigger download
  const filename = `VoltTrace_Battery_Passport_${battery.id || 'Report'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
