import { useMemo, useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { useConfigStore } from '../store/configStore';
import { useUIStore } from '../store/uiStore';
import { buildPrintPlan } from '../lib/printPlan';
import { buildQueueItemFromShelfItem } from '../lib/buildQueueItem';
import { formatPrintedDate } from '../lib/utils';
import { printBridge } from '../lib/printBridge';
import IosNavBar from './IosNavBar';

const REASON_LABEL = { never: 'ไม่เคยพิมพ์', price: 'ราคาเปลี่ยน', loc: 'ย้ายตำแหน่ง' } as const;

export default function PrintScreen() {
  const shelves = useShelvesStore((s) => s.shelves);
  const markPrinted = useShelvesStore((s) => s.markPrinted);
  const config = useConfigStore((s) => s.config);
  const goHome = useUIStore((s) => s.goHome);
  const showToast = useUIStore((s) => s.showToast);

  const [onlyChanged, setOnlyChanged] = useState(true);
  const [showLoc, setShowLoc] = useState(true);
  const [showPrinted, setShowPrinted] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set(shelves.flatMap((s) => s.rows.map((r) => r.id))),
  );
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const [sendError, setSendError] = useState(false);

  const plan = useMemo(() => buildPrintPlan(shelves, selectedRowIds, onlyChanged, showLoc), [shelves, selectedRowIds, onlyChanged, showLoc]);
  const totalTags = plan.entries.reduce((sum, e) => sum + e.item.printQty, 0);

  const isShelfFullySelected = (shelfId: string) => {
    const shelf = shelves.find((s) => s.id === shelfId);
    return !!shelf && shelf.rows.length > 0 && shelf.rows.every((r) => selectedRowIds.has(r.id));
  };

  const toggleShelf = (shelfId: string) => {
    const shelf = shelves.find((s) => s.id === shelfId);
    if (!shelf) return;
    const allSelected = isShelfFullySelected(shelfId);
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      shelf.rows.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  };

  const toggleRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!plan.entries.length) {
      showToast('ไม่มีป้ายที่ต้องพิมพ์', 'error');
      return;
    }
    setSending(true);
    setSendError(false);
    setProgress('');
    const printedDate = showPrinted ? formatPrintedDate(new Date()) : '';
    const items = plan.entries.map((e) => buildQueueItemFromShelfItem(e.item, e.product, showLoc ? e.loc : '', printedDate));
    try {
      await printBridge.publish(config, items, (sent, total) => {
        if (total > 1) setProgress(`${sent}/${total}`);
      });
      markPrinted(
        plan.entries.map((e) => ({
          shelfId: e.shelfId,
          rowId: e.rowId,
          uid: e.item.uid,
          price: e.product.Price,
          price2: e.product.Price2 || '',
          loc: showLoc ? e.loc : '',
        })),
      );
      showToast(`ส่งพิมพ์แล้ว · ${totalTags} ใบ`, 'success');
      goHome();
    } catch (err) {
      setSendError(true);
      const reason = err instanceof Error ? err.message : '';
      showToast(`ส่งพิมพ์ไม่สำเร็จ${reason ? ` — ${reason}` : ' — เช็คอินเทอร์เน็ต'}`, 'error');
    } finally {
      setSending(false);
      setProgress('');
    }
  };

  return (
    <>
      <IosNavBar title="พิมพ์ป้ายราคา" onBack={goHome} backLabel="ชั้นวาง" />
      <div className="ios-body">
        <div className="ios-segmented">
          <button type="button" className={`ios-segmented-option${onlyChanged ? ' active' : ''}`} onClick={() => setOnlyChanged(true)}>
            เฉพาะที่ต้องเปลี่ยน
          </button>
          <button type="button" className={`ios-segmented-option${!onlyChanged ? ' active' : ''}`} onClick={() => setOnlyChanged(false)}>
            ทั้งหมดในที่เลือก
          </button>
        </div>

        <div className="ios-section">
          <div className="ios-list">
            <div className="ios-row" style={{ cursor: 'default' }}>
              <div className="ios-row-main">
                <div className="ios-row-title">แสดงชั้น-แถวบนป้าย</div>
              </div>
              <label className="ios-toggle">
                <input type="checkbox" checked={showLoc} onChange={(e) => setShowLoc(e.target.checked)} />
                <span className="ios-toggle-track" />
                <span className="ios-toggle-thumb" />
              </label>
            </div>
            <div className="ios-row" style={{ cursor: 'default' }}>
              <div className="ios-row-main">
                <div className="ios-row-title">แสดงวันที่พิมพ์บนป้าย</div>
              </div>
              <label className="ios-toggle">
                <input type="checkbox" checked={showPrinted} onChange={(e) => setShowPrinted(e.target.checked)} />
                <span className="ios-toggle-track" />
                <span className="ios-toggle-thumb" />
              </label>
            </div>
          </div>
        </div>

        <div className="ios-section">
          <div className="ios-section-header">เลือกชั้น/แถว</div>
          <div className="ios-list">
            {shelves.map((shelf) => (
              <div className="ios-row" key={shelf.id} style={{ cursor: 'default', flexWrap: 'wrap' }}>
                <label className="ios-toggle" style={{ width: 44, height: 26 }}>
                  <input type="checkbox" checked={isShelfFullySelected(shelf.id)} onChange={() => toggleShelf(shelf.id)} />
                  <span className="ios-toggle-track" />
                  <span className="ios-toggle-thumb" style={{ width: 22, height: 22 }} />
                </label>
                <div className="ios-row-main">
                  <div className="ios-row-title">
                    ชั้น {shelf.code}
                    {shelf.name && ` · ${shelf.name}`}
                  </div>
                  <div className="ios-tile-pills" style={{ marginTop: 4 }}>
                    {shelf.rows.map((row) => (
                      <button
                        type="button"
                        key={row.id}
                        className={`ios-chip${selectedRowIds.has(row.id) ? ' active' : ''}`}
                        onClick={() => toggleRow(row.id)}
                      >
                        แถว {row.no}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ios-card">
          <div className="ios-card-title">
            จำนวนรายการ {plan.entries.length} · จำนวนป้ายรวม {totalTags} ใบ
          </div>
          {Object.entries(plan.tagCountByShelf).map(([code, count]) => (
            <div key={code} className="ios-card-line">
              ชั้น {code}: {count} ใบ
            </div>
          ))}
          <div className="ios-card-line">
            {(Object.keys(REASON_LABEL) as (keyof typeof REASON_LABEL)[])
              .filter((r) => plan.reasonCounts[r] > 0)
              .map((r) => `${REASON_LABEL[r]} ${plan.reasonCounts[r]}`)
              .join(' · ')}
          </div>
          {plan.pendingBarcodes.length > 0 && (
            <div className="ios-card-line" style={{ color: 'var(--ios-red)' }}>
              ⚠ ไม่พบใน Sheet (ไม่ถูกส่งพิมพ์): {plan.pendingBarcodes.join(', ')}
            </div>
          )}
        </div>

        <button type="button" className="ios-btn filled block" style={{ minHeight: 50 }} onClick={handleSend} disabled={sending || !plan.entries.length}>
          {sending ? `กำลังส่ง...${progress ? ` (${progress})` : ''}` : `📡 ส่งพิมพ์ (${totalTags} ใบ)`}
        </button>

        {sendError && !sending && (
          <button type="button" className="ios-btn tinted block" onClick={handleSend}>
            ลองอีกครั้ง
          </button>
        )}
      </div>
    </>
  );
}
