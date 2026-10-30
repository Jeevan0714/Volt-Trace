import os
import uuid
import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import crypto, rules_engine
from app.core.config import settings

router = APIRouter(prefix="/batteries/{battery_id}/documents", tags=["Documents"])

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    battery_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(..., description="BIRTH_CERTIFICATE, DIAGNOSTIC_REPORT, SERVICE_INVOICE, MODULE_REPLACEMENT"),
    issuer_name: str = Form(..., description="Name of submitting organisation or lab"),
    digital_signature: str = Form(None, description="Optional hex-encoded Ed25519 digital signature"),
    issuer_public_key: str = Form(None, description="Optional hex-encoded Ed25519 public key"),
    db: Session = Depends(get_db)
):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    # 1. Enforce size limit
    battery_storage = settings.DOCUMENT_STORAGE_DIR / battery_id
    battery_storage.mkdir(parents=True, exist_ok=True)

    # 2. Save temporary upload and compute streaming SHA-256
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 15 MB limit.")

    file_hash = crypto.calculate_bytes_sha256(file_bytes)
    
    # Content-Addressable Storage file path
    safe_filename = f"{file_hash[:16]}_{file.filename}"
    dest_path = battery_storage / safe_filename
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    # 3. Digital Signature Verification (Ed25519)
    signature_status = "NOT_PROVIDED"
    trust_tier = "TIER_1_SELF_REPORTED"

    if digital_signature and issuer_public_key:
        is_valid = crypto.verify_signature(issuer_public_key, digital_signature, file_bytes)
        if is_valid:
            # Check if public key is in trusted authorities keystore
            auth = db.query(models.TrustedAuthority).filter(
                models.TrustedAuthority.public_key == issuer_public_key,
                models.TrustedAuthority.is_active == True
            ).first()
            if auth:
                signature_status = "VALID_TRUSTED_ISSUER"
                trust_tier = "TIER_2_ISSUER_SIGNED"
            else:
                signature_status = "VALID_UNACCREDITED"
                trust_tier = "TIER_1_SELF_REPORTED"
        else:
            signature_status = "INVALID_SIGNATURE"
            trust_tier = "TIER_1_SELF_REPORTED"

    # 4. Save Document Record
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    document = models.Document(
        id=doc_id,
        battery_id=battery_id,
        file_name=file.filename,
        file_path=str(dest_path),
        file_size_bytes=len(file_bytes),
        file_hash_sha256=file_hash,
        document_type=document_type,
        issuer_name=issuer_name,
        issuer_public_key=issuer_public_key,
        digital_signature=digital_signature,
        signature_status=signature_status,
        trust_tier=trust_tier,
        integrity_status="MATCHED",
        uploaded_at=datetime.datetime.utcnow()
    )
    db.add(document)

    # 5. Add Passport Event
    event_status = "VERIFIED" if signature_status == "VALID_TRUSTED_ISSUER" else "INFORMATIONAL"
    db.add(models.BatteryEvent(
        battery_id=battery_id,
        event_type="DOCUMENT_UPLOADED",
        title=f"Document Uploaded: {file.filename}",
        description=f"Type: {document_type} | Issuer: {issuer_name} | SHA-256: {file_hash[:16]}...",
        submitting_org=issuer_name,
        actor="Submitting Agent",
        verification_status=event_status,
        timestamp=datetime.datetime.utcnow()
    ))

    # 6. Append to Merkle Audit Trail
    last_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id.desc()).first()
    prev_hash = last_audit.event_hash if last_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    ts_str = datetime.datetime.utcnow().isoformat()
    audit_hash = crypto.calculate_audit_chain_hash("DOCUMENT_UPLOAD", issuer_name, f"Uploaded {file.filename} (Hash: {file_hash[:16]})", ts_str, prev_hash)

    db.add(models.AuditEvent(
        event_type="DOCUMENT_UPLOAD",
        actor=issuer_name,
        details=f"Uploaded {file.filename} for battery {battery_id} (SHA-256: {file_hash[:16]}...)",
        timestamp=datetime.datetime.utcnow(),
        prev_hash=prev_hash,
        event_hash=audit_hash
    ))

    db.commit()
    db.refresh(document)
    return document

@router.post("/{doc_id}/verify")
def verify_document_integrity(
    battery_id: str,
    doc_id: str,
    simulate_tamper: bool = Query(False, description="Interactive demo toggle: simulates recalculating hash against an altered file"),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.battery_id == battery_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Underlying document binary file not found on disk.")

    # Calculate current file hash
    current_hash = crypto.calculate_sha256(file_path)

    if simulate_tamper:
        # Simulate tampering by flipping a mock byte in the hash string
        current_hash = current_hash[:-4] + "dead"

    is_matched = (current_hash == doc.file_hash_sha256)
    new_status = "MATCHED" if is_matched else "MISMATCH_DETECTED"
    doc.integrity_status = new_status
    db.commit()

    # If mismatch detected, trigger discrepancy
    if not is_matched:
        disc = models.Discrepancy(
            battery_id=battery_id,
            code="DISC_HASH_MISMATCH",
            title=f"File Integrity Mismatch ({doc.file_name})",
            severity="HIGH",
            description=f"Recalculated SHA-256 hash ({current_hash[:16]}...) does not match registered certificate hash ({doc.file_hash_sha256[:16]}...). Document has been altered.",
            status="UNRESOLVED"
        )
        db.add(disc)
        db.commit()

    return {
        "document_id": doc.id,
        "file_name": doc.file_name,
        "registered_hash": doc.file_hash_sha256,
        "recalculated_hash": current_hash,
        "integrity_status": new_status,
        "is_valid": is_matched,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "message": "File matches registered cryptographic fingerprint exactly." if is_matched else "CRITICAL: Hash mismatch detected! Document has been altered since registration."
    }

@router.get("/{doc_id}/download")
def download_document(battery_id: str, doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.battery_id == battery_id
    ).first()
    if not doc or not Path(doc.file_path).exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type="application/pdf"
    )
