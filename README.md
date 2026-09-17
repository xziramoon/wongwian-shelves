# wongwian-shelves

วงเวียน ลงทะเบียนชั้นวาง — แอปมือถือ (PWA) สำหรับร้านวงเวียน ใช้ลงทะเบียนว่าสินค้าตัวไหนอยู่ชั้นไหนแถวไหน แล้วพิมพ์ป้ายราคาเฉพาะที่ต้องเปลี่ยนได้ในครั้งเดียว โดยส่งงานพิมพ์ไปที่เครื่อง `TAG_PRINTER.html` เดิม (ของ [wongwian-tags01](https://github.com/xziramoon/wongwian-tags01)) ผ่าน Ably เหมือนแอป [wongwian-tags-mobile](https://github.com/xziramoon/wongwian-tags-mobile)

## Stack

React + TypeScript + Vite + zustand + vite-plugin-pwa + @zxing/browser + ably + jsbarcode + papaparse

## คำสั่งที่ใช้บ่อย

```
npm install
npm run dev      # dev server
npm run build    # type-check + build
npm run test     # vitest
npm run lint     # oxlint
```

## โครงสร้างข้อมูล

- ข้อมูลชั้น/แถว/สินค้า: `localStorage` key `wongwianShelves_v1`
- ตั้งค่าหน้าตาป้าย: `localStorage` key `wongwianShelvesConfig_v1`
- ฐานข้อมูลสินค้า (ชื่อ/ราคา) ไม่ได้เก็บซ้ำไว้ในแอปนี้ — ดึงสดจาก Google Sheet เดียวกับอีก 2 แอปทุกครั้งที่เปิด/พิมพ์

ดูรายละเอียดสเปกทั้งหมดในเอกสาร prompt ที่ใช้สร้างแอปนี้ (เก็บแยกไว้นอก repo)
