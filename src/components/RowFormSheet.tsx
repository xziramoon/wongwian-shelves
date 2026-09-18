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
    <div className="ios-sheet-backdrop" onClick={handleClose}>
      <div className="ios-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ios-sheet-handle" />
        <div className="ios-sheet-header">
          <button type="button" className="ios-btn plain" onClick={handleClose}>
            ยกเลิก
          </button>
          <span className="ios-sheet-title">เพิ่มแถว</span>
          <button type="button" className="ios-btn plain" onClick={handleAdd}>
            เพิ่ม
          </button>
        </div>

        <div className="ios-body" style={{ padding: '4px 0 16px', gap: 14 }}>
          <div className="ios-field">
            <span className="ios-field-label">เลขแถว</span>
            <input
              className="ios-input"
              value={no}
              onChange={(e) => setNo(e.target.value)}
              placeholder="เช่น 3, 12"
              maxLength={2}
              autoFocus
            />
          </div>

          {error && <div className="ios-banner red">{error}</div>}
        </div>
      </div>
    </div>
  );
}
