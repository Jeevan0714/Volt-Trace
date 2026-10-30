import uuid
import datetime
import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import rules_engine, triage_engine, crypto
from app.core.config import settings

router = APIRouter(prefix="/batteries", tags=["Batteries"])

@router.get("", response_model=List[schemas.BatteryListItem])
def list_batteries(
    search: Optional[str] = Query(None, description="Search by ID, model, or owner"),
    chemistry: Optional[str] = Query(None, description="Filter by chemistry"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Battery)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Battery.id.ilike(term),
                models.Battery.model.ilike(term),
                models.Battery.current_owner.ilike(term),
                models.Battery.manufacturer.ilike(term)
            )
        )
    if chemistry:
        query = query.filter(models.Battery.chemistry == chemistry)
    if status:
        query = query.filter(models.Battery.status == status)

    batteries = query.all()
    results = []

    for b in batteries:
        latest_diag = b.diagnostics[0] if b.diagnostics else None
        
        # Check integrity
        has_mismatch = any(doc.integrity_status == "MISMATCH_DETECTED" for doc in b.documents)
        integrity_status = "MISMATCH_DETECTED" if has_mismatch else ("MATCHED" if b.documents else "PENDING")
        
        # Completeness
        completeness = "Complete" if (b.documents and b.diagnostics) else "Incomplete"
        
        # Unresolved issues
        unresolved_count = sum(1 for d in b.discrepancies if d.status == "UNRESOLVED")
        
        # Evidence quality score
        ev_quality = rules_engine.calculate_evidence_quality_score(b)
        
        # 3-Pillar Triage Output
        triage = triage_engine.evaluate_second_life_triage(b)

        results.append(schemas.BatteryListItem(
            id=b.id,
            manufacturer=b.manufacturer,
            model=b.model,
            chemistry=b.chemistry,
            rated_capacity_kwh=b.rated_capacity_kwh,
            nominal_voltage=b.nominal_voltage,
            mfg_date=b.mfg_date,
            current_owner=b.current_owner,
            status=b.status,
            latest_soh=latest_diag.reported_soh if latest_diag else None,
            latest_soh_source=latest_diag.source_label if latest_diag else None,
            latest_soh_date=latest_diag.test_date.strftime("%Y-%m-%d") if latest_diag else None,
            completeness_status=completeness,
            integrity_status=integrity_status,
            integrity_label=triage["record_integrity"]["label"],
            unresolved_issues_count=unresolved_count,
            evidence_score=ev_quality["score"],
            evidence_quality_label=triage["evidence_quality"]["label"],
            next_action_label=triage["next_action"]["label"],
            next_action_code=triage["next_action"]["code"],
            suitability_label=triage["suitability"]["label"],
            lifecycle_outcome=b.lifecycle_outcome or "PENDING_ASSESSMENT"
        ))

    return results

@router.get("/{battery_id}", response_model=schemas.BatteryDetail)
def get_battery(battery_id: str, db: Session = Depends(get_db)):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found in passport registry.")

    # Run real-time consistency checks and update discrepancies if new ones discovered
    discovered_discrepancies = rules_engine.analyze_battery_consistency(battery)
    existing_codes = {d.code for d in battery.discrepancies if d.status == "UNRESOLVED"}
    
    for disc in discovered_discrepancies:
        if disc["code"] not in existing_codes:
            new_disc = models.Discrepancy(
                battery_id=battery.id,
                code=disc["code"],
                title=disc["title"],
                severity=disc["severity"],
                description=disc["description"],
                status="UNRESOLVED"
            )
            db.add(new_disc)
            db.commit()

    db.refresh(battery)

    # Compute Evidence Quality Score
    evidence_quality = rules_engine.calculate_evidence_quality_score(battery)

    # Check Recall Database
    recalls = db.query(models.RecallEntry).filter(
        or_(
            models.RecallEntry.battery_id_pattern == battery.id,
            models.RecallEntry.model == battery.model
        )
    ).all()

    recall_check = {
        "status": "POTENTIAL_MATCH_FOUND" if recalls else "NO_MATCH_FOUND",
        "matches_count": len(recalls),
        "matches": [
            {
                "code": r.recall_code,
                "title": r.title,
                "severity": r.severity,
                "description": r.description,
                "source": r.source,
                "updated_at": r.updated_at.strftime("%Y-%m-%d")
            } for r in recalls
        ],
        "dataset_source": "NHTSA / MoRTH Configured Technical Safety Bulletins (Demonstration Dataset)",
        "last_updated": "2026-10-15",
        "disclaimer": "Recall check matches against the configured demonstration dataset. Absence of a match is not proof that the battery is free of manufacturer defects."
    }

    # Evaluate 3-Pillar Triage & Valuation
    triage = triage_engine.evaluate_second_life_triage(battery)
    valuation = triage_engine.calculate_indicative_valuation(battery)

    return schemas.BatteryDetail(
        id=battery.id,
        uuid=battery.uuid,
        manufacturer=battery.manufacturer,
        model=battery.model,
        chemistry=battery.chemistry,
        rated_capacity_kwh=battery.rated_capacity_kwh,
        nominal_voltage=battery.nominal_voltage,
        mfg_date=battery.mfg_date,
        vehicle_info=battery.vehicle_info,
        current_owner=battery.current_owner,
        status=battery.status,
        lifecycle_outcome=battery.lifecycle_outcome or "PENDING_ASSESSMENT",
        created_at=battery.created_at,
        updated_at=battery.updated_at,
        events=battery.events,
        documents=battery.documents,
        diagnostics=battery.diagnostics,
        discrepancies=battery.discrepancies,
        service_orders=battery.service_orders,
        evidence_quality=evidence_quality,
        recall_check=recall_check,
        triage=triage,
        valuation=valuation
    )

