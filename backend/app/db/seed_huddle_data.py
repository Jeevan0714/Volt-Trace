import datetime
from pathlib import Path
from app.db.database import SessionLocal, engine, Base
from app.db import models
from app.core import crypto
from app.core.config import settings

def seed_huddle_data():
    db = SessionLocal()
    print("Seeding Hackathon Hurdle Data: 'Valid Signature, Impossible Battery'...")

    # Ensure tables
    Base.metadata.create_all(bind=engine)

    # 1. Fetch or create Trusted Authority keys
    tuv_auth = db.query(models.TrustedAuthority).filter_by(name="TÜV Rheinland India").first()
    if not tuv_auth:
        tuv_priv, tuv_pub = crypto.generate_ed25519_keypair()
        tuv_auth = models.TrustedAuthority(
            name="TÜV Rheinland India",
            public_key=tuv_pub,
            accreditation_number="ISO-17025-IND-8941",
            is_active=True
        )
        db.add(tuv_auth)
        db.commit()
    else:
        # Generate a private key that matches or a new pair
        tuv_priv, tuv_pub = crypto.generate_ed25519_keypair()
        tuv_auth.public_key = tuv_pub
        db.commit()

    # 2. Seed modules for VT-1001 (Clean Reference Pack)
    b1 = db.query(models.Battery).filter_by(id="VT-1001").first()
    if b1:
        # Delete existing modules if any
        db.query(models.BatteryModule).filter_by(battery_id="VT-1001").delete()
        b1.pack_composite_merkle_root = "5a2d8e41bc76f189a0234de512c984ff0123456789abcdef0123456789abcdef"
        
        # 8 healthy OEM modules
        for idx in range(1, 9):
            mod_hash = crypto.calculate_bytes_sha256(f"MOD-VT1001-M0{idx}-75kWh-NMC-2023".encode("utf-8"))
            db.add(models.BatteryModule(
                battery_id="VT-1001",
                module_index=idx,
                serial_number=f"MOD-VT1001-M0{idx}",
                cell_chemistry="NMC 811",
                nominal_voltage=48.0,
                soh_percent=round(86.2 - (idx * 0.1), 1),
                internal_resistance_mohm=round(1.8 + (idx * 0.05), 2),
                cycle_count=610,
                is_replaced=False,
                replacement_origin="ORIGINAL_OEM",
                status="NOMINAL",
                module_hash=mod_hash
            ))
        db.commit()
        print("Seeded 8 healthy modules for VT-1001.")

    # 3. Seed modules for VT-1002 (Tampered Document Pack)
    b2 = db.query(models.Battery).filter_by(id="VT-1002").first()
    if b2:
        db.query(models.BatteryModule).filter_by(battery_id="VT-1002").delete()
        b2.pack_composite_merkle_root = "7f3e1a90c425db88ef1102938475a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3"
        for idx in range(1, 9):
            mod_hash = crypto.calculate_bytes_sha256(f"MOD-VT1002-M0{idx}-60kWh-LFP-2022".encode("utf-8"))
            db.add(models.BatteryModule(
                battery_id="VT-1002",
                module_index=idx,
                serial_number=f"MOD-VT1002-M0{idx}",
                cell_chemistry="LFP",
                nominal_voltage=40.0,
                soh_percent=round(74.5 - (idx * 0.2), 1),
                internal_resistance_mohm=round(2.6 + (idx * 0.08), 2),
                cycle_count=850,
                is_replaced=False,
                replacement_origin="ORIGINAL_OEM",
                status="NOMINAL",
                module_hash=mod_hash
            ))
        db.commit()
        print("Seeded 8 modules for VT-1002.")

    # 4. Clean and Create VT-1003 (THE FLAGSHIP HUDDLE SHOWCASE)
    # "Valid Signature, Impossible Battery"
    # - Valid Ed25519 signature from TÜV Rheinland India
    # - Impossible SoH jump: 71.0% -> 85.5% (+14.5%)
    # - Impossible cycle count: 880 -> 520 cycles (-360 cycles rollback!)
    # - Module #4 swapped with a donor part from salvaged pack VT-0941 (+118% IR mismatch)
    # - 425-day unrecorded telematics gap -> 36% Buyer Confidence
    existing_b3 = db.query(models.Battery).filter_by(id="VT-1003").first()
    if existing_b3:
        db.delete(existing_b3)
        db.commit()

    b3 = models.Battery(
        id="VT-1003",
        uuid="urn:volttrace:battery:vt-1003-lfp-2023",
        manufacturer="Mahindra Electric",
        model="Pack-50-LFP",
        chemistry="LFP",
        rated_capacity_kwh=50.0,
        nominal_voltage=320.0,
        mfg_date="2023-01-15",
        vehicle_info="BluSmart Fleet EV Pack #312",
        current_owner="BluSmart Fleet Operations Ltd",
        status="quarantined",
        lifecycle_outcome="QUARANTINE_HOLD",
        pack_composite_merkle_root="8e3f41a0d892bc49fe18d098714fa23e198b42ec9a56c7d1e902b48a12c45f91"
    )
    db.add(b3)
    db.commit()

    # Create mock PDF document with REAL VALID SIGNATURE for VT-1003
    sample_docs_dir = settings.DOCUMENT_STORAGE_DIR / "sample_files"
    sample_docs_dir.mkdir(parents=True, exist_ok=True)
    doc_path = sample_docs_dir / "VT1003_TUV_Certified_Annual_Audit_2025.pdf"
    
    pdf_content = (
        b"%PDF-1.4\nTUV Rheinland Certified Diagnostic Inspection Audit VT-1003\n"
        b"Accredited Issuer: TUV Rheinland India (ISO-17025-IND-8941)\n"
        b"Reported SoH: 85.5% | Reported Cycles: 520 | Pack: Mahindra Pack-50-LFP\n"
        b"Signed by Lead Assessor Sharma | Digitally Certified\n%%EOF"
    )
    with open(doc_path, "wb") as f:
        f.write(pdf_content)

    doc_hash = crypto.calculate_sha256(doc_path)
    doc_sig = crypto.sign_data(tuv_priv, pdf_content)

    # Document has 100% VALID SIGNATURE and MATCHED HASH!
    db.add(models.Document(
        id="doc_vt1003_tuv_audit",
        battery_id="VT-1003",
        file_name="VT1003_TUV_Certified_Annual_Audit_2025.pdf",
        file_path=str(doc_path),
        file_size_bytes=len(pdf_content),
        file_hash_sha256=doc_hash,
        document_type="DIAGNOSTIC_REPORT",
        issuer_name="TÜV Rheinland India",
        issuer_public_key=tuv_pub,
        digital_signature=doc_sig,
        signature_status="VALID_TRUSTED_ISSUER",  # Cryptographically 100% Valid!
        trust_tier="TIER_2_ISSUER_SIGNED",
        integrity_status="MATCHED",                # SHA-256 Bitwise Match!
        uploaded_at=datetime.datetime(2025, 5, 10, 14, 0)
    ))

    # Diagnostics: Historical test vs 14-month later Impossible test
    db.add_all([
        models.DiagnosticReport(
            battery_id="VT-1003",
            test_date=datetime.datetime(2024, 3, 10, 10, 30),
            testing_org="Mahindra Fleet Service Depot #12",
            measured_capacity_kwh=35.5,
            reported_soh=71.0,
            nominal_voltage=318.5,
            internal_resistance_mohm=21.2,
            ambient_temp_c=24.0,
            cycle_count=880,  # 880 cycles in early 2024
            test_method="Standard Fleet OBD Diagnostic",
            source_label="HISTORICAL_REPORT",
            fault_codes="NONE",
            notes="Baseline 60,000 km fleet service. Normal LFP capacity degradation."
        ),
        models.DiagnosticReport(
            battery_id="VT-1003",
            test_date=datetime.datetime(2025, 5, 10, 11, 0),  # 425 days later!
            testing_org="TÜV Rheinland India",
            measured_capacity_kwh=42.8,
            reported_soh=85.5,  # Impossible +14.5% SoH jump!
            nominal_voltage=322.0,
            internal_resistance_mohm=26.4,
            ambient_temp_c=25.0,
            cycle_count=520,  # Impossible rollback (-360 cycles)!
            test_method="Certified Coulomb Counting C/3",
            source_label="HISTORICAL_REPORT",
            fault_codes="NONE",
            notes="Digitally signed audit report claiming 85.5% SoH and 520 cycles."
        )
    ])

    # 8 Sub-Modules for VT-1003 demonstrating Sub-Component Lineage & Frankenstein Swap
    # Module 4 was swapped with a donor part from scrapped rickshaw pack VT-0941!
    for idx in range(1, 9):
        if idx == 4:
            # Swapped donor module with high internal resistance (+118% mismatch!)
            db.add(models.BatteryModule(
                battery_id="VT-1003",
                module_index=4,
                serial_number="MOD-DONOR-CRASH-891",
                cell_chemistry="LFP",
                nominal_voltage=40.0,
                soh_percent=64.0,
                internal_resistance_mohm=4.8,  # 4.8 mΩ vs ~2.2 mΩ baseline -> +118% mismatch!
                cycle_count=1340,
                is_replaced=True,
                replacement_origin="SALVAGE_DONOR_PACK",
                donor_battery_id="VT-0941 (Scrapped Auto-Rickshaw)",
                donor_notes="Transplanted without OEM authorization from salvaged flood pack #941. Severe impedance mismatch.",
                status="IMPEDANCE_MISMATCH_HAZARD",
                module_hash=crypto.calculate_bytes_sha256(b"MOD-DONOR-CRASH-891-SALVAGE")
            ))
        else:
            db.add(models.BatteryModule(
                battery_id="VT-1003",
                module_index=idx,
                serial_number=f"MOD-VT1003-M0{idx}",
                cell_chemistry="LFP",
                nominal_voltage=40.0,
                soh_percent=round(71.8 - (idx * 0.15), 1),
                internal_resistance_mohm=round(2.1 + (idx * 0.04), 2),
                cycle_count=880,
                is_replaced=False,
                replacement_origin="ORIGINAL_OEM",
                status="NOMINAL",
                module_hash=crypto.calculate_bytes_sha256(f"MOD-VT1003-M0{idx}-50kWh-LFP-2023".encode("utf-8"))
            ))

    # Battery Events for VT-1003
    db.add_all([
        models.BatteryEvent(
            battery_id="VT-1003",
            event_type="REGISTRATION",
            title="Battery Registered & Passport Minted",
            description="Initial commercial assembly registration for BluSmart EV fleet.",
            submitting_org="Mahindra Electric OEM",
            actor="Factory Registrar",
            verification_status="VERIFIED",
            timestamp=datetime.datetime(2023, 1, 15, 9, 0)
        ),
        models.BatteryEvent(
            battery_id="VT-1003",
            event_type="MODULE_REPLACEMENT",
            title="Unscheduled Module #4 Swap Recorded",
            description="Module #4 replaced with donor part MOD-DONOR-CRASH-891 from salvage pack VT-0941. Pack Merkle root updated.",
            submitting_org="Third-Party Refurbishment Depot",
            actor="Technician Kumar",
            verification_status="INFORMATIONAL",
            timestamp=datetime.datetime(2024, 8, 14, 15, 30)
        ),
        models.BatteryEvent(
            battery_id="VT-1003",
            event_type="AUDIT_INSPECTION",
            title="TÜV Certified Annual Audit Uploaded (Signed)",
            description="Cryptographically signed report uploaded with Ed25519 key by TÜV Rheinland India.",
            submitting_org="TÜV Rheinland India",
            actor="Lead Inspector Sharma",
            verification_status="VERIFIED",
            timestamp=datetime.datetime(2025, 5, 10, 14, 0)
        ),
        models.BatteryEvent(
            battery_id="VT-1003",
            event_type="DISCREPANCY_FLAGGED",
            title="Physics Violations & Impedance Hazard Flagged",
            description="VoltTrace Consistency Engine detected valid cryptographic signature on impossible data (+14.5% SoH, -360 cycles rollback, and Module #4 impedance mismatch).",
            submitting_org="VoltTrace Consistency Engine",
            actor="Automated Daemon",
            verification_status="FAILED",
            timestamp=datetime.datetime(2025, 5, 10, 14, 5)
        )
    ])

    # Discrepancies for VT-1003
    db.add_all([
        models.Discrepancy(
            battery_id="VT-1003",
            code="DISC_VALID_SIG_IMPOSSIBLE_SOH",
            title="Valid Signature, Impossible Battery: Cryptographically Signed SoH Jump (+14.5%)",
            severity="CRITICAL",
            description="TÜV Rheinland Ed25519 signature is 100% valid, but reported SoH jumped from 71.0% to 85.5% without a certified new OEM replacement pack. Cryptographic authenticity cannot override the laws of thermodynamics.",
            status="UNRESOLVED",
            detected_at=datetime.datetime(2025, 5, 10, 14, 5)
        ),
        models.Discrepancy(
            battery_id="VT-1003",
            code="DISC_CYCLE_ROLLBACK",
            title="Physical Impossibility: BMS Odometer Rollback (-360 Cycles)",
            severity="CRITICAL",
            description="Reported cycle count decreased from 880 cycles (2024-03-10) to 520 cycles (2025-05-10). Battery cycle counters are strictly monotonic. Digital odometer tampering detected.",
            status="UNRESOLVED",
            detected_at=datetime.datetime(2025, 5, 10, 14, 5)
        ),
        models.Discrepancy(
            battery_id="VT-1003",
            code="DISC_MODULE_IMPEDANCE_MISMATCH",
            title="Sub-Component Lineage Hazard: Swapped Module #4 Impedance Mismatch (+118%)",
            severity="HIGH",
            description="Module #4 (MOD-DONOR-CRASH-891) was replaced using a salvage donor part from scrapped auto-rickshaw pack 'VT-0941'. Internal resistance of 4.8 mΩ diverges by +118% from the 2.2 mΩ pack baseline, creating severe thermal divergence under fast charging.",
            status="UNRESOLVED",
            detected_at=datetime.datetime(2025, 5, 10, 14, 5)
        )
    ])

    # Service Work Order for VT-1003
    wo3 = models.ServiceWorkOrder(
        id="WO-2025-0510",
        battery_id="VT-1003",
        service_center="BluSmart Fleet Central Workshop #2",
        technician_id="TECH-884",
        description="Investigation into digital signature vs physical telemetry contradictions",
        status="OPEN",
        reported_soh=85.5,
        measured_capacity_kwh=42.8,
        cell_variance_mv=38.5,  # High cell variance due to donor module #4!
        diagnostic_document_id="doc_vt1003_tuv_audit",
        action_taken=None,
        notes="Pack quarantined. Technician flagged cycle count rollback and module #4 impedance divergence.",
        opened_at=datetime.datetime(2025, 5, 10, 14, 10),
        completed_at=None
    )
    db.add(wo3)

    db.commit()
    db.close()
    print("Successfully seeded VT-1003 (The 'Valid Signature, Impossible Battery' Hurdle Flagship)!")

if __name__ == "__main__":
    seed_huddle_data()
