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
            <Sparkles size={13} />
            TRIAGE & TRUST LAYER FOR TESTING
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            EV Battery Passport & Provenance Registry
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '620px', marginTop: '0.25rem' }}>
            Screening inbound packs for reuse, second-life stationary storage, and recycling.
            Compliant with EU Regulation 2023/1542 & India Battery Waste Management Rules 2022.
          </p>
        </div>

        {/* Quick Demo Shortcuts for Evaluators */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '1rem', borderRadius: '12px', minWidth: '280px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            LIVE DEMO QUICK SCENARIOS:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              onClick={() => onSelectBattery('VT-1001')}
              className="btn btn-secondary"
              style={{ background: '#1e293b', color: '#34d399', borderColor: '#059669', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>✅ VT-1001 (Clean / High-Trust)</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onSelectBattery('VT-1002')}
              className="btn btn-secondary"
              style={{ background: '#1e293b', color: '#f87171', borderColor: '#dc2626', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>🚨 VT-1002 (Tamper / Contradiction)</span>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across connected fleets & depots</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Complete Records</span>
              <FileCheck size={18} color="var(--verified-green)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--verified-green)' }}>
              {stats.complete_records_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Both documents & diagnostics attached</div>
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Battery Registry & Triage Status</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click any battery row to view its complete 9-section passport and verification dossier.
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
                <th>Evidence Quality</th>
                <th>Integrity</th>
                <th>Issues</th>
                <th>Triage Destination</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading battery passport records...
                  </td>
                </tr>
              ) : batteries.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No batteries match the selected search criteria.
                  </td>
                </tr>
              ) : (
                batteries.map((b) => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => onSelectBattery(b.id)}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                        {b.id}
                      </span>
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
                      <span className={`badge ${b.evidence_score >= 80 ? 'badge-green' : b.evidence_score >= 50 ? 'badge-amber' : 'badge-red'}`}>
                        {b.evidence_score}/100
                      </span>
                    </td>
                    <td>
                      {b.integrity_status === 'MATCHED' ? (
                        <span className="badge badge-green"><CheckCircle2 size={12} /> Matched</span>
                      ) : b.integrity_status === 'MISMATCH_DETECTED' ? (
                        <span className="badge badge-red"><XCircle size={12} /> Mismatch</span>
                      ) : (
                        <span className="badge badge-neutral">Pending</span>
                      )}
                    </td>
                    <td>
                      {b.unresolved_issues_count > 0 ? (
                        <span className="badge badge-red">{b.unresolved_issues_count} Active</span>
                      ) : (
                        <span className="badge badge-green">Clean</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {b.triage_category}
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

      {/* Recent Ledger Activity */}
      {stats && stats.recent_activity?.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Recent Ledger & Passport Events</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {stats.recent_activity.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onSelectBattery(evt.battery_id)}
                style={{
                  background: 'var(--bg-app)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                    {evt.battery_id}
                  </span>
                  <span className={`badge ${evt.verification_status === 'VERIFIED' ? 'badge-green' : evt.verification_status === 'FAILED' ? 'badge-red' : 'badge-neutral'}`}>
                    {evt.verification_status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {evt.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {evt.description}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  By {evt.submitting_org} • {new Date(evt.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
