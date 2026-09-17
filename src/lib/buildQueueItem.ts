import type { Product, QueueItem, ShelfItem } from '../types';
import { extractSize } from './utils';

/* ⚠️ ตรรกะฟิลด์เริ่มต้นต้องตรงกับ wongwian-tags-mobile/src/store/queueStore.ts
 * normalize() ตรงตัว เพื่อให้ item ที่ส่งไปตรงกับที่ normalizeItem() ฝั่ง
 * TAG_PRINTER.html คาดหวัง (ทุกฟิลด์ต้องมีค่า ไม่ใช่ undefined) */
function normalize(q: Partial<QueueItem>): QueueItem {
  return {
    Barcode: '',
    ProductName: '',
    NameFontSize: 0,
    TagMode: 'standard',
    DualStyle: 'A',
    OldPrice: '',
    Price: '0.00',
    Price2: '',
    PriceOffsetX: 0,
    Size: '',
    Unit: 'ชิ้น',
    Unit1: '',
    Unit2: '',
    PackType: '',
    Ribbon: '',
    Mfg: '',
    Exp: '',
    Image: '',
    PrintQty: 1,
    PriceDiff: null,
    OosEta: '',
    OosReason: 'temp',
    Loc: '',
    Printed: '',
    ...q,
  };
}

/**
 * ประกอบ QueueItem สำหรับส่งพิมพ์ 1 ใบ จาก ShelfItem (จำนวนป้าย/ชนิดป้าย/ริบบิ้นที่
 * ลงทะเบียนไว้) + Product สด (ชื่อ/ราคา/รูป ดึงจาก database ณ ตอนพิมพ์เท่านั้น ไม่เคย
 * เก็บไว้ในชั้นวางเอง) + Loc/Printed ของงานพิมพ์นี้ — field เดียวกับ previewFromBarcode()
 * ของ tags-mobile บวกฟิลด์ที่ระบุเพิ่มตาม spec
 */
export function buildQueueItemFromShelfItem(item: ShelfItem, product: Product, loc: string, printed: string): QueueItem {
  const name = product.ProductName || `รหัส: ${item.barcode}`;
  const size = product.Size || extractSize(name);
  return normalize({
    Barcode: item.barcode,
    ProductName: name,
    Price: product.Price || '0.00',
    Price2: product.Price2 || '',
    Size: size,
    Unit: product.Unit || 'ชิ้น',
    Image: product.Image || '',
    PrintQty: item.printQty,
    TagMode: item.tagMode,
    DualStyle: item.dualStyle,
    Unit2: item.unit2,
    Ribbon: item.ribbon,
    Loc: loc,
    Printed: printed,
  });
}
