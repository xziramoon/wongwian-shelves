import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

/* retail barcode formats only — keeps decode fast and avoids false-positive reads
 * from QR/Aztec/Data Matrix noise in frame */
const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
];

const hints = new Map<DecodeHintType, unknown>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

const reader = new BrowserMultiFormatReader(hints);
let controls: IScannerControls | null = null;
/* bumped on every start/stop so a stale decodeFromConstraints() resolution (e.g. from
 * a React StrictMode double-effect mount/cleanup/remount race) can detect it was
 * superseded and release its camera stream instead of leaking it or double-firing. */
let startToken = 0;

/**
 * Starts the rear-camera decode loop into `videoEl`. Stops itself after the FIRST
 * successful decode (calling `onDetect`) to avoid double-fires while the same
 * barcode still sits in frame — call startScanning() again to resume scanning
 * (e.g. after the confirmation sheet closes).
 */
export async function startScanning(videoEl: HTMLVideoElement, onDetect: (code: string) => void): Promise<void> {
  stopScanning(); // ensure any previous run is torn down before opening a new stream
  const token = ++startToken;

  const newControls = await reader.decodeFromConstraints(
    {
      video: {
        facingMode: 'environment',
        // 720p: enough pixel density to read small/far barcodes clearly without the
        // decode cost of full 1080p. 1080p was tried first but the JS-based zxing
        // decode (re-run every ~500ms) was heavy enough at that resolution to
        // visibly stall the main thread on real phones — this is the balance point.
        width: { ideal: 1280 },
        height: { ideal: 720 },
        // best-effort only: unsupported keys inside `advanced` are silently ignored
        // rather than rejected, so this is safe to request even where unsupported
        advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
      },
    },
    videoEl,
    (result) => {
      if (token !== startToken) return; // superseded by a newer start/stop — ignore
      if (result) {
        const text = result.getText();
        stopScanning();
        onDetect(text);
      }
      // decode errors (NotFoundException etc.) fire on every frame with no result —
      // ignored on purpose, they just mean "no barcode in this frame yet"
    },
  );

  if (token !== startToken) {
    // a newer startScanning()/stopScanning() happened while getUserMedia was pending —
    // release the stream we just opened instead of leaking it
    newControls.stop();
    return;
  }
  controls = newControls;
}

export function stopScanning(): void {
  startToken++;
  controls?.stop();
  controls = null;
}

/* non-standard MediaTrackCapabilities/Constraints keys (torch, zoom) — supported by
 * Chromium-based browsers, not part of the official W3C MediaCapture spec */
interface ExtendedTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
}

/* the shipped .d.ts types this parameter as `(track) => MediaStreamTrack[]`, but the
 * actual runtime implementation (BrowserCodeReader.js) uses it as a plain boolean
 * predicate via Array.prototype.find/.filter — the type declaration is simply wrong,
 * so this cast matches reality rather than the (incorrect) published types. */
const includeAllTracks = (() => true) as unknown as (track: MediaStreamTrack) => MediaStreamTrack[];

/** true if the active camera stream exposes a torch (flashlight) track capability */
export function hasTorch(): boolean {
  try {
    const caps = controls?.streamVideoCapabilitiesGet?.(includeAllTracks) as ExtendedTrackCapabilities | undefined;
    return !!caps?.torch;
  } catch {
    return false; // capability query not supported on this device — treat as no torch
  }
}

/** best-effort torch on/off — no-ops silently if the device/browser doesn't support it */
export async function setTorch(on: boolean): Promise<void> {
  try {
    await controls?.switchTorch?.(on);
  } catch {
    /* torch not supported on this device — non-critical, scanning still works */
  }
}

/** the active camera's optical zoom range, or null if the device/browser doesn't
 * expose one (in practice: mostly Android Chrome — iOS Safari has no zoom control) */
export function getZoomRange(): { min: number; max: number; step: number } | null {
  try {
    const caps = controls?.streamVideoCapabilitiesGet?.(includeAllTracks) as ExtendedTrackCapabilities | undefined;
    return caps?.zoom ?? null;
  } catch {
    return null;
  }
}

/** best-effort zoom-level set — no-ops silently if unsupported */
export async function setZoom(level: number): Promise<void> {
  try {
    await controls?.streamVideoConstraintsApply?.({ advanced: [{ zoom: level } as MediaTrackConstraintSet] });
  } catch {
    /* zoom not supported on this device — non-critical, scanning still works */
  }
}
