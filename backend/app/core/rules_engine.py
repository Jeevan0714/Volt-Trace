import json
from datetime import datetime
from typing import List, Dict, Any
from app.db import models

def analyze_battery_consistency(battery: models.Battery) -> List[Dict[str, Any]]:
    """
    Run rules-based consistency checks across battery events, documents, and diagnostics.
    Returns list of discovered discrepancies.
    """
    discovered: List[Dict[str, Any]] = []

    # 1. Document Integrity Failures
    for doc in battery.documents:
        if doc.integrity_status == "MISMATCH_DETECTED":
            discovered.append({
                "code": "DISC_HASH_MISMATCH",
                "title": f"Document Integrity Failure ({doc.file_name})",
                "severity": "HIGH",
                "description": f"Uploaded document '{doc.file_name}' does not match its registered SHA-256 fingerprint ({doc.file_hash_sha256[:12]}...). Potential document tampering or file corruption detected."
            })
        if doc.signature_status == "INVALID_SIGNATURE":
            discovered.append({
                "code": "DISC_INVALID_SIG",
                "title": f"Digital Signature Invalid ({doc.file_name})",
                "severity": "HIGH",
                "description": f"Cryptographic Ed25519 signature verification failed for '{doc.file_name}'. The document may have been altered after signing."
            })

    # 2. Check for "Magic Rejuvenation" (SoH Jump without Module Replacement)
    # Collect all reported SoH points sorted chronologically
    soh_records = []
    for diag in battery.diagnostics:
        soh_records.append({
            "date": diag.test_date,
            "soh": diag.reported_soh,
            "source": diag.source_label
        })

    # Check extracted data from documents too
    has_module_replacement = any(
        doc.document_type == "MODULE_REPLACEMENT" for doc in battery.documents
    ) or any(
        evt.event_type == "MODULE_REPLACEMENT" for evt in battery.events
    )

    # Sort chronological
    soh_records.sort(key=lambda x: x["date"])

    for i in range(1, len(soh_records)):
        prev = soh_records[i - 1]
        curr = soh_records[i]
        diff = curr["soh"] - prev["soh"]
        
        # If SoH increased by more than 4% without recorded module replacement
        if diff > 4.0 and not has_module_replacement:
            discovered.append({
                "code": "DISC_SOH_JUMP",
                "title": f"Suspicious SoH Inversion (+{diff:.1f}%)",
                "severity": "HIGH",
                "description": (
                    f"Reported State of Health jumped from {prev['soh']:.1f}% on "
                    f"{prev['date'].strftime('%Y-%m-%d')} to {curr['soh']:.1f}% on "
                    f"{curr['date'].strftime('%Y-%m-%d')} without any recorded module or cell replacement invoice. "
                    "Physical battery health does not increase naturally over time."
                )
            })

    # 3. Capacity Drift / Impossible Measurement
    for diag in battery.diagnostics:
        if diag.measured_capacity_kwh > (battery.rated_capacity_kwh * 1.08):
            discovered.append({
                "code": "DISC_CAPACITY_EXCEEDED",
                "title": "Measured Capacity Exceeds Nameplate Rating",
                "severity": "MEDIUM",
                "description": (
                    f"Measured capacity of {diag.measured_capacity_kwh:.1f} kWh exceeds rated "
                    f"nameplate capacity of {battery.rated_capacity_kwh:.1f} kWh by more than 8%. "
                    "Possible calibration or test procedure error."
                )
            })

    # 4. Check for Chronological Inconsistency
    try:
        mfg_dt = datetime.strptime(battery.mfg_date, "%Y-%m-%d")
        for diag in battery.diagnostics:
            if diag.test_date < mfg_dt:
                discovered.append({
                    "code": "DISC_TIMELINE_ANOMALY",
                    "title": "Diagnostic Predates Manufacturing Date",
                    "severity": "HIGH",
                    "description": f"Test date {diag.test_date.strftime('%Y-%m-%d')} is earlier than battery manufacturing date {battery.mfg_date}."
                })
    except ValueError:
        pass

    return discovered

def calculate_evidence_quality_score(battery: models.Battery) -> Dict[str, Any]:
    """
    Computes transparent Evidence Quality Index based on explicit, deterministic rules.
    Does NOT calculate battery safety or physical health.
    """
    score = 40  # Base registration score

    breakdown = []
    
    # 1. Identity completeness (+15)
    if battery.manufacturer and battery.chemistry and battery.mfg_date and battery.rated_capacity_kwh:
        score += 15
        breakdown.append({"item": "Complete OEM Identification & Nameplate Specs", "points": "+15"})

    # 2. Document upload & integrity (+15)
    if battery.documents:
        all_matched = all(doc.integrity_status == "MATCHED" for doc in battery.documents)
        if all_matched:
            score += 15
            breakdown.append({"item": f"All {len(battery.documents)} Uploaded Documents Passed SHA-256 Check", "points": "+15"})
        else:
            score -= 35
            breakdown.append({"item": "Document Hash Mismatch Detected", "points": "-35"})

    # 3. Digital Signatures (+15)
    trusted_signed_docs = [
        doc for doc in battery.documents if doc.signature_status == "VALID_TRUSTED_ISSUER"
    ]
    if trusted_signed_docs:
        score += 15
        breakdown.append({"item": f"{len(trusted_signed_docs)} Document(s) Cryptographically Signed by Accredited Body", "points": "+15"})

    # 4. Independent / Intake Diagnostic (+15)
    if battery.diagnostics:
        score += 15
        breakdown.append({"item": "Intake Diagnostic Test Recorded", "points": "+15"})
    else:
        breakdown.append({"item": "No Intake Diagnostic Test Available", "points": "0 (Needs Verification)"})

    # 5. Penalties for active discrepancies
    high_discrepancies = [d for d in battery.discrepancies if d.severity == "HIGH" and d.status == "UNRESOLVED"]
    medium_discrepancies = [d for d in battery.discrepancies if d.severity == "MEDIUM" and d.status == "UNRESOLVED"]

    if high_discrepancies:
        penalty = min(40, len(high_discrepancies) * 25)
        score -= penalty
        breakdown.append({"item": f"{len(high_discrepancies)} High-Severity Discrepancies Unresolved", "points": f"-{penalty}"})

    if medium_discrepancies:
        penalty = min(20, len(medium_discrepancies) * 10)
        score -= penalty
        breakdown.append({"item": f"{len(medium_discrepancies)} Medium-Severity Discrepancies", "points": f"-{penalty}"})

    final_score = max(10, min(100, score))

    if final_score >= 80:
        level = "HIGH_CONFIDENCE"
        summary = "Comprehensive, verified documentation with passing cryptographic checks and zero unresolved conflicts."
    elif final_score >= 50:
        level = "MODERATE_CONFIDENCE"
        summary = "Standard evidence available; physical diagnostic recommended before commercial second-life commitment."
    else:
        level = "LOW_CONFIDENCE"
        summary = "Significant information gaps, unresolved conflicts, or file integrity failures detected. Mandatory lab inspection required."

    return {
        "score": final_score,
        "level": level,
        "summary": summary,
        "breakdown": breakdown,
        "disclaimer": "The Evidence Quality Index measures documentation completeness and verifiability only. It is NOT a physical battery safety score or warranty guarantee."
    }
