import { useRef } from 'react';
import { useConfigStore } from '../store/configStore';
import { useUIStore } from '../store/uiStore';
import { useShelvesStore } from '../store/shelvesStore';
import { database } from '../lib/database';
import type { QueueItem } from '../types';
import TagPreview from './TagPreview';
import SliderRow from './SliderRow';

/* placeholder shown in the embedded preview when the queue is still empty */
const PLACEHOLDER_ITEM: QueueItem = {
  Barcode: '8850000000012',
  ProductName: 'ตัวอย่างชื่อสินค้า',
  NameFontSize: 0,
  TagMode: 'standard',
  DualStyle: 'A',
  OldPrice: '',
  Price: '39.00',
  Price2: '',
  PriceOffsetX: 0,
  Size: '',
  Unit: 'ชิ้น',
  Unit1: '',
  Unit2: '',
  PackType: '',
  Ribbon: '',
  Mfg: '',
  Exp: '',
  Image: '',
  PrintQty: 1,
  PriceDiff: null,
  OosEta: '',
  OosReason: 'temp',
  Loc: '',
  Printed: '',
};

/* global tag-design editor — reachable via the gear-icon pill (top-right, mirrors
 * .conn-status top-left / .queue-badge bottom-right so nothing overlaps). Presets +
 * always-visible basics up top, ~12 SliderRows tucked under a <details> fold so the
 * common case (pick a preset, maybe change the header text) doesn't need scrolling
 * past a wall of sliders. */
function fmtDaysAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'วันนี้';
  return `${days} วันก่อน`;
}

