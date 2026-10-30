import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.db.database import Base

class Battery(Base):
    __tablename__ = "batteries"

    id = Column(String(64), primary_key=True, index=True)  # e.g. "VT-1001", "VT-1002"
    uuid = Column(String(64), unique=True, index=True)
    manufacturer = Column(String(128), nullable=False)
    model = Column(String(128), nullable=False)
    chemistry = Column(String(64), nullable=False)  # "NMC 811", "LFP", "NCA"
    rated_capacity_kwh = Column(Float, nullable=False)
    nominal_voltage = Column(Float, nullable=False)
    mfg_date = Column(String(32), nullable=False)
    vehicle_info = Column(String(256), nullable=True)
    current_owner = Column(String(128), nullable=False)
    status = Column(String(64), default="active")  # active, quarantined, recycled
    lifecycle_outcome = Column(String(64), default="PENDING_ASSESSMENT")  # PENDING_ASSESSMENT, SECOND_LIFE_DEPLOYED, RECYCLING_PROCESSED
    pack_composite_merkle_root = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    events = relationship("BatteryEvent", back_populates="battery", cascade="all, delete-orphan", order_by="BatteryEvent.timestamp.desc()")
    documents = relationship("Document", back_populates="battery", cascade="all, delete-orphan", order_by="Document.uploaded_at.desc()")
    diagnostics = relationship("DiagnosticReport", back_populates="battery", cascade="all, delete-orphan", order_by="DiagnosticReport.test_date.desc()")
    discrepancies = relationship("Discrepancy", back_populates="battery", cascade="all, delete-orphan")
    service_orders = relationship("ServiceWorkOrder", back_populates="battery", cascade="all, delete-orphan", order_by="ServiceWorkOrder.opened_at.desc()")
    modules = relationship("BatteryModule", back_populates="battery", cascade="all, delete-orphan", order_by="BatteryModule.module_index.asc()")

