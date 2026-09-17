import { create } from 'zustand';
import type { RemovedItem, Shelf, ShelfItem, ShelfTagMode, ShelvesFile } from '../types';
import { SHELVES_STORAGE_KEY } from '../constants';
import { database } from '../lib/database';
import { buildLoc, findItemInRow, findItemLocation, makeId } from '../lib/shelfHelpers';

const REMOVED_HISTORY_CAP = 200;
const BACKUP_REMINDER_THRESHOLD = 20;

interface ShelvesData {
  shelves: Shelf[];
  removed: RemovedItem[];
  editsSinceBackup: number;
  lastBackupAt: number | null;
}

function emptyData(): ShelvesData {
  return { shelves: [], removed: [], editsSinceBackup: 0, lastBackupAt: null };
}

/* ข้อมูลเสียหาย (parse ไม่ได้) ห้ามเขียนทับทันที — เก็บค่าดิบไว้ก่อนแล้วเริ่มใหม่ */
function loadData(): ShelvesData {
  const raw = localStorage.getItem(SHELVES_STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw);
    return {
      shelves: Array.isArray(parsed.shelves) ? parsed.shelves : [],
      removed: Array.isArray(parsed.removed) ? parsed.removed : [],
      editsSinceBackup: typeof parsed.editsSinceBackup === 'number' ? parsed.editsSinceBackup : 0,
      lastBackupAt: typeof parsed.lastBackupAt === 'number' ? parsed.lastBackupAt : null,
    };
  } catch {
    try {
      localStorage.setItem(`${SHELVES_STORAGE_KEY}_corrupt_${Date.now()}`, raw);
    } catch {
      /* localStorage full — nothing more we can do to preserve it */
    }
    return emptyData();
  }
}

function persist(data: ShelvesData) {
  localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(data));
}

function buildNewShelfItem(barcode: string, overrides: Partial<ShelfItem> = {}): ShelfItem {
  const product = database.find(barcode);
  const tagMode: ShelfTagMode = product?.Price2 ? 'dual' : 'standard';
  return {
    uid: makeId('item'),
    barcode,
    printQty: 1,
    tagMode,
    dualStyle: 'A',
    unit2: 'ยกลัง',
    ribbon: '',
    lastPrintedPrice: null,
    lastPrintedPrice2: null,
    lastPrintedLoc: null,
    lastPrintedAt: null,
    addedAt: Date.now(),
    ...overrides,
  };
}

function itemFromRemoved(rec: RemovedItem): ShelfItem {
  return {
    uid: makeId('item'),
    barcode: rec.barcode,
    printQty: rec.printQty,
    tagMode: rec.tagMode,
    dualStyle: rec.dualStyle,
    unit2: rec.unit2,
    ribbon: rec.ribbon,
    lastPrintedPrice: null,
    lastPrintedPrice2: null,
    lastPrintedLoc: null,
    lastPrintedAt: null,
    addedAt: Date.now(),
  };
}

export type ScanInResult =
  | { kind: 'added'; found: boolean }
  | { kind: 'added-from-history'; fromLoc: string }
  | { kind: 'duplicate-in-row' }
  | { kind: 'elsewhere'; loc: string };

export type ScanOutResult =
  | { kind: 'removed'; item: ShelfItem; loc: string }
  | { kind: 'elsewhere'; loc: string }
  | { kind: 'not-registered' };

export interface CheckUnregisteredEntry {
  barcode: string;
  existingLocation?: { shelfId: string; rowId: string; loc: string };
}

export interface CheckSummary {
  matchedBarcodes: string[]; // เรียงตามลำดับที่ยิง
  unregistered: CheckUnregisteredEntry[];
  missing: ShelfItem[]; // ลงทะเบียนไว้แต่ไม่ได้ยิงเจอ
}

export interface CheckApplyChoices {
  /** barcode -> true = เพิ่ม/ย้ายมาแถวนี้ (ค่าเริ่มต้น true ตาม spec) */
  addUnregistered: Record<string, boolean>;
  /** uid -> true = เก็บไว้ (ค่าเริ่มต้น true), false = เอาออก */
  keepMissing: Record<string, boolean>;
}

