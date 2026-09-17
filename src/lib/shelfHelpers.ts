import type { Shelf } from '../types';

/** Loc string shown on the tag: `${code}-${no}`, capped at 5 chars per the tag spec
 * (renderHeader() in PriceTag.tsx trims/caps Loc to 5 chars anyway, but building it
 * short in the first place avoids a silently-truncated Loc being persisted). */
export function buildLoc(code: string, no: string): string {
  return `${code}-${no}`.slice(0, 5);
}

export interface ItemLocation {
  shelfId: string;
  rowId: string;
  index: number;
}

/** finds the first row (other than shelfId/rowId, if given) containing an item with
 * this barcode — used by both "ยิงเข้า" (อยู่แถวอื่นแล้ว) and "ยิงออก" (อยู่ที่อื่น) */
export function findItemLocation(
  shelves: Shelf[],
  barcode: string,
  exclude?: { shelfId: string; rowId: string },
): ItemLocation | undefined {
  for (const shelf of shelves) {
    for (const row of shelf.rows) {
      if (exclude && shelf.id === exclude.shelfId && row.id === exclude.rowId) continue;
      const index = row.items.findIndex((i) => i.barcode === barcode);
      if (index !== -1) return { shelfId: shelf.id, rowId: row.id, index };
    }
  }
  return undefined;
}

/** finds an item within one specific row */
export function findItemInRow(shelves: Shelf[], shelfId: string, rowId: string, barcode: string) {
  const shelf = shelves.find((s) => s.id === shelfId);
  const row = shelf?.rows.find((r) => r.id === rowId);
  const index = row ? row.items.findIndex((i) => i.barcode === barcode) : -1;
  return { shelf, row, index };
}

/** "ตรวจวันนี้" card — the 2 rows with the oldest lastCheckedAt (never-checked rows,
 * i.e. null, sort first since they're the most overdue), across every shelf. Rows with
 * no items are skipped (nothing to verify). Stable order for equal timestamps: shelf
 * order then row order, so the card doesn't visibly jump around on every render. */
export function pickRowsToCheck(
  shelves: Shelf[],
  count = 2,
): { shelfId: string; shelfCode: string; rowId: string; rowNo: string }[] {
  const candidates: { shelfId: string; shelfCode: string; rowId: string; rowNo: string; lastCheckedAt: number | null }[] =
    [];
  for (const shelf of shelves) {
    for (const row of shelf.rows) {
      if (!row.items.length) continue;
      candidates.push({
        shelfId: shelf.id,
        shelfCode: shelf.code,
        rowId: row.id,
        rowNo: row.no,
        lastCheckedAt: row.lastCheckedAt,
      });
    }
  }
  candidates.sort((a, b) => (a.lastCheckedAt ?? -1) - (b.lastCheckedAt ?? -1));
  return candidates.slice(0, count).map(({ shelfId, shelfCode, rowId, rowNo }) => ({ shelfId, shelfCode, rowId, rowNo }));
}

let uidSeq = 0;
/** id generator — timestamp+counter+random is unique enough for a single-device app
 * with no concurrent writers, no need to pull in a uuid dependency for this */
export function makeId(prefix: string): string {
  uidSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidSeq}_${Math.random().toString(36).slice(2, 7)}`;
}
