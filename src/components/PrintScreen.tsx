import { useMemo, useState } from 'react';
import { useShelvesStore } from '../store/shelvesStore';
import { useConfigStore } from '../store/configStore';
import { useUIStore } from '../store/uiStore';
import { buildPrintPlan } from '../lib/printPlan';
import { buildQueueItemFromShelfItem } from '../lib/buildQueueItem';
import { formatPrintedDate } from '../lib/utils';
import { printBridge } from '../lib/printBridge';

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
    <div className="screen">
      <div className="shelf-screen-header">
        <button type="button" className="back-btn" onClick={goHome}>
          ‹ กลับหน้าหลัก
        </button>
      </div>
      <div className="p-lbl">พิมพ์ป้ายราคา</div>

      <div className="mode-btns mode-btns-2">
        <div className={`mode-btn${onlyChanged ? ' active' : ''}`} onClick={() => setOnlyChanged(true)}>
          เฉพาะป้ายที่ต้องเปลี่ยน
        </div>
        <div className={`mode-btn${!onlyChanged ? ' active' : ''}`} onClick={() => setOnlyChanged(false)}>
          ทั้งหมดในที่เลือก
        </div>
      </div>

      <div className="cb-wrap">
        <input type="checkbox" id="show-loc" checked={showLoc} onChange={(e) => setShowLoc(e.target.checked)} />
        <label htmlFor="show-loc">แสดงชั้น-แถวบนป้าย</label>
      </div>
      <div className="cb-wrap">
        <input type="checkbox" id="show-printed" checked={showPrinted} onChange={(e) => setShowPrinted(e.target.checked)} />
        <label htmlFor="show-printed">แสดงวันที่พิมพ์บนป้าย</label>
      </div>

      <div className="panel">
        <div className="p-lbl">เลือกชั้น/แถว</div>
        <div className="print-shelf-pick">
          {shelves.map((shelf) => (
            <div key={shelf.id}>
              <div className="print-shelf-row">
                <input type="checkbox" checked={isShelfFullySelected(shelf.id)} onChange={() => toggleShelf(shelf.id)} />
                <strong>ชั้น {shelf.code}</strong>
                {shelf.name && <span className="row-item-meta">· {shelf.name}</span>}
              </div>
              <div className="print-row-pick">
                {shelf.rows.map((row) => (
                  <button
                    type="button"
                    key={row.id}
                    className={`chip-btn${selectedRowIds.has(row.id) ? ' active' : ''}`}
                    onClick={() => toggleRow(row.id)}
                  >
                    แถว {row.no}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="print-summary">
        <div>
          จำนวนรายการ: <b>{plan.entries.length}</b> · จำนวนป้ายรวม: <b>{totalTags}</b> ใบ
        </div>
        {Object.entries(plan.tagCountByShelf).map(([code, count]) => (
          <div key={code} className="row-item-meta">
            ชั้น {code}: {count} ใบ
          </div>
        ))}
        <div className="row-item-meta">
          {(Object.keys(REASON_LABEL) as (keyof typeof REASON_LABEL)[])
            .filter((r) => plan.reasonCounts[r] > 0)
            .map((r) => `${REASON_LABEL[r]} ${plan.reasonCounts[r]}`)
            .join(' · ')}
        </div>
        {plan.pendingBarcodes.length > 0 && (
          <div className="pending-list">
            ⚠ ไม่พบใน Sheet (ไม่ถูกส่งพิมพ์): {plan.pendingBarcodes.join(', ')}
          </div>
        )}
      </div>

      <button type="button" className="btn btn-primary btn-block print-cta" onClick={handleSend} disabled={sending || !plan.entries.length}>
        {sending ? `กำลังส่ง...${progress ? ` (${progress})` : ''}` : `📡 ส่งพิมพ์ (${totalTags} ใบ)`}
      </button>

      {sendError && !sending && (
        <button type="button" className="btn btn-secondary btn-block" onClick={handleSend}>
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}
