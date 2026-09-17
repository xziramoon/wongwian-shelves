import { create } from 'zustand';
import type { Config } from '../types';
import { DEFAULT_CONFIG, SHELVES_CONFIG_STORAGE_KEY, SIZE_PRESETS } from '../constants';
import { useUIStore } from './uiStore';

/* ⚠️ ตรรกะต้องตรงกับ wongwian-tags-mobile/src/store/queueStore.ts ส่วน config
 * (loadConfig/persist/updateConfig/applyPreset) ตรงตัว — แยกออกมาเป็น store ของตัวเอง
 * เพราะแอปนี้ไม่มีแนวคิด "คิวพิมพ์" แบบแอปเดิม มีแค่การตั้งค่าหน้าตาป้าย */
function loadConfig(): Config {
  try {
    const saved = localStorage.getItem(SHELVES_CONFIG_STORAGE_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {
    /* corrupted storage — fall back to defaults */
  }
  return { ...DEFAULT_CONFIG };
}

function persist(config: Config) {
  localStorage.setItem(SHELVES_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

interface ConfigState {
  config: Config;
  updateConfig: (key: keyof Config, value: string | number | boolean) => void;
  applyPreset: (size: 'S' | 'M' | 'L' | 'XL') => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: loadConfig(),

  updateConfig: (key, value) => {
    set((s) => {
      const config = { ...s.config, [key]: value };
      persist(config);
      return { config };
    });
  },

  applyPreset: (size) => {
    const preset = SIZE_PRESETS[size];
    if (!preset) return;
    set((s) => {
      const config = { ...s.config, ...preset };
      persist(config);
      return { config };
    });
    useUIStore.getState().showToast(`ใช้ขนาดสำเร็จรูป [${size}] แล้ว`, 'success');
  },
}));
