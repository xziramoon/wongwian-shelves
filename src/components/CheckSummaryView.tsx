import { useMemo, useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { database } from '../lib/database';

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
    <div className="screen">
      <div className="shelf-screen-header">
        <button type="button" className="back-btn" onClick={onDone}>
          ‹ ยกเลิก
        </button>
      </div>
      <div className="p-lbl">สรุปผลยิงทวน</div>

      <div>
        <div className="check-group-title">✓ ตรงกัน ({summary.matchedBarcodes.length})</div>
        {summary.matchedBarcodes.map((b) => (
          <div className="check-row" key={b}>
            <span className="check-row-name">{productName(b)}</span>
          </div>
        ))}
        {summary.matchedBarcodes.length === 0 && <div className="row-card-meta">— ไม่มี —</div>}
      </div>

      <div>
        <div className="check-group-title">+ มีป้ายแต่ไม่ได้ลงทะเบียน ({summary.unregistered.length})</div>
        {summary.unregistered.map((u) => (
          <div className="check-row" key={u.barcode}>
            <span className="check-row-name">
              {productName(u.barcode)}
              {u.existingLocation && <span className="row-item-meta"> · เดิมอยู่ {u.existingLocation.loc}</span>}
            </span>
            <button
              type="button"
              className={`toggle-btn ${addUnregistered[u.barcode] ? 'on' : 'off'}`}
              onClick={() => setAddUnregistered((s) => ({ ...s, [u.barcode]: !s[u.barcode] }))}
            >
              {addUnregistered[u.barcode] ? (u.existingLocation ? 'ย้ายมาแถวนี้' : 'เพิ่ม') : 'ข้าม'}
            </button>
          </div>
        ))}
        {summary.unregistered.length === 0 && <div className="row-card-meta">— ไม่มี —</div>}
      </div>

      <div>
        <div className="check-group-title">? ลงทะเบียนแต่ไม่พบป้าย ({summary.missing.length})</div>
        {summary.missing.map((m) => (
          <div className="check-row" key={m.uid}>
            <span className="check-row-name">{productName(m.barcode)}</span>
            <button
              type="button"
              className={`toggle-btn ${keepMissing[m.uid] !== false ? 'on' : 'off'}`}
              onClick={() => setKeepMissing((s) => ({ ...s, [m.uid]: !(s[m.uid] !== false) }))}
            >
              {keepMissing[m.uid] !== false ? 'เก็บไว้' : 'เอาออก'}
            </button>
          </div>
        ))}
        {summary.missing.length === 0 && <div className="row-card-meta">— ไม่มี —</div>}
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          ยกเลิก
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          ยืนยัน
        </button>
      </div>
    </div>
  );
}
