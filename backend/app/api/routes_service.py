import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import crypto

router = APIRouter(prefix="/batteries/{battery_id}/service-orders", tags=["Service Work Orders"])

@router.get("", response_model=List[schemas.ServiceWorkOrderResponse])
def list_service_orders(battery_id: str, db: Session = Depends(get_db)):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found.")
    return battery.service_orders

@router.post("/open", response_model=schemas.ServiceWorkOrderResponse)
def open_service_order(
    battery_id: str,
    payload: schemas.ServiceWorkOrderCreate,
    db: Session = Depends(get_db)
):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found.")

    order_id = f"WO-{datetime.datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    order = models.ServiceWorkOrder(
        id=order_id,
        battery_id=battery.id,
        service_center=payload.service_center,
        technician_id=payload.technician_id,
        description=payload.description,
        status="OPEN",
        opened_at=datetime.datetime.utcnow()
    )
    db.add(order)

    # Log service order opening in battery events
    event = models.BatteryEvent(
        battery_id=battery.id,
        event_type="SERVICE_ORDER_OPENED",
        title=f"Work Order Opened: {order_id}",
        description=f"Authorized service intake at {payload.service_center} by technician {payload.technician_id}. {payload.description}",
        submitting_org=payload.service_center,
        actor=payload.technician_id,
        verification_status="INFORMATIONAL"
    )
    db.add(event)
    db.commit()
    db.refresh(order)

    return order

@router.post("/{order_id}/complete", response_model=schemas.ServiceWorkOrderResponse)
def complete_service_order(
    battery_id: str,
    order_id: str,
    payload: schemas.ServiceWorkOrderComplete,
    db: Session = Depends(get_db)
):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found.")

    order = db.query(models.ServiceWorkOrder).filter(
        models.ServiceWorkOrder.id == order_id,
        models.ServiceWorkOrder.battery_id == battery_id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail=f"Work order {order_id} not found for battery {battery_id}.")

    if order.status == "COMPLETED":
        raise HTTPException(status_code=400, detail=f"Work order {order_id} is already completed.")

    # MANDATORY DPP ENFORCEMENT CHECK:
    # "No service closure without verified diagnostic record submission"
    if not payload.diagnostic_document_id:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Policy VT-202: Mandatory Service Closure Blocked. "
                f"Work order {order_id} cannot be completed in VoltTrace without attaching "
                f"a verified diagnostic report reference to ensure passport provenance integrity."
            )
        )

    # Verify diagnostic document exists
    doc = db.query(models.Document).filter(
        models.Document.id == payload.diagnostic_document_id,
        models.Document.battery_id == battery_id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Policy VT-202: Diagnostic reference '{payload.diagnostic_document_id}' "
                f"does not match any registered document for battery {battery_id}."
            )
        )

    if doc.integrity_status == "MISMATCH_DETECTED":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Policy VT-202: Cannot close work order with compromised document "
                f"'{doc.file_name}' (SHA-256 mismatch detected). Physical review required."
            )
        )

    # Update work order
    order.status = "COMPLETED"
    order.completed_at = datetime.datetime.utcnow()
    order.reported_soh = payload.reported_soh
    order.measured_capacity_kwh = payload.measured_capacity_kwh
    order.cell_variance_mv = payload.cell_variance_mv
    order.diagnostic_document_id = payload.diagnostic_document_id
    order.action_taken = payload.action_taken
    order.notes = payload.notes

    # Add diagnostic report entry to battery
    diag = models.DiagnosticReport(
        battery_id=battery.id,
        test_date=datetime.datetime.utcnow(),
        testing_org=order.service_center,
        measured_capacity_kwh=payload.measured_capacity_kwh,
        reported_soh=payload.reported_soh,
        nominal_voltage=battery.nominal_voltage,
        internal_resistance_mohm=payload.cell_variance_mv,
        ambient_temp_c=25.0,
        cycle_count=None,
        test_method=f"Service Work Order ({order.id}) Diagnostic Benchmark",
        source_label="INDEPENDENT_TEST",
        fault_codes="NONE",
        notes=f"Service action: {payload.action_taken}. Attached doc: {doc.file_name}"
    )
    db.add(diag)

    # Add battery event
    event = models.BatteryEvent(
        battery_id=battery.id,
        event_type="SERVICE_COMPLETED",
        title=f"Service Completed: {order.id}",
        description=f"Technician {payload.technician_id} closed work order. Recorded {payload.reported_soh}% SoH. Action: {payload.action_taken}",
        submitting_org=order.service_center,
        actor=payload.technician_id,
        verification_status="VERIFIED"
    )
    db.add(event)

    # Log in Merkle Audit Trail
    last_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id.desc()).first()
    prev_hash = last_audit.event_hash if last_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    ts_str = datetime.datetime.utcnow().isoformat()
    new_audit_hash = crypto.calculate_audit_chain_hash("SERVICE_ORDER_CLOSED", payload.technician_id, f"Order {order.id} on {battery.id}", ts_str, prev_hash)

    db.add(models.AuditEvent(
        event_type="SERVICE_ORDER_CLOSED",
        actor=payload.technician_id,
        details=f"Service order {order.id} closed for battery {battery.id}. SoH: {payload.reported_soh}%, doc: {payload.diagnostic_document_id}",
        timestamp=datetime.datetime.utcnow(),
        prev_hash=prev_hash,
        event_hash=new_audit_hash
    ))

    db.commit()
    db.refresh(order)
    return order