interface ShelvesState {
  shelves: Shelf[];
  removed: RemovedItem[];
  editsSinceBackup: number;
  lastBackupAt: number | null;

  needsBackupReminder: () => boolean;

  // ---- shelf CRUD ----
  addShelf: (code: string, name: string) => { ok: boolean; error?: string; shelfId?: string };
  updateShelf: (shelfId: string, patch: { code?: string; name?: string }) => { ok: boolean; error?: string };
  removeShelf: (shelfId: string) => void;

  // ---- row CRUD ----
  addRow: (shelfId: string, no: string) => { ok: boolean; error?: string; rowId?: string };
  updateRowNo: (shelfId: string, rowId: string, no: string) => { ok: boolean; error?: string };
  removeRow: (shelfId: string, rowId: string) => void;

  // ---- item field edits (used by RowScreen's per-item controls) ----
  updateItem: (shelfId: string, rowId: string, uid: string, patch: Partial<ShelfItem>) => void;
  moveItem: (shelfId: string, rowId: string, uid: string, dir: 'up' | 'down') => void;
  removeItemAt: (shelfId: string, rowId: string, uid: string) => ShelfItem | undefined;
  /** ใส่รายการที่เพิ่งลบกลับเข้าแถวเดิม ใช้กับปุ่ม "เลิกทำ" — เพิ่มต่อท้ายแถว (ไม่ได้คืน
   * ตำแหน่งเดิมเป๊ะ เพราะแถวอาจเปลี่ยนไปแล้วระหว่างที่ toast ค้างอยู่) */
  restoreItem: (shelfId: string, rowId: string, item: ShelfItem) => void;

  // ---- ยิงเข้า ----
  scanIn: (shelfId: string, rowId: string, barcode: string) => ScanInResult;
  confirmDuplicateInRow: (shelfId: string, rowId: string, barcode: string) => void;
  confirmMoveHere: (shelfId: string, rowId: string, barcode: string) => void;
  confirmAddBothLocations: (shelfId: string, rowId: string, barcode: string) => void;

  // ---- ยิงออก ----
  scanOut: (shelfId: string, rowId: string, barcode: string) => ScanOutResult;
  confirmRemoveFromElsewhere: (barcode: string) => ShelfItem | undefined;

  // ---- ยิงทวน ----
  buildCheckSummary: (shelfId: string, rowId: string, scannedBarcodes: string[]) => CheckSummary;
  applyCheck: (shelfId: string, rowId: string, scannedBarcodes: string[], choices: CheckApplyChoices) => void;

  // ---- print ----
  markPrinted: (
    updates: { shelfId: string; rowId: string; uid: string; price: string; price2: string; loc: string }[],
  ) => void;

  // ---- backup / import ----
  exportFile: () => ShelvesFile;
  importFile: (file: ShelvesFile) => { ok: boolean; error?: string };
  markBackedUp: () => void;
}

function touch(set: (fn: (s: ShelvesState) => Partial<ShelvesState>) => void, patch: Partial<ShelvesState>) {
  set((s) => {
    const next = { ...s, ...patch, editsSinceBackup: s.editsSinceBackup + 1 };
    persist({ shelves: next.shelves, removed: next.removed, editsSinceBackup: next.editsSinceBackup, lastBackupAt: next.lastBackupAt });
    return { ...patch, editsSinceBackup: next.editsSinceBackup };
  });
}

