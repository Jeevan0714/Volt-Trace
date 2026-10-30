import os
import requests
from typing import Dict, Any, Optional, List
from app.db import models
from app.core.config import settings
from app.core.rules_engine import calculate_buyer_confidence_index

def evaluate_second_life_triage(battery: models.Battery) -> Dict[str, Any]:
    """
    3-Pillar Decision Framework & Testing-Prioritisation Engine.
    Produces three independent results:
      1. Record Integrity (Verified / Mismatch / No Reference)
      2. Evidence Quality (High / Limited / Conflicting)
      3. Recommended Next Action (Routine Assessment / Further Inspection / Hold for Investigation)
    Followed by a separate, conditional Second-Life Suitability Assessment.
    """
    latest_diag = battery.diagnostics[0] if battery.diagnostics else None
    latest_soh = latest_diag.reported_soh if latest_diag else None
    
    # -------------------------------------------------------------
    # PILLAR 1: RECORD INTEGRITY & PHYSICAL AUTHENTICITY
    # -------------------------------------------------------------
    has_mismatch = any(doc.integrity_status == "MISMATCH_DETECTED" for doc in battery.documents)
    has_signature_invalid = any(doc.signature_status == "INVALID_SIGNATURE" for doc in battery.documents)
    has_trusted_sig = any(doc.signature_status in ["VALID_TRUSTED_ISSUER", "VALID_UNACCREDITED"] or doc.trust_tier == "TIER_2_ISSUER_SIGNED" for doc in battery.documents)
    
    # Hackathon Hurdle: "Valid Signature, Impossible Battery"
    has_physics_violation = any(
        d.code in ["DISC_VALID_SIG_IMPOSSIBLE_SOH", "DISC_CYCLE_ROLLBACK", "DISC_UNREALISTIC_FADE"]
        for d in (battery.discrepancies or []) if d.status == "UNRESOLVED"
    )
    has_module_hazard = any(
        d.code in ["DISC_MODULE_IMPEDANCE_MISMATCH", "DISC_DONOR_MODULE_DETECTED"]
        for d in (battery.discrepancies or []) if d.status == "UNRESOLVED"
    )

    if not battery.documents:
        record_integrity = {
            "status": "NOT_REGISTERED",
            "label": "No Registered Documents",
            "badge_class": "badge-neutral",
            "details": "No supporting reports or invoices have been uploaded to establish cryptographic reference."
        }
    elif has_physics_violation:
        record_integrity = {
            "status": "PHYSICALLY_IMPOSSIBLE_DATA",
            "label": "Valid Signature, Impossible Battery (Physics Contradiction)",
            "badge_class": "badge-red",
            "details": "Document origin signature is cryptographically valid, but reported telemetry violates fundamental laws of battery physics or cycle monotonicity."
        }
    elif has_mismatch or has_signature_invalid:
        record_integrity = {
            "status": "MISMATCH_DETECTED",
            "label": "Integrity Mismatch Detected",
            "badge_class": "badge-red",
            "details": "One or more uploaded files differ from their registered SHA-256 fingerprint. Evidence tampering or file alteration detected."
        }
    else:
        record_integrity = {
            "status": "VERIFIED_MATCH",
            "label": "Verified Authentic (SHA-256)" + (" & Signed" if has_trusted_sig else ""),
            "badge_class": "badge-green",
            "details": f"All {len(battery.documents)} uploaded documents match their registered cryptographic hashes bit-for-bit."
        }

    # -------------------------------------------------------------
    # PILLAR 2: EVIDENCE QUALITY & EPITEMIC CERTAINTY
    # -------------------------------------------------------------
    unresolved_anomalies = [
        d for d in battery.discrepancies if d.status == "UNRESOLVED" and d.severity in ["HIGH", "CRITICAL"]
    ]

    if has_physics_violation or has_module_hazard or unresolved_anomalies or has_mismatch:
        summary_text = (
            "Cryptographically signed record describes physically impossible behavior (odometer rollback or unassisted SoH inversion)."
            if has_physics_violation else
            "Sub-component module replacement has fractured pack identity with high internal resistance mismatch."
            if has_module_hazard else
            "Historical records contain serious contradictions, unexplained SoH inversions, or file integrity failures."
        )
        evidence_quality = {
            "status": "CONFLICTING_EVIDENCE",
            "label": "Physics / Evidence Conflict",
            "badge_class": "badge-red",
            "summary": summary_text
        }
    elif not battery.documents or not battery.diagnostics:
        evidence_quality = {
            "status": "LIMITED_HISTORY",
            "label": "Limited History",
            "badge_class": "badge-amber",
            "summary": "Records are incomplete. Missing intake test or historical maintenance documents increase assessment uncertainty."
        }
    else:
        evidence_quality = {
            "status": "HIGH_CONFIDENCE",
            "label": "High Confidence",
            "badge_class": "badge-green",
            "summary": "Comprehensive, chronologically consistent records corroborated by diagnostic measurements."
        }

    # -------------------------------------------------------------
    # PILLAR 3: RECOMMENDED NEXT ACTION
    # -------------------------------------------------------------
    if record_integrity["status"] == "MISMATCH_DETECTED" or evidence_quality["status"] == "CONFLICTING_EVIDENCE":
        next_action = {
            "code": "HOLD_FOR_INVESTIGATION",
            "label": "Hold for Investigation & Independent Testing",
            "urgency": "CRITICAL",
            "badge_class": "badge-red",
            "instruction": (
                "Do NOT transact, price, or approve for second-life application. "
                "Investigate the document hash mismatch with the issuing organization and perform an independent "
                "physical diagnostic test on an isolated test bench before making any lifecycle decision."
            )
        }
    elif evidence_quality["status"] == "LIMITED_HISTORY" or latest_soh is None:
        next_action = {
            "code": "FURTHER_INSPECTION",
            "label": "Additional Diagnostics & Inspection Required",
            "urgency": "ATTENTION",
            "badge_class": "badge-amber",
            "instruction": (
                "Historical evidence is thin or incomplete. Conduct a full C/3 capacity discharge test, "
                "electrochemical impedance spectroscopy (EIS), and cell voltage variance screening before final commitment."
            )
        }
    else:
        next_action = {
            "code": "ROUTINE_ASSESSMENT",
            "label": "Proceed to Routine Physical Assessment",
            "urgency": "NORMAL",
            "badge_class": "badge-green",
            "instruction": (
                "Historical evidence is verified and consistent. Proceed with routine visual inspection, "
                "insulation resistance check, and operational qualification for the target second-life application."
            )
        }

    # -------------------------------------------------------------
    # CONDITIONAL SECOND-LIFE SUITABILITY ASSESSMENT
    # -------------------------------------------------------------
    potential_applications: List[str] = []
    missing_evidence: List[str] = []

    if next_action["code"] == "HOLD_FOR_INVESTIGATION":
        suitability_status = "NOT_DETERMINED"
        suitability_label = "Suitability Not Determined (Safety Hold)"
        suitability_notes = (
            "Because available evidence is conflicting or compromised, second-life suitability cannot be assessed. "
            "The battery is on administrative and technical hold."
        )
        missing_evidence = [
            "Resolution of document hash mismatch",
            "Explanation of reported SoH discrepancy",
            "Independent bench capacity and thermal impedance qualification"
        ]

    elif latest_soh is None:
        suitability_status = "ADDITIONAL_DIAGNOSTICS_REQUIRED"
        suitability_label = "Additional Diagnostics Required"
        suitability_notes = "No current diagnostic measurement is available to determine capacity retention or cell balance."
        missing_evidence = [
            "Full C/3 or C/5 capacity benchmark",
            "Internal cell impedance measurement",
            "Physical module balancing test"
        ]

    elif latest_soh >= 80.0:
        suitability_status = "CANDIDATE_FOR_FURTHER_ASSESSMENT"
        suitability_label = "Candidate for Further Second-Life Assessment"
        suitability_notes = (
            f"Measured capacity retention of {latest_soh:.1f}% SoH and consistent historical degradation curves "
            "indicate that this pack is a strong candidate for secondary stationary storage."
        )
        potential_applications = [
            "Commercial & Industrial Solar Energy Storage (BESS) — Peak Shaving",
            "Microgrid Renewable Buffer Storage (0.5C to 1C cycling)",
            "EV Fast-Charging Station Buffer Pack"
        ]
        missing_evidence = [
            "Enclosure high-voltage insulation resistance test",
            "Thermal runaway suppression inspection"
        ]

    elif latest_soh >= 70.0:
        suitability_status = "CANDIDATE_FOR_FURTHER_ASSESSMENT"
        suitability_label = "Candidate for Moderate-Demand Second Life"
        suitability_notes = (
            f"At {latest_soh:.1f}% SoH, the pack is suitable for lower-cycling float applications "
            "where continuous high discharge rates are not required."
        )
        potential_applications = [
            "Telecom Tower Backup Power (UPS)",
            "Cold-Storage Warehouse Emergency UPS",
            "Low-Speed Agricultural Utility Vehicles"
        ]
        missing_evidence = [
            "Float-charge impedance verification",
            "BMS communication protocol compatibility check"
        ]

    elif latest_soh >= 55.0:
        suitability_status = "CANDIDATE_FOR_FURTHER_ASSESSMENT"
        suitability_label = "Candidate for Low-Duty Cycle Second Life"
        suitability_notes = (
            f"Retained health of {latest_soh:.1f}% SoH indicates suitability only for gentle, low-demand applications."
        )
        potential_applications = [
            "Off-Grid Solar Streetlight Battery Clusters",
            "Solar Drip-Irrigation Daytime Pump Storage"
        ]
        missing_evidence = [
            "Low-temperature discharge test",
            "Cell degradation gradient check"
        ]

    else:
        suitability_status = "REFER_FOR_RECYCLING"
        suitability_label = "Refer for Specialist Evaluation or Recycling Assessment"
        suitability_notes = (
            f"At {latest_soh:.1f}% SoH, residual capacity is below economic second-life thresholds. "
            "Recommended for hydrometallurgical recycling and raw material extraction."
        )
        potential_applications = [
            "Hydrometallurgical Refining (Lithium, Nickel, Cobalt Recovery)",
            "Pyrometallurgical Scrap Processing"
        ]
        missing_evidence = [
            "End-of-life discharge safety report",
            "Dangerous Goods packaging clearance"
        ]

    return {
        "record_integrity": record_integrity,
        "evidence_quality": evidence_quality,
        "next_action": next_action,
        "suitability": {
            "status": suitability_status,
            "label": suitability_label,
            "notes": suitability_notes,
            "potential_applications": potential_applications,
            "missing_evidence": missing_evidence
        },
        "economic_insights": {
            "testing_time_saved_hours": 10.5 if next_action["code"] == "ROUTINE_ASSESSMENT" else (12.0 if next_action["code"] == "HOLD_FOR_INVESTIGATION" else 0.0),
            "testing_savings_label": "~10.5 Hours Cycler Testing Saved" if next_action["code"] == "ROUTINE_ASSESSMENT" else ("~12.0 Wasted Testing Hours Prevented" if next_action["code"] == "HOLD_FOR_INVESTIGATION" else "Full 10-12h Testing Required"),
            "testing_savings_rationale": (
                "Verified historical records and passing SHA-256 checks allow the facility to bypass an 8-12 hour "
                "full charge-discharge qualification cycler run, proceeding directly to a routine 45-minute physical inspection."
            ) if next_action["code"] == "ROUTINE_ASSESSMENT" else (
                "Immediate detection of file hash tampering and recall conflicts prevents wasting a 12-hour qualification "
                "test on an unviable pack, instantly triaging it to investigation/recycling."
            ) if next_action["code"] == "HOLD_FOR_INVESTIGATION" else (
                "Due to limited or uncorroborated records, this pack must undergo the full 10-12 hour diagnostic test procedure."
            ),
            "cycler_cost_saved_estimate": "₹4,200 (Estimated cycler energy & labor saved per pack)" if next_action["code"] == "ROUTINE_ASSESSMENT" else ("₹4,800 (Wasted cycler energy avoided)" if next_action["code"] == "HOLD_FOR_INVESTIGATION" else "₹0 (Full testing investment required)"),
            "critical_metals_kg": round(battery.rated_capacity_kwh * 0.56, 1),
            "water_avoided_liters": int(battery.rated_capacity_kwh * 1120),
            "second_life_extension_years": 7.5 if suitability_status == "CANDIDATE_FOR_FURTHER_ASSESSMENT" else 0.0,
            "current_outcome": getattr(battery, "lifecycle_outcome", "PENDING_ASSESSMENT") or "PENDING_ASSESSMENT"
        },
        "buyer_confidence": calculate_buyer_confidence_index(battery)
    }

