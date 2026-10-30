import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  Droplet,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  ArrowRight,
  RefreshCw,
  Building2,
  Recycle,
  Factory
} from 'lucide-react';
import { updateBatteryOutcome } from '../api';

export function EconomicInsightsCard({ battery, onOutcomeUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(battery.lifecycle_outcome || 'PENDING_ASSESSMENT');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [actorName, setActorName] = useState('Lead Assessor Roy');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const econ = battery.triage?.economic_insights || {
    testing_time_saved_hours: 0,
    testing_savings_label: 'Testing Assessment Pending',
    testing_savings_rationale: 'Reviewing diagnostic baseline.',
    cycler_cost_saved_estimate: '₹0',
    critical_metals_kg: (battery.rated_capacity_kwh * 0.56).toFixed(1),
    water_avoided_liters: Math.round(battery.rated_capacity_kwh * 1120),
    second_life_extension_years: 0,
    current_outcome: battery.lifecycle_outcome || 'PENDING_ASSESSMENT',
  };

  const handleUpdateOutcome = async (newOutcome) => {
    setUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const defaultNotes =
        newOutcome === 'SECOND_LIFE_DEPLOYED'
          ? 'Approved for stationary solar peak-shaving microgrid cluster.'
          : newOutcome === 'RECYCLING_PROCESSED'
          ? 'Dispatched to ISO-14001 hydrometallurgical lithium recovery facility.'
          : newOutcome === 'QUARANTINE_HOLD'
          ? 'Quarantined pending physical lab teardown and cell impedance audit.'
          : 'Intake triage pending physical qualification.';

      const updated = await updateBatteryOutcome(battery.id, {
        outcome: newOutcome,
        actor: actorName || 'Facility Assessor',
        notes: outcomeNotes || defaultNotes,
      });

      setSelectedOutcome(newOutcome);
      setSuccessMsg(`Lifecycle outcome successfully recorded as: ${newOutcome.replace(/_/g, ' ')}`);
      if (onOutcomeUpdated) {
        onOutcomeUpdated(updated);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update outcome');
    } finally {
      setUpdating(false);
    }
  };

  const outcomeBadge = () => {
    switch (battery.lifecycle_outcome) {
      case 'SECOND_LIFE_DEPLOYED':
        return {
          label: 'Deployed in Second Life (Active)',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'RECYCLING_PROCESSED':
        return {
          label: 'Dispatched to Closed-Loop Recycling',
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
        };
      case 'QUARANTINE_HOLD':
        return {
          label: 'Quarantine / Technical Hold',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: 'Pending Second-Life Triage Assessment',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
    }
  };

  const badge = outcomeBadge();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Economic Savings & Circular Mineral Stewardship</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Module 5: Real-world cycler bench testing-time optimization and finite lithium-ion resource recovery.
          </p>
        </div>

        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`} />
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric Row 1: Testing Time Optimization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Testing-Time Saved
              </span>
              <span className="text-[11px] bg-emerald-200/60 px-2 py-0.5 rounded">Per Pack</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-950">
              {econ.testing_time_saved_hours > 0 ? `${econ.testing_time_saved_hours} Hours` : 'Full Test Req.'}
            </div>
            <div className="text-xs font-medium text-emerald-700 mt-1">
              {econ.testing_savings_label}
            </div>
            <p className="text-[11px] text-emerald-900/80 mt-2 leading-relaxed">
              {econ.testing_savings_rationale}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
            <div className="flex items-center justify-between text-indigo-800 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600" />
                Bench Energy & Labor Saved
              </span>
              <span className="text-[11px] bg-indigo-200/60 px-2 py-0.5 rounded">Operating OpEx</span>
            </div>
            <div className="text-2xl font-extrabold text-indigo-950">
              {econ.cycler_cost_saved_estimate}
            </div>
            <div className="text-xs font-medium text-indigo-700 mt-1">
              Avoids {econ.testing_time_saved_hours}h electrical cycler degradation
            </div>
            <p className="text-[11px] text-indigo-900/80 mt-2 leading-relaxed">
              Direct testing equipment labor and kilowatt-hour cycler draw saved by relying on verified provenance data.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Recycle className="w-4 h-4 text-amber-600" />
                Second-Life Extension
              </span>
              <span className="text-[11px] bg-amber-200/60 px-2 py-0.5 rounded">Stationary</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-950">
              +{econ.second_life_extension_years > 0 ? `${econ.second_life_extension_years} Years` : 'Recycle Direct'}
            </div>
            <div className="text-xs font-medium text-amber-700 mt-1">
              Target: Stationary BESS or Float UPS
            </div>
            <p className="text-[11px] text-amber-900/80 mt-2 leading-relaxed">
              Prevents premature shredding of healthy battery modules by qualifying retained capacity for secondary duty.
            </p>
          </div>
        </div>

        {/* Environmental Minerals Banner */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-700">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                Critical Mineral Resource Preservation ({battery.chemistry})
              </h4>
              <p className="text-xs text-slate-500">
                Conserving virgin mining impact for {battery.rated_capacity_kwh} kWh EV battery pack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Lithium / Nickel / Cobalt</div>
              <div className="text-lg font-bold text-slate-900">~{econ.critical_metals_kg} kg Recovered</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Freshwater Mining Avoided</div>
              <div className="text-lg font-bold text-emerald-700">~{econ.water_avoided_liters.toLocaleString()} Liters</div>
            </div>
          </div>
        </div>

        {/* Lifecycle Disposition Selector */}
        <div className="p-5 rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Cascading Lifecycle Disposition Control
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Update the official disposition in the digital battery passport and append to the cryptographic audit trail.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Recorded Actor: <span className="font-semibold text-slate-800">{actorName}</span>
            </div>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateOutcome('SECOND_LIFE_DEPLOYED')}
              className={`p-3 rounded-lg border text-left transition-all ${
                battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Second-Life Storage
                </span>
                {battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' && (
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <p className={`text-[11px] leading-tight ${battery.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Deploy in stationary solar BESS, telecom backup, or low-speed vehicle cluster.
              </p>
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateOutcome('RECYCLING_PROCESSED')}
              className={`p-3 rounded-lg border text-left transition-all ${
                battery.lifecycle_outcome === 'RECYCLING_PROCESSED'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Factory className="w-3.5 h-3.5" />
                  Route to Recycling
                </span>
                {battery.lifecycle_outcome === 'RECYCLING_PROCESSED' && (
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <p className={`text-[11px] leading-tight ${battery.lifecycle_outcome === 'RECYCLING_PROCESSED' ? 'text-blue-100' : 'text-slate-500'}`}>
                Dispatch for hydrometallurgical closed-loop cathode metal recovery.
              </p>
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateOutcome('QUARANTINE_HOLD')}
              className={`p-3 rounded-lg border text-left transition-all ${
                battery.lifecycle_outcome === 'QUARANTINE_HOLD'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Quarantine / Hold
                </span>
                {battery.lifecycle_outcome === 'QUARANTINE_HOLD' && (
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <p className={`text-[11px] leading-tight ${battery.lifecycle_outcome === 'QUARANTINE_HOLD' ? 'text-rose-100' : 'text-slate-500'}`}>
                Isolate pack for discrepancy investigation, hash review, or destructive testing.
              </p>
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateOutcome('PENDING_ASSESSMENT')}
              className={`p-3 rounded-lg border text-left transition-all ${
                battery.lifecycle_outcome === 'PENDING_ASSESSMENT'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pending Assessment
                </span>
                {battery.lifecycle_outcome === 'PENDING_ASSESSMENT' && (
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <p className={`text-[11px] leading-tight ${battery.lifecycle_outcome === 'PENDING_ASSESSMENT' ? 'text-slate-300' : 'text-slate-500'}`}>
                Awaiting physical visual inspection and final qualification bench test.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
