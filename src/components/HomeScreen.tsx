import { useEffect, useState } from 'react';
import { database } from '../lib/database';
import { computeShelfStats, computeTotalReprintCount } from '../lib/shelfStats';
import { pickRowsToCheck } from '../lib/shelfHelpers';
import { useShelvesStore } from '../store/shelvesStore';
import { useUIStore } from '../store/uiStore';
import IosNavBar from './IosNavBar';
import ConnectionStatus from './ConnectionStatus';
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

  useEffect(
    () =>
      database.onChange((data) => {
        setDbCount(data.length);
        setLastSync(new Date());
      }),
    [],
  );

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
    <>
      <IosNavBar
        title="ชั้นวาง"
        trailing={
          <>
            <ConnectionStatus />
            <button
              type="button"
              className="ios-nav-icon-btn"
              onClick={() => setSettingsSheetOpen(true)}
              aria-label="ตั้งค่า"
            >
              ⚙
            </button>
          </>
        }
      />
      <div className="ios-body">
        <div className="ios-section">
          <div className="ios-list">
            <div className="ios-row" style={{ cursor: 'default' }}>
              <div className="ios-row-icon" style={{ background: 'var(--ios-blue-tint-bg)' }}>
                📦
              </div>
              <div className="ios-row-main">
                <div className="ios-row-title">สินค้าในฐานข้อมูล {dbCount.toLocaleString()} รายการ</div>
                {lastSync && <div className="ios-row-subtitle">โหลดล่าสุด {fmtTime(lastSync)}</div>}
              </div>
              <button type="button" className="ios-btn tinted sm" onClick={handleReload} disabled={syncing}>
                {syncing ? 'กำลังโหลด' : 'โหลดใหม่'}
              </button>
            </div>
          </div>
        </div>

        {needsBackupReminder && (
          <div className="ios-banner">
            <span>⚠️ ยังไม่ได้สำรองข้อมูลนาน — เข้าตั้งค่าเพื่อสำรอง</span>
          </div>
        )}

        {checkRows.length > 0 && (
          <div className="ios-section">
            <div className="ios-section-header">ตรวจวันนี้</div>
            <div className="ios-list">
              {checkRows.map((r) => (
                <button type="button" className="ios-row" key={r.rowId} onClick={() => handleCheckToday(r.shelfId, r.rowId)}>
                  <div className="ios-row-icon" style={{ background: 'var(--ios-blue-tint-bg)' }}>
                    🔵
                  </div>
                  <div className="ios-row-main">
                    <div className="ios-row-title">
                      ชั้น {r.shelfCode} · แถว {r.rowNo}
                    </div>
                  </div>
                  <span className="ios-chevron">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" className="ios-btn filled block" style={{ fontSize: 17, minHeight: 50 }} onClick={goPrint}>
          🖨️ พิมพ์ป้ายที่ต้องเปลี่ยน ({totalReprint} ใบ)
        </button>

        {shelves.length > 0 ? (
          <div className="ios-section">
            <div className="ios-section-header">ชั้นวางทั้งหมด</div>
            <div className="ios-grid-2">
              {shelves.map((shelf) => {
                const stats = computeShelfStats(shelf);
                return (
                  <button type="button" key={shelf.id} className="ios-tile" onClick={() => goShelf(shelf.id)}>
                    <div className="ios-tile-code">{shelf.code}</div>
                    {shelf.name && <div className="ios-tile-name">{shelf.name}</div>}
                    <div className="ios-tile-pills">
                      {stats.reprintCount > 0 && <span className="ios-pill orange">เปลี่ยน {stats.reprintCount}</span>}
                      {stats.pendingCount > 0 && <span className="ios-pill red">รอเข้าระบบ {stats.pendingCount}</span>}
                    </div>
                    <div className="ios-tile-meta">
                      {stats.rowCount} แถว · {stats.itemCount} รายการ
                    </div>
                  </button>
                );
              })}
              <button type="button" className="ios-tile add" onClick={() => setAddShelfOpen(true)}>
                + เพิ่มชั้น
              </button>
            </div>
          </div>
        ) : (
          <div className="ios-empty">
            <div className="ios-empty-icon">🗄️</div>
            ยังไม่มีชั้นวาง
            <div style={{ marginTop: 16 }}>
              <button type="button" className="ios-btn filled" onClick={() => setAddShelfOpen(true)}>
                + เพิ่มชั้นแรก
              </button>
            </div>
          </div>
        )}
      </div>

      <ShelfFormSheet open={addShelfOpen} onClose={() => setAddShelfOpen(false)} />
    </>
  );
}
