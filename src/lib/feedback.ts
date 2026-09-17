import { audioEngine } from './audio';
import { vibrate } from './haptics';

/* combined audio + haptic feedback for scan outcomes */
export const feedback = {
  /** new product found and added */
  success(): void {
    audioEngine.play('success');
    vibrate(30);
  },
  /** barcode already in the queue (qty bump) */
  duplicate(): void {
    audioEngine.play('alert');
    vibrate([20, 40, 20]);
  },
  /** barcode not found in the product database */
  notFound(): void {
    audioEngine.play('error');
    vibrate([50, 50, 50]);
  },
  /** hard error (e.g. send-queue failure) */
  error(): void {
    audioEngine.play('error');
    vibrate(80);
  },
};
