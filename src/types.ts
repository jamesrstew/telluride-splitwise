export type ParticipantId = 'james' | 'kyle' | 'dylan' | 'john-ross';

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export type Category =
  | 'lodging'
  | 'lift-tickets'
  | 'nicotine'
  | 'food-dining'
  | 'groceries'
  | 'drinks-apres'
  | 'transportation'
  | 'gas'
  | 'activities'
  | 'tips'
  | 'other';

export interface Participant {
  id: ParticipantId;
  name: string;
  venmo: string;
  color: string;
}

export interface CategoryInfo {
  id: Category;
  label: string;
  emoji: string;
}

export interface Split {
  participantId: ParticipantId;
  value: number; // meaning depends on splitType
}

export interface Expense {
  id: string;
  description: string;
  amount: number; // cents
  paidBy: ParticipantId;
  category: Category;
  splitType: SplitType;
  splits: Split[];
  date: string; // ISO date
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface Payment {
  id: string;
  fromId: ParticipantId;
  toId: ParticipantId;
  amount: number; // cents
  date: string;
  notes?: string;
  settled: boolean;
  createdAt: string;
}

export interface Transaction {
  from: ParticipantId;
  to: ParticipantId;
  amount: number; // cents
}

export interface AppState {
  expenses: Expense[];
  payments: Payment[];
  activeUser: ParticipantId | null;
}
