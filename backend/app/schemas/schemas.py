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

# --- Battery Module Lineage Schemas ---
class BatteryModuleResponse(BaseModel):
    id: int
    battery_id: str
    module_index: int
    serial_number: str
    cell_chemistry: str
    nominal_voltage: float
    soh_percent: float
    internal_resistance_mohm: float
    cycle_count: int
    is_replaced: bool
    replacement_origin: str
    donor_battery_id: Optional[str] = None
    donor_notes: Optional[str] = None
    status: str
    module_hash: Optional[str] = None

    class Config:
        from_attributes = True

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
    completeness_status: str
    integrity_status: str
    integrity_label: str
    unresolved_issues_count: int
    evidence_score: int
    evidence_quality_label: str
    next_action_label: str
    next_action_code: str
    suitability_label: str
    lifecycle_outcome: Optional[str] = "PENDING_ASSESSMENT"
    has_physics_violation: Optional[bool] = False
    has_module_replacement: Optional[bool] = False
    buyer_confidence_score: Optional[int] = None

# --- Service Work Order Schemas ---
class ServiceWorkOrderResponse(BaseModel):
    id: str
    battery_id: str
    service_center: str
    technician_id: str
    description: str
    status: str
    reported_soh: Optional[float] = None
    measured_capacity_kwh: Optional[float] = None
    cell_variance_mv: Optional[float] = None
    diagnostic_document_id: Optional[str] = None
    action_taken: Optional[str] = None
    notes: Optional[str] = None
    opened_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class ServiceWorkOrderCreate(BaseModel):
    technician_id: str = Field(..., example="TECH-409")
    service_center: str = Field(..., example="Zypp Mobility Central Hub Bangalore")
    description: str = Field(..., example="50,000 km Scheduled Service & Impedance Balance")

class ServiceWorkOrderComplete(BaseModel):
    technician_id: str = Field(..., example="TECH-409")
    reported_soh: float = Field(..., example=82.5)
    measured_capacity_kwh: float = Field(..., example=61.8)
    cell_variance_mv: float = Field(..., example=12.0)
    diagnostic_document_id: Optional[str] = Field(None, example="doc_vt1001_tuv")
    action_taken: str = Field(..., example="Inspected contactors, balanced module #4, verified BMS calibration.")
    notes: Optional[str] = Field(None, example="Passes routine maintenance criteria.")

class LifecycleOutcomeUpdate(BaseModel):
    outcome: str = Field(..., example="SECOND_LIFE_DEPLOYED")  # PENDING_ASSESSMENT, SECOND_LIFE_DEPLOYED, RECYCLING_PROCESSED, QUARANTINE_HOLD
    actor: str = Field(..., example="Lead Assessor Roy")
    notes: Optional[str] = Field(None, example="Deployed in C&I 150kWh solar storage buffer.")

# --- Role-Based Mobile Intake Schema ---
class RoleIntakeSubmission(BaseModel):
    role: str = Field(..., example="SELLER")  # MANUFACTURER, ASSEMBLER, SELLER, RECYCLER
    actor_name: str = Field(..., example="Technician Sharma")
    organization: str = Field(..., example="Apex EV Services Hub #3")
    
    # Operational & diagnostic metrics
    reported_soh: Optional[float] = None
    measured_capacity_kwh: Optional[float] = None
    internal_resistance_mohm: Optional[float] = None
    cell_variance_mv: Optional[float] = None
    action_type: Optional[str] = None
    odometer_km: Optional[int] = None
    vehicle_info: Optional[str] = None
    ambient_temp_c: Optional[float] = 25.0
    
    # Manufacturer-specific inputs
    factory_serial_number: Optional[str] = None
    cell_lot_id: Optional[str] = None
    chemistry: Optional[str] = None
    rated_capacity_kwh: Optional[float] = None
    nominal_voltage: Optional[float] = None
    cell_manufacturer: Optional[str] = None
    plant_location: Optional[str] = None

    # Assembler / Module replacement inputs
    module_replaced: Optional[bool] = False
    new_module_serial: Optional[str] = None
    cells_replaced_count: Optional[int] = None
    oem_compatibility_cert: Optional[str] = None

    # Seller & Transfer inputs
    decommission_reason: Optional[str] = None
    accident_or_thermal_history: Optional[bool] = False
    submersion_history: Optional[bool] = False
    physical_damage_detected: Optional[bool] = False

    # Recycler triage & visual check
    swelling_detected: Optional[bool] = False
    corrosion_detected: Optional[bool] = False
    leak_detected: Optional[bool] = False
    disposition: Optional[str] = None  # SECOND_LIFE_BESS, REPAIR_REQUIRED, RECYCLING_PROCESSED

    # Document attachment (base64 or precomputed hash)
    file_name: Optional[str] = None
    file_base64: Optional[str] = None
    file_hash_sha256: Optional[str] = None

    notes: Optional[str] = None

class RoleIntakeResponse(BaseModel):
    status: str
    battery_id: str
    role: str
    event_title: str
    actor_name: str
    organization: str
    audit_hash: str
    prev_audit_hash: Optional[str] = None
    discrepancy_flagged: bool
    anti_fraud_alert: Optional[str] = None
    file_hash_sha256: Optional[str] = None
    file_name: Optional[str] = None
    passport_status: str  # "UP_TO_DATE", "FLAGGED_INSPECTION_REQUIRED", "QUARANTINED"
    summary: str
    timestamp: datetime.datetime

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
    lifecycle_outcome: Optional[str] = "PENDING_ASSESSMENT"
    pack_composite_merkle_root: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    events: List[BatteryEventResponse]
    documents: List[DocumentResponse]
    diagnostics: List[DiagnosticResponse]
    discrepancies: List[DiscrepancyResponse]
    service_orders: List[ServiceWorkOrderResponse] = []
    modules: List[BatteryModuleResponse] = []
    evidence_quality: Dict[str, Any]
    recall_check: Dict[str, Any]
    triage: Dict[str, Any]  # Contains record_integrity, evidence_quality, next_action, suitability, economic_insights, and buyer_confidence
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
