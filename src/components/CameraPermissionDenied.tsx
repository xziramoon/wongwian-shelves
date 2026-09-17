import { useUIStore } from '../store/uiStore';

/* full-screen fallback shown when the camera is unavailable (permission denied, or
 * any other getUserMedia error) — keeps the app usable via manual product search */
export default function CameraPermissionDenied() {
  const cameraStatus = useUIStore((s) => s.cameraStatus);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);

  const isDenied = cameraStatus === 'denied';

  return (
    <div className="camera-denied">
      <div className="camera-denied-icon" aria-hidden="true">
        📷
      </div>
      <h1 className="camera-denied-title">{isDenied ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง' : 'ไม่สามารถเปิดกล้องได้'}</h1>
      <p className="camera-denied-text">
        {isDenied
          ? 'แอปนี้ต้องใช้กล้องเพื่อสแกนบาร์โค้ดสินค้า กรุณาอนุญาตการใช้กล้องในตั้งค่าเบราว์เซอร์ แล้วโหลดหน้านี้ใหม่'
          : 'เกิดข้อผิดพลาดในการเปิดกล้อง คุณยังสามารถค้นหาสินค้าด้วยตนเองได้'}
      </p>
      <button type="button" className="btn btn-primary" onClick={() => setManualSearchOpen(true)}>
        ค้นหาสินค้าด้วยตนเอง
      </button>
    </div>
  );
}
