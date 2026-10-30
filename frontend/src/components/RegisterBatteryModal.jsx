import React, { useState } from 'react';
import { X, BatteryCharging, CheckCircle2 } from 'lucide-react';
import { registerBattery } from '../api';

export default function RegisterBatteryModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    id: `VT-${Math.floor(1000 + Math.random() * 9000)}`,
    manufacturer: 'Tata AutoComp Systems Ltd',
    model: 'Pack-50-LFP',
    chemistry: 'LFP',
    rated_capacity_kwh: 50.0,
    nominal_voltage: 320.0,
    mfg_date: new Date().toISOString().split('T')[0],
    vehicle_info: 'BluSmart Mobility Fleet #302',
    current_owner: 'BluSmart Fleet Operations Ltd'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await registerBattery({
        ...formData,
        rated_capacity_kwh: parseFloat(formData.rated_capacity_kwh),
        nominal_voltage: parseFloat(formData.nominal_voltage)
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BatteryCharging size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Register New EV Battery</h3>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {error && (
              <div style={{ gridColumn: 'span 2', padding: '0.75rem', background: 'var(--danger-red-bg)', color: 'var(--danger-red)', borderRadius: '8px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Battery Identifier *</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cell Chemistry *</label>
              <select
                value={formData.chemistry}
                onChange={(e) => setFormData({ ...formData, chemistry: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              >
                <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                <option value="NMC 811">NMC 811 (High Energy Density)</option>
                <option value="NMC 622">NMC 622 (Balanced Cathode)</option>
                <option value="NCA">NCA (Nickel Cobalt Aluminum)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Manufacturer *</label>
              <input
                type="text"
                required
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Battery Model *</label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Rated Capacity (kWh) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.rated_capacity_kwh}
                onChange={(e) => setFormData({ ...formData, rated_capacity_kwh: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nominal Voltage (V) *</label>
              <input
                type="number"
                step="1"
                required
                value={formData.nominal_voltage}
                onChange={(e) => setFormData({ ...formData, nominal_voltage: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Manufacturing Date *</label>
              <input
                type="date"
                required
                value={formData.mfg_date}
                onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Submitting Fleet / Owner *</label>
              <input
                type="text"
                required
                value={formData.current_owner}
                onChange={(e) => setFormData({ ...formData, current_owner: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Vehicle / Source Info</label>
              <input
                type="text"
                value={formData.vehicle_info}
                onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <CheckCircle2 size={16} />
              {loading ? 'Minting Digital Passport...' : 'Register & Generate Placard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