export default function SettingsSheet() {
  const open = useUIStore((s) => s.settingsSheetOpen);
  const setOpen = useUIStore((s) => s.setSettingsSheetOpen);
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const applyPreset = useConfigStore((s) => s.applyPreset);

  const exportFile = useShelvesStore((s) => s.exportFile);
  const importFile = useShelvesStore((s) => s.importFile);
  const markBackedUp = useShelvesStore((s) => s.markBackedUp);
  const removed = useShelvesStore((s) => s.removed);
  const showToast = useUIStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleExport = () => {
    const file = exportFile();
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `SHELVES_${dateStr}.json`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    markBackedUp();
    showToast('สำรองข้อมูลเรียบร้อย', 'success');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!confirm('นำเข้าข้อมูลนี้จะเขียนทับข้อมูลชั้นวางทั้งหมดในเครื่องนี้ ยืนยันหรือไม่?')) return;
        const res = importFile(data);
        if (res.ok) showToast('นำเข้าข้อมูลเรียบร้อย', 'success');
        else showToast(res.error || 'ไฟล์ข้อมูลไม่ถูกต้อง', 'error');
      } catch {
        showToast('ไฟล์ข้อมูลเสียหาย อ่านไม่ได้', 'error');
      }
    };
    reader.readAsText(file);
  };

  const removedSorted = [...removed].sort((a, b) => b.removedAt - a.removedAt);

  const previewItem = PLACEHOLDER_ITEM;

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="sheet sheet-full settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>ออกแบบป้ายราคา</span>
          <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="ปิด">
            ✕
          </button>
        </div>

        <TagPreview item={previewItem} config={config} />

        <div className="preset-row">
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('S')}>
            เล็ก
          </button>
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('M')}>
            มาตรฐาน
          </button>
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('L')}>
            ใหญ่
          </button>
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('XL')}>
            ป้ายใหญ่
          </button>
        </div>

        <div className="cfg-grid">
          <div className="cfg-full">
            <span className="cfg-lbl">ชื่อร้านบนหัวป้าย</span>
            <input className="inp" value={config.header} onChange={(e) => updateConfig('header', e.target.value)} />
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">ฟอนต์ตัวหนังสือบนป้าย</span>
            <select className="inp" value={config.font} onChange={(e) => updateConfig('font', e.target.value)}>
              <option value="'Kanit',sans-serif">Kanit</option>
              <option value="'Prompt',sans-serif">Prompt</option>
              <option value="'Sarabun',sans-serif">Sarabun</option>
              <option value="'Mitr',sans-serif">Mitr</option>
            </select>
          </div>

          <div>
            <span className="cfg-lbl">คำนำหน้า "ขนาด"</span>
            <input className="inp" value={config.labelSize} onChange={(e) => updateConfig('labelSize', e.target.value)} />
          </div>
          <div>
            <span className="cfg-lbl">คำนำหน้า "บรรจุ"</span>
            <input className="inp" value={config.labelUnit} onChange={(e) => updateConfig('labelUnit', e.target.value)} />
          </div>
          <div className="cfg-full">
            <span className="cfg-lbl">คำว่า "ปลีก" (ป้ายโชว์ 2 ราคา แบบ A)</span>
            <input
              className="inp"
              value={config.labelRetail}
              onChange={(e) => updateConfig('labelRetail', e.target.value)}
              placeholder="เช่น ปลีก, ราคาปกติ, ขายปลีก"
            />
          </div>
        </div>

        <div className="cb-wrap">
          <input
            type="checkbox"
            id="invert-baht"
            checked={!!config.invertBaht}
            onChange={(e) => updateConfig('invertBaht', e.target.checked)}
          />
          <label htmlFor="invert-baht">ถมดำพื้นหลังคำว่า "บาท"</label>
        </div>

        <div className="panel">
          <div className="p-lbl">ข้อมูลชั้นวาง</div>
          <div className="sheet-actions">
            <button type="button" className="btn btn-secondary" onClick={handleExport}>
              สำรองข้อมูล
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleImportClick}>
              นำเข้าข้อมูล
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        </div>

        <details className="fold">
          <summary>
            ประวัติยิงออก ({removedSorted.length})<span className="fold-arrow">▾</span>
          </summary>
          <div className="fold-body">
            {removedSorted.length === 0 && <div className="row-card-meta">ยังไม่มีประวัติ</div>}
            {removedSorted.slice(0, 200).map((r, i) => (
              <div className="check-row" key={`${r.barcode}-${r.removedAt}-${i}`}>
                <span className="check-row-name">
                  {database.find(r.barcode)?.ProductName || `รหัส: ${r.barcode}`} · เดิมอยู่ {r.loc}
                </span>
                <span className="row-item-meta">{fmtDaysAgo(r.removedAt)}</span>
              </div>
            ))}
          </div>
        </details>

        <details className="fold">
          <summary>
            ตั้งค่าขั้นสูง<span className="fold-arrow">▾</span>
          </summary>
          <div className="fold-body">
            <div className="panel">
              <div className="p-lbl">ตั้งค่าป้ายปกติ</div>
              <div className="slider-stack">
                <SliderRow configKey="w" full />
                <SliderRow configKey="h" full />
                <SliderRow configKey="bcHeight" full />

                <span className="cfg-lbl cfg-sec-lbl">ขนาดตัวหนังสือ (px)</span>
                <SliderRow configKey="globalNameSz" full />
                <SliderRow configKey="priceSz" full />
                <SliderRow configKey="dualSz" full />
                <SliderRow configKey="metaSz" full />

                <span className="cfg-lbl cfg-sec-lbl">ริบบิ้นมุมป้าย</span>
                <SliderRow configKey="ribbonSz" full />
                <SliderRow configKey="ribbonX" full />
                <SliderRow configKey="ribbonY" full />
              </div>
            </div>

            <div className="panel">
              <div className="p-lbl">ตั้งค่าป้ายใหญ่</div>
              <div className="slider-stack">
                <SliderRow configKey="largeW" full />
                <SliderRow configKey="largeH" full />
                <SliderRow configKey="bcHeightLrg" full />
              </div>
            </div>

            <div className="panel">
              <div className="p-lbl">ตั้งค่าแถบสินค้าหมด</div>
              <div className="slider-stack">
                <SliderRow configKey="oosW" full />
                <SliderRow configKey="oosH" full />
                <SliderRow configKey="oosSz" full />
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
