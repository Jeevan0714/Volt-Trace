import json
from datetime import datetime
from typing import List, Dict, Any
from app.db import models

def analyze_battery_consistency(battery: models.Battery) -> List[Dict[str, Any]]:
    """
    Context-aware rules engine classifying discrepancies into:
      1. HIGH_PRIORITY_ANOMALY (severe mathematical, physical, or cryptographic conflict)
      2. NEEDS_REVIEW (requires explanation or check of measurement conditions)
      3. CONSISTENT (normal variance)
    """
    discovered: List[Dict[str, Any]] = []

    # 1. Cryptographic File Integrity Failures -> HIGH_PRIORITY_ANOMALY
    for doc in battery.documents:
        if doc.integrity_status == "MISMATCH_DETECTED":
            discovered.append({
                "code": "DISC_HASH_MISMATCH",
                "title": f"File Integrity Mismatch ({doc.file_name})",
                "severity": "CRITICAL",
                "description": (
                    f"Uploaded document '{doc.file_name}' does not match its registered SHA-256 fingerprint "
                    f"({doc.file_hash_sha256[:16]}...). Document has been altered after registration."
                )
            })
        if doc.signature_status == "INVALID_SIGNATURE":
            discovered.append({
                "code": "DISC_INVALID_SIG",
                "title": f"Digital Signature Invalid ({doc.file_name})",
                "severity": "HIGH",
                "description": f"Cryptographic Ed25519 signature verification failed for '{doc.file_name}'. Origin cannot be authenticated."
            })

    # 2. Chronological SoH Trajectory Analysis
    soh_records = []
    for diag in battery.diagnostics:
        soh_records.append({
            "date": diag.test_date,
            "soh": diag.reported_soh,
            "capacity": diag.measured_capacity_kwh,
            "method": diag.test_method,
            "temp": diag.ambient_temp_c,
            "source": diag.source_label
        })

    has_module_replacement = any(
        doc.document_type == "MODULE_REPLACEMENT" for doc in battery.documents
    ) or any(
        evt.event_type == "MODULE_REPLACEMENT" for evt in battery.events
    )

    soh_records.sort(key=lambda x: x["date"])

    for i in range(1, len(soh_records)):
        prev = soh_records[i - 1]
        curr = soh_records[i]
        diff = curr["soh"] - prev["soh"]
        
        # High-priority anomaly: large positive jump (>4%) without module replacement
        if diff > 4.0 and not has_module_replacement:
            discovered.append({
                "code": "DISC_SOH_JUMP",
                "title": f"High-Priority Anomaly: Suspicious SoH Inversion (+{diff:.1f}%)",
                "severity": "HIGH",
                "description": (
                    f"Reported State of Health jumped from {prev['soh']:.1f}% ({prev['date'].strftime('%Y-%m-%d')}) "
                    f"to {curr['soh']:.1f}% ({curr['date'].strftime('%Y-%m-%d')}) without a documented module replacement invoice. "
                    "Physical battery capacity does not increase over time without hardware replacement."
                )
            })
        # Needs review: minor positive jump (1.5% to 4%) attributable to temperature or C-rate variance
        elif 1.5 < diff <= 4.0 and not has_module_replacement:
            discovered.append({
                "code": "DISC_SOH_VARIANCE",
                "title": f"Needs Review: Minor SoH Fluctuation (+{diff:.1f}%)",
                "severity": "MEDIUM",
                "description": (
                    f"Minor capacity increase (+{diff:.1f}%) detected between {prev['date'].strftime('%Y-%m-%d')} "
                    f"and {curr['date'].strftime('%Y-%m-%d')}. May reflect differing test temperatures "
                    f"({prev['temp']}°C vs {curr['temp']}°C), battery resting times, or diagnostic method tolerances."
                )
            })

    # 3. Capacity vs Nameplate Rating Check
    for diag in battery.diagnostics:
        if diag.measured_capacity_kwh > (battery.rated_capacity_kwh * 1.08):
            discovered.append({
                "code": "DISC_CAPACITY_EXCEEDED",
                "title": "Needs Review: Measured Capacity Exceeds Nameplate Rating",
                "severity": "MEDIUM",
                "description": (
                    f"Measured capacity of {diag.measured_capacity_kwh:.1f} kWh exceeds rated "
                    f"nameplate capacity of {battery.rated_capacity_kwh:.1f} kWh by more than 8%. "
                    "Confirm cycler calibration and test procedure."
                )
            })

    # 4. Chronological Inconsistency (Test predating manufacturing)
    try:
        mfg_dt = datetime.strptime(battery.mfg_date, "%Y-%m-%d")
        for diag in battery.diagnostics:
            if diag.test_date < mfg_dt:
                discovered.append({
                    "code": "DISC_TIMELINE_ANOMALY",
                    "title": "High-Priority Anomaly: Diagnostic Predates Manufacturing Date",
                    "severity": "CRITICAL",
                    "description": f"Test date {diag.test_date.strftime('%Y-%m-%d')} is earlier than the battery manufacturing date {battery.mfg_date}."
                })
    except ValueError:
        pass

    return discovered

