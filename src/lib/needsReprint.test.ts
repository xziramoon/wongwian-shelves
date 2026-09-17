import { describe, expect, it } from 'vitest';
import { needsReprint } from './needsReprint';
import type { Product, ShelfItem } from '../types';

function makeItem(patch: Partial<ShelfItem> = {}): ShelfItem {
  return {
    uid: 'u1',
    barcode: '123',
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

function makeProduct(patch: Partial<Product> = {}): Product {
  return { Barcode: '123', ProductName: 'ทดสอบ', Unit: 'ชิ้น', Price: '10.00', Price2: '', Image: '', Size: '', ...patch };
}

describe('needsReprint', () => {
  it('is false when not found in the product database ("รอเข้าระบบ")', () => {
    expect(needsReprint(makeItem(), 'A-1', undefined, true)).toBe(false);
  });

  it('is true when never printed before', () => {
    expect(needsReprint(makeItem({ lastPrintedAt: null }), 'A-1', makeProduct(), true)).toBe(true);
  });

  it('is false when already printed and nothing changed', () => {
    const item = makeItem({ lastPrintedAt: 1000, lastPrintedPrice: '10.00', lastPrintedPrice2: null, lastPrintedLoc: 'A-1' });
    expect(needsReprint(item, 'A-1', makeProduct(), true)).toBe(false);
  });

  it('is true when Price changed', () => {
    const item = makeItem({ lastPrintedAt: 1000, lastPrintedPrice: '9.00', lastPrintedLoc: 'A-1' });
    expect(needsReprint(item, 'A-1', makeProduct({ Price: '10.00' }), true)).toBe(true);
  });

  it('is true when Price2 changed', () => {
    const item = makeItem({ lastPrintedAt: 1000, lastPrintedPrice: '10.00', lastPrintedPrice2: '90.00', lastPrintedLoc: 'A-1' });
    expect(needsReprint(item, 'A-1', makeProduct({ Price: '10.00', Price2: '95.00' }), true)).toBe(true);
  });

  it('is true when moved to a new Loc and showLoc is on', () => {
    const item = makeItem({ lastPrintedAt: 1000, lastPrintedPrice: '10.00', lastPrintedLoc: 'A-1' });
    expect(needsReprint(item, 'A-2', makeProduct(), true)).toBe(true);
  });

  it('ignores a Loc change when showLoc is off', () => {
    const item = makeItem({ lastPrintedAt: 1000, lastPrintedPrice: '10.00', lastPrintedLoc: 'A-1' });
    expect(needsReprint(item, 'A-2', makeProduct(), false)).toBe(false);
  });
});
