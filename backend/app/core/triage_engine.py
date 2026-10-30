import os
import requests
from typing import Dict, Any, Optional
from app.db import models
from app.core.config import settings

def evaluate_second_life_triage(battery: models.Battery) -> Dict[str, Any]:
    """
    Hybrid Triage & Second-Life Application Matching Engine.
    Combines deterministic electrochemistry safety rules (safety floor)
    with optional Gemini AI generative advisory.
    """
    # 1. Gather baseline metrics
    latest_diag = battery.diagnostics[0] if battery.diagnostics else None
    latest_soh = latest_diag.reported_soh if latest_diag else None
    
    has_hash_mismatch = any(doc.integrity_status == "MISMATCH_DETECTED" for doc in battery.documents)
    has_high_discrepancy = any(d.severity == "HIGH" and d.status == "UNRESOLVED" for d in battery.discrepancies)
    
    chemistry = battery.chemistry.upper()
    rated_kwh = battery.rated_capacity_kwh

    # 2. Deterministic Safety Floor & Category Selection
    if has_hash_mismatch or has_high_discrepancy:
        category = "RECYCLING_HYDROMETALLURGY"
        title = "Direct to Hydrometallurgical Recycling (Quarantined)"
        stream = "Stream C: High-Risk / Raw Material Extraction"
        safety_status = "UNSAFE_FOR_SECOND_LIFE"
        rationale = (
            "Battery history contains critical unresolved discrepancies or document integrity failures. "
            "To prevent thermal runaway risks in inhabited environments, this pack is disqualified from "
            "second-life storage and recommended for automated pack disassembly and chemical cobalt/lithium extraction."
        )
        projected_life_years = 0.0
        target_application = "Raw Material Recycling (Lithium/Cobalt/Nickel Salts Recovery)"
        icon = "alert-triangle"

    elif latest_soh is None:
        category = "BENCH_QUALIFICATION_REQUIRED"
        title = "Mandatory Diagnostic Qualification Required"
        stream = "Stream B: Diagnostic Benchmark Required"
        safety_status = "HOLD_PENDING_TEST"
        rationale = (
            "No recent diagnostic test is available on the passport. Physical capacity, cell balancing, "
            "and electrochemical impedance must be tested before second-life routing can be established."
        )
        projected_life_years = 0.0
        target_application = "Pending Intake Qualification"
        icon = "clock"

    elif latest_soh >= 80.0:
        category = "COMMERCIAL_BESS"
        title = "Commercial & Industrial Solar Storage (BESS)"
        stream = "Stream A: Fast-Track to High-Value Second-Life"
        safety_status = "APPROVED_STATIONARY_STORAGE"
        rationale = (
            f"Retained health of {latest_soh:.1f}% SoH and nominal cell impedance allows this pack to operate in "
            f"daily solar peak-shaving microgrids (0.5C to 1C cycling). Clean documentation enables commercial insurance."
        )
        projected_life_years = 7.5
        target_application = "Grid Peak Shaving / Solar Microgrid Energy Storage"
        icon = "sun"

    elif latest_soh >= 70.0:
        category = "TELECOM_UPS_BACKUP"
        title = "Telecom Tower UPS & Data Backup"
        stream = "Stream A: Moderate-Demand Second-Life"
        safety_status = "APPROVED_STATIONARY_STORAGE"
        rationale = (
            f"At {latest_soh:.1f}% SoH, the battery is ideally suited for intermittent float-charge backup duty "
            f"in telecom towers or rural emergency power stations, where continuous high C-rate cycling is not required."
        )
        projected_life_years = 5.0
        target_application = "Telecom Tower Battery Backup / Cold Storage UPS"
        icon = "radio"

    elif latest_soh >= 60.0:
        category = "LOW_SPEED_EV"
        title = "Low-Speed City Transport (E-Rickshaw / Ag Carts)"
        stream = "Stream A: Low-Duty Cycle Mobility"
        safety_status = "APPROVED_LOW_VOLTAGE_MOBILITY"
        rationale = (
            f"With {latest_soh:.1f}% SoH, pack can be reconfigured or matched with low-voltage controllers "
            "for agricultural carts, golf utility vehicles, or feeder e-rickshaws."
        )
        projected_life_years = 3.5
        target_application = "Low-Speed Agricultural Utility & Feeder Vehicles"
        icon = "truck"

    elif latest_soh >= 50.0:
        category = "SOLAR_STREETLIGHT"
        title = "Off-Grid Solar Streetlights / Farm Pumps"
        stream = "Stream B: Low-Duty Rural Application"
        safety_status = "APPROVED_EXTERIOR_STORAGE"
        rationale = (
            f"Gentle overnight discharge at C/10 or C/20 allows this {latest_soh:.1f}% SoH pack to power "
            "rural solar illumination or drip-irrigation pumps without safety strain."
        )
        projected_life_years = 3.0
        target_application = "Solar Streetlight Clusters / Solar Drip Irrigation"
        icon = "zap"

    else:
        category = "RECYCLING_HYDROMETALLURGY"
        title = "Hydrometallurgical Raw Material Recycling"
        stream = "Stream C: End-of-Life Processing"
        safety_status = "RETIRED_FOR_RECYCLING"
        rationale = (
            f"Capacity of {latest_soh:.1f}% SoH is below safe second-life operational thresholds. "
            "Optimal economic return is derived through certified hydrometallurgical recycling."
        )
        projected_life_years = 0.0
        target_application = "Black Mass Chemical Refining (Lithium, Nickel, Cobalt Recovery)"
        icon = "recycle"

    # 3. Optional Gemini AI Layer for Rich Advisory
    ai_advisory = None
    if settings.GEMINI_API_KEY:
        ai_advisory = generate_gemini_advisory(battery, latest_soh, category)

    if not ai_advisory:
        # High-quality deterministic fallback advisory
        ai_advisory = {
            "mode": "Deterministic Engineering Analysis",
            "executive_summary": f"VoltTrace Triage Protocol matched this {battery.chemistry} {battery.rated_capacity_kwh}kWh pack to {title}.",
            "technical_considerations": [
                f"Degradation profile aligns with {chemistry} cycle degradation curves.",
                f"Projected remaining cycle life: ~{int(projected_life_years * 280)} low-stress equivalent cycles.",
                "Mandatory thermal management check recommended during installation enclosure design."
            ],
            "economic_projection": f"Estimated second-life operational payback: ~{max(1.8, projected_life_years * 0.4):.1f} years compared to new LFP/NMC storage systems.",
            "carbon_offset_kg_co2": int(rated_kwh * (latest_soh / 100.0 if latest_soh else 0.7) * 72.0)
        }

    return {
        "category_code": category,
        "title": title,
        "stream": stream,
        "safety_status": safety_status,
        "rationale": rationale,
        "target_application": target_application,
        "projected_life_years": projected_life_years,
        "icon": icon,
        "ai_advisory": ai_advisory
    }

