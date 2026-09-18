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
    <div className="ios-sheet-backdrop" onClick={handleClose}>
      <div className="ios-sheet" style={{ height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="ios-sheet-handle" />
        <div className="ios-sheet-header">
          <span className="ios-sheet-title">ค้นหาสินค้า{debouncedQuery.trim() && results.length > 0 ? ` (${results.length})` : ''}</span>
          <button type="button" className="ios-btn plain" onClick={handleClose}>
            ปิด
          </button>
        </div>
        <div className="ios-search">
          <span>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด"
            autoFocus
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 12 }}>
          {debouncedQuery.trim() && results.length === 0 && <div className="ios-empty">ไม่พบสินค้าที่ค้นหา</div>}
          {results.length > 0 && (
            <div className="ios-list">
              {results.map((product) => (
                <button type="button" key={product.Barcode} className="ios-row" onClick={() => handlePick(product)}>
                  <div className="ios-row-main">
                    <div className="ios-row-title">{product.ProductName || 'รหัส: ' + product.Barcode}</div>
                    <div className="ios-row-subtitle">{product.Barcode}</div>
                  </div>
                  <span className="ios-row-value">{product.Price || '0.00'} บาท</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