@router.patch("/{battery_id}/outcome", response_model=schemas.BatteryDetail)
def update_lifecycle_outcome(
    battery_id: str,
    payload: schemas.LifecycleOutcomeUpdate,
    db: Session = Depends(get_db)
):
    valid_outcomes = ["PENDING_ASSESSMENT", "SECOND_LIFE_DEPLOYED", "RECYCLING_PROCESSED", "QUARANTINE_HOLD"]
    if payload.outcome not in valid_outcomes:
        raise HTTPException(status_code=400, detail=f"Invalid outcome. Allowed: {valid_outcomes}")

    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found.")

    old_outcome = battery.lifecycle_outcome or "PENDING_ASSESSMENT"
    battery.lifecycle_outcome = payload.outcome
    db.commit()

    # Log in Battery Event timeline
    event_title = f"Lifecycle Disposition: {payload.outcome.replace('_', ' ').title()}"
    event_desc = payload.notes or f"Battery reassigned from '{old_outcome}' to '{payload.outcome}'."
    event = models.BatteryEvent(
        battery_id=battery.id,
        event_type="LIFECYCLE_OUTCOME_SET",
        title=event_title,
        description=event_desc,
        submitting_org="VoltTrace Regional Triage Hub",
        actor=payload.actor,
        verification_status="VERIFIED"
    )
    db.add(event)

    # Log in Merkle Audit Trail
    last_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id.desc()).first()
    prev_hash = last_audit.event_hash if last_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    ts_str = datetime.datetime.utcnow().isoformat()
    new_audit_hash = crypto.calculate_audit_chain_hash("LIFECYCLE_OUTCOME_UPDATED", payload.actor, f"Battery {battery.id} -> {payload.outcome}", ts_str, prev_hash)
    
    db.add(models.AuditEvent(
        event_type="LIFECYCLE_OUTCOME_UPDATED",
        actor=payload.actor,
        details=f"Updated lifecycle outcome for {battery.id} from {old_outcome} to {payload.outcome}. Notes: {payload.notes or 'None'}",
        timestamp=datetime.datetime.utcnow(),
        prev_hash=prev_hash,
        event_hash=new_audit_hash
    ))
    db.commit()
    db.refresh(battery)

    return get_battery(battery.id, db)

