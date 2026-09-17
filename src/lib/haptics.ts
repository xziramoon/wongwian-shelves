/* thin, feature-detected wrapper around the Vibration API — iOS Safari has no
 * navigator.vibrate at all, so this must no-op silently there rather than throw */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* vibration not available — non-critical UI feedback only */
  }
}
