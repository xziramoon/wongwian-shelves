import * as Ably from 'ably';
import type { Config, QueueItem } from '../types';
import {
  ABLY_API_KEY,
  PRINT_BATCH_MAX_BYTES,
  PRINT_TAGS_CHANNEL,
  PRINT_EVENT_NAME,
  PRINT_PAYLOAD_VERSION,
} from '../constants';

export interface PrintPayload {
  v: number;
  ts: number;
  batchId: string;
  batchIndex: number;
  batchTotal: number;
  config: Config;
  items: QueueItem[];
}

export type PublishProgress = (sent: number, total: number) => void;

export type AblyConnState = 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'failed' | 'closed';
type StateListener = (state: AblyConnState) => void;

const jsonBytes = (value: unknown): number => new Blob([JSON.stringify(value)]).size;

/* splits items into chunks that each stay under PRINT_BATCH_MAX_BYTES once wrapped in
 * a PrintPayload — a queue with many rows (or long image URLs) can otherwise blow past
 * Ably's per-message size cap and fail to publish at all
 * ⚠️ ห้ามแก้ตรรกะ — ยกมาจาก wongwian-tags01/src/lib/printBridge.ts ตรงตัว */
function chunkItems(items: QueueItem[], config: Config): QueueItem[][] {
  const overheadBytes = jsonBytes(config) + 200;
  const chunks: QueueItem[][] = [];
  let current: QueueItem[] = [];
  let currentBytes = overheadBytes;

  for (const item of items) {
    const itemBytes = jsonBytes(item);
    if (current.length && currentBytes + itemBytes > PRINT_BATCH_MAX_BYTES) {
      chunks.push(current);
      current = [];
      currentBytes = overheadBytes;
    }
    current.push(item);
    currentBytes += itemBytes;
  }
  if (current.length) chunks.push(current);
  return chunks.length ? chunks : [[]];
}

/* publishes the current queue+config to the remote TAG_PRINTER receiver over Ably
 * (wss on port 443 — survives shop/office firewalls). Batch-splitting logic ported
 * verbatim from wongwian-tags01/src/lib/printBridge.ts; connects eagerly at
 * construction (not lazily on first publish) plus onStateChange()/getState(), ported
 * from wongwian-tags-mobile/src/lib/printBridge.ts, so the shelves app can show a live
 * connection-status pill before the first print job like the mobile app does. */
class PrintBridge {
  private client: Ably.Realtime;
  private listeners: StateListener[] = [];

  constructor() {
    this.client = new Ably.Realtime({ key: ABLY_API_KEY });
    (['connecting', 'connected', 'disconnected', 'suspended', 'failed', 'closed'] as const).forEach((state) => {
      this.client.connection.on(state, () => this.notify(state));
    });
  }

  private notify(state: AblyConnState) {
    this.listeners.forEach((l) => l(state));
  }

  /** subscribe to Ably connection-state changes; returns an unsubscribe fn */
  onStateChange(fn: StateListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  getState(): AblyConnState {
    return this.client.connection.state as AblyConnState;
  }

  private waitConnected(): Promise<void> {
    if (this.client.connection.state === 'connected') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onConnected = () => {
        this.client.connection.off('failed', onFailed);
        resolve();
      };
      const onFailed = (change: Ably.ConnectionStateChange) => {
        this.client.connection.off('connected', onConnected);
        reject(new Error(change.reason?.message || 'Ably connection failed'));
      };
      this.client.connection.once('connected', onConnected);
      this.client.connection.once('failed', onFailed);
    });
  }

  async publish(config: Config, items: QueueItem[], onProgress?: PublishProgress): Promise<void> {
    await this.waitConnected();
    const channel = this.client.channels.get(PRINT_TAGS_CHANNEL);

    const chunks = chunkItems(items, config);
    const batchTotal = chunks.length;
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    for (let i = 0; i < chunks.length; i++) {
      const payload: PrintPayload = {
        v: PRINT_PAYLOAD_VERSION,
        ts: Date.now(),
        batchId,
        batchIndex: i,
        batchTotal,
        config,
        items: chunks[i],
      };
      await channel.publish(PRINT_EVENT_NAME, payload);
      onProgress?.(i + 1, batchTotal);
    }
  }
}

export const printBridge = new PrintBridge();