@router.post("/{battery_id}/role-intake")
def submit_role_intake(battery_id: str, payload: schemas.RoleIntakeSubmission, db: Session = Depends(get_db)):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found.")

    role_upper = payload.role.upper()
    discrepancy_flagged = False
    anti_fraud_alert = None
    file_hash = None
    file_name = payload.file_name

    # 1. Process File Attachment (Binary Upload / Base64 / SHA-256 Checksum)
    if payload.file_base64:
        try:
            parts = payload.file_base64.split(",")
            raw_b64 = parts[1] if len(parts) > 1 else parts[0]
            file_bytes = base64.b64decode(raw_b64)
            file_hash = crypto.calculate_bytes_sha256(file_bytes)
            
            # Save file to Content-Addressable Storage
            battery_storage = settings.DOCUMENT_STORAGE_DIR / battery.id
            battery_storage.mkdir(parents=True, exist_ok=True)
            safe_fname = f"{file_hash[:16]}_{payload.file_name or 'attachment.bin'}"
            dest_path = battery_storage / safe_fname
            with open(dest_path, "wb") as f:
                f.write(file_bytes)
            
            doc_type_map = {
                "MANUFACTURER": "BIRTH_CERTIFICATE",
                "ASSEMBLER": "MODULE_REPLACEMENT" if (payload.module_replaced or payload.action_type == "Module Replacement") else "DIAGNOSTIC_REPORT",
                "SELLER": "SERVICE_INVOICE",
                "RECYCLER": "INSPECTION_REPORT"
            }
            doc_type = doc_type_map.get(role_upper, "DIAGNOSTIC_REPORT")
            
            doc_record = models.Document(
                id=f"doc_{uuid.uuid4().hex[:8]}",
                battery_id=battery.id,
                file_name=payload.file_name or "attached_file.pdf",
                file_path=str(dest_path),
                file_size_bytes=len(file_bytes),
                file_hash_sha256=file_hash,
                document_type=doc_type,
                issuer_name=payload.organization,
                signature_status="NOT_PROVIDED",
                trust_tier="TIER_1_SELF_REPORTED",
                integrity_status="MATCHED",
                uploaded_at=datetime.datetime.utcnow()
            )
            db.add(doc_record)
        except Exception:
            file_hash = payload.file_hash_sha256
    elif payload.file_hash_sha256:
        file_hash = payload.file_hash_sha256

    # 2. Anti-Fraud Rules Engine Cross-Check (SoH Inversion Detection)
    # Check if newly reported SoH is physically impossible (> historical reading without module replacement)
    latest_diag = battery.diagnostics[0] if battery.diagnostics else None
    if payload.reported_soh is not None and latest_diag and latest_diag.reported_soh is not None:
        has_module_replacement = (
            payload.module_replaced or 
            payload.action_type == "Module Replacement" or
            any(d.document_type == "MODULE_REPLACEMENT" for d in battery.documents)
        )
        soh_diff = payload.reported_soh - latest_diag.reported_soh
        if soh_diff > 1.0 and not has_module_replacement:
            discrepancy_flagged = True
            anti_fraud_alert = (
                f"🚨 Suspicious SoH Inversion detected! {role_upper} claimed SoH {payload.reported_soh:.1f}%, "
                f"which exceeds previous verified reading of {latest_diag.reported_soh:.1f}% ({latest_diag.testing_org}) "
                f"by +{soh_diff:.1f}% without documented module replacement."
            )
            inversion_disc = models.Discrepancy(
                battery_id=battery.id,
                code="DISC_SOH_JUMP",
                title=f"High-Priority Anomaly: Suspicious SoH Inversion (+{soh_diff:.1f}%)",
                severity="HIGH",
                description=anti_fraud_alert,
                status="UNRESOLVED"
            )
            db.add(inversion_disc)

    # 3. Format Title & Details by Persona
    if role_upper == "MANUFACTURER":
        event_type = "MANUFACTURER_LOG"
        event_title = "Factory Birth & Specifications Minted"
        desc = (
            f"OEM Birth Record: {payload.organization} ({payload.actor_name}). "
            f"Serial: {payload.factory_serial_number or 'N/A'}, Lot: {payload.cell_lot_id or 'N/A'}, "
            f"Plant: {payload.plant_location or 'N/A'}, Cell OEM: {payload.cell_manufacturer or 'N/A'}."
        )
        if payload.chemistry:
            battery.chemistry = payload.chemistry
        if payload.rated_capacity_kwh:
            battery.rated_capacity_kwh = payload.rated_capacity_kwh
        if payload.nominal_voltage:
            battery.nominal_voltage = payload.nominal_voltage
        if payload.notes:
            desc += f" Specs: {payload.notes}"

    elif role_upper == "ASSEMBLER":
        is_replacement = payload.module_replaced or payload.action_type == "Module Replacement"
        event_type = "MODULE_REPLACEMENT" if is_replacement else "ASSEMBLER_SERVICE"
        action_name = payload.action_type or ("Module Replacement" if is_replacement else "Maintenance Inspection")
        event_title = f"Workshop Service ({action_name})"
        desc = (
            f"Technician {payload.actor_name} ({payload.organization}) completed {action_name}. "
            f"Measured SoH: {payload.reported_soh or 'N/A'}%, "
            f"Variance: {payload.cell_variance_mv or 'N/A'} mV."
        )
        if is_replacement:
            desc += f" Replaced {payload.cells_replaced_count or 'N/A'} cells (New Module SN: {payload.new_module_serial or 'N/A'})."
        if payload.notes:
            desc += f" Notes: {payload.notes}"

    elif role_upper == "SELLER":
        event_type = "SELLER_TRANSFER"
        event_title = "Seller Condition & Custody Disclosure"
        desc = (
            f"Seller {payload.organization} ({payload.actor_name}) registered transfer. "
            f"Vehicle: {payload.vehicle_info or battery.vehicle_info or 'Chassis N/A'}, "
            f"Odometer: {payload.odometer_km or 'N/A'} km, "
            f"Reason: {payload.decommission_reason or 'Fleet Transfer'}, "
            f"Claimed SoH: {payload.reported_soh or 'N/A'}%."
        )
        if payload.accident_or_thermal_history or payload.submersion_history or payload.physical_damage_detected:
            discrepancy_flagged = True
            trauma_disc = models.Discrepancy(
                battery_id=battery.id,
                code="DISC_PERSONA_TRAUMA",
                title="Seller Disclosed Physical Pack Trauma",
                severity="HIGH",
                description="Seller disclosed water submersion, flood, severe collision impact, or thermal runaway history during mobile intake.",
                status="UNRESOLVED"
            )
            db.add(trauma_disc)
            desc += " ⚠️ SELLER DISCLOSED TRAUMA (Thermal runaway, submersion, or physical damage history)."
        if payload.notes:
            desc += f" Remarks: {payload.notes}"

    elif role_upper == "RECYCLER":
        event_type = "RECYCLER_INTAKE"
        event_title = "Recycler Safety Triage & Bench Test"
        disposition_label = (payload.disposition or "UNDER_REVIEW").replace("_", " ")
        desc = (
            f"Intake assessed by {payload.organization} ({payload.actor_name}). "
            f"Disposition: {disposition_label}. "
            f"Bench SoH: {payload.reported_soh or 'N/A'}%, "
            f"Impedance: {payload.internal_resistance_mohm or 'N/A'} mΩ, "
            f"Ambient Temp: {payload.ambient_temp_c or 25.0}°C."
        )
        if payload.swelling_detected or payload.leak_detected or payload.corrosion_detected or payload.physical_damage_detected:
            discrepancy_flagged = True
            defects = []
            if payload.swelling_detected: defects.append("Swollen pouch cells")
            if payload.leak_detected: defects.append("Coolant leak")
            if payload.corrosion_detected: defects.append("Terminal corrosion / arc marks")
            defect_str = ", ".join(defects) or "Physical pack damage"
            desc += f" 🚨 PHYSICAL DEFECTS DETECTED ({defect_str})."
            defect_disc = models.Discrepancy(
                battery_id=battery.id,
                code="DISC_PHYSICAL_DEFECT",
                title="Recycler Identified Critical Physical Defects",
                severity="CRITICAL",
                description=f"Depot triage inspection identified physical damage: {defect_str}. Immediate quarantine required.",
                status="UNRESOLVED"
            )
            db.add(defect_disc)
            battery.status = "quarantined"
        if payload.disposition:
            battery.lifecycle_outcome = payload.disposition
        if payload.notes:
            desc += f" Assessor Notes: {payload.notes}"

    else:
        event_type = "ROLE_INTAKE"
        event_title = f"{payload.role} Intake Submission"
        desc = f"Submitted by {payload.actor_name} ({payload.organization}). Notes: {payload.notes or 'None'}"

    # 4. Add Battery Event
    battery_event = models.BatteryEvent(
        battery_id=battery.id,
        event_type=event_type,
        title=event_title,
        description=desc,
        submitting_org=payload.organization,
        actor=payload.actor_name,
        verification_status="FLAGGED" if discrepancy_flagged else "VERIFIED"
    )
    db.add(battery_event)

    # 5. Add Diagnostic Report if numeric SoH provided
    if payload.reported_soh is not None:
        calc_kwh = payload.measured_capacity_kwh or round(battery.rated_capacity_kwh * (payload.reported_soh / 100.0), 2)
        source = "SELLER_REPORTED" if role_upper == "SELLER" else "INDEPENDENT_TEST"
        fault = "FRAUD_INVERSION_FLAGGED" if anti_fraud_alert else ("TRAUMA_DISCLOSED" if discrepancy_flagged else "NONE")
        diag = models.DiagnosticReport(
            battery_id=battery.id,
            test_date=datetime.datetime.utcnow(),
            testing_org=payload.organization,
            measured_capacity_kwh=calc_kwh,
            reported_soh=payload.reported_soh,
            internal_resistance_mohm=payload.internal_resistance_mohm or 18.0,
            ambient_temp_c=payload.ambient_temp_c or 25.0,
            test_method="Intake Bench Screening" if role_upper == "RECYCLER" else "Service Work Order OBD Check",
            source_label=source,
            fault_codes=fault,
            notes=payload.notes or f"Submitted via {role_upper} mobile intake."
        )
        db.add(diag)

    # 6. Append to Hash-Linked Merkle Audit Trail
    last_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id.desc()).first()
    prev_hash = last_audit.event_hash if last_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    ts_str = datetime.datetime.utcnow().isoformat()
    new_audit_hash = crypto.calculate_audit_chain_hash(
        event_type, payload.actor_name, f"Battery {battery.id} [{role_upper}] {desc[:80]}", ts_str, prev_hash
    )
    
    db.add(models.AuditEvent(
        event_type=event_type,
        actor=f"{payload.actor_name} ({payload.organization})",
        details=f"Mobile Role Intake ({role_upper}) for {battery.id}: {event_title}. {desc}" + (f" [Attachment SHA-256: {file_hash}]" if file_hash else ""),
        timestamp=datetime.datetime.utcnow(),
        prev_hash=prev_hash,
        event_hash=new_audit_hash
    ))

    db.commit()
    db.refresh(battery)

    passport_status = "UP_TO_DATE"
    if anti_fraud_alert:
        passport_status = "FLAGGED_SOH_INVERSION"
    elif discrepancy_flagged:
        passport_status = "FLAGGED_INSPECTION_REQUIRED"

    return {
        "success": True,
        "battery_id": battery.id,
        "role": role_upper,
        "event_title": event_title,
        "actor_name": payload.actor_name,
        "organization": payload.organization,
        "audit_hash": new_audit_hash,
        "prev_audit_hash": prev_hash,
        "discrepancy_flagged": discrepancy_flagged,
        "anti_fraud_alert": anti_fraud_alert,
        "file_hash_sha256": file_hash,
        "file_name": file_name,
        "passport_status": passport_status,
        "summary": desc,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }

