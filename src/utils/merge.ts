import type { AppState } from '../types';

/**
 * Union merge two states by ID. When the same ID exists in both,
 * the one with the later createdAt wins.
 */
export function mergeStates(
  local: Omit<AppState, 'activeUser'>,
  incoming: Omit<AppState, 'activeUser'>
): Omit<AppState, 'activeUser'> {
  return {
    expenses: mergeById(local.expenses, incoming.expenses),
    payments: mergeById(local.payments, incoming.payments),
  };
}

function mergeById<T extends { id: string; createdAt: string }>(
  localItems: T[],
  incomingItems: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of localItems) {
    map.set(item.id, item);
  }

  for (const item of incomingItems) {
    const existing = map.get(item.id);
    if (!existing || item.createdAt > existing.createdAt) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}
