/* ⚠️ ห้ามแก้ตรรกะ — QueueItem/Config/Product/ToastType/TagMode/DualStyle/OosReason
 * ยกมาจาก wongwian-tags-mobile/src/types/index.ts ตรงตัว (หลัง PROMPT 1: มี Loc/Printed)
 * ต้องตรงกันทุกฟิลด์เพื่อให้ normalize() และ TAG_PRINTER.html เข้ากันได้ */
export type TagMode = 'standard' | 'dual' | 'large' | 'oos';
export type DualStyle = 'A' | 'B';
export type OosReason = 'temp' | 'stop'; // temp = หมดชั่วคราว, stop = เลิกจำหน่าย

export interface QueueItem {
  Barcode: string;
  ProductName: string;
  NameFontSize: number;
  TagMode: TagMode;
  DualStyle: DualStyle;
  OldPrice: string;
  Price: string;
  Price2: string;
  PriceOffsetX: number;
  Size: string;
  Unit: string;
  Unit1: string;
  Unit2: string;
  PackType: string;
  Ribbon: string;
  Mfg: string;
  Exp: string;
  Image: string;
  PrintQty: number;
  PriceDiff: string | null;
  OosEta: string; // เช่น '18 ก.ย.' หรือ ''
  OosReason: OosReason;
  Loc: string;
  Printed: string; // วันที่พิมพ์ป้าย เช่น '17/9/69' หรือ ''
}

export interface Config {
  header: string;
  font: string;
  labelSize: string;
  labelUnit: string;
  labelRetail: string;
  invertBaht: boolean;
  w: number;
  h: number;
  bcHeight: number;
  globalNameSz: number;
  priceSz: number;
  dualSz: number;
  metaSz: number;
  ribbonSz: number;
  ribbonX: number;
  ribbonY: number;
  largeW: number;
  largeH: number;
  bcHeightLrg: number;
  oosW: number;
  oosH: number;
  oosSz: number;
  labelOos: string;
  labelStop: string;
  [key: string]: string | number | boolean | undefined;
}

export interface Product {
  Barcode: string;
  ProductName: string;
  Unit: string;
  Price: string;
  Price2: string;
  Image: string;
  Size: string;
}

export type ToastType = 'info' | 'success' | 'error';

/* ============================================================
 * โครงสร้างข้อมูลชั้นวาง (ใหม่ทั้งหมด เฉพาะแอปนี้)
 * ============================================================ */

/** ชนิดป้ายที่ลงทะเบียนบนชั้นวางได้ — ไม่รวม 'oos' (ดูเหตุผลใน spec: ร้านไม่สร้างสถานะ
 * "พักไว้/หมดชั่วคราว" ในแอปนี้ ของหมดชั่วคราวแค่ขยับป้ายเดิมไปท้ายแถว ไม่ใช่งานของแอปนี้) */
export type ShelfTagMode = 'standard' | 'dual' | 'large';

export interface ShelfItem {
  uid: string; // id ของรายการ (ไม่ใช่บาร์โค้ด) เพราะสินค้าเดียวกันอยู่หลายที่ได้
  barcode: string;
  printQty: number; // ค่าเริ่มต้น 1
  tagMode: ShelfTagMode;
  dualStyle: DualStyle;
  unit2: string; // ค่าเริ่มต้น 'ยกลัง'
  ribbon: string; // ค่าเริ่มต้น ''
  lastPrintedPrice: string | null; // ค่า ณ ตอนพิมพ์สำเร็จครั้งล่าสุด
  lastPrintedPrice2: string | null;
  lastPrintedLoc: string | null; // Loc ที่ส่งไปพิมพ์ ('' ถ้าปิดการแสดงตำแหน่ง)
  lastPrintedAt: number | null;
  addedAt: number;
}

export interface ShelfRow {
  id: string;
  no: string; // เลขแถว 1–2 ตัวอักษร เช่น "3", "12"
  items: ShelfItem[]; // ลำดับใน array = ลำดับบนชั้นจริง ซ้ายไปขวา
  lastCheckedAt: number | null; // ยิงทวนครั้งล่าสุด
}

export interface Shelf {
  id: string;
  code: string; // รหัสชั้น 1–2 ตัว A-Z/0-9 ตัวพิมพ์ใหญ่ เช่น "A", "B2"
  name: string; // ชื่อเรียก เช่น "ชั้นขนม" (ไม่บังคับ)
  rows: ShelfRow[];
  createdAt: number;
  updatedAt: number;
}

/** ประวัติยิงออก เก็บ 200 รายการล่าสุด — ให้ยิงเข้าที่แถวอื่นแล้วได้ค่าเดิมคืน (จำนวนป้าย/
 * ชนิดป้าย/ริบบิ้น) แทนที่จะเริ่มจากค่า default ใหม่ทุกครั้ง */
export interface RemovedItem {
  barcode: string;
  loc: string; // เช่น "A-3"
  removedAt: number;
  printQty: number;
  tagMode: ShelfTagMode;
  dualStyle: DualStyle;
  unit2: string;
  ribbon: string;
}

export interface ShelvesFile {
  schema: 1;
  exportedAt: number;
  shelves: Shelf[];
  removed: RemovedItem[];
}
