import { useMemo, useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { database } from '../lib/database';
import IosNavBar from './IosNavBar';

interface Props {
  shelfId: string;
  rowId: string;
  scanned: string[];
  onDone: () => void;
}

function productName(barcode: string): string {
  return database.find(barcode)?.ProductName || `รหัส: ${barcode}`;
}

/** สรุป 3 กลุ่มหลังยิงทวน — ตรงกัน / มีป้ายแต่ไม่ได้ลงทะเบียน / ลงทะเบียนแต่ไม่พบป้าย
 * ค่าเริ่มต้น: เพิ่มรายการที่ไม่ได้ลงทะเบียน = ติ๊ก, เก็บรายการที่หาไม่เจอ = ติ๊ก (ตาม spec) */
export default function CheckSummaryView({ shelfId, rowId, scanned, onDone }: Props) {
  const buildCheckSummary = useShelvesStore((s) => s.buildCheckSummary);
  const applyCheck = useShelvesStore((s) => s.applyCheck);

  const summary = useMemo(() => buildCheckSummary(shelfId, rowId, scanned), [buildCheckSummary, shelfId, rowId, scanned]);

  const [addUnregistered, setAddUnregistered] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(summary.unregistered.map((u) => [u.barcode, true])),
  );
  const [keepMissing, setKeepMissing] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(summary.missing.map((m) => [m.uid, true])),
  );

  const handleConfirm = () => {
    applyCheck(shelfId, rowId, scanned, { addUnregistered, keepMissing });
    onDone();
  };

  return (
    <>
      <IosNavBar title="สรุปผลยิงทวน" onBack={onDone} backLabel="ยกเลิก" />
      <div className="ios-body">
        <div className="ios-section">
          <div className="ios-section-header">✓ ตรงกัน ({summary.matchedBarcodes.length})</div>
          {summary.matchedBarcodes.length > 0 ? (
            <div className="ios-list">
              {summary.matchedBarcodes.map((b) => (
                <div className="ios-row" key={b} style={{ cursor: 'default' }}>
                  <div className="ios-row-main">
                    <div className="ios-row-title">{productName(b)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ios-empty" style={{ padding: 16 }}>
              ไม่มี
            </div>
          )}
        </div>

        <div className="ios-section">
          <div className="ios-section-header">+ มีป้ายแต่ไม่ได้ลงทะเบียน ({summary.unregistered.length})</div>
          {summary.unregistered.length > 0 ? (
            <div className="ios-list">
              {summary.unregistered.map((u) => (
                <div className="ios-row" key={u.barcode} style={{ cursor: 'default' }}>
                  <div className="ios-row-main">
                    <div className="ios-row-title">{productName(u.barcode)}</div>
                    {u.existingLocation && <div className="ios-row-subtitle">เดิมอยู่ {u.existingLocation.loc}</div>}
                  </div>
                  <button
                    type="button"
                    className={`ios-btn sm ${addUnregistered[u.barcode] ? 'filled green' : 'tinted gray'}`}
                    onClick={() => setAddUnregistered((s) => ({ ...s, [u.barcode]: !s[u.barcode] }))}
                  >
                    {addUnregistered[u.barcode] ? (u.existingLocation ? 'ย้ายมาแถวนี้' : 'เพิ่ม') : 'ข้าม'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="ios-empty" style={{ padding: 16 }}>
              ไม่มี
            </div>
          )}
        </div>

        <div className="ios-section">
          <div className="ios-section-header">? ลงทะเบียนแต่ไม่พบป้าย ({summary.missing.length})</div>
          {summary.missing.length > 0 ? (
            <div className="ios-list">
              {summary.missing.map((m) => (
                <div className="ios-row" key={m.uid} style={{ cursor: 'default' }}>
                  <div className="ios-row-main">
                    <div className="ios-row-title">{productName(m.barcode)}</div>
                  </div>
                  <button
                    type="button"
                    className={`ios-btn sm ${keepMissing[m.uid] !== false ? 'filled green' : 'tinted red'}`}
                    onClick={() => setKeepMissing((s) => ({ ...s, [m.uid]: !(s[m.uid] !== false) }))}
                  >
                    {keepMissing[m.uid] !== false ? 'เก็บไว้' : 'เอาออก'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="ios-empty" style={{ padding: 16 }}>
              ไม่มี
            </div>
          )}
        </div>

        <button type="button" className="ios-btn filled block" onClick={handleConfirm}>
          ยืนยัน
        </button>
        <button type="button" className="ios-btn tinted gray block" onClick={onDone}>
          ยกเลิก
        </button>
      </div>
    </>
  );
}
