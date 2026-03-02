import { describe, it, expect } from 'vitest';
import { simplifyDebts, directDebts } from '../settlement';
import { calculateNetBalances } from '../balances';
import type { Expense, Payment, Transaction } from '../../types';

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'test-1',
    description: 'Test expense',
    amount: 10000,
    paidBy: 'james',
    category: 'other',
    splitType: 'equal',
    splits: [
      { participantId: 'james', value: 1 },
      { participantId: 'kyle', value: 1 },
      { participantId: 'dylan', value: 1 },
      { participantId: 'john-ross', value: 1 },
    ],
    date: '2026-03-01',
    createdAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Verify that settlement transactions, when applied, would zero out all balances.
 * This is the fundamental invariant: executing the transactions must settle everything.
 */
function assertSettlesEverything(
  transactions: Transaction[],
  expenses: Expense[],
  payments: Payment[] = []
) {
  const balances = calculateNetBalances(expenses, payments);

  // Apply each transaction: from pays to
  for (const tx of transactions) {
    balances.set(tx.from, (balances.get(tx.from) || 0) + tx.amount);
    balances.set(tx.to, (balances.get(tx.to) || 0) - tx.amount);
  }

  // All balances should now be zero
  balances.forEach((balance, pid) => {
    expect(balance, `${pid} should be settled (balance: ${balance})`).toBe(0);
  });
}

/** Verify no transaction has a zero or negative amount. */
function assertPositiveAmounts(transactions: Transaction[]) {
  for (const tx of transactions) {
    expect(tx.amount, `${tx.from}->${tx.to} amount must be positive`).toBeGreaterThan(0);
  }
}

describe('simplifyDebts', () => {
  it('returns empty for no expenses', () => {
    expect(simplifyDebts([], [])).toEqual([]);
  });

  it('produces minimal transactions for a single expense', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const result = simplifyDebts([expense], []);
    expect(result.length).toBe(3);
    const totalPaid = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(7500);
    expect(result.every((t) => t.to === 'james')).toBe(true);
    assertPositiveAmounts(result);
    assertSettlesEverything(result, [expense]);
  });

  it('produces fewer transactions than direct debts with multiple payers', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 20000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 12000, paidBy: 'kyle' }),
      makeExpense({ id: '3', amount: 8000, paidBy: 'dylan' }),
    ];
    const simplified = simplifyDebts(expenses, []);
    const direct = directDebts(expenses, []);
    expect(simplified.length).toBeLessThanOrEqual(direct.length);
    assertPositiveAmounts(simplified);
    assertSettlesEverything(simplified, expenses);
  });

  it('handles all-settled state', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const payments: Payment[] = [
      { id: 'p1', fromId: 'kyle', toId: 'james', amount: 2500, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
      { id: 'p2', fromId: 'dylan', toId: 'james', amount: 2500, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
      { id: 'p3', fromId: 'john-ross', toId: 'james', amount: 2500, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
    ];
    const result = simplifyDebts([expense], payments);
    expect(result.length).toBe(0);
  });

  it('settlement transactions zero out all balances', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 15000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 10000, paidBy: 'kyle' }),
    ];
    const result = simplifyDebts(expenses, []);
    assertPositiveAmounts(result);
    assertSettlesEverything(result, expenses);
  });

  it('optimizes 4-person scenario to 3 or fewer transactions', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 40000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 20000, paidBy: 'kyle' }),
      makeExpense({ id: '3', amount: 10000, paidBy: 'dylan' }),
      makeExpense({ id: '4', amount: 10000, paidBy: 'john-ross' }),
    ];
    const result = simplifyDebts(expenses, []);
    expect(result.length).toBeLessThanOrEqual(3);
    assertPositiveAmounts(result);
    assertSettlesEverything(result, expenses);
  });

  it('handles complex realistic scenario', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 120000, paidBy: 'james', category: 'lodging' }),
      makeExpense({ id: '2', amount: 48000, paidBy: 'kyle', category: 'lift-tickets' }),
      makeExpense({ id: '3', amount: 8500, paidBy: 'dylan', category: 'groceries' }),
      makeExpense({ id: '4', amount: 3200, paidBy: 'john-ross', category: 'gas' }),
      makeExpense({
        id: '5', amount: 6000, paidBy: 'james', category: 'drinks-apres',
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 0 },
          { participantId: 'john-ross', value: 1 },
        ],
      }),
    ];
    const result = simplifyDebts(expenses, []);
    assertPositiveAmounts(result);
    assertSettlesEverything(result, expenses);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('handles partial settlements correctly', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 10000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 8000, paidBy: 'kyle' }),
    ];
    const payments: Payment[] = [
      { id: 'p1', fromId: 'dylan', toId: 'james', amount: 2000, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
    ];
    const result = simplifyDebts(expenses, payments);
    assertPositiveAmounts(result);
    assertSettlesEverything(result, expenses, payments);
  });

  it('no self-payments in results', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 10000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 10000, paidBy: 'kyle' }),
      makeExpense({ id: '3', amount: 10000, paidBy: 'dylan' }),
      makeExpense({ id: '4', amount: 10000, paidBy: 'john-ross' }),
    ];
    const result = simplifyDebts(expenses, []);
    for (const tx of result) {
      expect(tx.from).not.toBe(tx.to);
    }
  });
});

describe('directDebts', () => {
  it('returns all pairwise debts', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const result = directDebts([expense], []);
    expect(result.length).toBe(3); // 3 people owe James
    assertPositiveAmounts(result);
  });

  it('returns sorted by amount descending', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 20000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 8000, paidBy: 'kyle' }),
    ];
    const result = directDebts(expenses, []);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].amount).toBeLessThanOrEqual(result[i - 1].amount);
    }
  });

  it('returns empty when all settled', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const payments: Payment[] = [
      { id: 'p1', fromId: 'kyle', toId: 'james', amount: 2500, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
      { id: 'p2', fromId: 'dylan', toId: 'james', amount: 2500, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
      { id: 'p3', fromId: 'john-ross', toId: 'james', amount: 2500, date: '2026-03-01', settled: true, createdAt: '2026-03-01T00:00:00Z' },
    ];
    const result = directDebts([expense], payments);
    expect(result.length).toBe(0);
  });

  it('direct debts also settle everything', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 20000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 12000, paidBy: 'kyle' }),
      makeExpense({ id: '3', amount: 8000, paidBy: 'dylan' }),
    ];
    const result = directDebts(expenses, []);
    assertPositiveAmounts(result);
    // Direct debts should also settle everything — just less efficiently
    assertSettlesEverything(result, expenses);
  });
});