@router.post("", response_model=schemas.BatteryDetail)
def register_battery(payload: schemas.BatteryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Battery).filter(models.Battery.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Battery with ID '{payload.id}' already exists.")

    internal_uuid = f"urn:volttrace:battery:{payload.id.lower()}-{uuid.uuid4().hex[:8]}"

    new_battery = models.Battery(
        id=payload.id,
        uuid=internal_uuid,
        manufacturer=payload.manufacturer,
        model=payload.model,
        chemistry=payload.chemistry,
        rated_capacity_kwh=payload.rated_capacity_kwh,
        nominal_voltage=payload.nominal_voltage,
        mfg_date=payload.mfg_date,
        vehicle_info=payload.vehicle_info,
        current_owner=payload.current_owner,
        status="active"
    )
    db.add(new_battery)
    db.commit()

    # Log Registration Event in Passport
    reg_event = models.BatteryEvent(
        battery_id=new_battery.id,
        event_type="REGISTRATION",
        title="Battery Registered & Passport Minted",
        description=f"Registered by {payload.current_owner}. GS1 Digital Link QR placard activated.",
        submitting_org=payload.current_owner,
        actor="System Intake Agent",
        verification_status="VERIFIED"
    )
    db.add(reg_event)

    # Log in Merkle Audit Trail
    last_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id.desc()).first()
    prev_hash = last_audit.event_hash if last_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    ts_str = datetime.datetime.utcnow().isoformat()
    new_audit_hash = crypto.calculate_audit_chain_hash("BATTERY_REGISTERED", payload.current_owner, f"Registered battery {payload.id}", ts_str, prev_hash)
    
    db.add(models.AuditEvent(
        event_type="BATTERY_REGISTERED",
        actor=payload.current_owner,
        details=f"Registered battery {payload.id} ({payload.model}, {payload.chemistry})",
        timestamp=datetime.datetime.utcnow(),
        prev_hash=prev_hash,
        event_hash=new_audit_hash
    ))
    db.commit()
    db.refresh(new_battery)

    return get_battery(new_battery.id, db)
