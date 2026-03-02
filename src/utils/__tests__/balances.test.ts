import { describe, it, expect } from 'vitest';
import { calculateExpenseSplits, calculateNetBalances, calculatePairwiseDebts, getUserBalances } from '../balances';
import type { Expense, Payment, ParticipantId, SplitType } from '../../types';

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'test-1',
    description: 'Test expense',
    amount: 10000, // $100.00
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

/** Helper: assert all splits sum exactly to the expense amount (conservation of money). */
function assertSplitsSumToAmount(expense: Expense) {
  const splits = calculateExpenseSplits(expense);
  const total = Array.from(splits.values()).reduce((sum, v) => sum + v, 0);
  expect(total).toBe(expense.amount);
}

/** Helper: assert all net balances across participants sum to zero. */
function assertBalancesNetZero(expenses: Expense[], payments: Payment[] = []) {
  const balances = calculateNetBalances(expenses, payments);
  const total = Array.from(balances.values()).reduce((sum, v) => sum + v, 0);
  expect(total).toBe(0);
}

describe('calculateExpenseSplits', () => {
  describe('equal splits', () => {
    it('splits evenly among 4 people', () => {
      const expense = makeExpense({ amount: 10000 });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(2500);
      expect(result.get('kyle')).toBe(2500);
      expect(result.get('dylan')).toBe(2500);
      expect(result.get('john-ross')).toBe(2500);
      assertSplitsSumToAmount(expense);
    });

    it('handles rounding — last person absorbs penny', () => {
      const expense = makeExpense({ amount: 10001 }); // $100.01
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(2500);
      expect(result.get('kyle')).toBe(2500);
      expect(result.get('dylan')).toBe(2500);
      expect(result.get('john-ross')).toBe(2501); // absorbs extra cent
      assertSplitsSumToAmount(expense);
    });

    it('splits among 3 people with rounding', () => {
      const expense = makeExpense({
        amount: 10000,
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(3333);
      expect(result.get('kyle')).toBe(3333);
      expect(result.get('dylan')).toBe(3334); // absorbs penny
      expect(result.has('john-ross')).toBe(false);
      assertSplitsSumToAmount(expense);
    });

    it('splits among 2 people', () => {
      const expense = makeExpense({
        amount: 5000,
        splits: [
          { participantId: 'james', value: 0 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('kyle')).toBe(2500);
      expect(result.get('dylan')).toBe(2500);
      assertSplitsSumToAmount(expense);
    });

    it('handles $1 split among 3 people', () => {
      const expense = makeExpense({
        amount: 100,
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      assertSplitsSumToAmount(expense);
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(33);
      expect(result.get('kyle')).toBe(33);
      expect(result.get('dylan')).toBe(34);
    });
  });

  describe('exact splits', () => {
    it('assigns exact amounts', () => {
      const expense = makeExpense({
        splitType: 'exact',
        splits: [
          { participantId: 'james', value: 5000 },
          { participantId: 'kyle', value: 3000 },
          { participantId: 'dylan', value: 2000 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(5000);
      expect(result.get('kyle')).toBe(3000);
      expect(result.get('dylan')).toBe(2000);
      expect(result.has('john-ross')).toBe(false);
      assertSplitsSumToAmount(expense);
    });
  });

  describe('percentage splits', () => {
    it('calculates correct amounts from percentages', () => {
      const expense = makeExpense({
        amount: 10000,
        splitType: 'percentage',
        splits: [
          { participantId: 'james', value: 50 },
          { participantId: 'kyle', value: 25 },
          { participantId: 'dylan', value: 25 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(5000);
      expect(result.get('kyle')).toBe(2500);
      expect(result.get('dylan')).toBe(2500);
      assertSplitsSumToAmount(expense);
    });

    it('handles rounding in percentages — last absorbs remainder', () => {
      const expense = makeExpense({
        amount: 10000,
        splitType: 'percentage',
        splits: [
          { participantId: 'james', value: 33 },
          { participantId: 'kyle', value: 33 },
          { participantId: 'dylan', value: 34 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      assertSplitsSumToAmount(expense);
    });
  });

  describe('shares splits', () => {
    it('distributes by share ratio', () => {
      const expense = makeExpense({
        amount: 10000,
        splitType: 'shares',
        splits: [
          { participantId: 'james', value: 2 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(5000);
      expect(result.get('kyle')).toBe(2500);
      expect(result.get('dylan')).toBe(2500);
      assertSplitsSumToAmount(expense);
    });

    it('handles uneven share distribution with rounding', () => {
      const expense = makeExpense({
        amount: 10000,
        splitType: 'shares',
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      assertSplitsSumToAmount(expense);
    });

    it('handles 3:2:1 share ratio', () => {
      const expense = makeExpense({
        amount: 10000,
        splitType: 'shares',
        splits: [
          { participantId: 'james', value: 3 },
          { participantId: 'kyle', value: 2 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      // 3/6 * 10000 = 5000, 2/6 * 10000 = 3333, remainder = 1667
      expect(result.get('james')).toBe(5000);
      expect(result.get('kyle')).toBe(3333);
      expect(result.get('dylan')).toBe(1667);
      assertSplitsSumToAmount(expense);
    });
  });

  describe('negative expenses (refunds)', () => {
    it('negative equal split produces negative amounts that sum to amount', () => {
      const expense = makeExpense({ amount: -10000 });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(-2500);
      expect(result.get('kyle')).toBe(-2500);
      expect(result.get('dylan')).toBe(-2500);
      expect(result.get('john-ross')).toBe(-2500);
      assertSplitsSumToAmount(expense);
    });

    it('negative equal split with rounding', () => {
      const expense = makeExpense({
        amount: -10001,
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 1 },
        ],
      });
      assertSplitsSumToAmount(expense);
    });

    it('negative exact split applies correct sign', () => {
      const expense = makeExpense({
        amount: -10000,
        splitType: 'exact',
        splits: [
          { participantId: 'james', value: 5000 },
          { participantId: 'kyle', value: 3000 },
          { participantId: 'dylan', value: 2000 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(-5000);
      expect(result.get('kyle')).toBe(-3000);
      expect(result.get('dylan')).toBe(-2000);
      assertSplitsSumToAmount(expense);
    });

    it('negative percentage split applies correct sign', () => {
      const expense = makeExpense({
        amount: -10000,
        splitType: 'percentage',
        splits: [
          { participantId: 'james', value: 50 },
          { participantId: 'kyle', value: 25 },
          { participantId: 'dylan', value: 25 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(-5000);
      expect(result.get('kyle')).toBe(-2500);
      expect(result.get('dylan')).toBe(-2500);
      assertSplitsSumToAmount(expense);
    });

    it('negative shares split applies correct sign', () => {
      const expense = makeExpense({
        amount: -6000,
        splitType: 'shares',
        splits: [
          { participantId: 'james', value: 2 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 0 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('james')).toBe(-4000);
      expect(result.get('kyle')).toBe(-2000);
      assertSplitsSumToAmount(expense);
    });

    it('negative expense net balances still sum to zero', () => {
      const expenses = [
        makeExpense({ id: '1', amount: 10000, paidBy: 'james' }),
        makeExpense({ id: '2', amount: -3000, paidBy: 'james' }), // partial refund
      ];
      assertBalancesNetZero(expenses);
    });
  });

  describe('conservation of money — all split types, various amounts', () => {
    const amounts = [1, 2, 3, 7, 99, 100, 101, 333, 1000, 9999, 10000, 10001, 99999];
    const splitConfigs: { type: SplitType; splits: { participantId: ParticipantId; value: number }[] }[] = [
      {
        type: 'equal',
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 1 },
        ],
      },
      {
        type: 'equal',
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      },
      {
        type: 'percentage',
        splits: [
          { participantId: 'james', value: 33 },
          { participantId: 'kyle', value: 33 },
          { participantId: 'dylan', value: 34 },
          { participantId: 'john-ross', value: 0 },
        ],
      },
      {
        type: 'shares',
        splits: [
          { participantId: 'james', value: 3 },
          { participantId: 'kyle', value: 2 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 1 },
        ],
      },
    ];

    for (const config of splitConfigs) {
      for (const amount of amounts) {
        it(`${config.type} split: $${(amount / 100).toFixed(2)} sums correctly`, () => {
          const expense = makeExpense({
            amount,
            splitType: config.type,
            splits: config.splits,
          });
          assertSplitsSumToAmount(expense);
        });
      }
    }
  });

  describe('edge cases', () => {
    it('payer not in split — still produces correct balances', () => {
      const expense = makeExpense({
        amount: 10000,
        paidBy: 'james',
        splits: [
          { participantId: 'james', value: 0 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      // James paid $100 but isn't in the split
      expect(result.has('james')).toBe(false);
      expect(result.get('kyle')).toBe(5000);
      expect(result.get('dylan')).toBe(5000);
      assertSplitsSumToAmount(expense);

      // Net balances: James should be owed $100
      const balances = calculateNetBalances([expense], []);
      expect(balances.get('james')).toBe(10000); // credited $100, no share deducted
      expect(balances.get('kyle')).toBe(-5000);
      expect(balances.get('dylan')).toBe(-5000);
      assertBalancesNetZero([expense]);
    });

    it('equal split with no one included returns empty', () => {
      const expense = makeExpense({
        splits: [
          { participantId: 'james', value: 0 },
          { participantId: 'kyle', value: 0 },
          { participantId: 'dylan', value: 0 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.size).toBe(0);
    });

    it('shares split with all zero shares returns empty', () => {
      const expense = makeExpense({
        splitType: 'shares',
        splits: [
          { participantId: 'james', value: 0 },
          { participantId: 'kyle', value: 0 },
          { participantId: 'dylan', value: 0 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.size).toBe(0);
    });

    it('single person equal split gets full amount', () => {
      const expense = makeExpense({
        amount: 10000,
        splits: [
          { participantId: 'james', value: 0 },
          { participantId: 'kyle', value: 1 },
          { participantId: 'dylan', value: 0 },
          { participantId: 'john-ross', value: 0 },
        ],
      });
      const result = calculateExpenseSplits(expense);
      expect(result.get('kyle')).toBe(10000);
      assertSplitsSumToAmount(expense);
    });
  });
});

describe('calculateNetBalances', () => {
  it('returns zero balances with no expenses', () => {
    const result = calculateNetBalances([], []);
    expect(result.get('james')).toBe(0);
    expect(result.get('kyle')).toBe(0);
  });

  it('calculates correct net for a single equal expense', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const result = calculateNetBalances([expense], []);
    // James paid 10000, owes 2500 -> net +7500
    expect(result.get('james')).toBe(7500);
    // Others owe 2500 each -> net -2500
    expect(result.get('kyle')).toBe(-2500);
    expect(result.get('dylan')).toBe(-2500);
    expect(result.get('john-ross')).toBe(-2500);
    assertBalancesNetZero([expense]);
  });

  it('all net balances sum to zero with multiple payers', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 12000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 8000, paidBy: 'kyle' }),
      makeExpense({ id: '3', amount: 5000, paidBy: 'dylan' }),
    ];
    assertBalancesNetZero(expenses);
  });

  it('all net balances sum to zero with all 4 payers and mixed split types', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 24000, paidBy: 'james' }),
      makeExpense({
        id: '2', amount: 10000, paidBy: 'kyle', splitType: 'exact',
        splits: [
          { participantId: 'james', value: 4000 },
          { participantId: 'kyle', value: 2000 },
          { participantId: 'dylan', value: 3000 },
          { participantId: 'john-ross', value: 1000 },
        ],
      }),
      makeExpense({
        id: '3', amount: 8000, paidBy: 'dylan', splitType: 'percentage',
        splits: [
          { participantId: 'james', value: 25 },
          { participantId: 'kyle', value: 25 },
          { participantId: 'dylan', value: 25 },
          { participantId: 'john-ross', value: 25 },
        ],
      }),
      makeExpense({
        id: '4', amount: 6000, paidBy: 'john-ross', splitType: 'shares',
        splits: [
          { participantId: 'james', value: 1 },
          { participantId: 'kyle', value: 2 },
          { participantId: 'dylan', value: 1 },
          { participantId: 'john-ross', value: 2 },
        ],
      }),
    ];
    assertBalancesNetZero(expenses);
  });

  it('settled payments reduce balances', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const payment: Payment = {
      id: 'p1',
      fromId: 'kyle',
      toId: 'james',
      amount: 2500,
      date: '2026-03-01',
      settled: true,
      createdAt: '2026-03-01T00:00:00Z',
    };
    const result = calculateNetBalances([expense], [payment]);
    expect(result.get('james')).toBe(5000); // was 7500, minus 2500 received
    expect(result.get('kyle')).toBe(0); // was -2500, paid 2500
    assertBalancesNetZero([expense], [payment]);
  });

  it('unsettled payments do not affect balances', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const payment: Payment = {
      id: 'p1',
      fromId: 'kyle',
      toId: 'james',
      amount: 2500,
      date: '2026-03-01',
      settled: false,
      createdAt: '2026-03-01T00:00:00Z',
    };
    const result = calculateNetBalances([expense], [payment]);
    expect(result.get('james')).toBe(7500);
    expect(result.get('kyle')).toBe(-2500);
  });

  it('overpayment creates reverse debt', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const payment: Payment = {
      id: 'p1',
      fromId: 'kyle',
      toId: 'james',
      amount: 5000, // Kyle overpays (only owed 2500)
      date: '2026-03-01',
      settled: true,
      createdAt: '2026-03-01T00:00:00Z',
    };
    const result = calculateNetBalances([expense], [payment]);
    expect(result.get('kyle')).toBe(2500); // Kyle is now a creditor (overpaid by 2500)
    expect(result.get('james')).toBe(2500); // James still owed by Dylan & JR (5000), but owes Kyle back (2500) → 5000-2500=2500... wait
    // James: +10000 (paid) -2500 (own share) -5000 (received from Kyle) = 2500
    // Kyle: -2500 (share) +5000 (paid) = 2500
    assertBalancesNetZero([expense], [payment]);
  });
});

describe('calculatePairwiseDebts', () => {
  it('returns empty map with no expenses', () => {
    const result = calculatePairwiseDebts([], []);
    expect(result.size).toBe(0);
  });

  it('calculates correct pairwise debts for one expense', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const result = calculatePairwiseDebts([expense], []);
    expect(result.get('kyle->james')).toBe(2500);
    expect(result.get('dylan->james')).toBe(2500);
    expect(result.get('john-ross->james')).toBe(2500);
  });

  it('nets out bidirectional debts', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 10000, paidBy: 'james' }), // Kyle owes James 2500
      makeExpense({ id: '2', amount: 10000, paidBy: 'kyle' }),  // James owes Kyle 2500
    ];
    const result = calculatePairwiseDebts(expenses, []);
    // They cancel out — neither owes the other
    expect(result.has('kyle->james')).toBe(false);
    expect(result.has('james->kyle')).toBe(false);
  });

  it('nets unequal bidirectional debts correctly', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 20000, paidBy: 'james' }), // Kyle owes James 5000
      makeExpense({ id: '2', amount: 10000, paidBy: 'kyle' }),  // James owes Kyle 2500
    ];
    const result = calculatePairwiseDebts(expenses, []);
    // Kyle owes James net 2500
    expect(result.get('kyle->james')).toBe(2500);
    expect(result.has('james->kyle')).toBe(false);
  });
});

describe('getUserBalances', () => {
  it('shows what others owe the active user', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'james' });
    const result = getUserBalances('james', [expense], []);
    expect(result.get('kyle')).toBe(2500); // positive = they owe me
    expect(result.get('dylan')).toBe(2500);
    expect(result.get('john-ross')).toBe(2500);
  });

  it('shows what active user owes others', () => {
    const expense = makeExpense({ amount: 10000, paidBy: 'kyle' });
    const result = getUserBalances('james', [expense], []);
    expect(result.get('kyle')).toBe(-2500); // negative = I owe them
  });

  it('does not include zero balances', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 10000, paidBy: 'james' }),
      makeExpense({ id: '2', amount: 10000, paidBy: 'kyle' }),
    ];
    const result = getUserBalances('james', expenses, []);
    // James and Kyle cancel out
    expect(result.has('kyle')).toBe(false);
  });
});
