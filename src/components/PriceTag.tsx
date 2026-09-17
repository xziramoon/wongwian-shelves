import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import type { Config, QueueItem } from '../types';
import { fmtPrice } from '../lib/utils';

interface Props {
  item: QueueItem;
  config: Config;
  queueIndex: number;
  selected: boolean;
}

/* ⚠️ ห้ามแก้ตรรกะการ render — ยกมาจาก wongwian-tags01/src/components/PriceTag.tsx
 * ตรงตัว (เลย์เอาต์ตาม TagMode/DualStyle ทั้งหมด) เพื่อให้พรีวิวบนมือถือตรงกับป้ายที่
 * TAG_PRINTER.html จะ render จริงทุกประการ — ต่างจากต้นฉบับแค่ 2 จุดที่ไม่เกี่ยวกับ
 * การ render ป้าย: (1) mobile ไม่มี sidebar tag-list ให้เลือก ('เลือก' ป้าย) จึงตัด
 * useUIStore/selectTag ออก — `selected`/`queueIndex` props ยังอยู่ตาม interface เดิม
 * แต่ปล่อยว่างไว้เผื่ออนาคต (2) onClick ไม่ทำอะไร (ไม่มี selection state ให้ผูก) */

/* auto-shrink price font when the number is long, so it never overflows the column */
const dualScale = (s: string) => {
  const len = String(s).length;
  if (len <= 3) return 1;
  if (len === 4) return 0.88;
  if (len === 5) return 0.74;
  if (len === 6) return 0.62;
  return 0.52;
};

const heroScale = (s: string) => {
  const len = String(s).length;
  if (len <= 3) return 1;
  if (len === 4) return 0.85;
  if (len === 5) return 0.7;
  if (len === 6) return 0.58;
  return 0.48;
};

/* หัวป้าย: แสดงรหัสชั้น-แถว (item.Loc) ถ้ามี — ไม่มีค่า = markup เดิมทุกตัวอักษร
 * ต้องตรงกับ wongwian-tags01/src/components/PriceTag.tsx renderHeader() ทุกตัวอักษร */
function renderHeader(item: QueueItem, config: Config) {
  const loc = (item.Loc || '').trim().slice(0, 5);
  if (!loc) {
    return <div className="tag-header">{config.header || ' '}</div>;
  }
  const isLarge = item.TagMode === 'large';
  const tagWidth = isLarge ? config.largeW : config.w;
  if (tagWidth >= 4.0) {
    return (
      <div className="tag-header hs">
        <span className="loc-chip">{loc}</span>
        <span className="hs-name">{config.header || ' '}</span>
        <span className="loc-chip" style={{ visibility: 'hidden' }}>
          {loc}
        </span>
      </div>
    );
  }
  const [floor, row] = loc.split('-');
  const label = row ? `ชั้น ${floor} · แถว ${row}` : `ชั้น ${floor}`;
  return <div className="tag-header hl">{label}</div>;
}

