import { useUIStore } from '../store/uiStore';

const STATUS_TEXT: Record<string, string> = {
  connecting: 'กำลังเชื่อมต่อ...',
  connected: 'พร้อมส่งพิมพ์',
  offline: 'ขาดการเชื่อมต่อ',
};

const STATUS_CLASS: Record<string, string> = {
  connecting: '',
  connected: 'connected',
  offline: 'offline',
};

/** small inline status pill — used as a nav-bar trailing accessory (iOS style,
 * not a floating overlay) */
export default function ConnectionStatus() {
  const ablyStatus = useUIStore((s) => s.ablyStatus);
  return (
    <div className={`ios-conn ${STATUS_CLASS[ablyStatus]}`}>
      <span className="dot" />
      <span>{STATUS_TEXT[ablyStatus]}</span>
    </div>
  );
}
