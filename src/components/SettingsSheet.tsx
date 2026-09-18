import { useRef, useState } from 'react';
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
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    <div className="ios-sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="ios-sheet" style={{ height: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="ios-sheet-handle" />
        <div className="ios-sheet-header">
          <span className="ios-sheet-title">ตั้งค่า</span>
          <button type="button" className="ios-btn plain" onClick={() => setOpen(false)}>
            เสร็จ
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TagPreview item={previewItem} config={config} />
          </div>

          <div className="ios-section">
            <div className="ios-section-header">ขนาดสำเร็จรูป</div>
            <div className="ios-segmented">
              <button type="button" className="ios-segmented-option" onClick={() => applyPreset('S')}>
                เล็ก
              </button>
              <button type="button" className="ios-segmented-option" onClick={() => applyPreset('M')}>
                มาตรฐาน
              </button>
              <button type="button" className="ios-segmented-option" onClick={() => applyPreset('L')}>
                ใหญ่
              </button>
              <button type="button" className="ios-segmented-option" onClick={() => applyPreset('XL')}>
                ป้ายใหญ่
              </button>
            </div>
          </div>

          <div className="ios-section">
            <div className="ios-section-header">หัวป้าย</div>
            <div className="ios-list">
              <div className="ios-row" style={{ cursor: 'default' }}>
                <div className="ios-row-main">
                  <span className="ios-field-label">ชื่อร้านบนหัวป้าย</span>
                  <input className="ios-input" value={config.header} onChange={(e) => updateConfig('header', e.target.value)} />
                </div>
              </div>
              <div className="ios-row" style={{ cursor: 'default' }}>
                <div className="ios-row-main">
                  <span className="ios-field-label">ฟอนต์ตัวหนังสือบนป้าย</span>
                  <select className="ios-input" value={config.font} onChange={(e) => updateConfig('font', e.target.value)}>
                    <option value="'Kanit',sans-serif">Kanit</option>
                    <option value="'Prompt',sans-serif">Prompt</option>
                    <option value="'Sarabun',sans-serif">Sarabun</option>
                    <option value="'Mitr',sans-serif">Mitr</option>
                  </select>
                </div>
              </div>
              <div className="ios-row" style={{ cursor: 'default' }}>
                <div className="ios-row-main">
                  <span className="ios-field-label">คำนำหน้า "ขนาด" / "บรรจุ"</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="ios-input" value={config.labelSize} onChange={(e) => updateConfig('labelSize', e.target.value)} />
                    <input className="ios-input" value={config.labelUnit} onChange={(e) => updateConfig('labelUnit', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="ios-row" style={{ cursor: 'default' }}>
                <div className="ios-row-main">
                  <span className="ios-field-label">คำว่า "ปลีก" (ป้ายโชว์ 2 ราคา แบบ A)</span>
                  <input
                    className="ios-input"
                    value={config.labelRetail}
                    onChange={(e) => updateConfig('labelRetail', e.target.value)}
                    placeholder="เช่น ปลีก, ราคาปกติ, ขายปลีก"
                  />
                </div>
              </div>
              <div className="ios-row" style={{ cursor: 'default' }}>
                <div className="ios-row-main">
                  <div className="ios-row-title">ถมดำพื้นหลังคำว่า "บาท"</div>
                </div>
                <label className="ios-toggle">
                  <input type="checkbox" checked={!!config.invertBaht} onChange={(e) => updateConfig('invertBaht', e.target.checked)} />
                  <span className="ios-toggle-track" />
                  <span className="ios-toggle-thumb" />
                </label>
              </div>
            </div>
          </div>

          <div className="ios-section">
            <div className="ios-section-header">ข้อมูลชั้นวาง</div>
            <div className="ios-list">
              <button type="button" className="ios-row" onClick={handleExport}>
                <div className="ios-row-main">
                  <div className="ios-row-title">สำรองข้อมูล</div>
                </div>
                <span className="ios-chevron">›</span>
              </button>
              <button type="button" className="ios-row" onClick={handleImportClick}>
                <div className="ios-row-main">
                  <div className="ios-row-title">นำเข้าข้อมูล</div>
                </div>
                <span className="ios-chevron">›</span>
              </button>
              <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
              <button type="button" className="ios-row" onClick={() => setShowHistory((v) => !v)}>
                <div className="ios-row-main">
                  <div className="ios-row-title">ประวัติยิงออก ({removedSorted.length})</div>
                </div>
                <span className="ios-chevron">{showHistory ? '⌄' : '›'}</span>
              </button>
            </div>
            {showHistory && (
              <div className="ios-list" style={{ marginTop: 8 }}>
                {removedSorted.length === 0 && (
                  <div className="ios-row" style={{ cursor: 'default' }}>
                    <div className="ios-row-main ios-row-subtitle">ยังไม่มีประวัติ</div>
                  </div>
                )}
                {removedSorted.slice(0, 200).map((r, i) => (
                  <div className="ios-row" key={`${r.barcode}-${r.removedAt}-${i}`} style={{ cursor: 'default' }}>
                    <div className="ios-row-main">
                      <div className="ios-row-title">{database.find(r.barcode)?.ProductName || `รหัส: ${r.barcode}`}</div>
                      <div className="ios-row-subtitle">
                        เดิมอยู่ {r.loc} · {fmtDaysAgo(r.removedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ios-section">
            <button type="button" className="ios-row ios-list" onClick={() => setShowAdvanced((v) => !v)}>
              <div className="ios-row-main">
                <div className="ios-row-title">ตั้งค่าขั้นสูง</div>
              </div>
              <span className="ios-chevron">{showAdvanced ? '⌄' : '›'}</span>
            </button>
            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                <div className="ios-card">
                  <div className="ios-card-title">ตั้งค่าป้ายปกติ</div>
                  <SliderRow configKey="w" full />
                  <SliderRow configKey="h" full />
                  <SliderRow configKey="bcHeight" full />
                  <div className="ios-section-header" style={{ padding: '6px 0 0' }}>
                    ขนาดตัวหนังสือ (px)
                  </div>
                  <SliderRow configKey="globalNameSz" full />
                  <SliderRow configKey="priceSz" full />
                  <SliderRow configKey="dualSz" full />
                  <SliderRow configKey="metaSz" full />
                  <div className="ios-section-header" style={{ padding: '6px 0 0' }}>
                    ริบบิ้นมุมป้าย
                  </div>
                  <SliderRow configKey="ribbonSz" full />
                  <SliderRow configKey="ribbonX" full />
                  <SliderRow configKey="ribbonY" full />
                </div>

                <div className="ios-card">
                  <div className="ios-card-title">ตั้งค่าป้ายใหญ่</div>
                  <SliderRow configKey="largeW" full />
                  <SliderRow configKey="largeH" full />
                  <SliderRow configKey="bcHeightLrg" full />
                </div>

                <div className="ios-card">
                  <div className="ios-card-title">ตั้งค่าแถบสินค้าหมด</div>
                  <SliderRow configKey="oosW" full />
                  <SliderRow configKey="oosH" full />
                  <SliderRow configKey="oosSz" full />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
