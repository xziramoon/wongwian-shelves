import { beforeEach, describe, expect, it } from 'vitest';
import { buildPrintPlan } from './printPlan';
import { database } from './database';
import type { Shelf, ShelfItem } from '../types';

function makeItem(patch: Partial<ShelfItem>): ShelfItem {
  return {
    uid: 'u',
    barcode: '1',
    printQty: 1,
    tagMode: 'standard',
    dualStyle: 'A',
    unit2: 'ยกลัง',
    ribbon: '',
    lastPrintedPrice: null,
    lastPrintedPrice2: null,
    lastPrintedLoc: null,
    lastPrintedAt: null,
    addedAt: 0,
    ...patch,
  };
}

beforeEach(() => {
  database.data = [
    { Barcode: '1', ProductName: 'สินค้า 1', Unit: 'ชิ้น', Price: '10.00', Price2: '', Image: '', Size: '' },
    { Barcode: '2', ProductName: 'สินค้า 2', Unit: 'ชิ้น', Price: '20.00', Price2: '', Image: '', Size: '' },
  ];
  database.index = { '1': database.data[0], '2': database.data[1] };
});

describe('buildPrintPlan', () => {
  it('orders entries by shelf code, numeric row number, then item order', () => {
    const shelves: Shelf[] = [
      {
        id: 's2',
        code: 'B',
        name: '',
        rows: [{ id: 'r1', no: '1', items: [makeItem({ uid: 'b1', barcode: '1' })], lastCheckedAt: null }],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 's1',
        code: 'A',
        name: '',
        rows: [
          { id: 'r10', no: '10', items: [makeItem({ uid: 'a10', barcode: '2' })], lastCheckedAt: null },
          { id: 'r2', no: '2', items: [makeItem({ uid: 'a2', barcode: '1' })], lastCheckedAt: null },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const selected = new Set(['r1', 'r10', 'r2']);
    const plan = buildPrintPlan(shelves, selected, false, true);
    // shelf A before B; within A, row "2" before row "10" (numeric, not string sort)
    expect(plan.entries.map((e) => e.item.uid)).toEqual(['a2', 'a10', 'b1']);
  });

  it('excludes items not found in the product database, listing them as pending', () => {
    const shelves: Shelf[] = [
      { id: 's1', code: 'A', name: '', rows: [{ id: 'r1', no: '1', items: [makeItem({ barcode: '999' })], lastCheckedAt: null }], createdAt: 0, updatedAt: 0 },
    ];
    const plan = buildPrintPlan(shelves, new Set(['r1']), false, true);
    expect(plan.entries).toHaveLength(0);
    expect(plan.pendingBarcodes).toEqual(['999']);
  });

  it('onlyChanged=true includes only items that need reprinting', () => {
    const shelves: Shelf[] = [
      {
        id: 's1',
        code: 'A',
        name: '',
        rows: [
          {
            id: 'r1',
            no: '1',
            items: [
              makeItem({ uid: 'never', barcode: '1' }), // never printed -> included
              makeItem({ uid: 'unchanged', barcode: '2', lastPrintedAt: 1, lastPrintedPrice: '20.00', lastPrintedLoc: 'A-1' }), // unchanged
            ],
            lastCheckedAt: null,
          },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const plan = buildPrintPlan(shelves, new Set(['r1']), true, true);
    expect(plan.entries.map((e) => e.item.uid)).toEqual(['never']);
    expect(plan.reasonCounts.never).toBe(1);
  });

  it('classifies reason as "price" vs "loc" vs "never"', () => {
    const shelves: Shelf[] = [
      {
        id: 's1',
        code: 'A',
        name: '',
        rows: [
          {
            id: 'r1',
            no: '1',
            items: [
              makeItem({ uid: 'p', barcode: '1', lastPrintedAt: 1, lastPrintedPrice: '5.00', lastPrintedLoc: 'A-1' }),
              makeItem({ uid: 'l', barcode: '2', lastPrintedAt: 1, lastPrintedPrice: '20.00', lastPrintedLoc: 'A-9' }),
            ],
            lastCheckedAt: null,
          },
        ],
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const plan = buildPrintPlan(shelves, new Set(['r1']), true, true);
    const byUid = Object.fromEntries(plan.entries.map((e) => [e.item.uid, e.reason]));
    expect(byUid.p).toBe('price');
    expect(byUid.l).toBe('loc');
  });

  it('only sums tagCountByShelf/reasonCounts for included entries, weighted by printQty', () => {
    const shelves: Shelf[] = [
      { id: 's1', code: 'A', name: '', rows: [{ id: 'r1', no: '1', items: [makeItem({ barcode: '1', printQty: 3 })], lastCheckedAt: null }], createdAt: 0, updatedAt: 0 },
    ];
    const plan = buildPrintPlan(shelves, new Set(['r1']), false, true);
    expect(plan.tagCountByShelf.A).toBe(3);
  });
});
