import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  FileCheck,
  Zap,
  Activity,
  Sparkles
} from 'lucide-react';
import { fetchStatsSummary, fetchBatteries } from '../api';

export default function Dashboard({ onSelectBattery }) {
  const [stats, setStats] = useState(null);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChemistry, setSelectedChemistry] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, batteriesData] = await Promise.all([
        fetchStatsSummary(),
        fetchBatteries({ search: searchTerm, chemistry: selectedChemistry, status: selectedStatus })
      ]);
      setStats(statsData);
      setBatteries(batteriesData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedChemistry, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero / Quick Pitch Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#ffffff', padding: '1.75rem 2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.6rem' }}>
            <Activity size={13} />
            BATTERY HISTORY VERIFICATION & TESTING-PRIORITISATION
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Used EV Battery Passport & Triage Registry
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '620px', marginTop: '0.25rem' }}>
            Screening inbound packs for reuse, second-life evaluation, and recycling without pretending to certify safety.
            Organising evidence, verifying file integrity, and prioritising physical testing.
          </p>
        </div>

        {/* Quick Demo Shortcuts for Evaluators */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '1rem', borderRadius: '12px', minWidth: '300px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            LIVE DEMO QUICK SCENARIOS:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              onClick={() => onSelectBattery('VT-1001')}
              className="btn btn-secondary"
              style={{ background: '#1e293b', color: '#34d399', borderColor: '#059669', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>✅ VT-1001 (Complete & Consistent)</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onSelectBattery('VT-1002')}
              className="btn btn-secondary"
              style={{ background: '#1e293b', color: '#f87171', borderColor: '#dc2626', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>🚨 VT-1002 (Tamper / Hash Contradiction)</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onSelectBattery('VT-1003')}
              className="btn btn-secondary"
              style={{ background: '#1e293b', color: '#fbbf24', borderColor: '#d97706', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>⚡ VT-1003 (Valid Sig, Impossible Battery)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Registered Batteries</span>
              <BatteryCharging size={18} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stats.total_batteries}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across fleet depots and workshops</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Complete Records</span>
              <FileCheck size={18} color="var(--verified-green)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--verified-green)' }}>
              {stats.complete_records_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Documents & diagnostics attached</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Active Discrepancies</span>
              <AlertTriangle size={18} color="var(--danger-red)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger-red)' }}>
              {stats.unresolved_discrepancies_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flagged for manual investigation</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Avg Evidence Score</span>
              <ShieldCheck size={18} color="var(--info-blue)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info-blue)' }}>
              {stats.average_evidence_score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Documentation confidence index</div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-app)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search battery ID, OEM, model, or fleet owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={selectedChemistry}
              onChange={(e) => setSelectedChemistry(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff' }}
            >
              <option value="">All Chemistries</option>
              <option value="NMC 811">NMC 811</option>
              <option value="LFP">LFP</option>
              <option value="NCA">NCA</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="quarantined">Quarantined</option>
            </select>

            <button type="submit" className="btn btn-secondary">
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Batteries Registry Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Battery Registry & 3-Pillar Assessment</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click any battery row to view its full dossier, tamper simulator, and testing-prioritisation report.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Showing {batteries.length} batteries
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Battery ID</th>
                <th>OEM / Model</th>
                <th>Chemistry & Rating</th>
                <th>Fleet Owner</th>
                <th>Latest SoH</th>
                <th>Pillar 1: Integrity</th>
                <th>Pillar 2: Evidence</th>
                <th>Pillar 3: Recommended Action</th>
                <th>Suitability Assessment</th>
                <th>Lifecycle Outcome</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading battery passport records...
                  </td>
                </tr>
              ) : batteries.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No batteries match the selected search criteria.
                  </td>
                </tr>
              ) : (
                batteries.map((b) => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => onSelectBattery(b.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          {b.id}
                        </span>
                        {b.has_physics_violation && (
                          <span className="badge badge-red" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                            ⚡ Physics Violation
                          </span>
                        )}
                        {b.has_module_replacement && (
                          <span className="badge badge-amber" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                            🧩 Module Swapped
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.model}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.manufacturer}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.chemistry}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.rated_capacity_kwh} kWh ({b.nominal_voltage}V)</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{b.current_owner}</div>
                    </td>
                    <td>
                      {b.latest_soh !== null ? (
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: b.latest_soh > 80 ? 'var(--verified-green)' : 'var(--warning-amber)' }}>
                            {b.latest_soh}%
                          </span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{b.latest_soh_source}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Untested</span>
                      )}
                    </td>
                    <td>
                      {b.has_physics_violation ? (
                        <span className="badge badge-red" title="Valid Signature on Physically Impossible Data">
                          <Zap size={12} /> Impossible
                        </span>
                      ) : b.integrity_status === 'MATCHED' ? (
                        <span className="badge badge-green"><CheckCircle2 size={12} /> Verified</span>
                      ) : b.integrity_status === 'MISMATCH_DETECTED' ? (
                        <span className="badge badge-red"><XCircle size={12} /> Mismatch</span>
                      ) : (
                        <span className="badge badge-neutral">No Ref</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${b.evidence_score >= 80 ? 'badge-green' : b.evidence_score >= 50 ? 'badge-amber' : 'badge-red'}`}>
                        {b.evidence_quality_label}
                      </span>
                      {b.buyer_confidence_score !== undefined && b.buyer_confidence_score !== null && (
                        <div style={{ fontSize: '0.68rem', color: b.buyer_confidence_score < 50 ? '#dc2626' : 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 700 }}>
                          {b.buyer_confidence_score}% Buyer Conf.
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${b.next_action_code === 'HOLD_FOR_INVESTIGATION' ? 'badge-red' : b.next_action_code === 'FURTHER_INSPECTION' ? 'badge-amber' : 'badge-green'}`}>
                        {b.next_action_label}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {b.suitability_label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        b.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED'
                          ? 'badge-green'
                          : b.lifecycle_outcome === 'RECYCLING_PROCESSED'
                          ? 'badge-blue'
                          : b.lifecycle_outcome === 'QUARANTINE_HOLD'
                          ? 'badge-red'
                          : 'badge-neutral'
                      }`}>
                        {b.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED'
                          ? 'Second Life'
                          : b.lifecycle_outcome === 'RECYCLING_PROCESSED'
                          ? 'Recycled'
                          : b.lifecycle_outcome === 'QUARANTINE_HOLD'
                          ? 'Quarantine'
                          : 'Pending'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
                        Dossier <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