export default function PriceTag({ item, config, selected }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const isLarge = item.TagMode === 'large';
  const isOos = item.TagMode === 'oos';
  const bcHeightStd = config.bcHeight || 24;
  const bcHeightLrg = config.bcHeightLrg || 35;

  useEffect(() => {
    if (isOos || !item.Barcode || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, String(item.Barcode), {
        format: 'CODE128',
        width: isLarge ? 2.2 : 1.4,
        height: isLarge ? bcHeightLrg : bcHeightStd,
        displayValue: true,
        fontSize: 11,
        font: 'sans-serif',
        fontOptions: 'bold',
        textMargin: 1,
        margin: 1,
      });
    } catch {
      /* invalid barcode value — leave svg empty */
    }
  }, [item.Barcode, isLarge, bcHeightStd, bcHeightLrg, isOos]);

  if (isOos) {
    const stop = item.OosReason === 'stop';
    return (
      <div className="price-tag price-tag-oos">
        <div className="oos-main">{stop ? config.labelStop : config.labelOos}</div>
        {!stop && item.OosEta && <div className="oos-eta">เข้า {item.OosEta}</div>}
      </div>
    );
  }

  const pDisp = fmtPrice(item.Price);
  const p2Disp = fmtPrice(item.Price2);
  const invBaht = config.invertBaht !== false;
  const LBL_SIZE = config.labelSize || 'ขนาด';
  const LBL_UNIT = config.labelUnit || 'บรรจุ';
  const LBL_RETAIL = config.labelRetail || 'ปลีก';
  const xOffset = item.PriceOffsetX || 0;

  const safeSize = (item.Size || '').trim();
  const safeUnit = item.Unit || 'ชิ้น';
  const safeUnit1 = (item.Unit1 || '').trim();
  const safeUnit2 = item.Unit2 || '';
  const printed = (item.Printed || '').trim().slice(0, 8);
  const safeRibbon = (item.Ribbon || '').trim();
  const safePack = (item.PackType || '').trim();
  const imgURL = (item.Image || '').trim();

  const bahtEl = invBaht ? (
    <span className="tag-baht-inv">บาท</span>
  ) : (
    <span className="tag-baht-norm">บาท</span>
  );

  const sizeEl = safeSize ? (
    <div>
      <span className="badge">{LBL_SIZE}</span>
      {safeSize}
    </div>
  ) : null;
  const unitEl = (
    <div>
      <span className="badge">{LBL_UNIT}</span>1 {safeUnit}
    </div>
  );
  const packEl = safePack ? (
    <div>
      <span className="pack-icon">📦</span>
      {safePack}
    </div>
  ) : null;

  const dateEl =
    item.Mfg || item.Exp ? (
      <div style={{ marginTop: 2 }}>
        {item.Mfg && <div className="tag-date-txt">MFG: {item.Mfg}</div>}
        {item.Exp && <div className="tag-date-txt">EXP: {item.Exp}</div>}
      </div>
    ) : null;

  let middle: React.ReactNode = null;
  let tagClass = 'price-tag-normal';

  if (item.TagMode === 'standard' || !item.TagMode) {
    middle = (
      <>
        <div className="tag-name-area">
          <div className="tag-name" style={{ fontSize: `${item.NameFontSize || 13}px` }}>
            {item.ProductName}
          </div>
        </div>
        <div className="tag-mid-std">
          {imgURL && (
            <div className="tag-img-side">
              <img src={imgURL} onError={(e) => ((e.currentTarget.parentNode as HTMLElement).style.display = 'none')} />
            </div>
          )}
          <div className="tag-info">
            {sizeEl}
            {unitEl}
            {packEl}
            {dateEl}
          </div>
          <div className="tag-price-wrap">
            {item.OldPrice && parseFloat(item.OldPrice) > 0 && (
              <div className="tag-old">
                ปกติ <del>{fmtPrice(item.OldPrice)}</del>
              </div>
            )}
            <div className="tag-price-container">
              <div className="tag-price-slide" style={{ transform: `translateX(${xOffset}px)` }}>
                <div className="tag-price">{pDisp}</div>
              </div>
              <div className="tag-baht-anchor">{bahtEl}</div>
            </div>
          </div>
        </div>
      </>
    );
  } else if (item.TagMode === 'dual') {
    if (item.DualStyle === 'B') {
      const hs = heroScale(pDisp);
      const wss = heroScale(p2Disp);
      const hasWs = item.Price2 && String(item.Price2).trim() !== '';
      middle = (
        <>
          <div className="tag-name-area">
            <div className="tag-name" style={{ fontSize: `${item.NameFontSize || 13}px` }}>
              {item.ProductName}
            </div>
          </div>
          <div className="tag-mid-hero">
            <div className="hero-top">
              <div className="hero-meta">
                {sizeEl}
                {unitEl}
                {packEl}
              </div>
              <div className="hero-price-box" style={{ transform: `translateX(${xOffset}px)` }}>
                <span className="hero-price" style={{ fontSize: `calc(var(--price-sz) * ${hs})` }}>
                  {pDisp}
                </span>
                <span className="hero-baht">บาท</span>
              </div>
            </div>
            {hasWs && (
              <div className="wholesale-strip">
                <span className="ws-label">{safeUnit2 || 'ราคาส่ง'}</span>
                <span className="ws-price" style={{ fontSize: `calc(var(--dual-price-sz) * 0.72 * ${wss})` }}>
                  {p2Disp}
                </span>
                <span className="ws-baht">บาท</span>
              </div>
            )}
          </div>
        </>
      );
    } else {
      const p1Label = safeUnit1 || LBL_RETAIL;
      const p2Label = safeUnit2 || 'ราคาส่ง';
      const s1 = dualScale(pDisp);
      const s2 = dualScale(p2Disp);
      middle = (
        <>
          <div className="tag-name-area">
            <div className="tag-name" style={{ fontSize: `${item.NameFontSize || 13}px` }}>
              {item.ProductName}
            </div>
            {safeSize && (
              <div style={{ fontSize: 9, fontWeight: 600, marginTop: 2, lineHeight: 1.3 }}>
                [ {LBL_SIZE} {safeSize} ]
              </div>
            )}
          </div>
          <div className="tag-mid-dual">
            <div className="dual-col">
              <div className="dual-badge">{p1Label}</div>
              <div className="dual-price-row">
                <div className="dual-price-val" style={{ fontSize: `calc(var(--dual-price-sz) * ${s1})` }}>
                  {pDisp}
                </div>
                <div className="dual-baht">บาท</div>
              </div>
            </div>
            <div className="dual-div" />
            <div className="dual-col">
              <div className="dual-badge">{p2Label}</div>
              <div className="dual-price-row">
                <div className="dual-price-val" style={{ fontSize: `calc(var(--dual-price-sz) * ${s2})` }}>
                  {p2Disp}
                </div>
                <div className="dual-baht">บาท</div>
              </div>
            </div>
          </div>
        </>
      );
    }
  } else if (item.TagMode === 'large') {
    tagClass = 'price-tag-large';
    const hasWs = item.Price2 && String(item.Price2).trim() !== '';
    middle = (
      <>
        <div className="tag-name-area-large">
          <div className="tag-name-large" style={{ fontSize: `calc(${item.NameFontSize || 14}px + 6px)` }}>
            {item.ProductName}
          </div>
        </div>
        <div className="tag-large-body">
          <div className="tag-large-left">
            {imgURL && (
              <img
                className="tag-large-img"
                src={imgURL}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            )}
            {safeSize && (
              <div>
                {LBL_SIZE} {safeSize}
              </div>
            )}
            <div>
              {LBL_UNIT} 1 {safeUnit}
            </div>
            {safePack && <div>📦 {safePack}</div>}
            {(item.Mfg || item.Exp) && (
              <div style={{ marginTop: 6 }}>
                {item.Mfg && (
                  <div className="tag-date-txt" style={{ fontSize: 11 }}>
                    MFG: {item.Mfg}
                  </div>
                )}
                {item.Exp && (
                  <div className="tag-date-txt" style={{ fontSize: 11 }}>
                    EXP: {item.Exp}
                  </div>
                )}
              </div>
            )}
            {hasWs && (
              <div className="tag-large-box">
                <div className="tag-large-box-title">{safeUnit2 || 'ราคาส่ง'}</div>
                <div className="tag-large-box-price">
                  {p2Disp} <span style={{ fontSize: 12, fontWeight: 800 }}>บาท</span>
                </div>
              </div>
            )}
          </div>
          <div className="tag-large-divider" />
          <div className="tag-large-right">
            <div
              className="tag-price-slide"
              style={{ transform: `translateX(${xOffset}px)`, display: 'flex', alignItems: 'baseline' }}
            >
              <div className="tag-price-large">{pDisp}</div>
              <div className="tag-baht-large">บาท</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`price-tag ${tagClass}${selected ? ' selected' : ''}`}>
      {safeRibbon && <div className="tag-ribbon">{safeRibbon}</div>}
      {renderHeader(item, config)}
      {middle}
      <div className={`tag-bc-area${printed ? ' has-date' : ''}`}>
        <svg ref={svgRef} />
        {printed && <span className="bc-date">{printed}</span>}
      </div>
    </div>
  );
}
