import { useCallback, useEffect, useRef, useState } from 'react';
import { convertKedmaneeBarcode, hasUnconvertedThai } from './wedgeScanner';
import { useUIStore } from '../store/uiStore';

export type WedgeStatus = 'ready' | 'idle';

const SILENCE_MS = 80;
const MIN_LENGTH = 6;
const REFOCUS_DELAY_MS = 300;
const DUPLICATE_GUARD_MS = 800;

/**
 * ปืนยิงบาร์โค้ดบลูทูธทำงานเป็นคีย์บอร์ด (HID) — hook นี้ดักรับผ่าน input ที่ซ่อนไว้
 * (ผู้ใช้ render <input ref={inputRef} ...attrs /> เอง ด้วย attrs ที่ hook คืนให้ เพื่อกัน
 * แป้นพิมพ์บนจอเด้งขึ้นมาบัง)
 *
 * ปิดรับ (enabled=false) เมื่อมี modal/sheet อื่นเปิดอยู่ — ผู้เรียกเป็นคนคุมผ่าน `enabled`
 * เอง ไม่ใช่ hook เดา เพราะ hook ไม่รู้ว่าหน้าจอไหนกำลังเปิด sheet อยู่
 */
export function useWedgeScanner(onCode: (code: string) => void, enabled: boolean) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<WedgeStatus>('idle');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refocusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastCodeRef = useRef<{ code: string; time: number } | null>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const emit = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const converted = convertKedmaneeBarcode(trimmed);
    if (hasUnconvertedThai(converted)) {
      useUIStore.getState().showToast('อ่านบาร์โค้ดไม่ได้ ลองเปลี่ยนแป้นพิมพ์เป็นภาษาอังกฤษ', 'error');
      return;
    }
    const now = Date.now();
    if (lastCodeRef.current && lastCodeRef.current.code === converted && now - lastCodeRef.current.time < DUPLICATE_GUARD_MS) {
      return; // กันยิงซ้ำ
    }
    lastCodeRef.current = { code: converted, time: now };
    onCodeRef.current(converted);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    inputRef.current?.focus();
  }, [enabled]);

  useEffect(
    () => () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (refocusTimerRef.current) clearTimeout(refocusTimerRef.current);
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (v.length >= MIN_LENGTH) {
          emit(v);
          setValue('');
        }
      }, SILENCE_MS);
    },
    [emit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const v = e.currentTarget.value;
        emit(v);
        setValue('');
      }
    },
    [emit],
  );

  const handleFocus = useCallback(() => setStatus('ready'), []);

  const handleBlur = useCallback(() => {
    setStatus('idle');
    if (!enabled) return;
    if (refocusTimerRef.current) clearTimeout(refocusTimerRef.current);
    refocusTimerRef.current = setTimeout(() => {
      const active = document.activeElement;
      const isOtherTextField =
        active instanceof HTMLElement &&
        active !== inputRef.current &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isOtherTextField) return;
      inputRef.current?.focus();
    }, REFOCUS_DELAY_MS);
  }, [enabled]);

  return {
    status,
    inputProps: {
      ref: inputRef,
      value,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      inputMode: 'none' as const,
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'off',
      spellCheck: false,
    },
  };
}
