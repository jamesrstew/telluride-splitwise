import type { Expense, ParticipantId, Payment } from '../types';
import { PARTICIPANTS } from '../constants';

const ALL_IDS = PARTICIPANTS.map((p) => p.id);

/**
 * Calculate the actual cent amount each person owes for a single expense.
 * Returns a map of participantId -> cents owed.
 */
export function calculateExpenseSplits(expense: Expense): Map<ParticipantId, number> {
  const result = new Map<ParticipantId, number>();
  const { amount, splitType, splits } = expense;
  // Always calculate splits on the absolute amount, then apply the sign.
  // This ensures negative expenses (refunds) produce correctly signed splits.
  const sign = amount < 0 ? -1 : 1;
  const absAmount = Math.abs(amount);

  switch (splitType) {
    case 'equal': {
      const included = splits.filter((s) => s.value === 1);
      if (included.length === 0) break;
      const perPerson = Math.floor(absAmount / included.length);
      const remainder = absAmount - perPerson * included.length;
      included.forEach((s, i) => {
        // Last person absorbs the penny
        const share = perPerson + (i === included.length - 1 ? remainder : 0);
        result.set(s.participantId, share * sign);
      });
      break;
    }
    case 'exact': {
      // Split values are stored as positive cents (entered against abs total).
      // Apply the expense sign so refund splits are negative.
      splits.forEach((s) => {
        if (s.value !== 0) result.set(s.participantId, s.value * sign);
      });
      break;
    }
    case 'percentage': {
      let assigned = 0;
      const sorted = [...splits].filter((s) => s.value > 0);
      sorted.forEach((s, i) => {
        if (i === sorted.length - 1) {
          // Last person gets the remainder to avoid rounding error
          result.set(s.participantId, (absAmount - assigned) * sign);
        } else {
          const share = Math.round((absAmount * s.value) / 100);
          assigned += share;
          result.set(s.participantId, share * sign);
        }
      });
      break;
    }
    case 'shares': {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
      if (totalShares === 0) break;
      let assigned = 0;
      const nonZero = splits.filter((s) => s.value > 0);
      nonZero.forEach((s, i) => {
        if (i === nonZero.length - 1) {
          result.set(s.participantId, (absAmount - assigned) * sign);
        } else {
          const share = Math.round((absAmount * s.value) / totalShares);
          assigned += share;
          result.set(s.participantId, share * sign);
        }
      });
      break;
    }
  }

  return result;
}

/**
 * Calculate net balances for all participants across all expenses and payments.
 * Positive = owed money (creditor), Negative = owes money (debtor).
 */
export function calculateNetBalances(
  expenses: Expense[],
  payments: Payment[]
): Map<ParticipantId, number> {
  const balances = new Map<ParticipantId, number>();
  ALL_IDS.forEach((id) => balances.set(id, 0));

  for (const expense of expenses) {
    const splits = calculateExpenseSplits(expense);
    // Payer gains credit for the full amount
    balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + expense.amount);
    // Each person's share is a debit
    splits.forEach((amount, pid) => {
      balances.set(pid, (balances.get(pid) || 0) - amount);
    });
  }

  // Settled payments adjust balances
  for (const payment of payments) {
    if (payment.settled) {
      balances.set(payment.fromId, (balances.get(payment.fromId) || 0) + payment.amount);
      balances.set(payment.toId, (balances.get(payment.toId) || 0) - payment.amount);
    }
  }

  return balances;
}

/**
 * Calculate pairwise debts: who owes whom and how much.
 * Returns a list of [debtor, creditor, amount] where amount > 0.
 */
export function calculatePairwiseDebts(
  expenses: Expense[],
  payments: Payment[]
): Map<string, number> {
  // pairKey "A->B" means A owes B that amount
  const debts = new Map<string, number>();

  for (const expense of expenses) {
    const splits = calculateExpenseSplits(expense);
    splits.forEach((amount, pid) => {
      if (pid === expense.paidBy || amount === 0) return;
      const key = `${pid}->${expense.paidBy}`;
      debts.set(key, (debts.get(key) || 0) + amount);
    });
  }

  // Settle payments reduce pairwise debts
  for (const payment of payments) {
    if (payment.settled) {
      const key = `${payment.fromId}->${payment.toId}`;
      debts.set(key, (debts.get(key) || 0) - payment.amount);
    }
  }

  // Net out bidirectional debts
  const netted = new Map<string, number>();
  const processed = new Set<string>();

  debts.forEach((amount, key) => {
    if (processed.has(key)) return;
    const [from, to] = key.split('->') as [ParticipantId, ParticipantId];
    const reverseKey = `${to}->${from}`;
    processed.add(key);
    processed.add(reverseKey);

    const reverse = debts.get(reverseKey) || 0;
    const net = amount - reverse;
    if (net > 0) {
      netted.set(key, net);
    } else if (net < 0) {
      netted.set(reverseKey, -net);
    }
  });

  return netted;
}

/**
 * Get what a specific user owes/is owed by each other person.
 * Positive = they owe you, Negative = you owe them.
 */
export function getUserBalances(
  userId: ParticipantId,
  expenses: Expense[],
  payments: Payment[]
): Map<ParticipantId, number> {
  const pairwise = calculatePairwiseDebts(expenses, payments);
  const result = new Map<ParticipantId, number>();

  ALL_IDS.forEach((otherId) => {
    if (otherId === userId) return;
    const theyOweMe = pairwise.get(`${otherId}->${userId}`) || 0;
    const iOweThem = pairwise.get(`${userId}->${otherId}`) || 0;
    const net = theyOweMe - iOweThem;
    if (net !== 0) result.set(otherId, net);
  });

  return result;
}
