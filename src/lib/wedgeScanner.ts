/* ปืนยิงบาร์โค้ดบลูทูธทำงานเป็นคีย์บอร์ด (HID) — ถ้ามือถือตั้งแป้นพิมพ์เป็นภาษาไทยอยู่
 * ปืนจะพิมพ์ตัวอักษรไทยตามผัง Kedmanee แทนตัวเลข (เพราะปืนส่ง keycode ตำแหน่งเดียวกับที่
 * แป้นเลข แต่ระบบตีความตามเลย์เอาต์ปัจจุบัน) ต้องแปลงกลับเป็นตัวเลขก่อนใช้งาน */
export const KEDMANEE_TO_DIGIT: Record<string, string> = {
  'ๅ': '1',
  '/': '2',
  '-': '3',
  'ภ': '4',
  'ถ': '5',
  'ุ': '6',
  'ึ': '7',
  'ค': '8',
  'ต': '9',
  'จ': '0',
};

const THAI_DIGIT_TO_ARABIC: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

const THAI_CHAR_RX = /[฀-๿]/;

/**
 * แปลงบาร์โค้ดที่ปืนยิงพิมพ์ออกมาผิดเพราะแป้นพิมพ์ตั้งเป็นภาษาไทย กลับเป็นตัวเลข/อักษร
 * อังกฤษที่ควรจะเป็น — คืนค่าเดิมทันทีถ้าไม่มีอักษรไทยเลย (CODE128 อาจมี '-' หรือ '/' จริง
 * ซึ่งเป็นอักขระปกติ ไม่ใช่สัญญาณว่าแป้นพิมพ์ผิด) เลขไทย ๐-๙ แปลงเป็น 0-9 เสมอไม่ว่าจะมี
 * อักษรไทยตัวอื่นปนหรือไม่ก็ตาม
 */
export function convertKedmaneeBarcode(raw: string): string {
  let hasThai = false;
  let out = '';
  for (const ch of raw) {
    if (THAI_DIGIT_TO_ARABIC[ch] !== undefined) {
      out += THAI_DIGIT_TO_ARABIC[ch];
      continue;
    }
    if (THAI_CHAR_RX.test(ch)) hasThai = true;
    out += ch;
  }
  if (!hasThai) return out;

  let mapped = '';
  for (const ch of out) {
    mapped += KEDMANEE_TO_DIGIT[ch] !== undefined ? KEDMANEE_TO_DIGIT[ch] : ch;
  }
  return mapped;
}

/** ยังมีอักษรไทยเหลืออยู่หลังแปลงแล้ว = แปลงไม่สำเร็จ (ปุ่มที่กดไม่อยู่ในตาราง Kedmanee ด้านบน) */
export function hasUnconvertedThai(s: string): boolean {
  return THAI_CHAR_RX.test(s);
}
