import { useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import type { ShelfItem } from '../types';
import { useUIStore } from '../store/uiStore';
import { useWedgeScanner } from '../lib/useWedgeScanner';
import { database } from '../lib/database';
import { needsReprint } from '../lib/needsReprint';
import { buildLoc } from '../lib/shelfHelpers';
import { fmtPrice } from '../lib/utils';
import { feedback } from '../lib/feedback';
import RowCamera from './RowCamera';
import ManualSearchSheet from './ManualSearchSheet';
import CheckSummaryView from './CheckSummaryView';

interface Props {
  shelfId: string;
  rowId: string;
}

const UNDO_MS = 5000;

export default function RowScreen({ shelfId, rowId }: Props) {
  const shelf = useShelvesStore((s) => s.shelves.find((sh) => sh.id === shelfId));
  const row = shelf?.rows.find((r) => r.id === rowId);
  const scanIn = useShelvesStore((s) => s.scanIn);
  const confirmDuplicateInRow = useShelvesStore((s) => s.confirmDuplicateInRow);
  const confirmMoveHere = useShelvesStore((s) => s.confirmMoveHere);
  const confirmAddBothLocations = useShelvesStore((s) => s.confirmAddBothLocations);
  const scanOut = useShelvesStore((s) => s.scanOut);
  const confirmRemoveFromElsewhere = useShelvesStore((s) => s.confirmRemoveFromElsewhere);
  const removeItemAt = useShelvesStore((s) => s.removeItemAt);
  const restoreItem = useShelvesStore((s) => s.restoreItem);
  const updateItem = useShelvesStore((s) => s.updateItem);
  const moveItem = useShelvesStore((s) => s.moveItem);

  const scanMode = useUIStore((s) => s.scanMode);
  const setScanMode = useUIStore((s) => s.setScanMode);
  const goShelf = useUIStore((s) => s.goShelf);
  const showToast = useUIStore((s) => s.showToast);
  const manualSearchOpen = useUIStore((s) => s.manualSearchOpen);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);

  const [inputMethod, setInputMethod] = useState<'camera' | 'gun'>('gun');
  const [pendingDuplicate, setPendingDuplicate] = useState<string | null>(null);
  const [pendingElsewhereIn, setPendingElsewhereIn] = useState<{ barcode: string; loc: string } | null>(null);
  const [pendingElsewhereOut, setPendingElsewhereOut] = useState<{ barcode: string; loc: string } | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ item: ShelfItem; expiresAt: number } | null>(null);
  const [checkScanned, setCheckScanned] = useState<string[]>([]);
  const [checkSummaryOpen, setCheckSummaryOpen] = useState(false);

  const anyDialogOpen = !!pendingDuplicate || !!pendingElsewhereIn || !!pendingElsewhereOut || manualSearchOpen || checkSummaryOpen;

  const handleCodeIn = (barcode: string) => {
    const res = scanIn(shelfId, rowId, barcode);
    if (res.kind === 'added') {
      feedback[res.found ? 'success' : 'notFound']();
      showToast(res.found ? 'เพิ่มแล้ว' : `เพิ่มแล้ว · รอเข้าระบบ (ไม่พบใน Sheet)`, res.found ? 'success' : 'error');
    } else if (res.kind === 'added-from-history') {
      feedback.success();
      showToast(`เพิ่มแล้ว · เคยอยู่ที่ ${res.fromLoc}`, 'info');
    } else if (res.kind === 'duplicate-in-row') {
      feedback.duplicate();
      setPendingDuplicate(barcode);
    } else if (res.kind === 'elsewhere') {
      feedback.duplicate();
      setPendingElsewhereIn({ barcode, loc: res.loc });
    }
  };

  const handleCodeOut = (barcode: string) => {
    const res = scanOut(shelfId, rowId, barcode);
    if (res.kind === 'removed') {
      feedback.success();
      showToast(`เอาออกแล้ว`, 'success');
      setLastRemoved({ item: res.item, expiresAt: Date.now() + UNDO_MS });
      setTimeout(() => setLastRemoved((cur) => (cur && cur.item.uid === res.item.uid ? null : cur)), UNDO_MS + 100);
    } else if (res.kind === 'elsewhere') {
      feedback.duplicate();
      setPendingElsewhereOut({ barcode, loc: res.loc });
    } else {
      feedback.notFound();
      showToast('ไม่ได้ลงทะเบียนไว้', 'error');
    }
  };

  const handleCodeCheck = (barcode: string) => {
    setCheckScanned((prev) => {
      if (prev.includes(barcode)) return prev; // ยิงซ้ำตัวเดิม ให้ข้าม
      feedback.success();
      return [...prev, barcode];
    });
  };

  const handleCode = (barcode: string) => {
    if (scanMode === 'in') handleCodeIn(barcode);
    else if (scanMode === 'out') handleCodeOut(barcode);
    else handleCodeCheck(barcode);
  };

  const { status: wedgeStatus, inputProps: wedgeInputProps } = useWedgeScanner(handleCode, !anyDialogOpen);

  if (!shelf || !row) {
    goShelf(shelfId);
    return null;
  }

  if (checkSummaryOpen) {
    return (
      <CheckSummaryView
        shelfId={shelfId}
        rowId={rowId}
        scanned={checkScanned}
        onDone={() => {
          setCheckSummaryOpen(false);
          setCheckScanned([]);
          setScanMode('in');
        }}
      />
    );
  }

  const loc = buildLoc(shelf.code, row.no);

  return (
    <div className="screen">
      <div className="row-header">
        <button type="button" className="back-btn" onClick={() => goShelf(shelfId)}>
          ‹ ชั้น {shelf.code}
        </button>
        <div className="row-header-title">
          {scanMode === 'in' && `กำลังเพิ่มเข้า ชั้น ${shelf.code} · แถว ${row.no}`}
          {scanMode === 'out' && `กำลังยิงออก ชั้น ${shelf.code} · แถว ${row.no}`}
          {scanMode === 'check' && `กำลังยิงทวน ชั้น ${shelf.code} · แถว ${row.no}`}
        </div>
        <div className="scan-mode-btns">
          <button
            type="button"
            className={`scan-mode-btn mode-in${scanMode === 'in' ? ' active' : ''}`}
            onClick={() => setScanMode('in')}
          >
            ยิงเข้า
          </button>
          <button
            type="button"
            className={`scan-mode-btn mode-out${scanMode === 'out' ? ' active' : ''}`}
            onClick={() => setScanMode('out')}
          >
            ยิงออก
          </button>
          <button
            type="button"
            className={`scan-mode-btn mode-check${scanMode === 'check' ? ' active' : ''}`}
            onClick={() => setScanMode('check')}
          >
            ยิงทวน
          </button>
        </div>
      </div>

      {/* ปืนยิงบลูทูธ — input ที่ซ่อนไว้ รับ HID เสมอไม่ว่าจะสลับแท็บกล้อง/ปืนยิง */}
      <input {...wedgeInputProps} className="wedge-input" aria-hidden="true" tabIndex={-1} />
      <div className={`wedge-status ${wedgeStatus}`} onClick={() => wedgeInputProps.ref.current?.focus()}>
        {wedgeStatus === 'ready' ? '🔫 พร้อมยิง' : 'แตะเพื่อเปิดรับปืน'}
      </div>

      <div className="input-method-tabs">
        <button
          type="button"
          className={`input-method-tab${inputMethod === 'camera' ? ' active' : ''}`}
          onClick={() => setInputMethod('camera')}
        >
          📷 กล้อง
        </button>
        <button
          type="button"
          className={`input-method-tab${inputMethod === 'gun' ? ' active' : ''}`}
          onClick={() => setInputMethod('gun')}
        >
          🔫 ปืนยิง
        </button>
        <button type="button" className="input-method-tab" onClick={() => setManualSearchOpen(true)}>
          🔍 ค้นหา
        </button>
      </div>

      <RowCamera active={inputMethod === 'camera' && !anyDialogOpen} onDetect={handleCode} />

      {scanMode === 'check' && (
        <div className="panel">
          <div className="p-lbl">ยิงแล้ว {checkScanned.length} ชิ้น</div>
          <div className="check-today-list">
            {checkScanned.map((b) => (
              <span key={b} className="chip-btn">
                {database.find(b)?.ProductName || b}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!checkScanned.length}
            onClick={() => setCheckSummaryOpen(true)}
          >
            เสร็จ — ดูสรุป
          </button>
        </div>
      )}

      {scanMode !== 'check' && (
        <div className="row-item-list">
          {row.items.map((item) => {
            const product = database.find(item.barcode);
            const pending = !product;
            const warn = product && needsReprint(item, loc, product, true);
            return (
              <div className="row-item" key={item.uid}>
                {product?.Image && <img className="row-item-thumb" src={product.Image} />}
                <div className="row-item-info">
                  <div className="row-item-name">
                    {product?.ProductName || `รหัส: ${item.barcode}`}
                    {pending && <span className="row-item-flag flag-pending">รอเข้าระบบ</span>}
                    {!pending && warn && <span className="row-item-flag flag-warn">ต้องเปลี่ยนป้าย</span>}
                  </div>
                  <div className="row-item-meta">
                    {product ? `${fmtPrice(product.Price)} บาท · ${item.barcode}` : item.barcode}
                  </div>
                </div>
                <div className="row-item-ctrl">
                  <button type="button" className="icon-btn" onClick={() => updateItem(shelfId, rowId, item.uid, { printQty: Math.max(1, item.printQty - 1) })}>
                    −
                  </button>
                  <span>{item.printQty}</span>
                  <button type="button" className="icon-btn" onClick={() => updateItem(shelfId, rowId, item.uid, { printQty: item.printQty + 1 })}>
                    +
                  </button>
                  <div className="row-item-move">
                    <button type="button" className="icon-btn" onClick={() => moveItem(shelfId, rowId, item.uid, 'up')}>
                      ▲
                    </button>
                    <button type="button" className="icon-btn" onClick={() => moveItem(shelfId, rowId, item.uid, 'down')}>
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      const removed = removeItemAt(shelfId, rowId, item.uid);
                      if (removed) {
                        setLastRemoved({ item: removed, expiresAt: Date.now() + UNDO_MS });
                        setTimeout(() => setLastRemoved((cur) => (cur && cur.item.uid === removed.uid ? null : cur)), UNDO_MS + 100);
                      }
                    }}
                    aria-label="ลบ"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
          {!row.items.length && <div className="row-card-meta">ยังไม่มีสินค้าในแถวนี้ — ยิงบาร์โค้ดเพื่อเริ่มเพิ่ม</div>}
        </div>
      )}

      {lastRemoved && (
        <div className="warn-banner">
          เอาออกแล้ว
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: 10 }}
            onClick={() => {
              restoreItem(shelfId, rowId, lastRemoved.item);
              setLastRemoved(null);
            }}
          >
            เลิกทำ
          </button>
        </div>
      )}

      {pendingDuplicate && (
        <div className="sheet-backdrop" onClick={() => setPendingDuplicate(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="p-lbl">สินค้านี้อยู่ในแถวนี้แล้ว</div>
            <div className="sheet-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPendingDuplicate(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  confirmDuplicateInRow(shelfId, rowId, pendingDuplicate);
                  setPendingDuplicate(null);
                  feedback.success();
                }}
              >
                +1 ป้าย
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingElsewhereIn && (
        <div className="sheet-backdrop" onClick={() => setPendingElsewhereIn(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="p-lbl">สินค้านี้อยู่ที่ {pendingElsewhereIn.loc} แล้ว</div>
            <div className="sheet-actions" style={{ flexDirection: 'column' }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  confirmMoveHere(shelfId, rowId, pendingElsewhereIn.barcode);
                  setPendingElsewhereIn(null);
                }}
              >
                ย้ายมาแถวนี้
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => {
                  confirmAddBothLocations(shelfId, rowId, pendingElsewhereIn.barcode);
                  setPendingElsewhereIn(null);
                }}
              >
                อยู่ทั้งสองที่
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setPendingElsewhereIn(null)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingElsewhereOut && (
        <div className="sheet-backdrop" onClick={() => setPendingElsewhereOut(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="p-lbl">สินค้านี้อยู่ที่ {pendingElsewhereOut.loc}</div>
            <div className="sheet-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPendingElsewhereOut(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  confirmRemoveFromElsewhere(pendingElsewhereOut.barcode);
                  setPendingElsewhereOut(null);
                  feedback.success();
                  showToast('เอาออกแล้ว', 'success');
                }}
              >
                เอาออกจาก {pendingElsewhereOut.loc}
              </button>
            </div>
          </div>
        </div>
      )}

      <ManualSearchSheet onPick={handleCode} />
    </div>
  );
}
