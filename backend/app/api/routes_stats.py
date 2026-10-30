import socket
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.schemas import schemas
from app.core import rules_engine

router = APIRouter(prefix="/stats", tags=["Statistics"])

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@router.get("/network-info")
def get_network_info():
    ip = get_lan_ip()
    return {
        "lan_ip": ip,
        "frontend_port": 5173,
        "network_url": f"http://{ip}:5173",
        "qr_base_url": f"http://{ip}:5173/?id="
    }

@router.get("/summary", response_model=schemas.DashboardStats)
def get_dashboard_summary(db: Session = Depends(get_db)):
    batteries = db.query(models.Battery).all()
    total = len(batteries)

    complete_count = 0
    pending_count = 0
    total_score = 0

    for b in batteries:
        if b.documents and b.diagnostics:
            complete_count += 1
        has_pending = any(doc.integrity_status == "PENDING" for doc in b.documents) or not b.documents
        if has_pending:
            pending_count += 1
        ev = rules_engine.calculate_evidence_quality_score(b)
        total_score += ev["score"]

    avg_score = round(total_score / total, 1) if total > 0 else 0.0

    unresolved_disc = db.query(models.Discrepancy).filter(models.Discrepancy.status == "UNRESOLVED").count()
    recalls_count = db.query(models.RecallEntry).count()

    recent_events = db.query(models.BatteryEvent).order_by(models.BatteryEvent.timestamp.desc()).limit(8).all()

    return schemas.DashboardStats(
        total_batteries=total,
        complete_records_count=complete_count,
        pending_verification_count=pending_count,
        unresolved_discrepancies_count=unresolved_disc,
        average_evidence_score=avg_score,
        active_recalls_count=recalls_count,
        recent_activity=recent_events
    )
