import { useEffect, useRef } from 'react';
import { startScanning, stopScanning } from '../lib/scan';

interface Props {
  active: boolean;
  onDetect: (code: string) => void;
}

/** กล้องสแกนต่อเนื่อง — หลังอ่านได้ให้หยุดรับ 1.2 วินาทีก่อนเริ่มสแกนใหม่ กันอ่านชิ้นเดิมซ้ำ */
export default function RowCamera({ active, onDetect }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    if (!active) {
      stopScanning();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let cooldown: ReturnType<typeof setTimeout> | undefined;

    const loop = () => {
      startScanning(video, (code) => {
        if (cancelled) return;
        onDetectRef.current(code);
        cooldown = setTimeout(() => {
          if (!cancelled) loop();
        }, 1200);
      }).catch(() => {
        /* camera unavailable — RowScreen falls back to wedge/manual search */
      });
    };
    loop();

    return () => {
      cancelled = true;
      if (cooldown) clearTimeout(cooldown);
      stopScanning();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="ios-camera">
      <video ref={videoRef} muted playsInline />
    </div>
  );
}
