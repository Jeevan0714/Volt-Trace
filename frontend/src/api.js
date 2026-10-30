const API_BASE = '/api/v1';

export async function fetchStatsSummary() {
  const res = await fetch(`${API_BASE}/stats/summary`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchBatteries(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.chemistry) query.append('chemistry', params.chemistry);
  if (params.status) query.append('status', params.status);

  const res = await fetch(`${API_BASE}/batteries?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch batteries list');
  return res.json();
}

export async function fetchBatteryDetail(batteryId) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch battery details');
  }
  return res.json();
}

export async function registerBattery(payload) {
  const res = await fetch(`${API_BASE}/batteries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to register battery');
  }
  return res.json();
}

export async function uploadDocument(batteryId, formData) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function verifyDocumentIntegrity(batteryId, docId, simulateTamper = false) {
  const res = await fetch(
    `${API_BASE}/batteries/${batteryId}/documents/${docId}/verify?simulate_tamper=${simulateTamper}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Failed to verify document integrity');
  return res.json();
}

export async function addDiagnosticRecord(batteryId, payload) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}/diagnostics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to record diagnostic test');
  }
  return res.json();
}

export async function fetchAuditChain() {
  const res = await fetch(`${API_BASE}/audit/chain`);
  if (!res.ok) throw new Error('Failed to fetch audit chain');
  return res.json();
}

export async function verifyAuditChainIntegrity() {
  const res = await fetch(`${API_BASE}/audit/verify`);
  if (!res.ok) throw new Error('Failed to verify audit chain integrity');
  return res.json();
}

export async function updateBatteryOutcome(batteryId, payload) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}/outcome`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update lifecycle outcome');
  }
  return res.json();
}

export async function fetchServiceOrders(batteryId) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}/service-orders`);
  if (!res.ok) throw new Error('Failed to fetch service orders');
  return res.json();
}

export async function openServiceOrder(batteryId, payload) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}/service-orders/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to open service order');
  }
  return res.json();
}

export async function completeServiceOrder(batteryId, orderId, payload) {
  const res = await fetch(`${API_BASE}/batteries/${batteryId}/service-orders/${orderId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to complete service order');
  }
  return res.json();
}
