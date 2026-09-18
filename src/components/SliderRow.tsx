import { useEffect, useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { SLIDER_DEFS } from '../constants';
import type { Config } from '../types';

interface Props {
  configKey: keyof Config;
  full?: boolean;
}

/* ported near-verbatim from wongwian-tags-mobile/src/components/SliderRow.tsx (same
 * configKey/full props, same SLIDER_DEFS lookup + setValue/commitNumText logic) — this
 * app has no queueStore (no print-queue concept), so it reads/writes configStore
 * instead, which holds only the config slice */
export default function SliderRow({ configKey, full }: Props) {
  const def = SLIDER_DEFS[configKey as string];
  const value = useConfigStore((s) => s.config[configKey]);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const cur = typeof value === 'number' ? value : def.def;
  const [numText, setNumText] = useState(String(cur));

  useEffect(() => setNumText(String(cur)), [cur]);

  const setValue = (v: number) => {
    const clamped = Math.min(def.max, Math.max(def.min, +v.toFixed(2)));
    updateConfig(configKey, clamped);
  };

  const commitNumText = () => {
    const v = parseFloat(numText);
    setValue(isNaN(v) ? def.def : v);
  };

  return (
    <div className={`ios-slider-row${full ? ' full' : ''}`}>
      <div className="ios-slider-header">
        <span className="ios-field-label">{def.label}</span>
        <span className="ios-slider-val">{cur}</span>
      </div>
      <div className="ios-slider-controls">
        <button type="button" className="ios-nav-icon-btn" onClick={() => setValue(cur - def.step)}>
          −
        </button>
        <input
          className="ios-range"
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={cur}
          onChange={(e) => setValue(parseFloat(e.target.value))}
        />
        <input
          type="text"
          inputMode="decimal"
          className="ios-input ios-slider-num"
          value={numText}
          onChange={(e) => setNumText(e.target.value)}
          onBlur={commitNumText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <button type="button" className="ios-nav-icon-btn" onClick={() => setValue(cur + def.step)}>
          +
        </button>
      </div>
    </div>
  );
}
