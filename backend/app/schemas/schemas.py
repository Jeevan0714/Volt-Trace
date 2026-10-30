import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# --- Document Schemas ---
class DocumentBase(BaseModel):
    document_type: str
    issuer_name: str

class DocumentResponse(BaseModel):
    id: str
    battery_id: str
    file_name: str
    file_size_bytes: int
    file_hash_sha256: str
    document_type: str
    issuer_name: str
    issuer_public_key: Optional[str] = None
    signature_status: str
    trust_tier: str
    integrity_status: str
    uploaded_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Diagnostic Schemas ---
class DiagnosticCreate(BaseModel):
    test_date: Optional[datetime.datetime] = None
    testing_org: str
    measured_capacity_kwh: float
    reported_soh: float
    nominal_voltage: Optional[float] = None
    internal_resistance_mohm: Optional[float] = None
    ambient_temp_c: Optional[float] = 25.0
    cycle_count: Optional[int] = None
    test_method: Optional[str] = "Coulomb Counting C/3 + EIS"
    source_label: str = "INDEPENDENT_TEST"  # INDEPENDENT_TEST, HISTORICAL_REPORT, SELLER_REPORTED
    fault_codes: Optional[str] = "NONE"
    notes: Optional[str] = None

class DiagnosticResponse(BaseModel):
    id: int
    battery_id: str
    test_date: datetime.datetime
    testing_org: str
    measured_capacity_kwh: float
    reported_soh: float
    nominal_voltage: Optional[float]
    internal_resistance_mohm: Optional[float]
    ambient_temp_c: Optional[float]
    cycle_count: Optional[int]
    test_method: str
    source_label: str
    fault_codes: str
    notes: Optional[str]

    class Config:
        from_attributes = True

# --- Discrepancy Schemas ---
class DiscrepancyResponse(BaseModel):
    id: int
    battery_id: str
    code: str
    title: str
    severity: str
    description: str
    status: str
    detected_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Battery Event Schemas ---
class BatteryEventResponse(BaseModel):
    id: int
    battery_id: str
    event_type: str
    title: str
    description: Optional[str]
    submitting_org: str
    actor: str
    verification_status: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# --- Battery Registration & List Schemas ---
class BatteryCreate(BaseModel):
    id: str = Field(..., example="VT-1003")
    manufacturer: str = Field(..., example="Tata AutoComp")
    model: str = Field(..., example="Pack-50-LFP")
    chemistry: str = Field(..., example="LFP")
    rated_capacity_kwh: float = Field(..., example=50.0)
    nominal_voltage: float = Field(..., example=320.0)
    mfg_date: str = Field(..., example="2024-01-15")
    vehicle_info: Optional[str] = Field(None, example="BluSmart Fleet #89")
    current_owner: str = Field(..., example="BluSmart Mobility Ltd")

class BatteryListItem(BaseModel):
    id: str
    manufacturer: str
    model: str
    chemistry: str
    rated_capacity_kwh: float
    nominal_voltage: float
    mfg_date: str
    current_owner: str
    status: str
    latest_soh: Optional[float] = None
    latest_soh_source: Optional[str] = None
    latest_soh_date: Optional[str] = None
    completeness_status: str  # Complete, Incomplete
    integrity_status: str     # Matched, Mismatch Detected, Pending
    unresolved_issues_count: int
    evidence_score: int
    triage_category: str

class BatteryDetail(BaseModel):
    id: str
    uuid: str
    manufacturer: str
    model: str
    chemistry: str
    rated_capacity_kwh: float
    nominal_voltage: float
    mfg_date: str
    vehicle_info: Optional[str]
    current_owner: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    events: List[BatteryEventResponse]
    documents: List[DocumentResponse]
    diagnostics: List[DiagnosticResponse]
    discrepancies: List[DiscrepancyResponse]
    evidence_quality: Dict[str, Any]
    recall_check: Dict[str, Any]
    triage: Dict[str, Any]
    valuation: Dict[str, Any]

# --- Audit Event ---
class AuditEventResponse(BaseModel):
    id: int
    event_type: str
    actor: str
    details: str
    timestamp: datetime.datetime
    prev_hash: str
    event_hash: str

    class Config:
        from_attributes = True

# --- Summary Statistics ---
class DashboardStats(BaseModel):
    total_batteries: int
    complete_records_count: int
    pending_verification_count: int
    unresolved_discrepancies_count: int
    average_evidence_score: float
    active_recalls_count: int
    recent_activity: List[BatteryEventResponse]
