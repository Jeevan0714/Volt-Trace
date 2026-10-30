import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import rules_engine, crypto

router = APIRouter(prefix="/batteries/{battery_id}/diagnostics", tags=["Diagnostics"])

@router.post("", response_model=schemas.DiagnosticResponse)
def add_diagnostic_record(
    battery_id: str,
    payload: schemas.DiagnosticCreate,
    db: Session = Depends(get_db)
):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    test_dt = payload.test_date or datetime.datetime.utcnow()

    diagnostic = models.DiagnosticReport(
        battery_id=battery_id,
        test_date=test_dt,
        testing_org=payload.testing_org,
        measured_capacity_kwh=payload.measured_capacity_kwh,
        reported_soh=payload.reported_soh,
        nominal_voltage=payload.nominal_voltage or battery.nominal_voltage,
        internal_resistance_mohm=payload.internal_resistance_mohm or 18.0,
        ambient_temp_c=payload.ambient_temp_c or 25.0,
        cycle_count=payload.cycle_count or 0,
        test_method=payload.test_method or "Standard C/3 Discharge Qualification",
        source_label=payload.source_label or "USER_ENTERED",
        fault_codes=payload.fault_codes or "NONE",
        notes=payload.notes
    )
    db.add(diagnostic)

    # Add Passport Timeline Event
    db.add(models.BatteryEvent(
        battery_id=battery_id,
        event_type="DIAGNOSTIC_COMPLETED",
        title=f"Diagnostic Test Entered: {payload.reported_soh:.1f}% SoH",
        description=f"Measured {payload.measured_capacity_kwh:.1f} kWh by {payload.testing_org} (Source: {payload.source_label})",
        submitting_org=payload.testing_org,
        actor="Diagnostic Technician",
        verification_status="VERIFIED" if payload.source_label == "INDEPENDENT_TEST" else "INFORMATIONAL",
        timestamp=datetime.datetime.utcnow()
    ))

    # Append to Merkle Audit Trail
    last_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id.desc()).first()
    prev_hash = last_audit.event_hash if last_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    ts_str = datetime.datetime.utcnow().isoformat()
    audit_hash = crypto.calculate_audit_chain_hash(
        "DIAGNOSTIC_ENTRY",
        payload.testing_org,
        f"Entered SoH {payload.reported_soh}% for {battery_id}",
        ts_str,
        prev_hash
    )
    db.add(models.AuditEvent(
        event_type="DIAGNOSTIC_ENTRY",
        actor=payload.testing_org,
        details=f"Recorded {payload.measured_capacity_kwh}kWh ({payload.reported_soh}% SoH) for {battery_id}",
        timestamp=datetime.datetime.utcnow(),
        prev_hash=prev_hash,
        event_hash=audit_hash
    ))

    db.commit()
    db.refresh(diagnostic)

    # Trigger Consistency Re-evaluation
    db.refresh(battery)
    discovered = rules_engine.analyze_battery_consistency(battery)
    existing_codes = {d.code for d in battery.discrepancies if d.status == "UNRESOLVED"}
    for disc in discovered:
        if disc["code"] not in existing_codes:
            db.add(models.Discrepancy(
                battery_id=battery.id,
                code=disc["code"],
                title=disc["title"],
                severity=disc["severity"],
                description=disc["description"],
                status="UNRESOLVED"
            ))
            db.commit()

    return diagnostic
