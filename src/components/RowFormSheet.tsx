import { useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { useUIStore } from '../store/uiStore';

interface Props {
  shelfId: string | null;
  onClose: () => void;
}

/** เพิ่มแถวใหม่ในชั้น shelfId (null = ปิด) */
export default function RowFormSheet({ shelfId, onClose }: Props) {
  const addRow = useShelvesStore((s) => s.addRow);
  const goRow = useUIStore((s) => s.goRow);
  const [no, setNo] = useState('');
  const [error, setError] = useState('');

  if (!shelfId) return null;

  const handleClose = () => {
    setNo('');
    setError('');
    onClose();
  };

  const handleAdd = () => {
    const res = addRow(shelfId, no);
    if (!res.ok) {
      setError(res.error || 'เพิ่มแถวไม่สำเร็จ');
      return;
    }
    const rowId = res.rowId!;
    handleClose();
    goRow(shelfId, rowId);
  };

  return (
    <div className="sheet-backdrop" onClick={handleClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>เพิ่มแถว</span>
          <button type="button" className="sheet-close" onClick={handleClose} aria-label="ปิด">
            ✕
          </button>
        </div>

        <label className="field-label" htmlFor="row-no">
          เลขแถว
        </label>
        <input
          id="row-no"
          className="field-input"
          value={no}
          onChange={(e) => setNo(e.target.value)}
          placeholder="เช่น 3, 12"
          maxLength={2}
          autoFocus
        />

        {error && <div className="form-error">{error}</div>}

        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            เพิ่มแถว
          </button>
        </div>
      </div>
    </div>
  );
}
