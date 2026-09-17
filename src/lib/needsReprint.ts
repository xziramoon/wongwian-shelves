import type { Product } from '../types';
import type { ShelfItem } from '../types';
import { priceEq } from './utils';

/**
 * "ต้องเปลี่ยนป้าย" — สินค้าต้องพบใน database ก่อน (ของ "รอเข้าระบบ" ไม่นับ ไม่ถูกส่งพิมพ์
 * อยู่แล้ว) แล้วเข้าเงื่อนไขข้อใดข้อหนึ่ง:
 *   1. ไม่เคยพิมพ์มาก่อน (lastPrintedAt === null) — รวมถึงของที่เพิ่งมีข้อมูลใน Sheet
 *      ตอนนี้ (ก่อนหน้านี้เป็น "รอเข้าระบบ")
 *   2. ราคาปัจจุบันต่างจากราคาตอนพิมพ์ครั้งล่าสุด (Price หรือ Price2)
 *   3. เปิดแสดงตำแหน่งชั้น-แถวบนป้าย (showLoc) และตำแหน่งปัจจุบันต่างจากตอนพิมพ์ครั้งล่าสุด
 */
export function needsReprint(item: ShelfItem, loc: string, product: Product | undefined, showLoc: boolean): boolean {
  if (!product) return false;
  if (item.lastPrintedAt === null) return true;
  if (!priceEq(product.Price, item.lastPrintedPrice)) return true;
  if (!priceEq(product.Price2 || '', item.lastPrintedPrice2 || '')) return true;
  if (showLoc && loc !== (item.lastPrintedLoc || '')) return true;
  return false;
}
