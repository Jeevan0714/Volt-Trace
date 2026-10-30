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
  Layers,
  Sparkles
} from 'lucide-react';
import { fetchStatsSummary, fetchBatteries } from '../api';

export default function Dashboard({ onSelectBattery }) {
  const [stats, setStats] = useState(null);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Form input state (not yet applied)
  const [searchInput, setSearchInput] = useState('');
  const [chemistryInput, setChemistryInput] = useState('');
  const [statusInput, setStatusInput] = useState('');

  // Active filters applied to the backend
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    chemistry: '',
    status: ''
  });
  const [filterTab, setFilterTab] = useState('all');

  const loadData = async (filters = appliedFilters) => {
    setLoading(true);
    try {
      const [statsData, batteriesData] = await Promise.all([
        fetchStatsSummary(),
        fetchBatteries({
          search: filters.search,
          chemistry: filters.chemistry,
          status: filters.status
        })
      ]);
      setStats(statsData);
      setBatteries(batteriesData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Only load on initial mount
  useEffect(() => {
    loadData(appliedFilters);
  }, []);

  const handleApplyFilter = (e) => {
    if (e) e.preventDefault();
    const newFilters = {
      search: searchInput,
      chemistry: chemistryInput,
      status: statusInput
    };
    setAppliedFilters(newFilters);
    setFilterTab(statusInput || 'all');
    loadData(newFilters);
  };

  const handleFilterTabClick = (tabKey) => {
    setFilterTab(tabKey);
    const newStatus = tabKey === 'all' ? '' : tabKey;
    setStatusInput(newStatus);
    const newFilters = {
      ...appliedFilters,
      status: newStatus
    };
    setAppliedFilters(newFilters);
    loadData(newFilters);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setChemistryInput('');
    setStatusInput('');
    setFilterTab('all');
    const reset = { search: '', chemistry: '', status: '' };
    setAppliedFilters(reset);
    loadData(reset);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero / Quick Pitch Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '0.25rem 0.7rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '0.65rem'
          }}>
            <Activity size={13} />
            DIGITAL PRODUCT PASSPORT &amp; PROVENANCE ENFORCEMENT
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Used EV Battery Passport &amp; Triage Registry
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.45rem', lineHeight: 1.5 }}>
            Screening inbound packs for second-life reuse, module lineage provenance, and recycling.
            Cryptographic ledger integrity paired with real-world physics consistency verification.
          </p>
        </div>

        {/* Quick Demo Shortcuts for Evaluators */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.15rem',
          borderRadius: '12px',
          minWidth: '310px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
            HURDLE LIVE DEMO SCENARIOS:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <button
              onClick={() => onSelectBattery('VT-1001')}
              className="btn btn-secondary"
              style={{
                background: '#1e293b',
                color: '#34d399',
                borderColor: '#059669',
                fontSize: '0.8rem',
                justifyContent: 'space-between',
                padding: '0.5rem 0.85rem'
              }}
            >
              <span>✅ VT-1001 (Complete &amp; Consistent)</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onSelectBattery('VT-1002')}
              className="btn btn-secondary"
              style={{
                background: '#1e293b',
                color: '#f87171',
                borderColor: '#dc2626',
                fontSize: '0.8rem',
                justifyContent: 'space-between',
                padding: '0.5rem 0.85rem'
              }}
            >
              <span>🚨 VT-1002 (Tamper / Hash Mismatch)</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onSelectBattery('VT-1003')}
              className="btn btn-secondary"
              style={{
                background: '#1e293b',
                color: '#fbbf24',
                borderColor: '#d97706',
                fontSize: '0.8rem',
                justifyContent: 'space-between',
                padding: '0.5rem 0.85rem'
              }}
            >
              <span>⚡ VT-1003 (Valid Sig, Impossible Battery)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.15rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Registered Batteries</span>
              <BatteryCharging size={18} color="#4f46e5" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
              {stats.total_batteries}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Across fleet hubs &amp; workshops</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Complete Records</span>
              <FileCheck size={18} color="#15803d" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d' }}>
              {stats.complete_records_count}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Passports with diagnostics attached</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Flags &amp; Issues</span>
              <AlertTriangle size={18} color="#b91c1c" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#b91c1c' }}>
              {stats.unresolved_discrepancies_count}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Flagged for physics or hash review</div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Evidence Score</span>
              <ShieldCheck size={18} color="#0284c7" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284c7' }}>
              {stats.average_evidence_score} <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 600 }}>/ 100</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Confidence index across ledger</div>
          </div>
        </div>
      )}

      {/* Batteries Registry Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header & Filter Bar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Battery Passport Registry
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              Cryptographically verified lifecycle tracking, physics consistency checks, and circularity triage.
            </p>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
            {[
              { key: 'all', label: `All (${batteries.length})` },
              { key: 'active', label: 'In Service' },
              { key: 'quarantined', label: 'Under Review / Flagged' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterTabClick(tab.key)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: filterTab === tab.key ? '#ffffff' : 'transparent',
                  color: filterTab === tab.key ? '#4f46e5' : '#64748b',
                  boxShadow: filterTab === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Form Row */}
        <form onSubmit={handleApplyFilter} style={{
          padding: '0.9rem 1.5rem',
          background: '#f8fafc',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '0.85rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Search Box */}
          <div style={{
            flex: '1 1 240px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#ffffff',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1'
          }}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search battery ID, OEM, model, or fleet owner..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem' }}
            />
          </div>

          {/* Chemistry Dropdown */}
          <select
            value={chemistryInput}
            onChange={(e) => setChemistryInput(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.82rem',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="">All Chemistries</option>
            <option value="NMC 811">NMC 811</option>
            <option value="LFP">LFP</option>
            <option value="NCA">NCA</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.82rem',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active (In Service)</option>
            <option value="quarantined">Quarantined (Under Review)</option>
          </select>

          {/* Apply Filter Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #4338ca',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(79, 70, 229, 0.2)'
            }}
          >
            <Filter size={14} />
            <span>Apply Filter</span>
          </button>

          {/* Reset Button (visible when filters are typed or applied) */}
          {(searchInput || chemistryInput || statusInput || appliedFilters.search || appliedFilters.chemistry || appliedFilters.status) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.82rem',
                color: '#64748b',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          )}
        </form>

        {/* Clean, High-Contrast Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Battery ID</th>
                <th>Model &amp; Manufacturer</th>
                <th>Specs / Chemistry</th>
                <th>Fleet Operator</th>
                <th>Health (SoH)</th>
                <th>Verification &amp; Integrity</th>
                <th>Buyer Certainty</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Loading battery passport records...
                  </td>
                </tr>
              ) : batteries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No batteries match the selected search criteria.
                  </td>
                </tr>
              ) : (
                batteries.map((b) => {
                  const isGoodSoh = b.latest_soh != null && b.latest_soh >= 80;
                  const isFairSoh = b.latest_soh != null && b.latest_soh >= 60 && b.latest_soh < 80;

                  return (
                    <tr
                      key={b.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectBattery(b.id)}
                    >
                      {/* Battery ID Tag */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            color: '#4338ca',
                            background: '#eef2ff',
                            border: '1px solid #c7d2fe',
                            borderRadius: '6px',
                            padding: '0.25rem 0.55rem',
                            width: 'fit-content'
                          }}>
                            {b.id}
                          </span>
                          {b.has_physics_violation && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#dc2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                              ⚡ Physics Flag
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Model & OEM */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                          {b.model}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                          {b.manufacturer}
                        </div>
                      </td>

                      {/* Chemistry & Specs */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                            {b.chemistry}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                            {b.rated_capacity_kwh} kWh ({b.nominal_voltage}V)
                          </span>
                        </div>
                      </td>

                      {/* Fleet Operator */}
                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500 }}>
                          {b.current_owner || '—'}
                        </div>
                      </td>

                      {/* State of Health */}
                      <td>
                        {b.latest_soh !== null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              width: 'fit-content',
                              background: isGoodSoh ? '#dcfce7' : isFairSoh ? '#fef3c7' : '#fee2e2',
                              color: isGoodSoh ? '#15803d' : isFairSoh ? '#b45309' : '#b91c1c'
                            }}>
                              {b.latest_soh}%
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              {b.latest_soh_source === 'INDEPENDENT_TEST'
                                ? 'Lab Tested'
                                : b.latest_soh_source === 'SELLER_REPORTED'
                                ? 'Seller Reported'
                                : 'Historical'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Untested</span>
                        )}
                      </td>

                      {/* Provenance & Integrity Status */}
                      <td>
                        {b.has_physics_violation ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}>
                              <Zap size={13} />
                              Physics Paradox
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 600 }}>
                              Valid Sig, Impossible Data
                            </span>
                          </div>
                        ) : b.integrity_status === 'MISMATCH_DETECTED' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}>
                              <XCircle size={13} />
                              Tamper Detected
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#b91c1c' }}>
                              Hash Fingerprint Mismatch
                            </span>
                          </div>
                        ) : b.integrity_status === 'MATCHED' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}>
                              <CheckCircle2 size={13} />
                              Verified Authentic
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#15803d' }}>
                              Bit-for-Bit Ledger Match
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-neutral">No Baseline</span>
                        )}
                      </td>

                      {/* Buyer Certainty & Telematics Holes */}
                      <td>
                        {b.buyer_confidence_score !== undefined && b.buyer_confidence_score !== null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                color: b.buyer_confidence_score >= 60 ? '#15803d' : b.buyer_confidence_score >= 40 ? '#b45309' : '#dc2626'
                              }}>
                                {b.buyer_confidence_score}%
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {b.buyer_confidence_score >= 60 ? 'Audited' : b.buyer_confidence_score >= 40 ? 'Moderate Risk' : 'Critical Holes'}
                              </span>
                            </div>
                            <div style={{ width: '85px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${b.buyer_confidence_score}%`,
                                height: '100%',
                                background: b.buyer_confidence_score >= 60 ? '#16a34a' : b.buyer_confidence_score >= 40 ? '#d97706' : '#dc2626',
                                borderRadius: '2px'
                              }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>

                      {/* Status / Outcome */}
                      <td>
                        <span className={`badge ${
                          b.status === 'active' || b.lifecycle_outcome === 'SECOND_LIFE_DEPLOYED'
                            ? 'badge-green'
                            : b.status === 'quarantined' || b.lifecycle_outcome === 'QUARANTINE_HOLD'
                            ? 'badge-amber'
                            : 'badge-neutral'
                        }`}>
                          {b.status === 'active'
                            ? 'In Service'
                            : b.status === 'quarantined'
                            ? 'Under Review'
                            : b.lifecycle_outcome === 'RECYCLING_PROCESSED'
                            ? 'Recycled'
                            : b.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            borderColor: '#cbd5e1'
                          }}
                        >
                          <span>Inspect</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
