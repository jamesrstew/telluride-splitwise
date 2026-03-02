import lzString from 'lz-string';
import type { AppState } from '../types';

export function encodeState(state: Omit<AppState, 'activeUser'>): string {
  const payload = { expenses: state.expenses, payments: state.payments };
  const json = JSON.stringify(payload);
  return lzString.compressToEncodedURIComponent(json);
}

export function decodeState(compressed: string): Omit<AppState, 'activeUser'> | null {
  try {
    const json = lzString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.expenses || !parsed.payments) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getShareUrl(state: AppState): string {
  const compressed = encodeState(state);
  const base = window.location.href.split('#')[0];
  return `${base}#s=${compressed}`;
}

/**
 * Extract shared state from URL hash before React router processes it.
 * Returns the compressed string or null.
 */
export function extractSharedStateFromUrl(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#s=')) {
    return hash.slice(3);
  }
  return null;
}

export function clearUrlState(): void {
  const base = window.location.href.split('#')[0];
  window.history.replaceState(null, '', base + '#/');
}
