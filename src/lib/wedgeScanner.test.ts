import { describe, expect, it } from 'vitest';
import { convertKedmaneeBarcode, hasUnconvertedThai } from './wedgeScanner';

describe('convertKedmaneeBarcode', () => {
  it('converts Kedmanee-layout Thai letters back to digits', () => {
    expect(convertKedmaneeBarcode('ๅภถจ')).toBe('1450');
  });

  it('leaves a plain numeric barcode unchanged', () => {
    expect(convertKedmaneeBarcode('8850999123456')).toBe('8850999123456');
  });

  it('leaves an alphanumeric barcode with a real hyphen unchanged (no Thai present)', () => {
    expect(convertKedmaneeBarcode('AB-12')).toBe('AB-12');
  });

  it('converts Thai numerals to Arabic digits even with no other Thai letters', () => {
    expect(convertKedmaneeBarcode('๘๘๕๐')).toBe('8850');
  });

  it('converts a mix of Thai digits and Kedmanee letters', () => {
    expect(convertKedmaneeBarcode('๘๘๕๐ๅภถจ')).toBe('8850' + '1450');
  });
});

describe('hasUnconvertedThai', () => {
  it('is false for a fully converted ASCII/digit string', () => {
    expect(hasUnconvertedThai(convertKedmaneeBarcode('ๅภถจ'))).toBe(false);
  });

  it('is true when a Thai character has no Kedmanee digit mapping', () => {
    expect(hasUnconvertedThai(convertKedmaneeBarcode('กก'))).toBe(true);
  });
});
