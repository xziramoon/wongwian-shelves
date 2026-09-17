import { useUIStore } from '../store/uiStore';

/* status pill visual language mirrored from wongwian-tags01's ScannerStatus.tsx
 * (dot + Thai status text, color driven by a className switch) */
const STATUS_TEXT: Record<string, string> = {
  connecting: 'กำลังเชื่อมต่อ...',
  connected: 'พร้อมส่งพิมพ์',
  offline: 'ขาดการเชื่อมต่อ — กำลังต่อใหม่ให้...',
};

const STATUS_CLASS: Record<string, string> = {
  connecting: '',
  connected: 'status-ok',
  offline: 'status-err',
};

export default function ConnectionStatus() {
  const ablyStatus = useUIStore((s) => s.ablyStatus);
  return (
    <div id="ably-status" className={`conn-status ${STATUS_CLASS[ablyStatus]}`}>
      <span className="conn-dot" />
      <span className="conn-text">{STATUS_TEXT[ablyStatus]}</span>
    </div>
  );
}
