import { useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { useUIStore } from '../store/uiStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** เพิ่มชั้นใหม่ — รหัส 1-2 ตัว (บังคับ ห้ามซ้ำ) + ชื่อเรียก (ไม่บังคับ) */
export default function ShelfFormSheet({ open, onClose }: Props) {
  const addShelf = useShelvesStore((s) => s.addShelf);
  const goShelf = useUIStore((s) => s.goShelf);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleClose = () => {
    setCode('');
    setName('');
    setError('');
    onClose();
  };

  const handleAdd = () => {
    const res = addShelf(code, name);
    if (!res.ok) {
      setError(res.error || 'เพิ่มชั้นไม่สำเร็จ');
      return;
    }
    const shelfId = res.shelfId!;
    handleClose();
    goShelf(shelfId);
  };

  return (
    <div className="ios-sheet-backdrop" onClick={handleClose}>
      <div className="ios-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ios-sheet-handle" />
        <div className="ios-sheet-header">
          <button type="button" className="ios-btn plain" onClick={handleClose}>
            ยกเลิก
          </button>
          <span className="ios-sheet-title">เพิ่มชั้นวาง</span>
          <button type="button" className="ios-btn plain" onClick={handleAdd}>
            เพิ่ม
          </button>
        </div>

        <div className="ios-body" style={{ padding: '4px 0 16px', gap: 14 }}>
          <div className="ios-field">
            <span className="ios-field-label">รหัสชั้น (1-2 ตัวอักษร)</span>
            <input
              className="ios-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="เช่น A, B2"
              maxLength={2}
              autoFocus
            />
          </div>

          <div className="ios-field">
            <span className="ios-field-label">ชื่อเรียก (ไม่บังคับ)</span>
            <input className="ios-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ชั้นขนม" />
          </div>

          {error && <div className="ios-banner red">{error}</div>}
        </div>
      </div>
    </div>
  );
}
