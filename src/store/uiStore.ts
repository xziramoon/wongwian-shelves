import { create } from 'zustand';
import type { ToastType } from '../types';

/* toast shape/pattern ported verbatim from wongwian-tags01/src/store/uiStore.ts */
export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

let toastSeq = 0;

export type AblyStatus = 'connecting' | 'connected' | 'offline';
export type CameraStatus = 'starting' | 'active' | 'denied' | 'error';
export type ScanMode = 'in' | 'out' | 'check';

/* screen-stack navigation — this app has no queue-of-sheets like tags-mobile, it's a
 * small set of full screens (home -> shelf -> row -> print), so a single `screen`
 * union covers the whole app instead of many independent *Open booleans */
export type Screen =
  | { name: 'home' }
  | { name: 'shelf'; shelfId: string }
  | { name: 'row'; shelfId: string; rowId: string }
  | { name: 'print' };

interface UIState {
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: number) => void;

  ablyStatus: AblyStatus;
  setAblyStatus: (status: AblyStatus) => void;

  cameraStatus: CameraStatus;
  setCameraStatus: (status: CameraStatus) => void;
  cameraEnabled: boolean;
  setCameraEnabled: (enabled: boolean) => void;

  manualSearchOpen: boolean;
  setManualSearchOpen: (open: boolean) => void;

  settingsSheetOpen: boolean;
  setSettingsSheetOpen: (open: boolean) => void;

  screen: Screen;
  goHome: () => void;
  goShelf: (shelfId: string) => void;
  goRow: (shelfId: string, rowId: string) => void;
  goPrint: () => void;

  /* RowScreen's 3 big mode buttons — ยิงเข้า (default) / ยิงออก / ยิงทวน */
  scanMode: ScanMode;
  setScanMode: (mode: ScanMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  showToast: (msg, type = 'info') => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  ablyStatus: 'connecting',
  setAblyStatus: (ablyStatus) => set({ ablyStatus }),

  cameraStatus: 'starting',
  setCameraStatus: (cameraStatus) => set({ cameraStatus }),
  cameraEnabled: true,
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),

  manualSearchOpen: false,
  setManualSearchOpen: (manualSearchOpen) => set({ manualSearchOpen }),

  settingsSheetOpen: false,
  setSettingsSheetOpen: (settingsSheetOpen) => set({ settingsSheetOpen }),

  screen: { name: 'home' },
  goHome: () => set({ screen: { name: 'home' } }),
  goShelf: (shelfId) => set({ screen: { name: 'shelf', shelfId } }),
  goRow: (shelfId, rowId) => set({ screen: { name: 'row', shelfId, rowId }, scanMode: 'in' }),
  goPrint: () => set({ screen: { name: 'print' } }),

  scanMode: 'in',
  setScanMode: (scanMode) => set({ scanMode }),
}));
