import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.db import models

def analyze_battery_consistency(battery: models.Battery) -> List[Dict[str, Any]]:
    """
    Multi-layered rules engine classifying discrepancies across:
      1. Cryptographic File Integrity & Signatures
      2. Physical & Thermodynamic Monotonicity ("Valid Signature, Impossible Battery")
      3. Sub-Component & Module Lineage Tracking ("What does a replacement part carry?")
      4. Nameplate & Chronological Limits
    """
    discovered: List[Dict[str, Any]] = []

    # -------------------------------------------------------------------------
    # 1. Cryptographic File Integrity & Signature Authenticity
    # -------------------------------------------------------------------------
    has_trusted_signature = False
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
        if doc.signature_status in ["VALID_TRUSTED_ISSUER", "VALID_UNACCREDITED"] or doc.trust_tier == "TIER_2_ISSUER_SIGNED":
            has_trusted_signature = True

    # -------------------------------------------------------------------------
    # 2. Physics & Thermodynamic Monotonicity (HACKATHON HURDLE CORE)
    #    "A correctly signed record can still be impossible: health that goes up
    #     without repair, cycle counts that go backwards, capacity fading faster
    #     than cycles allow."
    # -------------------------------------------------------------------------
    soh_records = []
    for diag in battery.diagnostics:
        soh_records.append({
            "date": diag.test_date,
            "soh": diag.reported_soh,
            "capacity": diag.measured_capacity_kwh,
            "cycles": diag.cycle_count,
            "method": diag.test_method,
            "temp": diag.ambient_temp_c,
            "source": diag.source_label
        })

    has_module_replacement = any(
        doc.document_type == "MODULE_REPLACEMENT" for doc in battery.documents
    ) or any(
        evt.event_type == "MODULE_REPLACEMENT" for evt in battery.events
    ) or any(
        getattr(m, "is_replaced", False) for m in (battery.modules or [])
    )

    soh_records.sort(key=lambda x: x["date"])

    for i in range(1, len(soh_records)):
        prev = soh_records[i - 1]
        curr = soh_records[i]
        diff_soh = curr["soh"] - prev["soh"]

        # Physics Rule 1: SoH Monotonicity & Valid Signature Paradox
        if diff_soh > 3.0 and not has_module_replacement:
            if has_trusted_signature:
                # The exact hackathon hurdle: Cryptographically valid signature on physically impossible data
                discovered.append({
                    "code": "DISC_VALID_SIG_IMPOSSIBLE_SOH",
                    "title": f"Valid Signature, Impossible Battery: Cryptographically Signed SoH Jump (+{diff_soh:.1f}%)",
                    "severity": "CRITICAL",
                    "description": (
                        f"Cryptographically valid Ed25519 signature verified on record, yet reported State of Health "
                        f"increased from {prev['soh']:.1f}% ({prev['date'].strftime('%Y-%m-%d')}) to {curr['soh']:.1f}% "
                        f"({curr['date'].strftime('%Y-%m-%d')}) without a documented module replacement invoice. "
                        f"Cryptographic authenticity cannot override the laws of thermodynamics (electrochemical wear is strictly monotonic without cell replacement)."
                    )
                })
            else:
                discovered.append({
                    "code": "DISC_SOH_JUMP",
                    "title": f"High-Priority Anomaly: Suspicious SoH Inversion (+{diff_soh:.1f}%)",
                    "severity": "HIGH",
                    "description": (
                        f"Reported State of Health jumped from {prev['soh']:.1f}% ({prev['date'].strftime('%Y-%m-%d')}) "
                        f"to {curr['soh']:.1f}% ({curr['date'].strftime('%Y-%m-%d')}) without a documented module replacement invoice. "
                        "Physical battery capacity does not increase over time without hardware replacement."
                    )
                })
        elif 1.5 < diff_soh <= 3.0 and not has_module_replacement:
            discovered.append({
                "code": "DISC_SOH_VARIANCE",
                "title": f"Needs Review: Minor SoH Fluctuation (+{diff_soh:.1f}%)",
                "severity": "MEDIUM",
                "description": (
                    f"Minor capacity increase (+{diff_soh:.1f}%) detected between {prev['date'].strftime('%Y-%m-%d')} "
                    f"and {curr['date'].strftime('%Y-%m-%d')}. May reflect differing test temperatures "
                    f"({prev['temp']}°C vs {curr['temp']}°C), battery resting times, or diagnostic method tolerances."
                )
            })

        # Physics Rule 2: Monotonic Cycle Counts (BMS Odometer Rollback)
        if prev["cycles"] is not None and curr["cycles"] is not None:
            if curr["cycles"] < prev["cycles"]:
                rollback = prev["cycles"] - curr["cycles"]
                discovered.append({
                    "code": "DISC_CYCLE_ROLLBACK",
                    "title": f"Physical Impossibility: BMS Odometer Rollback (-{rollback} Cycles)",
                    "severity": "CRITICAL",
                    "description": (
                        f"Reported cycle count decreased from {prev['cycles']} cycles ({prev['date'].strftime('%Y-%m-%d')}) "
                        f"to {curr['cycles']} cycles ({curr['date'].strftime('%Y-%m-%d')}). Battery cycle counts are strictly monotonic. "
                        "Digital odometer fraud, BMS EEPROM reset, or falsified diagnostic readout detected."
                    )
                })
            elif curr["cycles"] > prev["cycles"]:
                # Physics Rule 3: Electrochemical Degradation Envelope (Over-fade & Perpetual Battery)
                d_cycles = curr["cycles"] - prev["cycles"]
                d_cap = prev["capacity"] - curr["capacity"]
                if battery.rated_capacity_kwh and battery.rated_capacity_kwh > 0:
                    fade_pct = (d_cap / battery.rated_capacity_kwh) * 100
                    # Capacity fading faster than physical cycles allow (>15% drop in <40 cycles)
                    if d_cycles <= 40 and fade_pct > 15.0:
                        discovered.append({
                            "code": "DISC_UNREALISTIC_FADE",
                            "title": f"Electrochemical Boundary Anomaly: Rapid Capacity Collapse (-{fade_pct:.1f}% in {d_cycles} cycles)",
                            "severity": "HIGH",
                            "description": (
                                f"Pack lost {fade_pct:.1f}% capacity over only {d_cycles} operating cycles "
                                f"({prev['capacity']:.1f} kWh -> {curr['capacity']:.1f} kWh). Exceeds nominal electrochemical wear envelope by 10x. "
                                "Indicates catastrophic internal cell short, separator damage, or corrupted intake data."
                            )
                        })

    # -------------------------------------------------------------------------
    # 3. Sub-Component Lineage & Module Swapping (HACKATHON HINT 2)
    #    "Batteries are repaired in parts. What does a replacement part carry?
    #     And swapping one module changes part of the battery's identity."
    # -------------------------------------------------------------------------
    if battery.modules:
        nominal_irs = [
            m.internal_resistance_mohm for m in battery.modules if not m.is_replaced and m.internal_resistance_mohm
        ]
        baseline_ir = sum(nominal_irs) / len(nominal_irs) if nominal_irs else 2.0

        for mod in battery.modules:
            if mod.is_replaced:
                ir_delta_pct = ((mod.internal_resistance_mohm - baseline_ir) / baseline_ir) * 100
                if ir_delta_pct > 25.0:
                    discovered.append({
                        "code": "DISC_MODULE_IMPEDANCE_MISMATCH",
                        "title": f"Sub-Component Lineage Hazard: Swapped Module #{mod.module_index} Impedance Mismatch (+{ir_delta_pct:.0f}%)",
                        "severity": "HIGH",
                        "description": (
                            f"Module #{mod.module_index} ({mod.serial_number}) was replaced using a '{mod.replacement_origin.replace('_', ' ')}' "
                            f"(Donor ID: {mod.donor_battery_id or 'Unrecorded'}). Its internal resistance ({mod.internal_resistance_mohm:.1f} mΩ) "
                            f"diverges by +{ir_delta_pct:.0f}% from pack baseline ({baseline_ir:.1f} mΩ). In series strings, this creates "
                            "severe localized ohmic heating and thermal runaway risk under fast charge regimes."
                        )
                    })
                elif mod.replacement_origin == "SALVAGE_DONOR_PACK":
                    discovered.append({
                        "code": "DISC_DONOR_MODULE_DETECTED",
                        "title": f"Sub-Component Lineage Alert: Module #{mod.module_index} Transplanted from Donor Pack",
                        "severity": "MEDIUM",
                        "description": (
                            f"Module #{mod.module_index} carries donor serial '{mod.serial_number}' from salvage pack '{mod.donor_battery_id}'. "
                            "The pack composite Merkle identity has shifted; individual module cycling history must be reconciled before second-life certification."
                        )
                    })

    # -------------------------------------------------------------------------
    # 4. Capacity vs Nameplate Rating Check
    # -------------------------------------------------------------------------
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

    # -------------------------------------------------------------------------
    # 5. Chronological Inconsistency (Test predating manufacturing)
    # -------------------------------------------------------------------------
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


