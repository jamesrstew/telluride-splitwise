import type { AppState, Expense, Payment, ParticipantId } from '../types';
import { mergeStates } from '../utils/merge';

export type AppAction =
  | { type: 'SET_ACTIVE_USER'; userId: ParticipantId }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'UPDATE_EXPENSE'; expense: Expense }
  | { type: 'DELETE_EXPENSE'; expenseId: string }
  | { type: 'ADD_PAYMENT'; payment: Payment }
  | { type: 'TOGGLE_PAYMENT_SETTLED'; paymentId: string }
  | { type: 'DELETE_PAYMENT'; paymentId: string }
  | { type: 'REPLACE_STATE'; expenses: Expense[]; payments: Payment[] }
  | { type: 'MERGE_STATE'; expenses: Expense[]; payments: Payment[] };

export const initialState: AppState = {
  expenses: [],
  payments: [],
  activeUser: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_USER':
      return { ...state, activeUser: action.userId };

    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.expense, ...state.expenses] };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.expense.id ? action.expense : e
        ),
      };

    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.expenseId),
      };

    case 'ADD_PAYMENT':
      return { ...state, payments: [action.payment, ...state.payments] };

    case 'TOGGLE_PAYMENT_SETTLED':
      return {
        ...state,
        payments: state.payments.map((p) =>
          p.id === action.paymentId ? { ...p, settled: !p.settled } : p
        ),
      };

    case 'DELETE_PAYMENT':
      return {
        ...state,
        payments: state.payments.filter((p) => p.id !== action.paymentId),
      };

    case 'REPLACE_STATE':
      return {
        ...state,
        expenses: action.expenses,
        payments: action.payments,
      };

    case 'MERGE_STATE': {
      const merged = mergeStates(
        { expenses: state.expenses, payments: state.payments },
        { expenses: action.expenses, payments: action.payments }
      );
      return { ...state, ...merged };
    }

    default:
      return state;
  }
}
