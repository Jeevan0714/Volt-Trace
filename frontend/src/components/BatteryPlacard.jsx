import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, BatteryCharging, QrCode, Smartphone, Wifi, Copy, Check } from 'lucide-react';
import { fetchNetworkInfo } from '../api';

export default function BatteryPlacard({ battery }) {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [useNetworkIp, setUseNetworkIp] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchNetworkInfo().then((info) => {
      if (info && info.lan_ip) {
        setNetworkInfo(info);
      }
    });
  }, []);

  if (!battery) return null;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // When on localhost, default to using the PC's Wi-Fi / LAN IP so phones scanning from the monitor can reach the PC!
  const resolvedOrigin =
    isLocalhost && networkInfo?.lan_ip && useNetworkIp
      ? `http://${networkInfo.lan_ip}:${window.location.port || '5173'}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://volttrace.io';

  const passportUrl = `${resolvedOrigin}/?id=${battery.id}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(passportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="placard-container" id="battery-placard-printable">
        <div className="placard-screws tl"></div>
        <div className="placard-screws tr"></div>
        <div className="placard-screws bl"></div>
        <div className="placard-screws br"></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <BatteryCharging size={20} color="#38bdf8" />
              <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', color: '#f8fafc' }}>
                VOLTTRACE DIGITAL BATTERY PASSPORT
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              DATA CARRIER IDENTIFIER • ISO 15118-20 • GS1 DIGITAL LINK
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', background: '#0284c7', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
              PASSPORT CARRIER: GS1-DL
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Battery Identifier</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
                {battery.id}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Cell Electrochemistry</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                {battery.chemistry}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Rated Nameplate Capacity</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                {battery.rated_capacity_kwh} kWh ({battery.nominal_voltage}V)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Production Date & OEM</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                {battery.mfg_date} | {battery.manufacturer}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Submitting Organization / Fleet</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                {battery.current_owner}
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', minWidth: '150px' }}>
            <QRCodeSVG
              value={passportUrl}
              size={130}
              level="H"
              includeMargin={false}
            />
            <span style={{ fontSize: '0.65rem', color: '#0f172a', fontWeight: 800, marginTop: '0.45rem', letterSpacing: '0.05em' }}>
              SCAN PASSPORT
            </span>
            {isLocalhost && networkInfo?.lan_ip && (
              <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>
                  Target: {useNetworkIp ? 'Wi-Fi IP (Phone Ready)' : 'localhost'}
                </span>
                <button
                  type="button"
                  onClick={() => setUseNetworkIp(!useNetworkIp)}
                  style={{ fontSize: '0.58rem', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', textDecoration: 'underline' }}
                >
                  Toggle to {useNetworkIp ? 'localhost' : 'Wi-Fi IP'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ border: '1px solid #475569', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>DPP Data Carrier</span>
            <span style={{ border: '1px solid #475569', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>SHA-256 Hashed</span>
            <span>Record Reference: {battery.uuid?.slice(0, 18)}...</span>
          </div>
          <div>
            <span>VoltTrace Ledger v1.0</span>
          </div>
        </div>
      </div>

      {/* Helpful Mobile Link Bar */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem 0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Smartphone size={15} color="var(--primary)" />
          <span><strong>QR Target URL:</strong> <code style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{passportUrl}</code></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
          >
            {copied ? <Check size={12} color="var(--verified-green)" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
            <Printer size={12} /> Print Placard
          </button>
        </div>
      </div>
    </div>
  );
}