def calculate_buyer_confidence_index(battery: models.Battery) -> Dict[str, Any]:
    """
    Epistemic Uncertainty & Buyer Confidence Framework (HACKATHON HINT 3).
    "How sure should a buyer be about grade when the history has holes?"

    Quantifies:
      - Temporal blackouts / telematics gaps (days without records)
      - Cycle tracking continuity
      - Risk-adjusted fair bid vs nominal valuation
      - Escrow withholding recommendations
      - Mandatory buyer safeguards to eliminate uncertainty
    """
    # 1. Timeline & Gap Analysis
    all_dates = []
    try:
        if battery.mfg_date:
            all_dates.append(datetime.strptime(battery.mfg_date, "%Y-%m-%d"))
    except ValueError:
        pass

    for diag in battery.diagnostics:
        if diag.test_date:
            all_dates.append(diag.test_date)
    for doc in battery.documents:
        if doc.uploaded_at:
            all_dates.append(doc.uploaded_at)
    for evt in battery.events:
        if evt.timestamp:
            all_dates.append(evt.timestamp)

    all_dates.sort()

    max_gap_days = 0
    gap_start = None
    gap_end = None
    if len(all_dates) >= 2:
        for idx in range(1, len(all_dates)):
            gap = (all_dates[idx] - all_dates[idx - 1]).days
            if gap > max_gap_days:
                max_gap_days = gap
                gap_start = all_dates[idx - 1].strftime("%Y-%m-%d")
                gap_end = all_dates[idx].strftime("%Y-%m-%d")

    # 2. Confidence Scoring Algorithm (0 - 100)
    score = 92  # Base score for an active digital passport
    risk_factors = []

    # Telematics Gap Penalties
    if max_gap_days > 365:
        penalty = 30
        score -= penalty
        risk_factors.append({
            "type": "TEMPORAL_HOLE",
            "title": f"Extended Telematics Blackout ({max_gap_days} Days)",
            "impact": f"-{penalty}%",
            "detail": f"Pack operated or was stored with zero recorded logs between {gap_start} and {gap_end} ({max_gap_days} days). True calendar aging and cell degradation during this window cannot be audited."
        })
    elif max_gap_days > 180:
        penalty = 15
        score -= penalty
        risk_factors.append({
            "type": "TEMPORAL_HOLE",
            "title": f"Moderate Diagnostic Gap ({max_gap_days} Days)",
            "impact": f"-{penalty}%",
            "detail": f"Unmonitored interval of {max_gap_days} days detected. Degradation trajectory interpolated."
        })

    # Physical Contradiction Penalties (From active discrepancies)
    unresolved_codes = [d.code for d in (battery.discrepancies or []) if d.status == "UNRESOLVED"]
    
    if "DISC_VALID_SIG_IMPOSSIBLE_SOH" in unresolved_codes:
        score -= 25
        risk_factors.append({
            "type": "PHYSICS_VIOLATION",
            "title": "Signed Record Contains Impossible SoH (+14%)",
            "impact": "-25%",
            "detail": "Accredited signature found on physically impossible diagnostic data. High epistemic fraud risk."
        })

    if "DISC_CYCLE_ROLLBACK" in unresolved_codes:
        score -= 25
        risk_factors.append({
            "type": "ODOMETER_FRAUD",
            "title": "BMS Cycle Rollback Detected",
            "impact": "-25%",
            "detail": "BMS cycle counter rolled backwards. Cumulative operational throughput cannot be trusted."
        })

    if "DISC_MODULE_IMPEDANCE_MISMATCH" in unresolved_codes:
        score -= 15
        risk_factors.append({
            "type": "MODULE_FRACTURE",
            "title": "Frankenstein Pack: Donor Module Impedance Divergence",
            "impact": "-15%",
            "detail": "Sub-component module replaced with salvage donor part. Cell impedance imbalance creates localized thermal hazard."
        })

    if "DISC_HASH_MISMATCH" in unresolved_codes:
        score -= 20
        risk_factors.append({
            "type": "TAMPERING",
            "title": "Document Hash Integrity Failure",
            "impact": "-20%",
            "detail": "Historical PDF altered bitwise after registration."
        })

    final_confidence = max(18, min(98, score))

    # 3. Confidence Tier Categorization
    if final_confidence >= 80:
        confidence_tier = "HIGH_CONFIDENCE"
        tier_label = "Audited & Continuous Provenance"
        tier_color = "#059669"
        buyer_advice = "Safe to transact at nominal valuation. Standard intake visual screening sufficient."
    elif final_confidence >= 50:
        confidence_tier = "MODERATE_UNCERTAINTY"
        tier_label = "Moderate History Gaps"
        tier_color = "#d97706"
        buyer_advice = "Negotiate contingency escrow discount. Require physical bench capacity discharge before final payment."
    else:
        confidence_tier = "HIGH_RISK_UNCERTAINTY"
        tier_label = "Critical Information Holes"
        tier_color = "#dc2626"
        buyer_advice = "DO NOT buy at nominal price. Deep epistemic uncertainty. Withhold escrow discount and demand full module impedance isolation test."

    # 4. Financial Valuation Breakdown (Risk-Adjusted Fair Bid)
    # Estimate baseline nominal market value: ~₹2,400 per remaining usable kWh
    latest_diag = battery.diagnostics[0] if battery.diagnostics else None
    latest_soh = latest_diag.reported_soh if latest_diag else 75.0
    nominal_kwh = battery.rated_capacity_kwh * (latest_soh / 100.0)
    nominal_valuation_inr = int(nominal_kwh * 2400)

    # Uncertainty Discount Factor: At 100% confidence discount is 0%; at 30% confidence discount is 35-40%
    uncertainty_fraction = (100 - final_confidence) / 100.0
    escrow_discount_inr = int(nominal_valuation_inr * (uncertainty_fraction * 0.55))
    risk_adjusted_bid_inr = nominal_valuation_inr - escrow_discount_inr

    # 5. Mandatory Buyer Protocols to Close the Hole
    mandatory_safeguards = []
    if max_gap_days > 180:
        mandatory_safeguards.append("Mandatory Coulomb-Counting C/3 Bench Test to confirm true retention capacity.")
    if "DISC_MODULE_IMPEDANCE_MISMATCH" in unresolved_codes:
        mandatory_safeguards.append("Electrochemical Impedance Spectroscopy (EIS) across all 8 modules to isolate thermal weak link.")
    if "DISC_CYCLE_ROLLBACK" in unresolved_codes or "DISC_VALID_SIG_IMPOSSIBLE_SOH" in unresolved_codes:
        mandatory_safeguards.append("Direct BMS CAN-bus flash read and forensic firmware audit at authorized OEM center.")
    if not mandatory_safeguards:
        mandatory_safeguards.append("Standard visual chassis inspection and insulation resistance check (>100 MΩ).")

    return {
        "buyer_confidence_score": final_confidence,
        "confidence_tier": confidence_tier,
        "tier_label": tier_label,
        "tier_color": tier_color,
        "max_gap_days": max_gap_days,
        "gap_window": f"{gap_start} to {gap_end}" if gap_start else "None",
        "nominal_valuation_inr": f"₹{nominal_valuation_inr:,}",
        "risk_adjusted_bid_inr": f"₹{risk_adjusted_bid_inr:,}",
        "escrow_discount_inr": f"₹{escrow_discount_inr:,}",
        "buyer_advice": buyer_advice,
        "risk_factors": risk_factors,
        "mandatory_safeguards": mandatory_safeguards,
        "weakest_link_principle": "Pack second-life capacity is bounded by the most degraded or highest-impedance sub-module."
    }


def calculate_evidence_quality_score(battery: models.Battery) -> Dict[str, Any]:
    """
    Calculates Evidence Quality Index (0-100) based on record completeness,
    source corroboration, physics consistency, and unresolved anomalies.
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
        breakdown.append({"item": f"{len(critical_anomalies)} High-Priority / Physics Anomalies Unresolved", "points": f"-{penalty}"})

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
        summary = "Critical information gaps, unresolved conflicts, or physical monotonicity failures detected. Mandatory lab inspection required."

    return {
        "score": final_score,
        "level": level,
        "summary": summary,
        "breakdown": breakdown,
        "disclaimer": "The Evidence Quality Index measures documentation completeness and verifiability only. It is NOT a physical battery safety score or warranty guarantee."
    }
