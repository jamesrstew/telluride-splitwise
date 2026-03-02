import type { ParticipantId, Transaction, Expense, Payment } from '../types';
import { calculateNetBalances, calculatePairwiseDebts } from './balances';

/**
 * Simplify debts using greedy creditor/debtor matching.
 * Produces the minimum number of transactions to settle all balances.
 */
export function simplifyDebts(
  expenses: Expense[],
  payments: Payment[]
): Transaction[] {
  const balances = calculateNetBalances(expenses, payments);

  const creditors: [ParticipantId, number][] = [];
  const debtors: [ParticipantId, number][] = [];

  balances.forEach((balance, pid) => {
    if (balance > 0) creditors.push([pid, balance]);
    else if (balance < 0) debtors.push([pid, -balance]); // store as positive
  });

  // Sort descending by amount
  creditors.sort((a, b) => b[1] - a[1]);
  debtors.sort((a, b) => b[1] - a[1]);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i][1], creditors[j][1]);
    if (amount > 0) {
      transactions.push({
        from: debtors[i][0],
        to: creditors[j][0],
        amount,
      });
    }
    debtors[i][1] -= amount;
    creditors[j][1] -= amount;
    if (debtors[i][1] === 0) i++;
    if (creditors[j][1] === 0) j++;
  }

  return transactions;
}

/**
 * Direct (non-simplified) debts — each pairwise debt as a transaction.
 */
export function directDebts(
  expenses: Expense[],
  payments: Payment[]
): Transaction[] {
  const pairwise = calculatePairwiseDebts(expenses, payments);
  const transactions: Transaction[] = [];

  pairwise.forEach((amount, key) => {
    if (amount <= 0) return;
    const [from, to] = key.split('->') as [ParticipantId, ParticipantId];
    transactions.push({ from, to, amount });
  });

  return transactions.sort((a, b) => b.amount - a.amount);
}
