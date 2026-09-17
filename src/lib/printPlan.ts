import type { Product, Shelf, ShelfItem } from '../types';
import { database } from './database';
import { needsReprint } from './needsReprint';
import { buildLoc } from './shelfHelpers';
import { priceEq } from './utils';

export type ReprintReason = 'never' | 'price' | 'loc';

export interface PrintPlanEntry {
  shelfId: string;
  rowId: string;
  shelfCode: string;
  item: ShelfItem;
  product: Product;
  loc: string;
  reason: ReprintReason;
}

export interface PrintPlan {
  entries: PrintPlanEntry[]; // เรียง: รหัสชั้น A→Z, เลขแถวตัวเลข, ลำดับในแถว
  pendingBarcodes: string[]; // รอเข้าระบบ (ไม่พบใน Sheet) — ไม่ถูกส่งพิมพ์
  tagCountByShelf: Record<string, number>; // shelfCode -> จำนวนป้ายรวม (นับ printQty)
  reasonCounts: Record<ReprintReason, number>;
}

function reasonFor(item: ShelfItem, loc: string, product: Product, showLoc: boolean): ReprintReason {
  if (item.lastPrintedAt === null) return 'never';
  if (!priceEq(product.Price, item.lastPrintedPrice) || !priceEq(product.Price2 || '', item.lastPrintedPrice2 || '')) return 'price';
  return showLoc && loc !== (item.lastPrintedLoc || '') ? 'loc' : 'never';
}

const numericRowSort = (a: string, b: string) => {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
};

export function buildPrintPlan(shelves: Shelf[], selectedRowIds: Set<string>, onlyChanged: boolean, showLoc: boolean): PrintPlan {
  const entries: PrintPlanEntry[] = [];
  const pendingBarcodes: string[] = [];
  const tagCountByShelf: Record<string, number> = {};
  const reasonCounts: Record<ReprintReason, number> = { never: 0, price: 0, loc: 0 };

  const sortedShelves = [...shelves].sort((a, b) => a.code.localeCompare(b.code));
  for (const shelf of sortedShelves) {
    const sortedRows = [...shelf.rows].filter((r) => selectedRowIds.has(r.id)).sort((a, b) => numericRowSort(a.no, b.no));
    for (const row of sortedRows) {
      const loc = buildLoc(shelf.code, row.no);
      for (const item of row.items) {
        const product = database.find(item.barcode);
        if (!product) {
          pendingBarcodes.push(item.barcode);
          continue;
        }
        const reason = reasonFor(item, loc, product, showLoc);
        const include = onlyChanged ? needsReprint(item, loc, product, showLoc) : true;
        if (!include) continue;
        entries.push({ shelfId: shelf.id, rowId: row.id, shelfCode: shelf.code, item, product, loc, reason });
        tagCountByShelf[shelf.code] = (tagCountByShelf[shelf.code] || 0) + item.printQty;
        reasonCounts[reason] += item.printQty;
      }
    }
  }

  return { entries, pendingBarcodes, tagCountByShelf, reasonCounts };
}
