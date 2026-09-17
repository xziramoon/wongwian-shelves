import { useEffect, useMemo, useState } from 'react';
import { database } from '../lib/database';
import { useUIStore } from '../store/uiStore';
import { debounce } from '../lib/utils';
import type { Product } from '../types';

/* ปรับจาก wongwian-tags-mobile/src/components/ManualSearchSheet.tsx — ต่างจากต้นฉบับ
 * ตรงที่แอปนี้ไม่มีแนวคิด scanSheet/คิวพิมพ์ ตัวเลือกที่เลือกจะถูกส่งกลับผ่าน onPick(barcode)
 * ให้ RowScreen ไปตัดสินใจต่อว่าจะยิงเข้า/ยิงออก/นับเป็นยิงทวน ตามโหมดปัจจุบัน */
interface Props {
  onPick: (barcode: string) => void;
}

export default function ManualSearchSheet({ onPick }: Props) {
  const open = useUIStore((s) => s.manualSearchOpen);
  const setOpen = useUIStore((s) => s.setManualSearchOpen);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const applyDebounced = useMemo(() => debounce((q: string) => setDebouncedQuery(q), 150), []);

  useEffect(() => {
    applyDebounced(query);
  }, [query, applyDebounced]);

  if (!open) return null;

  const results: Product[] = database.search(debouncedQuery);

  const handlePick = (product: Product) => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    onPick(product.Barcode);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <div className="sheet-backdrop" onClick={handleClose}>
      <div className="sheet manual-search-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="manual-search-fixed">
          <div className="queue-drawer-header">
            <span>ค้นหาสินค้า{debouncedQuery.trim() && results.length > 0 ? ` (${results.length})` : ''}</span>
            <button type="button" className="sheet-close" onClick={handleClose} aria-label="ปิด">
              ✕
            </button>
          </div>
          <input
            className="field-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด"
            autoFocus
          />
        </div>
        <div className="search-results">
          {debouncedQuery.trim() && results.length === 0 && <div className="queue-empty">ไม่พบสินค้าที่ค้นหา</div>}
          {results.map((product) => (
            <button type="button" key={product.Barcode} className="search-result-row" onClick={() => handlePick(product)}>
              <div className="queue-row-name">{product.ProductName || 'รหัส: ' + product.Barcode}</div>
              <div className="queue-row-price">{product.Price || '0.00'} บาท</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
