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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-500/40">
              <Wrench className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Mandatory Service Work Orders & Provenance Enforcement</h3>
              <p className="text-xs text-slate-300">
                Battery {battery.id} &bull; Policy VT-202 (No Closure Without Diagnostic Proof)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Explainer Banner */}
        <div className="px-6 py-2.5 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            <strong>Anti-Dead Ledger Rule:</strong> Work orders cannot be closed without attaching an accredited diagnostic report and SHA-256 hash. Real-world service software blocks technician sign-off until data is submitted.
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex gap-4 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Work Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'open'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Open Work Order
          </button>
          <button
            onClick={() => {
              if (openOrders.length > 0 && !selectedOrderId) {
                setSelectedOrderId(openOrders[0].id);
              }
              setActiveTab('complete');
            }}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'complete'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Close / Authorize Order ({openOrders.length} Open)
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-0.5">Closure Blocked by Policy VT-202</div>
                <div>{errorMessage}</div>
              </div>
            </div>
          )}

          {/* TAB 1: LIST ORDERS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No service work orders recorded for this battery.
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{o.id}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            o.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(o.opened_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">{o.description}</div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">Service Center:</span>{' '}
                        <span className="font-medium text-slate-700">{o.service_center}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Technician:</span>{' '}
                        <span className="font-medium text-slate-700">{o.technician_id}</span>
                      </div>
                      {o.status === 'COMPLETED' ? (
                        <div>
                          <span className="text-slate-400">Recorded SoH:</span>{' '}
                          <span className="font-bold text-emerald-700">{o.reported_soh}%</span>
                        </div>
                      ) : (
                        <div className="text-amber-700 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Awaiting Diagnostic Proof
                        </div>
                      )}
                    </div>

                    {o.action_taken && (
                      <div className="text-[11px] bg-slate-50 p-2 rounded text-slate-600 mt-1 border border-slate-100">
                        <strong>Action Taken:</strong> {o.action_taken}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: OPEN NEW ORDER */}
          {activeTab === 'open' && (
            <form onSubmit={handleOpenOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Technician ID</label>
                  <input
                    type="text"
                    required
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. TECH-409"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Center / Hub</label>
                  <input
                    type="text"
                    required
                    value={serviceCenter}
                    onChange={(e) => setServiceCenter(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Zypp Central Fleet Hub"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order Description</label>
                <textarea
                  rows={3}
                  required
                  value={orderDesc}
                  onChange={(e) => setOrderDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe maintenance scope (e.g. Scheduled 50,000 km battery pack service and cell impedance balance check)"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  {loading ? 'Opening...' : 'Open Work Order'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: COMPLETE WORK ORDER */}
          {activeTab === 'complete' && (
            <form onSubmit={handleCompleteOrder} className="space-y-4">
              {openOrders.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  There are no open work orders for this battery right now. Click "Open Work Order" above to create one.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Open Work Order</label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {openOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id} &mdash; {o.description} ({o.service_center})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Recorded SoH (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={reportedSoH}
                        onChange={(e) => setReportedSoH(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 81.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Measured Capacity (kWh)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={measuredCapacity}
                        onChange={(e) => setMeasuredCapacity(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 61.2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cell Variance (mV)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={cellVariance}
                        onChange={(e) => setCellVariance(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 14.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Mandatory Diagnostic Document Attachment</span>
                      <span className="text-[11px] text-indigo-600 font-normal">Policy VT-202 Mandatory Field</span>
                    </label>
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">-- Select Attached Diagnostic File -- (Required for Closure)</option>
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.file_name} ({d.issuer_name}) &mdash; {d.integrity_status}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      If left empty, closure is blocked. If a tampered document is chosen, cryptographic failure prevents ledger sign-off.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Action Taken</label>
                    <input
                      type="text"
                      required
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Contactors tested, cell balance aligned, diagnostic benchmark attached."
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
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
