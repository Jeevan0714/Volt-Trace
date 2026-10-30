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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    events = relationship("BatteryEvent", back_populates="battery", cascade="all, delete-orphan", order_by="BatteryEvent.timestamp")
    documents = relationship("Document", back_populates="battery", cascade="all, delete-orphan", order_by="Document.uploaded_at.desc()")
    diagnostics = relationship("DiagnosticReport", back_populates="battery", cascade="all, delete-orphan", order_by="DiagnosticReport.test_date.desc()")
    discrepancies = relationship("Discrepancy", back_populates="battery", cascade="all, delete-orphan")

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