export const useShelvesStore = create<ShelvesState>((set, get) => {
  const initial = loadData();

  return {
    shelves: initial.shelves,
    removed: initial.removed,
    editsSinceBackup: initial.editsSinceBackup,
    lastBackupAt: initial.lastBackupAt,

    needsBackupReminder: () => get().editsSinceBackup >= BACKUP_REMINDER_THRESHOLD,

    addShelf: (codeRaw, name) => {
      const code = codeRaw.trim().toUpperCase().slice(0, 2);
      if (!code) return { ok: false, error: 'กรุณากรอกรหัสชั้น' };
      const { shelves } = get();
      if (shelves.some((s) => s.code === code)) return { ok: false, error: `รหัสชั้น "${code}" มีอยู่แล้ว` };
      const now = Date.now();
      const shelf: Shelf = { id: makeId('shelf'), code, name: name.trim(), rows: [], createdAt: now, updatedAt: now };
      touch(set, { shelves: [...shelves, shelf] });
      return { ok: true, shelfId: shelf.id };
    },

    updateShelf: (shelfId, patch) => {
      const { shelves } = get();
      const target = shelves.find((s) => s.id === shelfId);
      if (!target) return { ok: false, error: 'ไม่พบชั้นนี้' };
      let code = target.code;
      if (patch.code !== undefined) {
        code = patch.code.trim().toUpperCase().slice(0, 2);
        if (!code) return { ok: false, error: 'กรุณากรอกรหัสชั้น' };
        if (shelves.some((s) => s.id !== shelfId && s.code === code)) {
          return { ok: false, error: `รหัสชั้น "${code}" มีอยู่แล้ว` };
        }
      }
      const name = patch.name !== undefined ? patch.name.trim() : target.name;
      touch(set, {
        shelves: shelves.map((s) => (s.id === shelfId ? { ...s, code, name, updatedAt: Date.now() } : s)),
      });
      return { ok: true };
    },

    removeShelf: (shelfId) => {
      touch(set, { shelves: get().shelves.filter((s) => s.id !== shelfId) });
    },

    addRow: (shelfId, noRaw) => {
      const no = noRaw.trim().toUpperCase().slice(0, 2);
      if (!no) return { ok: false, error: 'กรุณากรอกเลขแถว' };
      const { shelves } = get();
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!shelf) return { ok: false, error: 'ไม่พบชั้นนี้' };
      if (shelf.rows.some((r) => r.no === no)) return { ok: false, error: `แถว "${no}" มีอยู่แล้ว` };
      const row = { id: makeId('row'), no, items: [], lastCheckedAt: null };
      touch(set, {
        shelves: shelves.map((s) => (s.id === shelfId ? { ...s, rows: [...s.rows, row], updatedAt: Date.now() } : s)),
      });
      return { ok: true, rowId: row.id };
    },

    updateRowNo: (shelfId, rowId, noRaw) => {
      const no = noRaw.trim().toUpperCase().slice(0, 2);
      if (!no) return { ok: false, error: 'กรุณากรอกเลขแถว' };
      const { shelves } = get();
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!shelf) return { ok: false, error: 'ไม่พบชั้นนี้' };
      if (shelf.rows.some((r) => r.id !== rowId && r.no === no)) return { ok: false, error: `แถว "${no}" มีอยู่แล้ว` };
      touch(set, {
        shelves: shelves.map((s) =>
          s.id === shelfId ? { ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, no } : r)), updatedAt: Date.now() } : s,
        ),
      });
      return { ok: true };
    },

    removeRow: (shelfId, rowId) => {
      touch(set, {
        shelves: get().shelves.map((s) => (s.id === shelfId ? { ...s, rows: s.rows.filter((r) => r.id !== rowId), updatedAt: Date.now() } : s)),
      });
    },

    updateItem: (shelfId, rowId, uid, patch) => {
      touch(set, {
        shelves: get().shelves.map((s) =>
          s.id !== shelfId
            ? s
            : {
                ...s,
                rows: s.rows.map((r) =>
                  r.id !== rowId ? r : { ...r, items: r.items.map((i) => (i.uid === uid ? { ...i, ...patch } : i)) },
                ),
              },
        ),
      });
    },

    moveItem: (shelfId, rowId, uid, dir) => {
      touch(set, {
        shelves: get().shelves.map((s) => {
          if (s.id !== shelfId) return s;
          return {
            ...s,
            rows: s.rows.map((r) => {
              if (r.id !== rowId) return r;
              const idx = r.items.findIndex((i) => i.uid === uid);
              if (idx === -1) return r;
              const swapWith = dir === 'up' ? idx - 1 : idx + 1;
              if (swapWith < 0 || swapWith >= r.items.length) return r;
              const items = r.items.slice();
              [items[idx], items[swapWith]] = [items[swapWith], items[idx]];
              return { ...r, items };
            }),
          };
        }),
      });
    },

    removeItemAt: (shelfId, rowId, uid) => {
      const { shelves } = get();
      const shelf = shelves.find((s) => s.id === shelfId);
      const row = shelf?.rows.find((r) => r.id === rowId);
      const item = row?.items.find((i) => i.uid === uid);
      if (!shelf || !row || !item) return undefined;
      const loc = buildLoc(shelf.code, row.no);
      const removedEntry: RemovedItem = {
        barcode: item.barcode,
        loc,
        removedAt: Date.now(),
        printQty: item.printQty,
        tagMode: item.tagMode,
        dualStyle: item.dualStyle,
        unit2: item.unit2,
        ribbon: item.ribbon,
      };
      const removed = [...get().removed, removedEntry].slice(-REMOVED_HISTORY_CAP);
      touch(set, {
        shelves: shelves.map((s) =>
          s.id !== shelfId ? s : { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, items: r.items.filter((i) => i.uid !== uid) })) },
        ),
        removed,
      });
      return item;
    },

    restoreItem: (shelfId, rowId, item) => {
      touch(set, {
        shelves: get().shelves.map((s) =>
          s.id !== shelfId ? s : { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, items: [...r.items, item] })) },
        ),
      });
    },

    scanIn: (shelfId, rowId, barcode) => {
      const { shelves, removed } = get();

      // 1) ซ้ำในแถวนี้?
      const { row: currentRow, index: dupIndex } = findItemInRow(shelves, shelfId, rowId, barcode);
      if (dupIndex !== -1) return { kind: 'duplicate-in-row' };
      void currentRow;

      // 2) อยู่แถวอื่นแล้ว?
      const elsewhere = findItemLocation(shelves, barcode, { shelfId, rowId });
      if (elsewhere) {
        const eShelf = shelves.find((s) => s.id === elsewhere.shelfId)!;
        const eRow = eShelf.rows.find((r) => r.id === elsewhere.rowId)!;
        return { kind: 'elsewhere', loc: buildLoc(eShelf.code, eRow.no) };
      }

      // 3) เคยอยู่ในประวัติยิงออก?
      const historyMatch = [...removed].reverse().find((r) => r.barcode === barcode);
      if (historyMatch) {
        const item = itemFromRemoved(historyMatch);
        appendItem(set, get, shelfId, rowId, item);
        return { kind: 'added-from-history', fromLoc: historyMatch.loc };
      }

      // 4) ของใหม่ / รอเข้าระบบ (ไม่พบใน Sheet)
      const product = database.find(barcode);
      const item = buildNewShelfItem(barcode);
      appendItem(set, get, shelfId, rowId, item);
      return { kind: 'added', found: !!product };
    },

    confirmDuplicateInRow: (shelfId, rowId, barcode) => {
      const { shelves } = get();
      const { row } = findItemInRow(shelves, shelfId, rowId, barcode);
      const item = row?.items.find((i) => i.barcode === barcode);
      if (!item) return;
      get().updateItem(shelfId, rowId, item.uid, { printQty: item.printQty + 1 });
    },

    confirmMoveHere: (shelfId, rowId, barcode) => {
      const { shelves } = get();
      const loc = findItemLocation(shelves, barcode, { shelfId, rowId });
      if (!loc) return;
      const fromShelf = shelves.find((s) => s.id === loc.shelfId)!;
      const fromRow = fromShelf.rows.find((r) => r.id === loc.rowId)!;
      const item = fromRow.items[loc.index];
      const moved: ShelfItem = { ...item, lastPrintedLoc: null }; // ตำแหน่งเปลี่ยน ต้องพิมพ์ใหม่
      const shelvesAfterRemove = shelves.map((s) =>
        s.id !== loc.shelfId
          ? s
          : { ...s, rows: s.rows.map((r) => (r.id !== loc.rowId ? r : { ...r, items: r.items.filter((_, idx) => idx !== loc.index) })) },
      );
      const shelvesAfterAdd = shelvesAfterRemove.map((s) =>
        s.id !== shelfId ? s : { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, items: [...r.items, moved] })) },
      );
      touch(set, { shelves: shelvesAfterAdd });
    },

    confirmAddBothLocations: (shelfId, rowId, barcode) => {
      const { shelves } = get();
      const loc = findItemLocation(shelves, barcode);
      const source = loc ? shelves.find((s) => s.id === loc.shelfId)?.rows.find((r) => r.id === loc.rowId)?.items[loc.index] : undefined;
      const item = buildNewShelfItem(barcode, {
        printQty: source?.printQty ?? 1,
        tagMode: source?.tagMode ?? 'standard',
        dualStyle: source?.dualStyle ?? 'A',
        unit2: source?.unit2 ?? 'ยกลัง',
        ribbon: source?.ribbon ?? '',
      });
      appendItem(set, get, shelfId, rowId, item);
    },

    scanOut: (shelfId, rowId, barcode) => {
      const { shelves } = get();
      const { index } = findItemInRow(shelves, shelfId, rowId, barcode);
      if (index !== -1) {
        const shelf = shelves.find((s) => s.id === shelfId)!;
        const row = shelf.rows.find((r) => r.id === rowId)!;
        const item = row.items[index];
        const loc = buildLoc(shelf.code, row.no);
        const removedItem = get().removeItemAt(shelfId, rowId, item.uid);
        return { kind: 'removed', item: removedItem!, loc };
      }
      const elsewhere = findItemLocation(shelves, barcode);
      if (elsewhere) {
        const eShelf = shelves.find((s) => s.id === elsewhere.shelfId)!;
        const eRow = eShelf.rows.find((r) => r.id === elsewhere.rowId)!;
        return { kind: 'elsewhere', loc: buildLoc(eShelf.code, eRow.no) };
      }
      return { kind: 'not-registered' };
    },

    confirmRemoveFromElsewhere: (barcode) => {
      const { shelves } = get();
      const loc = findItemLocation(shelves, barcode);
      if (!loc) return undefined;
      const shelf = shelves.find((s) => s.id === loc.shelfId)!;
      const row = shelf.rows.find((r) => r.id === loc.rowId)!;
      const item = row.items[loc.index];
      return get().removeItemAt(loc.shelfId, loc.rowId, item.uid);
    },

    buildCheckSummary: (shelfId, rowId, scannedBarcodes) => {
      const { shelves } = get();
      const shelf = shelves.find((s) => s.id === shelfId);
      const row = shelf?.rows.find((r) => r.id === rowId);
      const registeredBarcodes = new Set((row?.items || []).map((i) => i.barcode));
      const scannedSet = new Set(scannedBarcodes);

      const matchedBarcodes = scannedBarcodes.filter((b) => registeredBarcodes.has(b));
      const unregistered: CheckUnregisteredEntry[] = scannedBarcodes
        .filter((b) => !registeredBarcodes.has(b))
        .map((barcode) => {
          const loc = findItemLocation(shelves, barcode, { shelfId, rowId });
          if (!loc) return { barcode };
          const lShelf = shelves.find((s) => s.id === loc.shelfId)!;
          const lRow = lShelf.rows.find((r) => r.id === loc.rowId)!;
          return { barcode, existingLocation: { shelfId: loc.shelfId, rowId: loc.rowId, loc: buildLoc(lShelf.code, lRow.no) } };
        });
      const missing = (row?.items || []).filter((i) => !scannedSet.has(i.barcode));

      return { matchedBarcodes, unregistered, missing };
    },

    applyCheck: (shelfId, rowId, scannedBarcodes, choices) => {
      const { shelves } = get();
      const summary = get().buildCheckSummary(shelfId, rowId, scannedBarcodes);
      const shelf = shelves.find((s) => s.id === shelfId);
      const row = shelf?.rows.find((r) => r.id === rowId);
      if (!shelf || !row) return;

      const byBarcode = new Map(row.items.map((i) => [i.barcode, i] as const));
      const reordered: ShelfItem[] = summary.matchedBarcodes.map((b) => byBarcode.get(b)!).filter(Boolean);

      // เก็บไว้ (missing ที่ไม่ถูกเอาออก) ต่อท้าย เรียงตามลำดับเดิม
      const keptMissing = summary.missing.filter((i) => choices.keepMissing[i.uid] !== false);
      reordered.push(...keptMissing);

      // เอาออก (missing ที่ไม่ถูกเก็บไว้) -> บันทึกลง removed
      const removedNow = summary.missing.filter((i) => choices.keepMissing[i.uid] === false);
      const loc = buildLoc(shelf.code, row.no);
      const newRemovedEntries: RemovedItem[] = removedNow.map((i) => ({
        barcode: i.barcode,
        loc,
        removedAt: Date.now(),
        printQty: i.printQty,
        tagMode: i.tagMode,
        dualStyle: i.dualStyle,
        unit2: i.unit2,
        ribbon: i.ribbon,
      }));

      // เพิ่ม/ย้ายมาแถวนี้ (unregistered ที่ติ๊กไว้)
      const toRemoveFromElsewhere: { shelfId: string; rowId: string; barcode: string }[] = [];
      for (const entry of summary.unregistered) {
        if (choices.addUnregistered[entry.barcode] === false) continue;
        if (entry.existingLocation) {
          const src = shelves
            .find((s) => s.id === entry.existingLocation!.shelfId)
            ?.rows.find((r) => r.id === entry.existingLocation!.rowId)
            ?.items.find((i) => i.barcode === entry.barcode);
          reordered.push({ ...(src ?? buildNewShelfItem(entry.barcode)), lastPrintedLoc: null });
          toRemoveFromElsewhere.push({ shelfId: entry.existingLocation.shelfId, rowId: entry.existingLocation.rowId, barcode: entry.barcode });
        } else {
          reordered.push(buildNewShelfItem(entry.barcode));
        }
      }

      let nextShelves = shelves.map((s) => {
        if (s.id !== shelfId) return s;
        return { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, items: reordered, lastCheckedAt: Date.now() })) };
      });
      // เอารายการที่ "ย้ายมาแถวนี้" ออกจากตำแหน่งเดิม
      for (const mv of toRemoveFromElsewhere) {
        nextShelves = nextShelves.map((s) =>
          s.id !== mv.shelfId
            ? s
            : { ...s, rows: s.rows.map((r) => (r.id !== mv.rowId ? r : { ...r, items: r.items.filter((i) => i.barcode !== mv.barcode) })) },
        );
      }

      touch(set, { shelves: nextShelves, removed: [...get().removed, ...newRemovedEntries].slice(-REMOVED_HISTORY_CAP) });
    },

    markPrinted: (updates) => {
      if (!updates.length) return;
      const { shelves } = get();
      const now = Date.now();
      const nextShelves = shelves.map((s) => ({
        ...s,
        rows: s.rows.map((r) => ({
          ...r,
          items: r.items.map((i) => {
            const u = updates.find((x) => x.shelfId === s.id && x.rowId === r.id && x.uid === i.uid);
            if (!u) return i;
            return { ...i, lastPrintedPrice: u.price, lastPrintedPrice2: u.price2, lastPrintedLoc: u.loc, lastPrintedAt: now };
          }),
        })),
      }));
      touch(set, { shelves: nextShelves });
    },

    exportFile: () => ({ schema: 1, exportedAt: Date.now(), shelves: get().shelves, removed: get().removed }),

    importFile: (file) => {
      if (!file || file.schema !== 1 || !Array.isArray(file.shelves) || !Array.isArray(file.removed)) {
        return { ok: false, error: 'ไฟล์ข้อมูลไม่ถูกต้อง' };
      }
      set({ shelves: file.shelves, removed: file.removed, editsSinceBackup: 0, lastBackupAt: Date.now() });
      persist({ shelves: file.shelves, removed: file.removed, editsSinceBackup: 0, lastBackupAt: Date.now() });
      return { ok: true };
    },

    markBackedUp: () => {
      const patch = { editsSinceBackup: 0, lastBackupAt: Date.now() };
      set(patch);
      persist({ shelves: get().shelves, removed: get().removed, ...patch });
    },
  };
});

function appendItem(
  set: (fn: (s: ShelvesState) => Partial<ShelvesState>) => void,
  get: () => ShelvesState,
  shelfId: string,
  rowId: string,
  item: ShelfItem,
) {
  touch(set, {
    shelves: get().shelves.map((s) =>
      s.id !== shelfId ? s : { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, items: [...r.items, item] })) },
    ),
  });
}
