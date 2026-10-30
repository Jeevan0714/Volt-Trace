import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { verifyDocumentIntegrity } from '../api';

export default function TamperSimulator({ batteryId, documents = [], onVerificationComplete }) {
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!documents || documents.length === 0) return null;

  const handleVerify = async (simulateTamper = false) => {
    if (!selectedDocId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyDocumentIntegrity(batteryId, selectedDocId, simulateTamper);
      setResult(res);
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      alert(err.message || 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  return (
    <div style={{ background: '#0f172a', color: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            LIVE DEMO VERIFICATION TOOL
          </span>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '0.1rem' }}>
            Cryptographic SHA-256 Hash Verifier & Tamper Catch
          </h4>
        </div>

        <select
          value={selectedDocId}
          onChange={(e) => { setSelectedDocId(e.target.value); setResult(null); }}
          style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #475569', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.file_name} ({d.integrity_status})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
        <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Registered Reference Hash</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8', wordBreak: 'break-all', marginTop: '0.2rem' }}>
            {selectedDoc?.file_hash_sha256}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Registered Issuer & Tier</div>
          <div style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600, marginTop: '0.2rem' }}>
            {selectedDoc?.issuer_name} • <span style={{ color: '#34d399' }}>{selectedDoc?.trust_tier}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleVerify(false)}
          disabled={loading}
          className="btn btn-secondary"
          style={{ background: '#1e293b', color: '#34d399', borderColor: '#059669', fontSize: '0.82rem' }}
        >
          <CheckCircle2 size={15} />
          {loading ? 'Calculating Hash...' : 'Verify Authentic File'}
        </button>

        <button
          onClick={() => handleVerify(true)}
          disabled={loading}
          className="btn btn-danger"
          style={{ fontSize: '0.82rem' }}
        >
          <AlertTriangle size={15} />
          {loading ? 'Calculating...' : 'Simulate File Tampering (Altered Byte)'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '8px', background: result.is_valid ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.25)', border: `1px solid ${result.is_valid ? '#059669' : '#dc2626'}` }} className="animate-fade">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: result.is_valid ? '#34d399' : '#f87171' }}>
            {result.is_valid ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{result.message}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Target:</span> {result.file_name}
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Recalculated Hash:</span>{' '}
              <span style={{ color: result.is_valid ? '#34d399' : '#f87171' }}>
                {result.recalculated_hash}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
