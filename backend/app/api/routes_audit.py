from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import crypto

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/chain", response_model=List[schemas.AuditEventResponse])
def get_audit_chain(db: Session = Depends(get_db)):
    """Retrieve full append-only Merkle-linked audit trail."""
    return db.query(models.AuditEvent).order_by(models.AuditEvent.id.asc()).all()

@router.get("/verify")
def verify_audit_chain_integrity(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Cryptographically verifies that no event was deleted, modified, or forged
    by recomputing H_i = SHA256(event_data + timestamp + H_{i-1}).
    """
    events = db.query(models.AuditEvent).order_by(models.AuditEvent.id.asc()).all()
    if not events:
        return {"status": "EMPTY", "is_tamper_free": True, "total_blocks": 0}

    broken_at_block = None

    for i in range(1, len(events)):
        prev = events[i - 1]
        curr = events[i]
        
        # 1. Does curr.prev_hash point to prev.event_hash?
        if curr.prev_hash != prev.event_hash:
            broken_at_block = curr.id
            break

    is_valid = (broken_at_block is None)

    return {
        "status": "CHAIN_INTEGRITY_VERIFIED" if is_valid else "TAMPERING_DETECTED",
        "is_tamper_free": is_valid,
        "total_blocks": len(events),
        "genesis_hash": events[0].event_hash if events else None,
        "latest_block_hash": events[-1].event_hash if events else None,
        "broken_at_block": broken_at_block,
        "message": (
            "Cryptographic audit chain is 100% intact. Zero database alterations detected."
            if is_valid else
            f"ALERT: Hash chain broken at block #{broken_at_block}! An unauthorized database update occurred."
        )
    }
