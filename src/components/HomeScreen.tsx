import { useEffect, useState } from 'react';
import { database } from '../lib/database';
import { computeShelfStats, computeTotalReprintCount } from '../lib/shelfStats';
import { pickRowsToCheck } from '../lib/shelfHelpers';
import { useShelvesStore } from '../store/shelvesStore';
import { useUIStore } from '../store/uiStore';
import ShelfFormSheet from './ShelfFormSheet';

function fmtTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HomeScreen() {
  const shelves = useShelvesStore((s) => s.shelves);
  const needsBackupReminder = useShelvesStore((s) => s.needsBackupReminder());
  const goShelf = useUIStore((s) => s.goShelf);
  const goRow = useUIStore((s) => s.goRow);
  const goPrint = useUIStore((s) => s.goPrint);
  const setScanMode = useUIStore((s) => s.setScanMode);
  const setSettingsSheetOpen = useUIStore((s) => s.setSettingsSheetOpen);
  const showToast = useUIStore((s) => s.showToast);

  const [dbCount, setDbCount] = useState(database.data.length);
  const [lastSync, setLastSync] = useState<Date | null>(database.data.length ? new Date() : null);
  const [syncing, setSyncing] = useState(false);
  const [addShelfOpen, setAddShelfOpen] = useState(false);

  useEffect(() => database.onChange((data) => {
    setDbCount(data.length);
    setLastSync(new Date());
  }), []);

  const handleReload = () => {
    setSyncing(true);
    database
      .sync()
      .catch(() => showToast('โหลดฐานข้อมูลสินค้าไม่สำเร็จ — ลองใหม่ภายหลัง', 'error'))
      .finally(() => setSyncing(false));
  };

  const handleCheckToday = (shelfId: string, rowId: string) => {
    goRow(shelfId, rowId);
    setScanMode('check');
  };

  const checkRows = pickRowsToCheck(shelves, 2);
  const totalReprint = computeTotalReprintCount(shelves);

  return (
    <div className="screen home-screen">
      <div className="home-header">
        <div className="home-header-info">
          <span>สินค้าในฐานข้อมูล {dbCount.toLocaleString()} รายการ</span>
          {lastSync && <span className="home-header-time"> · โหลดล่าสุด {fmtTime(lastSync)}</span>}
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleReload} disabled={syncing}>
          {syncing ? 'กำลังโหลด...' : '↻ โหลดใหม่'}
        </button>
      </div>

      {needsBackupReminder && (
        <div className="warn-banner">⚠ ยังไม่ได้สำรองข้อมูล — เข้าเมนูตั้งค่าเพื่อสำรอง</div>
      )}

      {checkRows.length > 0 && (
        <div className="panel check-today-card">
          <div className="p-lbl">ตรวจวันนี้</div>
          <div className="check-today-list">
            {checkRows.map((r) => (
              <button
                type="button"
                key={r.rowId}
                className="btn btn-secondary check-today-btn"
                onClick={() => handleCheckToday(r.shelfId, r.rowId)}
              >
                ชั้น {r.shelfCode} · แถว {r.rowNo}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-block print-cta" onClick={goPrint}>
        🖨 พิมพ์ป้ายที่ต้องเปลี่ยน ({totalReprint} ใบ)
      </button>

      <div className="shelf-grid">
        {shelves.map((shelf) => {
          const stats = computeShelfStats(shelf);
          return (
            <button type="button" key={shelf.id} className="shelf-card" onClick={() => goShelf(shelf.id)}>
              <div className="shelf-card-code">{shelf.code}</div>
              {shelf.name && <div className="shelf-card-name">{shelf.name}</div>}
              <div className="shelf-card-meta">
                {stats.rowCount} แถว · {stats.itemCount} รายการ
              </div>
              {stats.reprintCount > 0 && <div className="shelf-card-badge badge-warn">ต้องเปลี่ยน {stats.reprintCount}</div>}
              {stats.pendingCount > 0 && <div className="shelf-card-badge badge-pending">รอเข้าระบบ {stats.pendingCount}</div>}
            </button>
          );
        })}
        <button type="button" className="shelf-card shelf-card-add" onClick={() => setAddShelfOpen(true)}>
          + เพิ่มชั้น
        </button>
      </div>

      <div className="home-footer-links">
        <button type="button" className="btn btn-secondary" onClick={() => setSettingsSheetOpen(true)}>
          ตั้งค่า / สำรองข้อมูล
        </button>
      </div>

      <ShelfFormSheet open={addShelfOpen} onClose={() => setAddShelfOpen(false)} />
    </div>
  );
}
