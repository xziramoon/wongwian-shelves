import { useEffect } from 'react';
import { database } from './lib/database';
import { printBridge, type AblyConnState } from './lib/printBridge';
import { useUIStore } from './store/uiStore';
import ConnectionStatus from './components/ConnectionStatus';
import ToastContainer from './components/ToastContainer';
import SettingsSheet from './components/SettingsSheet';
import HomeScreen from './components/HomeScreen';
import ShelfScreen from './components/ShelfScreen';
import RowScreen from './components/RowScreen';
import PrintScreen from './components/PrintScreen';

/* maps Ably's connection.state values to the coarser 3-state pill the UI shows —
 * ported verbatim from wongwian-tags-mobile/src/App.tsx */
function toAblyStatus(state: AblyConnState): 'connecting' | 'connected' | 'offline' {
  if (state === 'connected') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'offline'; // disconnected | suspended | failed | closed
}

function App() {
  const setAblyStatus = useUIStore((s) => s.setAblyStatus);
  const showToast = useUIStore((s) => s.showToast);
  const setSettingsSheetOpen = useUIStore((s) => s.setSettingsSheetOpen);
  const screen = useUIStore((s) => s.screen);

  useEffect(() => {
    // กันเบราว์เซอร์ลบข้อมูลชั้นวางทิ้งเองตอนพื้นที่เครื่องใกล้เต็ม
    navigator.storage?.persist?.().catch(() => {});

    database.sync().catch(() => {
      showToast('ซิงค์ฐานข้อมูลสินค้าไม่สำเร็จ — ลองใหม่ภายหลัง', 'error');
    });

    setAblyStatus(toAblyStatus(printBridge.getState()));
    const unsubscribe = printBridge.onStateChange((state) => {
      setAblyStatus(toAblyStatus(state));
    });
    return unsubscribe;
  }, [setAblyStatus, showToast]);

  return (
    <div className="app-shell">
      <header className="app-bar">
        <ConnectionStatus />
        <button
          type="button"
          className="settings-gear-btn"
          onClick={() => setSettingsSheetOpen(true)}
          aria-label="ตั้งค่าป้ายราคา"
        >
          ⚙
        </button>
      </header>

      <main className="app-main">
        {screen.name === 'home' && <HomeScreen />}
        {screen.name === 'shelf' && <ShelfScreen shelfId={screen.shelfId} />}
        {screen.name === 'row' && <RowScreen shelfId={screen.shelfId} rowId={screen.rowId} />}
        {screen.name === 'print' && <PrintScreen />}
      </main>

      <SettingsSheet />
      <ToastContainer />
    </div>
  );
}

export default App;
