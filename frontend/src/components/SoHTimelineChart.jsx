import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function SoHTimelineChart({ diagnostics = [] }) {
  if (!diagnostics || diagnostics.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
        No historical diagnostic data recorded yet.
      </div>
    );
  }

  // Sort chronological for graph display
  const chartData = [...diagnostics]
    .sort((a, b) => new Date(a.test_date) - new Date(b.test_date))
    .map((item) => ({
      date: new Date(item.test_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      fullDate: new Date(item.test_date).toLocaleDateString(),
      soh: item.reported_soh,
      capacity: item.measured_capacity_kwh,
      source: item.source_label,
      org: item.testing_org,
      method: item.test_method,
    }));

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="sohGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
          <YAxis domain={[50, 100]} tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="soh"
            stroke="#2563eb"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#sohGradient)"
            dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 7 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>{data.fullDate}</div>
        <div style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.95rem' }}>
          SoH: {data.soh}% ({data.capacity} kWh)
        </div>
        <div style={{ color: '#64748b', marginTop: '0.25rem' }}>
          Org: <strong>{data.org}</strong>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
          Source: <span style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{data.source}</span>
        </div>
      </div>
    );
  }
  return null;
}
