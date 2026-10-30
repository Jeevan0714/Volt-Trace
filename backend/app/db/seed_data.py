import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from app.db import models
from app.core import crypto
from app.core.config import settings

SAMPLE_DOCS_DIR = settings.DOCUMENT_STORAGE_DIR / "sample_files"
SAMPLE_DOCS_DIR.mkdir(parents=True, exist_ok=True)

def create_mock_pdf_file(filename: str, content_text: str) -> tuple[Path, str]:
    """Create a sample mock PDF file and return its path and SHA-256 hash."""
    file_path = SAMPLE_DOCS_DIR / filename
    # Minimal standard PDF header and binary structure
    pdf_content = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Length 100 >>\nstream\nBT /F1 12 Tf 72 712 Td ("
        + content_text.encode("utf-8")
        + b") Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n"
        b"0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
        b"0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n360\n%%EOF\n"
    )
    with open(file_path, "wb") as f:
        f.write(pdf_content)
    
    file_hash = crypto.calculate_sha256(file_path)
    return file_path, file_hash

def seed_database(db: Session):
    # Only seed if no batteries exist
    if db.query(models.Battery).first():
        return

    print("Initializing VoltTrace seed data...")

    # 1. Trusted Authorities
    tuv_priv, tuv_pub = crypto.generate_ed25519_keypair()
    oem_priv, oem_pub = crypto.generate_ed25519_keypair()
    
    auth_tuv = models.TrustedAuthority(
        name="TÜV Rheinland India",
        public_key=tuv_pub,
        accreditation_number="ISO-17025-IND-8941",
        is_active=True
    )
    auth_oem = models.TrustedAuthority(
        name="VoltTrace Certified OEM Lab",
        public_key=oem_pub,
        accreditation_number="OEM-QUAL-2023-01",
        is_active=True
    )
    db.add_all([auth_tuv, auth_oem])
    db.commit()

    # 2. Recall Database
    recalls = [
        models.RecallEntry(
            battery_id_pattern="VT-1002",
            make="Apex Power Systems",
            model="Blade-60-LFP",
            recall_code="REC-2024-EV-091",
            title="Connector Pin Thermal Expansion Advisory",
            description="High ambient temperature during continuous fast charging may cause minor high-voltage pin contact resistance increase.",
            severity="MODERATE",
            source="MoRTH / ARAI Technical Safety Bulletin",
            updated_at=datetime.datetime(2025, 6, 12, 10, 0)
        ),
        models.RecallEntry(
            battery_id_pattern="ALL-GEN1",
            make="PowerGrid Tech",
            model="PG-Cell-48",
            recall_code="REC-2023-NMC-014",
            title="Cathode Separator Fold Defect",
            description="Potential micro-short circuit hazard under heavy vibration regimes.",
            severity="CRITICAL",
            source="NHTSA Global Recall Database",
            updated_at=datetime.datetime(2024, 3, 5, 8, 30)
        )
    ]
    db.add_all(recalls)
    db.commit()

    # 3. Genesis Audit Event
    genesis_prev = "0000000000000000000000000000000000000000000000000000000000000000"
    genesis_hash = crypto.calculate_audit_chain_hash("GENESIS", "SYSTEM", "VoltTrace Ledger Genesis Block", "2026-01-01T00:00:00Z", genesis_prev)
    db.add(models.AuditEvent(
        event_type="GENESIS",
        actor="SYSTEM",
        details="VoltTrace Cryptographic Audit Chain Initialized",
        timestamp=datetime.datetime(2026, 1, 1, 0, 0, 0),
        prev_hash=genesis_prev,
        event_hash=genesis_hash
    ))
    db.commit()

    # -------------------------------------------------------------
    # 4. Battery VT-1001 (THE HONEST, VERIFIED BATTERY)
    # -------------------------------------------------------------
    b1 = models.Battery(
        id="VT-1001",
        uuid="urn:volttrace:battery:vt-1001-nmc-2023",
        manufacturer="VoltTrace Certified OEM",
        model="Pack-75-NMC",
        chemistry="NMC 811",
        rated_capacity_kwh=75.0,
        nominal_voltage=400.0,
        mfg_date="2023-04-10",
        vehicle_info="Tata Nexon EV Max / Zypp Fleet #204",
        current_owner="Zypp Fleet Logistics Ltd",
        status="active"
    )
    db.add(b1)
    db.commit()

    # Sample PDF documents for VT-1001
    doc1_path, doc1_hash = create_mock_pdf_file("VT1001_Birth_Certificate.pdf", "VoltTrace OEM Birth Certificate VT-1001 NMC 75kWh Nominal 400V")
    doc2_path, doc2_hash = create_mock_pdf_file("VT1001_TUV_Diagnostic_Report_2024.pdf", "TUV Rheinland Test Report VT-1001 Measured SoH 86.0% Pass")
    
    # Sign doc2 with TUV private key
    doc2_bytes = open(doc2_path, "rb").read()
    tuv_sig = crypto.sign_data(tuv_priv, doc2_bytes)

    db.add_all([
        models.Document(
            id="doc_vt1001_birth",
            battery_id="VT-1001",
            file_name="VT1001_Birth_Certificate.pdf",
            file_path=str(doc1_path),
            file_size_bytes=len(open(doc1_path, "rb").read()),
            file_hash_sha256=doc1_hash,
            document_type="BIRTH_CERTIFICATE",
            issuer_name="VoltTrace Certified OEM Lab",
            issuer_public_key=oem_pub,
            digital_signature=crypto.sign_data(oem_priv, open(doc1_path, "rb").read()),
            signature_status="VALID_TRUSTED_ISSUER",
            trust_tier="TIER_2_ISSUER_SIGNED",
            integrity_status="MATCHED",
            uploaded_at=datetime.datetime(2023, 4, 11, 10, 0)
        ),
        models.Document(
            id="doc_vt1001_tuv",
            battery_id="VT-1001",
            file_name="VT1001_TUV_Diagnostic_Report_2024.pdf",
            file_path=str(doc2_path),
            file_size_bytes=len(doc2_bytes),
            file_hash_sha256=doc2_hash,
            document_type="DIAGNOSTIC_REPORT",
            issuer_name="TÜV Rheinland India",
            issuer_public_key=tuv_pub,
            digital_signature=tuv_sig,
            signature_status="VALID_TRUSTED_ISSUER",
            trust_tier="TIER_2_ISSUER_SIGNED",
            integrity_status="MATCHED",
            uploaded_at=datetime.datetime(2024, 5, 12, 14, 30)
        )
    ])

    # Diagnostics for VT-1001
    db.add_all([
        models.DiagnosticReport(
            battery_id="VT-1001",
            test_date=datetime.datetime(2024, 5, 12, 11, 0),
            testing_org="TÜV Rheinland India",
            measured_capacity_kwh=64.5,
            reported_soh=86.0,
            nominal_voltage=398.2,
            internal_resistance_mohm=16.8,
            ambient_temp_c=25.0,
            cycle_count=420,
            test_method="Coulomb Counting C/3 + EIS",
            source_label="HISTORICAL_REPORT",
            fault_codes="NONE",
            notes="Cell balancing nominal. Thermal impedance within OEM bounds."
        ),
        models.DiagnosticReport(
            battery_id="VT-1001",
            test_date=datetime.datetime(2025, 10, 15, 9, 30),
            testing_org="EcoTrace Qualified Refurbisher Lab",
            measured_capacity_kwh=60.9,
            reported_soh=81.2,
            nominal_voltage=396.5,
            internal_resistance_mohm=18.4,
            ambient_temp_c=24.5,
            cycle_count=610,
            test_method="Standard C/3 Discharge Qualification",
            source_label="INDEPENDENT_TEST",
            fault_codes="NONE",
            notes="Degradation gradient 0.04% per 100 cycles. Pack structurally sound and ready for second-life BESS."
        )
    ])

    # Passport Events for VT-1001
    db.add_all([
        models.BatteryEvent(
            battery_id="VT-1001",
            event_type="REGISTRATION",
            title="Battery Registered & Placard Issued",
            description="Vehicle assembly registration completed. GS1 Digital Link QR code minted.",
            submitting_org="VoltTrace Certified OEM",
            actor="Fleet Registrar",
            verification_status="VERIFIED",
            timestamp=datetime.datetime(2023, 4, 11, 10, 0)
        ),
        models.BatteryEvent(
            battery_id="VT-1001",
            event_type="DIAGNOSTIC_UPLOAD",
            title="Annual Diagnostic Report Uploaded",
            description="TÜV Rheinland certified diagnostic report uploaded and signed with Ed25519 key.",
            submitting_org="TÜV Rheinland India",
            actor="Lead Inspector Sharma",
            verification_status="VERIFIED",
            timestamp=datetime.datetime(2024, 5, 12, 14, 30)
        ),
        models.BatteryEvent(
            battery_id="VT-1001",
            event_type="INTEGRITY_CHECK",
            title="SHA-256 Document Integrity Audit Passed",
            description="Cryptographic checksum recalculated. 100% bitwise match with registered version.",
            submitting_org="VoltTrace Engine",
            actor="Automated Daemon",
            verification_status="VERIFIED",
            timestamp=datetime.datetime(2025, 10, 15, 9, 35)
        )
    ])
    db.commit()

    # -------------------------------------------------------------
    # 5. Battery VT-1002 (THE TAMPERED / CONTRADICTION CHEATER DEMO)
    # -------------------------------------------------------------
    b2 = models.Battery(
        id="VT-1002",
        uuid="urn:volttrace:battery:vt-1002-lfp-2022",
        manufacturer="Apex Power Systems",
        model="Blade-60-LFP",
        chemistry="LFP",
        rated_capacity_kwh=60.0,
        nominal_voltage=320.0,
        mfg_date="2022-09-18",
        vehicle_info="E-Rickshaw Fleet Pack #110",
        current_owner="Private Seller / Unverified Depot",
        status="quarantined"
    )
    db.add(b2)
    db.commit()

    # Create original file and a tampered version for VT-1002
    doc_orig_path, doc_orig_hash = create_mock_pdf_file("VT1002_Seller_Report.pdf", "Original Service Report SoH 74% 2024")
    
    # Tampered file in storage (simulates user or seller secretly editing 1 byte/number)
    tampered_doc_path = SAMPLE_DOCS_DIR / "VT1002_Seller_Report_TAMPERED.pdf"
    with open(tampered_doc_path, "wb") as f:
        f.write(open(doc_orig_path, "rb").read() + b"\n% TAMPERED ALTERATION BY SELLER: SOH 84%")
    
    # Register document with the ORIGINAL hash, but point to the tampered file to trigger the red mismatch
    db.add(models.Document(
        id="doc_vt1002_tampered",
        battery_id="VT-1002",
        file_name="VT1002_Seller_Report.pdf",
        file_path=str(tampered_doc_path),
        file_size_bytes=len(open(tampered_doc_path, "rb").read()),
        file_hash_sha256=doc_orig_hash,  # Registered reference hash differs from file content
        document_type="DIAGNOSTIC_REPORT",
        issuer_name="Unverified Seller Upload",
        issuer_public_key=None,
        digital_signature=None,
        signature_status="NOT_PROVIDED",
        trust_tier="TIER_1_SELF_REPORTED",
        integrity_status="MISMATCH_DETECTED",  # Hash mismatch detected!
        uploaded_at=datetime.datetime(2025, 8, 20, 16, 0)
    ))

    # Diagnostics for VT-1002 demonstrating impossible SoH inversion (+10% jump)
    db.add_all([
        models.DiagnosticReport(
            battery_id="VT-1002",
            test_date=datetime.datetime(2024, 2, 10, 11, 0),
            testing_org="Authorized Service Depot #4",
            measured_capacity_kwh=44.4,
            reported_soh=74.0,
            nominal_voltage=318.0,
            internal_resistance_mohm=26.5,
            ambient_temp_c=22.0,
            cycle_count=850,
            test_method="Standard Service OBD Readout",
            source_label="HISTORICAL_REPORT",
            fault_codes="NONE",
            notes="Cell #14 shows minor voltage deviation under peak load."
        ),
        models.DiagnosticReport(
            battery_id="VT-1002",
            test_date=datetime.datetime(2025, 8, 20, 15, 0),
            testing_org="Seller-Reported Intake Sheet",
            measured_capacity_kwh=50.4,
            reported_soh=84.0,  # +10% jump without module replacement!
            nominal_voltage=322.0,
            internal_resistance_mohm=21.0,
            ambient_temp_c=25.0,
            cycle_count=920,
            test_method="Self-Reported Test",
            source_label="SELLER_REPORTED",
            fault_codes="NONE",
            notes="Seller claims battery capacity was restored to 84%."
        )
    ])

    # Discrepancies for VT-1002
    db.add_all([
        models.Discrepancy(
            battery_id="VT-1002",
            code="DISC_HASH_MISMATCH",
            title="Document Fingerprint Integrity Failure",
            severity="HIGH",
            description="Uploaded file 'VT1002_Seller_Report.pdf' has a calculated SHA-256 hash that differs from its registered certificate hash. Evidence tampering detected.",
            status="UNRESOLVED",
            detected_at=datetime.datetime(2025, 8, 20, 16, 5)
        ),
        models.Discrepancy(
            battery_id="VT-1002",
            code="DISC_SOH_JUMP",
            title="Suspicious SoH Inversion (+10.0%)",
            severity="HIGH",
            description="Reported State of Health jumped from 74.0% (2024-02-10) to 84.0% (2025-08-20) without any recorded module or cell replacement invoice.",
            status="UNRESOLVED",
            detected_at=datetime.datetime(2025, 8, 20, 16, 10)
        )
    ])

    # Passport Events for VT-1002
    db.add_all([
        models.BatteryEvent(
            battery_id="VT-1002",
            event_type="REGISTRATION",
            title="Battery Registered",
            description="Initial fleet registration by third-party broker.",
            submitting_org="Apex Regional Fleet",
            actor="Fleet Agent",
            verification_status="INFORMATIONAL",
            timestamp=datetime.datetime(2022, 9, 20, 12, 0)
        ),
        models.BatteryEvent(
            battery_id="VT-1002",
            event_type="DISCREPANCY_FLAGGED",
            title="Integrity & SoH Contradiction Flags Triggered",
            description="Automated consistency engine flagged SHA-256 mismatch and impossible 10% SoH increase.",
            submitting_org="VoltTrace Consistency Engine",
            actor="Automated Daemon",
            verification_status="FAILED",
            timestamp=datetime.datetime(2025, 8, 20, 16, 15)
        )
    ])
    db.commit()

    # Append Audit Events
    audit_hash_1 = crypto.calculate_audit_chain_hash("BATTERY_REGISTERED", "SYSTEM", "Registered clean battery VT-1001", "2023-04-11T10:00:00", genesis_hash)
    db.add(models.AuditEvent(
        event_type="BATTERY_REGISTERED",
        actor="SYSTEM",
        details="Registered clean battery VT-1001 with Ed25519 signed birth certificate",
        timestamp=datetime.datetime(2023, 4, 11, 10, 0),
        prev_hash=genesis_hash,
        event_hash=audit_hash_1
    ))

    audit_hash_2 = crypto.calculate_audit_chain_hash("DISCREPANCY_FLAGGED", "CONSISTENCY_ENGINE", "Flagged VT-1002 integrity mismatch and SoH jump", "2025-08-20T16:15:00", audit_hash_1)
    db.add(models.AuditEvent(
        event_type="DISCREPANCY_FLAGGED",
        actor="CONSISTENCY_ENGINE",
        details="Flagged VT-1002 file hash mismatch and +10% SoH jump without repair bill",
        timestamp=datetime.datetime(2025, 8, 20, 16, 15),
        prev_hash=audit_hash_1,
        event_hash=audit_hash_2
    ))
    db.commit()

    print("VoltTrace seed data loaded successfully: VT-1001 (Clean) and VT-1002 (Contradiction).")
