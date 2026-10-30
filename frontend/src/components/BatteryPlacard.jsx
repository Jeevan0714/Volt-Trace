import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Shield, CheckCircle2, BatteryCharging } from 'lucide-react';

export default function BatteryPlacard({ battery }) {
  if (!battery) return null;

  // The QR link points to the public digital passport URI
  const passportUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?id=${battery.id}`
    : `https://volttrace.io/passport/${battery.id}`;

  const handlePrint = () => {
    window.print();
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
              ISO 15118-20 • EU REGULATION 2023/1542 • INDIA BWMR 2022
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

          <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            <QRCodeSVG
              value={passportUrl}
              size={130}
              level="H"
              includeMargin={false}
            />
            <span style={{ fontSize: '0.65rem', color: '#0f172a', fontWeight: 700, marginTop: '0.4rem', letterSpacing: '0.05em' }}>
              SCAN TO VERIFY
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ border: '1px solid #64748b', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>CE</span>
            <span style={{ border: '1px solid #64748b', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>UN 38.3</span>
            <span style={{ border: '1px solid #64748b', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>WEEE ♻️</span>
            <span>EPR Reg: IND-BWMR-2022-841</span>
          </div>
          <div>
            <span>UUID: {battery.uuid?.slice(0, 24)}...</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button onClick={handlePrint} className="btn btn-secondary">
          <Printer size={15} /> Print Physical Label Placard
        </button>
      </div>
    </div>
  );
}
