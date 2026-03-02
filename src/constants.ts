import type { Participant, CategoryInfo, ParticipantId } from './types';

export const PARTICIPANTS: Participant[] = [
  { id: 'james', name: 'James', venmo: 'jamesrstewart', color: 'var(--color-p-james)' },
  { id: 'kyle', name: 'Kyle', venmo: 'KyleLarson4', color: 'var(--color-p-kyle)' },
  { id: 'dylan', name: 'Dylan', venmo: 'Dylan-Christopher-1', color: 'var(--color-p-dylan)' },
  { id: 'john-ross', name: 'John Ross', venmo: 'johnrosshicks', color: 'var(--color-p-john-ross)' },
];

export const PARTICIPANT_MAP: Record<ParticipantId, Participant> = Object.fromEntries(
  PARTICIPANTS.map((p) => [p.id, p])
) as Record<ParticipantId, Participant>;

export const CATEGORIES: CategoryInfo[] = [
  { id: 'lodging', label: 'Lodging', emoji: '\u{1F3E0}' },
  { id: 'lift-tickets', label: 'Lift Tickets', emoji: '\u{1F3BF}' },
  { id: 'nicotine', label: 'Nicotine', emoji: '\u{1F6AC}' },
  { id: 'food-dining', label: 'Food & Dining', emoji: '\u{1F355}' },
  { id: 'groceries', label: 'Groceries', emoji: '\u{1F6D2}' },
  { id: 'drinks-apres', label: 'Drinks & Apres', emoji: '\u{1F37A}' },
  { id: 'transportation', label: 'Transport', emoji: '\u{1F697}' },
  { id: 'gas', label: 'Gas', emoji: '\u26FD' },
  { id: 'activities', label: 'Activities', emoji: '\u{1F3AF}' },
  { id: 'tips', label: 'Tips', emoji: '\u{1F4B5}' },
  { id: 'other', label: 'Other', emoji: '\u{1F4E6}' },
];

export const CATEGORY_MAP: Record<string, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export const STORAGE_KEY = 'splitluride-state';
export const ACTIVE_USER_KEY = 'splitluride-active-user';
