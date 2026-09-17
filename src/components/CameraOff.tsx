import { useUIStore } from '../store/uiStore';

/* full-screen placeholder shown when the user has manually turned the camera off
 * (via the toolbar toggle) — distinct from CameraPermissionDenied, which covers the
 * device/browser refusing camera access rather than a deliberate user choice */
export default function CameraOff() {
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);

  return (
    <div className="camera-denied">
      <div className="camera-denied-icon" aria-hidden="true">
        📷
      </div>
      <h1 className="camera-denied-title">กล้องปิดอยู่</h1>
      <p className="camera-denied-text">กดเปิดกล้องเพื่อสแกนบาร์โค้ด หรือค้นหาสินค้าด้วยตนเองแทนได้</p>
      <button type="button" className="btn btn-primary" onClick={() => setCameraEnabled(true)}>
        เปิดกล้อง
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => setManualSearchOpen(true)}>
        ค้นหาสินค้าด้วยตนเอง
      </button>
    </div>
  );
}