def generate_gemini_advisory(battery: models.Battery, soh: Optional[float], category: str) -> Optional[Dict[str, Any]]:
    """Query Google Gemini API for an enriched techno-economic advisory."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        prompt = (
            f"You are a Senior EV Battery Refurbishing & Second-Life Storage Engineer. "
            f"Analyze this battery passport: ID={battery.id}, Chemistry={battery.chemistry}, "
            f"Rated Capacity={battery.rated_capacity_kwh}kWh, Latest SoH={soh}%, Category={category}. "
            f"Respond with a brief JSON object containing keys: 'executive_summary', 'technical_considerations' (list of 3 strings), "
            f"'economic_projection', and 'carbon_offset_kg_co2' (integer)."
        )
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code == 200:
            data = res.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Clean possible markdown fencing
            text = text.replace("```json", "").replace("```", "").strip()
            import json
            parsed = json.loads(text)
            parsed["mode"] = "Gemini 1.5 Flash Neural Advisory"
            return parsed
    except Exception:
        pass
    return None

def calculate_indicative_valuation(battery: models.Battery) -> Dict[str, Any]:
    """
    Computes an illustrative, transparent valuation range based on explicitly stated market assumptions.
    Reflects the 'uncertainty band' principle calibrated for the Indian EV ecosystem.
    """
    has_hash_mismatch = any(doc.integrity_status == "MISMATCH_DETECTED" for doc in battery.documents)
    has_high_disc = any(d.severity == "HIGH" and d.status == "UNRESOLVED" for d in battery.discrepancies)

    if has_hash_mismatch or has_high_disc:
        return {
            "status": "VALUATION_ON_HOLD",
            "currency": "INR (₹)",
            "min_val": 0,
            "max_val": 0,
            "formatted_range": "Valuation On Hold",
            "confidence_label": "High Risk / Integrity Conflict",
            "notes": "Critical discrepancies or file tampering detected. Do NOT transact or agree on pricing without thorough physical bench inspection."
        }

    latest_diag = battery.diagnostics[0] if battery.diagnostics else None
    soh = latest_diag.reported_soh if latest_diag else 75.0
    kwh = battery.rated_capacity_kwh
    
    # Base estimated benchmark in Indian market: ~₹1,000 per usable residual kWh for second life
    usable_kwh = kwh * (soh / 100.0)
    base_price = usable_kwh * 950.0

    # If evidence is complete (clean docs, signed), narrow variance (+/- 3%)
    if battery.documents and all(d.integrity_status == "MATCHED" for d in battery.documents):
        min_p = round(base_price * 0.96, -2)
        max_p = round(base_price * 1.04, -2)
        confidence_label = "Narrow Variance (Verified Historical Evidence)"
        notes = "Historical evidence and lab signatures corroborated. Low commercial transaction risk."
    else:
        # Wider variance if records are thin (Uncertainty, not fraud!)
        min_p = round(base_price * 0.80, -2)
        max_p = round(base_price * 1.15, -2)
        confidence_label = "Wide Variance (Uncertain: Bench Test Advised)"
        notes = "Thin historical records create wider valuation spread. Conduct C/3 capacity test before final settlement."

    return {
        "status": "CALCULATED",
        "currency": "INR (₹)",
        "min_val": int(min_p),
        "max_val": int(max_p),
        "formatted_range": f"₹{int(min_p):,} – ₹{int(max_p):,}",
        "confidence_label": confidence_label,
        "notes": notes,
        "disclaimer": "Indicative illustrative range based on prevailing residual capacity benchmarks. Not a binding financial appraisal."
    }
