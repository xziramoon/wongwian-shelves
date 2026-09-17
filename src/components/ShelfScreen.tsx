import { useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { useUIStore } from '../store/uiStore';
import RowFormSheet from './RowFormSheet';

function fmtAgo(ts: number | null): string {
  if (ts === null) return 'ยังไม่เคยตรวจ';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'ตรวจวันนี้';
  return `ตรวจล่าสุด ${days} วันก่อน`;
}

interface Props {
  shelfId: string;
}

export default function ShelfScreen({ shelfId }: Props) {
  const shelf = useShelvesStore((s) => s.shelves.find((sh) => sh.id === shelfId));
  const removeRow = useShelvesStore((s) => s.removeRow);
  const updateRowNo = useShelvesStore((s) => s.updateRowNo);
  const updateShelf = useShelvesStore((s) => s.updateShelf);
  const removeShelf = useShelvesStore((s) => s.removeShelf);
  const goHome = useUIStore((s) => s.goHome);
  const goRow = useUIStore((s) => s.goRow);
  const showToast = useUIStore((s) => s.showToast);
  const [addRowShelfId, setAddRowShelfId] = useState<string | null>(null);

  if (!shelf) {
    goHome();
    return null;
  }

  const printedCountInRow = (rowId: string) => shelf.rows.find((r) => r.id === rowId)?.items.filter((i) => i.lastPrintedAt !== null).length || 0;
  const printedCountInShelf = shelf.rows.reduce((sum, r) => sum + r.items.filter((i) => i.lastPrintedAt !== null).length, 0);

  const handleRenameRow = (rowId: string, currentNo: string) => {
    const next = prompt('เลขแถวใหม่', currentNo);
    if (next === null || next.trim() === '' || next.trim().toUpperCase() === currentNo) return;
    const affected = printedCountInRow(rowId);
    if (affected > 0 && !confirm(`ป้าย ${affected} ใบในแถวนี้จะต้องพิมพ์ใหม่ (ตำแหน่งเปลี่ยน) ยืนยันเปลี่ยนเลขแถว?`)) return;
    const res = updateRowNo(shelfId, rowId, next);
    if (!res.ok) showToast(res.error || 'เปลี่ยนเลขแถวไม่สำเร็จ', 'error');
  };

  const handleRemoveRow = (rowId: string, no: string) => {
    if (!confirm(`ลบแถว ${no}? สินค้าที่ลงทะเบียนไว้ในแถวนี้จะหายไปด้วย`)) return;
    removeRow(shelfId, rowId);
  };

  const handleRenameShelf = () => {
    const nextCode = prompt('รหัสชั้นใหม่', shelf.code);
    if (nextCode === null) return;
    const nextName = prompt('ชื่อเรียกชั้น (ไม่บังคับ)', shelf.name) ?? shelf.name;
    const codeChanged = nextCode.trim().toUpperCase() !== shelf.code;
    if (codeChanged && printedCountInShelf > 0) {
      if (!confirm(`ป้าย ${printedCountInShelf} ใบในชั้นนี้จะต้องพิมพ์ใหม่ (ตำแหน่งเปลี่ยน) ยืนยันเปลี่ยนรหัสชั้น?`)) return;
    }
    const res = updateShelf(shelfId, { code: nextCode, name: nextName });
    if (!res.ok) showToast(res.error || 'แก้ไขชั้นไม่สำเร็จ', 'error');
  };

  const handleDeleteShelf = () => {
    const typed = prompt(`พิมพ์รหัสชั้น "${shelf.code}" เพื่อยืนยันการลบชั้นนี้ทั้งหมด`);
    if (typed !== shelf.code) {
      if (typed !== null) showToast('รหัสไม่ตรง ยกเลิกการลบ', 'error');
      return;
    }
    removeShelf(shelfId);
    goHome();
  };

  return (
    <div className="screen">
      <div className="shelf-screen-header">
        <button type="button" className="back-btn" onClick={goHome}>
          ‹ กลับหน้าหลัก
        </button>
      </div>

      <div className="panel">
        <div className="p-lbl">
          ชั้น {shelf.code}
          {shelf.name && ` · ${shelf.name}`}
        </div>
        <div className="shelf-screen-actions">
          <button type="button" className="btn btn-secondary" onClick={handleRenameShelf}>
            แก้ไขรหัส/ชื่อ
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDeleteShelf}>
            ลบชั้นนี้
          </button>
        </div>
      </div>

      <div className="row-list">
        {shelf.rows.map((row) => (
          <div key={row.id} className="row-card" onClick={() => goRow(shelfId, row.id)}>
            <div className="row-card-no">{row.no}</div>
            <div className="row-card-info">
              <div>{row.items.length} รายการ</div>
              <div className="row-card-meta">{fmtAgo(row.lastCheckedAt)}</div>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRenameRow(row.id, row.no);
              }}
              aria-label="เปลี่ยนเลขแถว"
            >
              ✎
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveRow(row.id, row.no);
              }}
              aria-label="ลบแถว"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={() => setAddRowShelfId(shelfId)}>
        + เพิ่มแถว
      </button>

      <RowFormSheet shelfId={addRowShelfId} onClose={() => setAddRowShelfId(null)} />
    </div>
  );
}