def calculate_evidence_quality_score(battery: models.Battery) -> Dict[str, Any]:
    """
    Calculates Evidence Quality Index (0-100) based on record completeness,
    source corroboration, and unresolved anomalies.
    Does NOT calculate battery safety or physical health.
    """
    score = 40  # Base registration score
    breakdown = []
    
    # 1. Complete identification (+15)
    if battery.manufacturer and battery.chemistry and battery.mfg_date and battery.rated_capacity_kwh:
        score += 15
        breakdown.append({"item": "Complete OEM Identification & Nameplate Specifications", "points": "+15"})

    # 2. Document upload & integrity (+15)
    if battery.documents:
        all_matched = all(doc.integrity_status == "MATCHED" for doc in battery.documents)
        if all_matched:
            score += 15
            breakdown.append({"item": f"All {len(battery.documents)} Supporting Documents Passed SHA-256 Check", "points": "+15"})
        else:
            score -= 35
            breakdown.append({"item": "Document Hash Mismatch Detected", "points": "-35"})
    else:
        breakdown.append({"item": "No Supporting Documents Registered (High Uncertainty)", "points": "0"})

    # 3. Digital Signatures (+15)
    trusted_signed_docs = [
        doc for doc in battery.documents if doc.signature_status == "VALID_TRUSTED_ISSUER"
    ]
    if trusted_signed_docs:
        score += 15
        breakdown.append({"item": f"{len(trusted_signed_docs)} Document(s) Cryptographically Signed by Registered Issuer", "points": "+15"})

    # 4. Independent / Intake Diagnostic (+15)
    if battery.diagnostics:
        score += 15
        breakdown.append({"item": "Current Diagnostic Intake Test Recorded", "points": "+15"})
    else:
        breakdown.append({"item": "Missing Current Diagnostic Test", "points": "0 (Test Required)"})

    # 5. Penalties for active discrepancies
    critical_anomalies = [d for d in battery.discrepancies if d.severity in ["HIGH", "CRITICAL"] and d.status == "UNRESOLVED"]
    medium_reviews = [d for d in battery.discrepancies if d.severity == "MEDIUM" and d.status == "UNRESOLVED"]

    if critical_anomalies:
        penalty = min(40, len(critical_anomalies) * 25)
        score -= penalty
        breakdown.append({"item": f"{len(critical_anomalies)} High-Priority Anomalies Unresolved", "points": f"-{penalty}"})

    if medium_reviews:
        penalty = min(20, len(medium_reviews) * 10)
        score -= penalty
        breakdown.append({"item": f"{len(medium_reviews)} Needs Review Discrepancies", "points": f"-{penalty}"})

    final_score = max(10, min(100, score))

    if final_score >= 80:
        level = "HIGH_CONFIDENCE"
        summary = "Comprehensive, verified documentation with passing cryptographic checks and zero unresolved conflicts."
    elif final_score >= 50:
        level = "LIMITED_HISTORY"
        summary = "Basic evidence available with moderate gaps; physical bench diagnostic recommended before financial settlement."
    else:
        level = "CONFLICTING_EVIDENCE"
        summary = "Critical information gaps, unresolved conflicts, or file integrity failures detected. Mandatory lab inspection required."

    return {
        "score": final_score,
        "level": level,
        "summary": summary,
        "breakdown": breakdown,
        "disclaimer": "The Evidence Quality Index measures documentation completeness and verifiability only. It is NOT a physical battery safety score or warranty guarantee."
    }
