import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import rules_engine, triage_engine, crypto

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
