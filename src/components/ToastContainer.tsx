import { useEffect, useState } from 'react';
import { useUIStore, type Toast } from '../store/uiStore';

function ToastMsg({ toast }: { toast: Toast }) {
  const [show, setShow] = useState(false);
  const removeToast = useUIStore((s) => s.removeToast);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    const hideTimer = setTimeout(() => setShow(false), 3200);
    const removeTimer = setTimeout(() => removeToast(toast.id), 3500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, removeToast]);

  return <div className={`toast-msg ${toast.type}${show ? ' show' : ''}`}>{toast.msg}</div>;
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastMsg key={t.id} toast={t} />
      ))}
    </div>
  );
}
