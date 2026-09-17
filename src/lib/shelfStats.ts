import type { Shelf } from '../types';
import { database } from './database';
import { needsReprint } from './needsReprint';
import { buildLoc } from './shelfHelpers';

export interface ShelfStats {
  rowCount: number;
  itemCount: number;
  reprintCount: number; // ต้องเปลี่ยนป้าย
  pendingCount: number; // รอเข้าระบบ (ไม่พบใน Sheet)
}

/** ใช้ showLoc=true เป็นค่าประมาณสำหรับตัวเลขสรุปหน้าหลัก/หน้าชั้น — ตรงกับค่าเริ่มต้นของ
 * ตัวเลือก "แสดงชั้น-แถวบนป้าย" ในหน้าพิมพ์ ตัวเลขจริงตอนพิมพ์คำนวณใหม่ตามตัวเลือกที่เลือกจริง */
export function computeShelfStats(shelf: Shelf, showLoc = true): ShelfStats {
  let itemCount = 0;
  let reprintCount = 0;
  let pendingCount = 0;
  for (const row of shelf.rows) {
    const loc = buildLoc(shelf.code, row.no);
    for (const item of row.items) {
      itemCount++;
      const product = database.find(item.barcode);
      if (!product) {
        pendingCount++;
        continue;
      }
      if (needsReprint(item, loc, product, showLoc)) reprintCount++;
    }
  }
  return { rowCount: shelf.rows.length, itemCount, reprintCount, pendingCount };
}

export function computeTotalReprintCount(shelves: Shelf[], showLoc = true): number {
  return shelves.reduce((sum, s) => sum + computeShelfStats(s, showLoc).reprintCount, 0);
}
