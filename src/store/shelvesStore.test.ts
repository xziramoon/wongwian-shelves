import { beforeEach, describe, expect, it } from 'vitest';
import { loadData, useShelvesStore } from './shelvesStore';
import { SHELVES_STORAGE_KEY } from '../constants';

function resetStore() {
  localStorage.clear();
  useShelvesStore.setState({ shelves: [], removed: [], editsSinceBackup: 0, lastBackupAt: null });
}

beforeEach(() => {
  resetStore();
});

function setupShelfWithRows(rowNos: string[]) {
  const { addShelf, addRow } = useShelvesStore.getState();
  const { shelfId } = addShelf('A', 'ชั้นทดสอบ');
  const rowIds: Record<string, string> = {};
  for (const no of rowNos) {
    const { rowId } = addRow(shelfId!, no);
    rowIds[no] = rowId!;
  }
  return { shelfId: shelfId!, rowIds };
}

describe('shelvesStore — shelf/row CRUD', () => {
  it('adds a shelf and rejects a duplicate code', () => {
    const { addShelf } = useShelvesStore.getState();
    const r1 = addShelf('a', 'ชั้นขนม');
    expect(r1.ok).toBe(true);
    expect(useShelvesStore.getState().shelves[0].code).toBe('A'); // auto-uppercased

    const r2 = addShelf('A', 'ชั้นอื่น');
    expect(r2.ok).toBe(false);
  });

  it('adds a row and rejects a duplicate row number within the same shelf', () => {
    const { shelfId } = setupShelfWithRows(['1']);
    const { addRow } = useShelvesStore.getState();
    expect(addRow(shelfId, '1').ok).toBe(false);
    expect(addRow(shelfId, '2').ok).toBe(true);
  });
});

describe('shelvesStore — scanIn', () => {
  it('adds a brand-new barcode to the row, in scan order', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    const { scanIn } = useShelvesStore.getState();
    const r1 = scanIn(shelfId, rowIds['1'], '111');
    const r2 = scanIn(shelfId, rowIds['1'], '222');
    expect(r1.kind).toBe('added');
    expect(r2.kind).toBe('added');
    const row = useShelvesStore.getState().shelves[0].rows[0];
    expect(row.items.map((i) => i.barcode)).toEqual(['111', '222']);
  });

  it('detects a duplicate scan within the same row without adding a second row', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    const { scanIn } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const dup = scanIn(shelfId, rowIds['1'], '111');
    expect(dup.kind).toBe('duplicate-in-row');
    expect(useShelvesStore.getState().shelves[0].rows[0].items).toHaveLength(1);
  });

  it('flags a barcode already registered in a different row as "elsewhere"', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1', '2']);
    const { scanIn } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const res = scanIn(shelfId, rowIds['2'], '111');
    expect(res).toEqual({ kind: 'elsewhere', loc: 'A-1' });
  });

  it('confirmMoveHere moves the item and clears lastPrintedLoc (needs reprint)', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1', '2']);
    const { scanIn, confirmMoveHere, markPrinted } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const uid = useShelvesStore.getState().shelves[0].rows[0].items[0].uid;
    markPrinted([{ shelfId, rowId: rowIds['1'], uid, price: '10.00', price2: '', loc: 'A-1' }]);

    confirmMoveHere(shelfId, rowIds['2'], '111');
    const shelf = useShelvesStore.getState().shelves[0];
    expect(shelf.rows[0].items).toHaveLength(0);
    expect(shelf.rows[1].items).toHaveLength(1);
    expect(shelf.rows[1].items[0].lastPrintedLoc).toBeNull();
  });

  it('re-adding a barcode found in scan-out history restores its old settings', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1', '2']);
    const { scanIn, scanOut } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const uid = useShelvesStore.getState().shelves[0].rows[0].items[0].uid;
    useShelvesStore.getState().updateItem(shelfId, rowIds['1'], uid, { printQty: 5, ribbon: 'ลดพิเศษ' });
    scanOut(shelfId, rowIds['1'], '111');

    const res = scanIn(shelfId, rowIds['2'], '111');
    expect(res.kind).toBe('added-from-history');
    const item = useShelvesStore.getState().shelves[0].rows[1].items[0];
    expect(item.printQty).toBe(5);
    expect(item.ribbon).toBe('ลดพิเศษ');
  });
});

describe('shelvesStore — scanOut', () => {
  it('removes an item present in the current row and records it in history', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    const { scanIn, scanOut } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const res = scanOut(shelfId, rowIds['1'], '111');
    expect(res.kind).toBe('removed');
    expect(useShelvesStore.getState().shelves[0].rows[0].items).toHaveLength(0);
    expect(useShelvesStore.getState().removed).toHaveLength(1);
  });

  it('reports "elsewhere" when scanning out a barcode registered in another row', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1', '2']);
    const { scanIn, scanOut } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const res = scanOut(shelfId, rowIds['2'], '111');
    expect(res).toEqual({ kind: 'elsewhere', loc: 'A-1' });
  });

  it('reports "not-registered" for an unknown barcode', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    const res = useShelvesStore.getState().scanOut(shelfId, rowIds['1'], '999');
    expect(res).toEqual({ kind: 'not-registered' });
  });

  it('restoreItem undoes a removal', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    const { scanIn, scanOut, restoreItem } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['1'], '111');
    const res = scanOut(shelfId, rowIds['1'], '111');
    expect(res.kind).toBe('removed');
    if (res.kind === 'removed') restoreItem(shelfId, rowIds['1'], res.item);
    expect(useShelvesStore.getState().shelves[0].rows[0].items.map((i) => i.barcode)).toEqual(['111']);
  });
});

