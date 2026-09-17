import type { Config } from './types';

/* ⚠️ ห้ามแก้ — ยกมาจาก wongwian-tags01/src/constants.ts ตรงตัว (ห้ามแก้ค่า)
 * ต้องตรงกับฝั่ง publish/subscribe ของ TAG_PRINTER.html และ printBridge.ts เดิมทุกประการ */
export const CLOUD_DB_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRUuWPCwpQbleOg8F8Kyt34obiUG15BuUuHJvRfo_I5GSqlCPp638EqDUgcqHG0igWkg9g6ko7h9hYS/pub?gid=2051624344&single=true&output=csv';

/* Ably realtime — used only for the print-tags bridge (src/lib/printBridge.ts).
 * Publishes to the SAME channel/event the existing wongwian-tags01 receiver
 * (public/TAG_PRINTER.html) subscribes to — do not change these values. */
export const ABLY_API_KEY = '8nH3AQ.PvSlnw:CWEkBBL-RYpuLLgRyfLQIxivigFmhnbd2EzDD3oZvh8';
export const PRINT_TAGS_CHANNEL = 'branch-nuea-print-tags';
export const PRINT_EVENT_NAME = 'print';
/* ต้องใช้ v2 (แบ่ง batch) เพราะการพิมพ์หลายชั้นพร้อมกันพร้อม URL รูปภาพอาจเกิน ~64KB
 * ต่อข้อความของ Ably ถ้าส่งก้อนเดียวแบบ v1 จะส่งไม่ออก */
export const PRINT_PAYLOAD_VERSION = 2;
/* keep each published message safely under Ably's ~64KB cap */
export const PRINT_BATCH_MAX_BYTES = 48 * 1024;

export const SHELVES_STORAGE_KEY = 'wongwianShelves_v1';
export const SHELVES_CONFIG_STORAGE_KEY = 'wongwianShelvesConfig_v1';

/* ⚠️ ห้ามแก้ค่า — default ตรงกับ wongwian-tags01/src/constants.ts DEFAULT_CONFIG
 * (ค่าตัวเลขคัดลอกมาจาก SLIDER_DEFS[...].def เดิม) — เป็นค่าเริ่มต้นก่อนผู้ใช้ปรับแต่งเอง
 * ผ่าน SettingsSheet */
export const DEFAULT_CONFIG: Config = {
  header: 'ร้านวงเวียน',
  font: "'Kanit',sans-serif",
  labelSize: 'ขนาด',
  labelUnit: 'บรรจุ',
  labelRetail: 'ปลีก',
  invertBaht: true,
  w: 5.4,
  h: 4.0,
  bcHeight: 24,
  globalNameSz: 0,
  priceSz: 46,
  dualSz: 28,
  metaSz: 10,
  ribbonSz: 10,
  ribbonX: -32,
  ribbonY: 15,
  largeW: 11.4,
  largeH: 6.0,
  bcHeightLrg: 35,
  oosW: 5.4,
  oosH: 1.4,
  oosSz: 22,
  labelOos: 'สินค้าหมด',
  labelStop: 'เลิกจำหน่าย',
};

export interface SliderDef {
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
}

/* ⚠️ ห้ามแก้ค่า — ยกมาจาก wongwian-tags01/src/constants.ts SLIDER_DEFS ตรงตัว
 * (label, min, max, step, unit, default) */
export const SLIDER_DEFS: Record<string, SliderDef> = {
  w: { label: 'W (cm)', min: 2, max: 15, step: 0.1, def: 5.4 },
  h: { label: 'H (cm)', min: 2, max: 15, step: 0.1, def: 4.0 },
  bcHeight: { label: 'BARCODE HEIGHT', min: 10, max: 60, step: 1, def: 24 },
  globalNameSz: { label: 'NAME (0=Auto)', min: 0, max: 40, step: 1, def: 0 },
  priceSz: { label: 'PRICE 1', min: 10, max: 100, step: 1, def: 46 },
  dualSz: { label: 'DUAL / WHOLESALE', min: 10, max: 80, step: 1, def: 28 },
  metaSz: { label: 'META INFO', min: 6, max: 24, step: 1, def: 10 },
  ribbonSz: { label: 'RIBBON SIZE', min: 6, max: 24, step: 1, def: 10 },
  ribbonX: { label: 'RIBBON OFFSET X', min: -100, max: 100, step: 1, def: -32 },
  ribbonY: { label: 'RIBBON OFFSET Y', min: -100, max: 100, step: 1, def: 15 },
  largeW: { label: 'LARGE W (cm)', min: 5, max: 20, step: 0.1, def: 11.4 },
  largeH: { label: 'LARGE H (cm)', min: 3, max: 15, step: 0.1, def: 6.0 },
  bcHeightLrg: { label: 'LARGE BC HEIGHT', min: 10, max: 80, step: 1, def: 35 },
  oosW: { label: 'OOS W (cm)', min: 2, max: 15, step: 0.1, def: 5.4 },
  oosH: { label: 'OOS H (cm)', min: 0.8, max: 4, step: 0.1, def: 1.4 },
  oosSz: { label: 'OOS TEXT', min: 10, max: 40, step: 1, def: 22 },
};

/* ⚠️ ห้ามแก้ค่า — ยกมาจาก wongwian-tags01/src/constants.ts SIZE_PRESETS ตรงตัว */
export const SIZE_PRESETS: Record<string, Partial<Config>> = {
  S: { w: 3.0, h: 2.5, bcHeight: 18 },
  M: { w: 5.4, h: 4.0, bcHeight: 24 },
  L: { w: 8.0, h: 6.0, bcHeight: 30 },
  XL: { largeW: 11.4, largeH: 6.0, bcHeightLrg: 35 },
};
