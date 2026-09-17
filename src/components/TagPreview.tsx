import { useEffect, useRef, useState } from 'react';
import type { Config, QueueItem } from '../types';
import PriceTag from './PriceTag';

/* CSS's fixed physical-unit ratio (96dpi / 2.54 cm-per-inch) — tag.css sizes tags in
 * real cm via --tag-w/--tag-h/--large-w/--large-h, which must NOT be touched, so this
 * wrapper scales visually with a CSS transform instead of touching those vars. */
const PX_PER_CM = 37.795;
/* fixed preview-card footprint: width chosen so that even a standard tag's aspect
 * ratio (~5.4:4) scaled to this width stays within FRAME_HEIGHT tall (no clipping) —
 * see TagPreview's own verification notes for the math. */
const FRAME_WIDTH = 230;
const FRAME_HEIGHT = 180;

interface Props {
  item: QueueItem;
  config: Config;
}

/** Scale-to-fit preview wrapper around <PriceTag>. tag.css sizes the real tag in cm
 * (for print accuracy) — this scales the whole rendered tag down/up with a CSS
 * transform so it always fits a small on-screen preview card. */
export default function TagPreview({ item, config }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const tagWidthCm = item.TagMode === 'large' ? config.largeW : config.w;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const compute = () => {
      const tagWidthPx = (tagWidthCm || 1) * PX_PER_CM;
      setScale(tagWidthPx > 0 ? frame.clientWidth / tagWidthPx : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [tagWidthCm]);

  return (
    <div className="tag-preview-frame" ref={frameRef} style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}>
      <div className="tag-preview-scale" style={{ transform: `scale(${scale})` }}>
        <PriceTag item={item} config={config} queueIndex={0} selected={false} />
      </div>
    </div>
  );
}
