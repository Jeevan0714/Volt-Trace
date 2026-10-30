import React, { useState } from 'react';
import {
  Wrench,
  X,
  Plus,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  Building,
  Lock,
  ArrowRight
} from 'lucide-react';
import { openServiceOrder, completeServiceOrder } from '../api';

export function ServiceWorkOrderModal({ battery, isOpen, onClose, onOrderUpdated }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'open', 'complete'
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // New order state
  const [technicianId, setTechnicianId] = useState('TECH-409');
  const [serviceCenter, setServiceCenter] = useState('Zypp Mobility Central Hub Bangalore');
  const [orderDesc, setOrderDesc] = useState('');

  // Complete order state
  const [closingTechId, setClosingTechId] = useState('TECH-409');
  const [reportedSoH, setReportedSoH] = useState('');
  const [measuredCapacity, setMeasuredCapacity] = useState('');
  const [cellVariance, setCellVariance] = useState('12.5');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen || !battery) return null;

  const orders = battery.service_orders || [];
  const openOrders = orders.filter((o) => o.status === 'OPEN');
  const documents = battery.documents || [];

  const handleOpenOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await openServiceOrder(battery.id, {
        technician_id: technicianId,
        service_center: serviceCenter,
        description: orderDesc || 'Routine scheduled battery maintenance and impedance diagnostic check',
      });
      setSuccessMessage('Service Work Order opened successfully. Battery passport updated.');
      setOrderDesc('');
      if (onOrderUpdated) onOrderUpdated();
      setActiveTab('list');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to open service order');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setErrorMessage('Please select an open work order to close.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await completeServiceOrder(battery.id, selectedOrderId, {
        technician_id: closingTechId,
        reported_soh: parseFloat(reportedSoH),
        measured_capacity_kwh: parseFloat(measuredCapacity),
        cell_variance_mv: parseFloat(cellVariance || 0),
        diagnostic_document_id: selectedDocId || null,
        action_taken: actionTaken || 'Contactors inspected, cell balance validated, diagnostic log uploaded.',
        notes: completionNotes || 'Closed in compliance with DPP maintenance integrity rules.',
      });
      setSuccessMessage(`Work Order ${selectedOrderId} completed and verified against DPP ledger!`);
      if (onOrderUpdated) onOrderUpdated();
      setActiveTab('list');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="swo-overlay" onClick={onClose}>
      <div className="swo-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="swo-header">
          <div className="swo-header-left">
            <div className="swo-header-icon">
              <Wrench size={19} />
            </div>
            <div>
              <div className="swo-title">Mandatory Service Work Orders &amp; Provenance Enforcement</div>
              <div className="swo-subtitle">
                Battery {battery.id} &bull; Policy VT-202 (No Closure Without Diagnostic Proof)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="swo-close-btn"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Policy Explainer Banner */}
        <div className="swo-policy-banner">
          <Lock size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Anti-Dead Ledger Rule:</strong> Work orders cannot be closed without attaching an accredited diagnostic report and SHA-256 hash. Real-world service software blocks technician sign-off until cryptographic proof is submitted.
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="swo-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`swo-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          >
            <span>Work Orders</span>
            <span className="swo-tab-count">{orders.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`swo-tab-btn ${activeTab === 'open' ? 'active' : ''}`}
          >
            <Plus size={14} />
            <span>Open Work Order</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (openOrders.length > 0 && !selectedOrderId) {
                setSelectedOrderId(openOrders[0].id);
              }
              setActiveTab('complete');
            }}
            className={`swo-tab-btn ${activeTab === 'complete' ? 'active' : ''}`}
          >
            <CheckCircle size={14} />
            <span>Close / Authorize Order</span>
            {openOrders.length > 0 && (
              <span className="swo-tab-count" style={{ background: '#fef3c7', color: '#b45309' }}>
                {openOrders.length} Open
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="swo-body">
          {successMessage && (
            <div className="swo-alert-success">
              <CheckCircle size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="swo-alert-error">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Closure Blocked by Policy VT-202</strong>
                <div>{errorMessage}</div>
              </div>
            </div>
          )}

          {/* TAB 1: LIST ORDERS */}
          {activeTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {orders.length === 0 ? (
                <div className="swo-empty-state">
                  No service work orders recorded for this battery yet. Click "Open Work Order" above to log a technician intake.
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="swo-order-card">
                    <div className="swo-order-head">
                      <div className="swo-order-id-group">
                        <span className="swo-order-id">{o.id}</span>
                        <span className={o.status === 'COMPLETED' ? 'swo-badge-completed' : 'swo-badge-open'}>
                          {o.status}
                        </span>
                      </div>
                      <div className="swo-order-date">
                        <Calendar size={13} />
                        {new Date(o.opened_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    <div className="swo-order-desc">{o.description}</div>

                    <div className="swo-order-grid">
                      <div className="swo-order-grid-item">
                        <span className="swo-order-grid-label">Service Center</span>
                        <span className="swo-order-grid-val">{o.service_center}</span>
                      </div>
                      <div className="swo-order-grid-item">
                        <span className="swo-order-grid-label">Technician</span>
                        <span className="swo-order-grid-val">{o.technician_id}</span>
                      </div>
                      <div className="swo-order-grid-item">
                        <span className="swo-order-grid-label">Recorded Health</span>
                        {o.status === 'COMPLETED' ? (
                          <span className="swo-order-grid-val good">{o.reported_soh}% SoH</span>
                        ) : (
                          <span className="swo-order-grid-val pending">
                            <Lock size={12} /> Awaiting Diagnostic Proof
                          </span>
                        )}
                      </div>
                    </div>

                    {o.action_taken && (
                      <div className="swo-order-action">
                        <strong style={{ color: '#1e293b' }}>Action Taken:</strong> {o.action_taken}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: OPEN NEW ORDER */}
          {activeTab === 'open' && (
            <form onSubmit={handleOpenOrder} className="swo-form">
              <div className="swo-form-grid-2">
                <div className="swo-form-group">
                  <label className="swo-label">Technician ID</label>
                  <input
                    type="text"
                    required
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="swo-input"
                    placeholder="e.g. TECH-409"
                  />
                </div>
                <div className="swo-form-group">
                  <label className="swo-label">Service Center / Hub</label>
                  <input
                    type="text"
                    required
                    value={serviceCenter}
                    onChange={(e) => setServiceCenter(e.target.value)}
                    className="swo-input"
                    placeholder="e.g. Zypp Central Fleet Hub"
                  />
                </div>
              </div>

              <div className="swo-form-group">
                <label className="swo-label">Work Order Description</label>
                <textarea
                  rows={3}
                  required
                  value={orderDesc}
                  onChange={(e) => setOrderDesc(e.target.value)}
                  className="swo-textarea"
                  placeholder="Describe maintenance scope (e.g. Scheduled 50,000 km battery pack service and cell impedance balance check)"
                />
              </div>

              <div className="swo-form-actions">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="swo-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="swo-btn-primary"
                >
                  {loading ? 'Opening...' : 'Open Work Order'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: COMPLETE WORK ORDER */}
          {activeTab === 'complete' && (
            <form onSubmit={handleCompleteOrder} className="swo-form">
              {openOrders.length === 0 ? (
                <div className="swo-empty-state">
                  There are no open work orders for this battery right now. Click "Open Work Order" above to create one.
                </div>
              ) : (
                <>
                  <div className="swo-form-group">
                    <label className="swo-label">Select Open Work Order</label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="swo-select"
                      required
                    >
                      {openOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id} &mdash; {o.description} ({o.service_center})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="swo-form-grid-3">
                    <div className="swo-form-group">
                      <label className="swo-label">Recorded SoH (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={reportedSoH}
                        onChange={(e) => setReportedSoH(e.target.value)}
                        className="swo-input"
                        placeholder="e.g. 81.5"
                      />
                    </div>
                    <div className="swo-form-group">
                      <label className="swo-label">Capacity (kWh)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={measuredCapacity}
                        onChange={(e) => setMeasuredCapacity(e.target.value)}
                        className="swo-input"
                        placeholder="e.g. 61.2"
                      />
                    </div>
                    <div className="swo-form-group">
                      <label className="swo-label">Cell Variance (mV)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={cellVariance}
                        onChange={(e) => setCellVariance(e.target.value)}
                        className="swo-input"
                        placeholder="e.g. 14.0"
                      />
                    </div>
                  </div>

                  <div className="swo-form-group">
                    <label className="swo-label">
                      <span>Mandatory Diagnostic Document Attachment</span>
                      <span className="swo-label-tag">Policy VT-202 Mandatory Field</span>
                    </label>
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="swo-select"
                      required
                    >
                      <option value="">-- Select Attached Diagnostic File -- (Required for Closure)</option>
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.file_name} ({d.issuer_name}) &mdash; {d.integrity_status}
                        </option>
                      ))}
                    </select>
                    <div className="swo-form-help">
                      If left empty, closure is blocked. If a tampered document is chosen, cryptographic failure prevents ledger sign-off.
                    </div>
                  </div>

                  <div className="swo-form-group">
                    <label className="swo-label">Action Taken</label>
                    <input
                      type="text"
                      required
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      className="swo-input"
                      placeholder="e.g. Contactors tested, cell balance aligned, diagnostic benchmark attached."
                    />
                  </div>

                  <div className="swo-form-actions">
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="swo-btn-secondary"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="swo-btn-primary"
                    >
                      <CheckCircle size={15} />
                      {loading ? 'Verifying & Closing...' : 'Authorize Work Order Closure'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
