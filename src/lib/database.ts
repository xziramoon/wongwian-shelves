import Papa from 'papaparse';
import type { Product } from '../types';
import { CLOUD_DB_URL } from '../constants';

/*
 * ⚠️ ห้ามแก้ตรรกะ — CSV parsing (auto-detect header, column mapping, positional
 * defaults, leading-zero tolerant find) ยกมาจาก wongwian-tags01/src/lib/database.ts
 * DatabaseService._processData ตรงตัว (A=barcode B=name C=unit D=price E=price2 F=image)
 */
const HEADER_WORDS = ['barcode', 'price', 'ราคา', 'บาร์โค้ด', 'รหัส', 'ชื่อสินค้า', 'productname', 'name', 'หน่วย', 'unit'];

export type DatabaseListener = (data: Product[]) => void;

class DatabaseService {
  data: Product[] = [];
  index: Record<string, Product> = {};
  private listeners: DatabaseListener[] = [];

  onChange(fn: DatabaseListener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.data));
  }

  sync(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      const url = CLOUD_DB_URL + (CLOUD_DB_URL.includes('?') ? '&' : '?') + '_ts=' + Date.now();
      Papa.parse(url, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (res) => {
          this._processData(res.data as string[][]);
          resolve(this.data);
        },
        error: (err) => reject(err),
      });
    });
  }

  private _processData(rawRows: string[][]) {
    if (!rawRows || !rawRows.length) {
      this.data = [];
      this.index = {};
      this.notify();
      return;
    }

    // Detect a header row: does row 0 contain known header words?
    const first = rawRows[0].map((c) => String(c || '').toLowerCase().trim());
    const looksLikeHeader = first.some((c) => HEADER_WORDS.includes(c));

    // Build column index map. Default positional: A=barcode B=name C=unit D=price E=price2 F=image
    let colBarcode = 0,
      colName = 1,
      colUnit = 2,
      colPrice = 3,
      colPrice2 = 4,
      colImage = 5,
      colSize = -1;
    let dataRows = rawRows;

    if (looksLikeHeader) {
      const findCol = (words: string[]) => first.findIndex((c) => words.includes(c));
      const bc = findCol(['barcode', 'บาร์โค้ด', 'รหัส']);
      if (bc >= 0) colBarcode = bc;
      const nm = findCol(['productname', 'name', 'ชื่อสินค้า', 'สินค้า']);
      if (nm >= 0) colName = nm;
      const un = findCol(['unit', 'หน่วย']);
      if (un >= 0) colUnit = un;
      const pr = findCol(['price', 'ราคา', 'ราคาขาย']);
      if (pr >= 0) colPrice = pr;
      const p2 = findCol(['price2', 'ราคาส่ง', 'ราคายกลัง']);
      if (p2 >= 0) colPrice2 = p2;
      const im = findCol(['image', 'รูป', 'รูปภาพ', 'imageurl', 'img']);
      if (im >= 0) colImage = im;
      const sz = findCol(['size', 'ขนาด']);
      if (sz >= 0) colSize = sz;
      dataRows = rawRows.slice(1); // drop header row
    }

    const g = (row: string[], idx: number) => (idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '');

    this.data = dataRows
      .map(
        (row): Product => ({
          Barcode: g(row, colBarcode),
          ProductName: g(row, colName),
          Unit: g(row, colUnit),
          Price: g(row, colPrice),
          Price2: g(row, colPrice2),
          Image: g(row, colImage),
          Size: colSize >= 0 ? g(row, colSize) : '',
        }),
      )
      .filter((p) => p.Barcode);

    this.index = {};
    this.data.forEach((p) => {
      this.index[p.Barcode] = p;
    });
    this.notify();
  }

  find(code: string): Product | undefined {
    const c = String(code).trim();
    if (this.index[c]) return this.index[c];
    // tolerate leading-zero differences between queue and sheet
    const stripped = c.replace(/^0+/, '');
    for (const k in this.index) {
      if (k.replace(/^0+/, '') === stripped) return this.index[k];
    }
    return this.data.find((x) => String(x.Barcode) === c);
  }

  search(query: string): Product[] {
    // multi-token AND match: "ไก่ 5กิโล" splits into ["ไก่","5กิโล"], and a product
    // must contain EVERY token somewhere (in either order, anywhere in the name/
    // barcode) to match — e.g. "ข้าวไก่แจ้ 5 กิโล" matches both tokens even though
    // neither appears as one contiguous phrase. A single-word query like "ไก่แจ้"
    // still behaves as a plain substring search, just with one token.
    const tokens = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) return [];

    // spaces stripped on both sides so "5กิโล" (typed with no space) still matches
    // a product name written "5 กิโล" (with a space) — units/numbers are written
    // inconsistently across the sheet, this keeps token matching spacing-tolerant
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

    // no result cap — the caller renders this in a scrollable list, so a common
    // search term should surface every match, not just the first page
    return this.data.filter((p) => {
      const haystack = normalize(String(p.ProductName || '') + ' ' + String(p.Barcode || ''));
      return tokens.every((t) => haystack.includes(t));
    });
  }
}

export const database = new DatabaseService();