describe('shelvesStore — ยิงทวน (check)', () => {
  it('scenario: skip one registered tag, scan one unregistered tag — summary + apply', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['3']);
    const { scanIn, buildCheckSummary, applyCheck } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['3'], '111');
    scanIn(shelfId, rowIds['3'], '222'); // this one will be "skipped" during the check
    scanIn(shelfId, rowIds['3'], '333');

    // physically: scanned 111, 333 (in that order), and a rogue tag 999 not registered
    const scanned = ['111', '333', '999'];
    const summary = buildCheckSummary(shelfId, rowIds['3'], scanned);
    expect(summary.matchedBarcodes).toEqual(['111', '333']);
    expect(summary.unregistered.map((u) => u.barcode)).toEqual(['999']);
    expect(summary.missing.map((m) => m.barcode)).toEqual(['222']);

    applyCheck(shelfId, rowIds['3'], scanned, {
      addUnregistered: { '999': true },
      keepMissing: { [summary.missing[0].uid]: false }, // เอาออก
    });

    const row = useShelvesStore.getState().shelves[0].rows[0];
    expect(row.items.map((i) => i.barcode)).toEqual(['111', '333', '999']);
    expect(row.lastCheckedAt).not.toBeNull();
    expect(useShelvesStore.getState().removed.map((r) => r.barcode)).toContain('222');
  });

  it('keeps a "missing" item by default when keepMissing is not explicitly false', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['3']);
    const { scanIn, applyCheck } = useShelvesStore.getState();
    scanIn(shelfId, rowIds['3'], '111');
    scanIn(shelfId, rowIds['3'], '222');

    applyCheck(shelfId, rowIds['3'], ['111'], { addUnregistered: {}, keepMissing: {} });
    const row = useShelvesStore.getState().shelves[0].rows[0];
    expect(row.items.map((i) => i.barcode)).toEqual(['111', '222']);
  });
});

describe('shelvesStore — corrupt data recovery', () => {
  it('preserves the raw corrupted value under a _corrupt_<timestamp> key and returns empty data, without throwing', () => {
    localStorage.setItem(SHELVES_STORAGE_KEY, '{not valid json');
    let result;
    expect(() => {
      result = loadData();
    }).not.toThrow();
    expect(result).toEqual({ shelves: [], removed: [], editsSinceBackup: 0, lastBackupAt: null });

    const corruptKey = Object.keys(localStorage).find((k) => k.startsWith(`${SHELVES_STORAGE_KEY}_corrupt_`));
    expect(corruptKey).toBeDefined();
    expect(localStorage.getItem(corruptKey!)).toBe('{not valid json');
    // the original key itself is untouched by the recovery (not overwritten until
    // the next real persist() call)
    expect(localStorage.getItem(SHELVES_STORAGE_KEY)).toBe('{not valid json');
  });

  it('tolerates valid JSON with missing/wrong-shaped fields by defaulting them', () => {
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify({ shelves: 'not-an-array' }));
    const result = loadData();
    expect(result.shelves).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('importFile rejects a file with the wrong schema', () => {
    const res = useShelvesStore.getState().importFile({ schema: 2, exportedAt: 0, shelves: [], removed: [] } as never);
    expect(res.ok).toBe(false);
  });

  it('exportFile/importFile round-trip preserves shelves and removed history', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    useShelvesStore.getState().scanIn(shelfId, rowIds['1'], '111');
    useShelvesStore.getState().scanOut(shelfId, rowIds['1'], '111');
    const file = useShelvesStore.getState().exportFile();

    resetStore();
    expect(useShelvesStore.getState().shelves).toHaveLength(0);

    const res = useShelvesStore.getState().importFile(file);
    expect(res.ok).toBe(true);
    expect(useShelvesStore.getState().shelves[0].code).toBe('A');
    expect(useShelvesStore.getState().removed).toHaveLength(1);
  });
});

describe('shelvesStore — persistence', () => {
  it('persists to localStorage and a fresh load call reads it back', () => {
    const { shelfId, rowIds } = setupShelfWithRows(['1']);
    useShelvesStore.getState().scanIn(shelfId, rowIds['1'], '111');

    const raw = localStorage.getItem(SHELVES_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.shelves[0].rows[0].items[0].barcode).toBe('111');
  });

  it('tracks editsSinceBackup and resets it on markBackedUp', () => {
    setupShelfWithRows(['1']);
    expect(useShelvesStore.getState().editsSinceBackup).toBeGreaterThan(0);
    useShelvesStore.getState().markBackedUp();
    expect(useShelvesStore.getState().editsSinceBackup).toBe(0);
  });

  it('needsBackupReminder flips true after 20 edits', () => {
    const { addRow } = useShelvesStore.getState();
    const { shelfId } = setupShelfWithRows([]);
    for (let i = 0; i < 25; i++) addRow(shelfId, String(i));
    expect(useShelvesStore.getState().needsBackupReminder()).toBe(true);
  });
});