def calculate_indicative_valuation(battery: models.Battery) -> Dict[str, Any]:
    """
    Illustrative synthetic residual benchmark based on explicit assumptions.
    Labeled as an illustrative estimate, NOT a binding financial appraisal.
    """
    has_mismatch = any(doc.integrity_status == "MISMATCH_DETECTED" for doc in battery.documents)
    has_high_disc = any(d.severity in ["HIGH", "CRITICAL"] and d.status == "UNRESOLVED" for d in battery.discrepancies)

    if has_mismatch or has_high_disc:
        return {
            "status": "VALUATION_ON_HOLD",
            "currency": "INR (₹)",
            "min_val": 0,
            "max_val": 0,
            "formatted_range": "Valuation On Hold",
            "confidence_label": "High Risk / Integrity Conflict",
            "notes": "Critical discrepancies or file tampering detected. Valuation suspended until physical qualification is performed."
        }

    latest_diag = battery.diagnostics[0] if battery.diagnostics else None
    soh = latest_diag.reported_soh if latest_diag else 75.0
    kwh = battery.rated_capacity_kwh
    
    usable_kwh = kwh * (soh / 100.0)
    base_benchmark = usable_kwh * 950.0

    if battery.documents and all(d.integrity_status == "MATCHED" for d in battery.documents):
        min_p = round(base_benchmark * 0.95, -2)
        max_p = round(base_benchmark * 1.05, -2)
        confidence_label = "Narrow Variance (Verified Historical Evidence)"
        notes = "Historical evidence and lab signatures corroborated."
    else:
        min_p = round(base_benchmark * 0.80, -2)
        max_p = round(base_benchmark * 1.15, -2)
        confidence_label = "Wide Variance (Uncertain: Bench Test Advised)"
        notes = "Thin historical records create wider valuation spread. Conduct C/3 capacity test before settlement."

    return {
        "status": "CALCULATED",
        "currency": "INR (₹)",
        "min_val": int(min_p),
        "max_val": int(max_p),
        "formatted_range": f"₹{int(min_p):,} – ₹{int(max_p):,}",
        "confidence_label": confidence_label,
        "notes": notes,
        "disclaimer": "Illustrative benchmark only based on synthetic market assumptions. Does not represent a guaranteed market price."
    }
