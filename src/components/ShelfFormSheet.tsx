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
    <div className="sheet-backdrop" onClick={handleClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>เพิ่มชั้นวาง</span>
          <button type="button" className="sheet-close" onClick={handleClose} aria-label="ปิด">
            ✕
          </button>
        </div>

        <label className="field-label" htmlFor="shelf-code">
          รหัสชั้น (1-2 ตัวอักษร)
        </label>
        <input
          id="shelf-code"
          className="field-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="เช่น A, B2"
          maxLength={2}
          autoFocus
        />

        <label className="field-label" htmlFor="shelf-name">
          ชื่อเรียก (ไม่บังคับ)
        </label>
        <input
          id="shelf-name"
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น ชั้นขนม"
        />

        {error && <div className="form-error">{error}</div>}

        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            เพิ่มชั้น
          </button>
        </div>
      </div>
    </div>
  );
}
