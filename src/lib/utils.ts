import type { TagMode } from '../types';

/* ⚠️ ห้ามแก้ตรรกะ — ยกมาจาก wongwian-tags01/src/lib/utils.ts ตรงตัว */
export const escapeHTML = (str: unknown): string => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, (tag) =>
    (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      } as Record<string, string>
    )[tag],
  );
};

export const debounce = <A extends unknown[]>(func: (...args: A) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const fmtPrice = (v: unknown): string => {
  const n = parseFloat(String(v)) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

export const priceEq = (a: unknown, b: unknown): boolean => {
  const na = parseFloat(String(a));
  const nb = parseFloat(String(b));
  if (isNaN(na) && isNaN(nb)) return true;
  return Math.abs((na || 0) - (nb || 0)) < 0.001;
};

const SIZE_RX =
  /(\d+(?:\.\d+)?\s*(?:กิโลกรัม|กิโล|กรัม|มิลลิลิตร|มิลลิกรัม|ลิตร|ซีซี|ออนซ์|ฟุต|นิ้ว|เมตร|เซนติเมตร|มิลลิเมตร|kg\.?|g\.?|mg\.?|ml\.?|mL\.?|l\.?|L\.?|cc\.?|oz\.?|lb\.?|cm\.?|mm\.?|m\.?|กก\.?|มล\.?|ซม\.?|มม\.?))/gi;

export const extractSize = (name: string | undefined): string => {
  if (!name) return '';
  const m = [...name.matchAll(SIZE_RX)];
  return m.length ? m[m.length - 1][0].trim() : '';
};

/* วันที่พิมพ์บนป้าย — วัน/เดือน/ปี พ.ศ. 2 หลัก ไม่เติมศูนย์หน้าวัน/เดือน แต่ปีเติมศูนย์
 * ให้ครบ 2 หลักเสมอ (เช่น พ.ศ. 2600 -> "00") เพื่อความกว้างคงที่ตอนอ่านบนป้ายเล็กๆ
 * ต้องตรงกับ wongwian-tags01/src/lib/utils.ts formatPrintedDate() ทุกตัวอักษร */
export const formatPrintedDate = (d: Date): string => {
  const beYear = d.getFullYear() + 543;
  const yy = String(beYear % 100).padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1}/${yy}`;
};

export const autoFontSize = (name: string | undefined, mode: TagMode = 'standard'): number => {
  const len = (name || '').trim().length;
  if (mode === 'large') {
    if (len <= 15) return 22;
    if (len <= 30) return 18;
    if (len <= 45) return 16;
    if (len <= 60) return 14;
    if (len <= 75) return 12;
    return 10;
  }
  if (len <= 10) return 14;
  if (len <= 20) return 12;
  if (len <= 30) return 10.5;
  if (len <= 40) return 9.5;
  if (len <= 50) return 8.5;
  return 7.5;
};