class BatteryEvent(Base):
    __tablename__ = "battery_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    battery_id = Column(String(64), ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)  # REGISTRATION, DIAGNOSTIC_UPLOAD, REPAIR, TRIAGE
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    submitting_org = Column(String(128), nullable=False)
    actor = Column(String(128), nullable=False)
    verification_status = Column(String(64), default="INFORMATIONAL")  # VERIFIED, PENDING, FAILED, INFORMATIONAL
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    battery = relationship("Battery", back_populates="events")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    battery_id = Column(String(64), ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(256), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_hash_sha256 = Column(String(64), nullable=False, index=True)  # Registered reference hash
    document_type = Column(String(64), nullable=False)  # BIRTH_CERTIFICATE, DIAGNOSTIC_REPORT, SERVICE_INVOICE, MODULE_REPLACEMENT
    issuer_name = Column(String(128), nullable=False)
    issuer_public_key = Column(String(128), nullable=True)
    digital_signature = Column(String(256), nullable=True)
    signature_status = Column(String(64), default="NOT_PROVIDED")  # VALID_TRUSTED_ISSUER, VALID_UNACCREDITED, INVALID_SIGNATURE, NOT_PROVIDED
    trust_tier = Column(String(64), default="TIER_1_SELF_REPORTED")  # TIER_1_SELF_REPORTED, TIER_2_ISSUER_SIGNED, TIER_3_CORROBORATED
    integrity_status = Column(String(64), default="MATCHED")  # MATCHED, MISMATCH_DETECTED, PENDING
    extracted_data_json = Column(Text, nullable=True)  # Stored JSON with parsed SoH, capacity, date
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    battery = relationship("Battery", back_populates="documents")

class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    battery_id = Column(String(64), ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    test_date = Column(DateTime, default=datetime.datetime.utcnow)
    testing_org = Column(String(128), nullable=False)
    measured_capacity_kwh = Column(Float, nullable=False)
    reported_soh = Column(Float, nullable=False)
    nominal_voltage = Column(Float, nullable=True)
    internal_resistance_mohm = Column(Float, nullable=True)
    ambient_temp_c = Column(Float, nullable=True, default=25.0)
    cycle_count = Column(Integer, nullable=True)
    test_method = Column(String(128), default="Coulomb Counting C/3 + EIS")
    source_label = Column(String(64), default="USER_ENTERED")  # SELLER_REPORTED, HISTORICAL_REPORT, USER_ENTERED, INDEPENDENT_TEST
    fault_codes = Column(String(256), default="NONE")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    battery = relationship("Battery", back_populates="diagnostics")

class Discrepancy(Base):
    __tablename__ = "discrepancies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    battery_id = Column(String(64), ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(64), nullable=False)  # DISC_SOH_JUMP, DISC_HASH_MISMATCH, DISC_MISSING_DOC, DISC_TIMELINE_ANOMALY
    title = Column(String(128), nullable=False)
    severity = Column(String(32), default="MEDIUM")  # HIGH, MEDIUM, LOW, INFORMATIONAL
    description = Column(Text, nullable=False)
    status = Column(String(32), default="UNRESOLVED")  # UNRESOLVED, RESOLVED, ACKNOWLEDGED
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

    battery = relationship("Battery", back_populates="discrepancies")

class RecallEntry(Base):
    __tablename__ = "recall_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    battery_id_pattern = Column(String(128), nullable=False)  # exact battery ID or model matching
    make = Column(String(64), nullable=False)
    model = Column(String(64), nullable=False)
    recall_code = Column(String(64), nullable=False)
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), default="CRITICAL")  # CRITICAL, MODERATE
    source = Column(String(128), default="NHTSA / MoRTH Technical Bulletin")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class TrustedAuthority(Base):
    __tablename__ = "trusted_authorities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False, unique=True)
    public_key = Column(String(128), nullable=False, unique=True)  # Ed25519 hex
    accreditation_number = Column(String(64), nullable=False)
    is_active = Column(Boolean, default=True)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(64), nullable=False)
    actor = Column(String(128), nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    prev_hash = Column(String(64), nullable=False)
    event_hash = Column(String(64), nullable=False, unique=True)

class ServiceWorkOrder(Base):
    __tablename__ = "service_work_orders"

    id = Column(String(64), primary_key=True, index=True)  # e.g. "WO-2026-0812"
    battery_id = Column(String(64), ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    service_center = Column(String(128), nullable=False)
    technician_id = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="OPEN")  # OPEN, COMPLETED, BLOCKED
    reported_soh = Column(Float, nullable=True)
    measured_capacity_kwh = Column(Float, nullable=True)
    cell_variance_mv = Column(Float, nullable=True)
    diagnostic_document_id = Column(String(64), nullable=True)
    action_taken = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    opened_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    battery = relationship("Battery", back_populates="service_orders")
 
class BatteryModule(Base):
    __tablename__ = "battery_modules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    battery_id = Column(String(64), ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    module_index = Column(Integer, nullable=False)  # e.g. 1 through 8 or 16
    serial_number = Column(String(128), nullable=False)
    cell_chemistry = Column(String(64), default="LFP")
    nominal_voltage = Column(Float, default=40.0)
    soh_percent = Column(Float, nullable=False)
    internal_resistance_mohm = Column(Float, nullable=False)
    cycle_count = Column(Integer, default=0)
    is_replaced = Column(Boolean, default=False)
    replacement_origin = Column(String(64), default="ORIGINAL_OEM")  # ORIGINAL_OEM, NEW_OEM_PART, SALVAGE_DONOR_PACK
    donor_battery_id = Column(String(64), nullable=True)  # e.g. "VT-0941"
    donor_notes = Column(Text, nullable=True)
    status = Column(String(64), default="NOMINAL")  # NOMINAL, IMPEDANCE_MISMATCH_HAZARD, UNVERIFIED_SWAP
    module_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    battery = relationship("Battery", back_populates="modules")
