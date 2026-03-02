import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../components/Toast';
import { ExpenseCard } from '../components/ExpenseCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PARTICIPANT_MAP } from '../constants';
import { formatCents } from '../utils/formatters';
import { getUserBalances, calculateNetBalances } from '../utils/balances';
import type { ParticipantId } from '../types';

export function Dashboard() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const showToast = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const userId = state.activeUser!;

  function confirmDelete() {
    if (!pendingDeleteId) return;
    dispatch({ type: 'DELETE_EXPENSE', expenseId: pendingDeleteId });
    showToast('Expense deleted', 'success');
    setPendingDeleteId(null);
  }

  const netBalances = calculateNetBalances(state.expenses, state.payments);
  const myNetBalance = netBalances.get(userId) || 0;
  const userBalances = getUserBalances(userId, state.expenses, state.payments);

  const recentExpenses = [...state.expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const totalSpend = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPersonAvg = state.expenses.length > 0 ? Math.round(totalSpend / 4) : 0;
  const biggestExpense = state.expenses.length > 0
    ? state.expenses.reduce((max, e) => (e.amount > max.amount ? e : max), state.expenses[0])
    : null;

  return (
    <div className="space-y-5">
      {/* Balance Hero Card */}
      <div className="relative rounded-xl border border-white/10 bg-bg-card p-5 overflow-hidden crt-overlay">
        <p className="text-xs text-muted uppercase tracking-wider mb-2">Your balance</p>
        <p
          className={`text-3xl font-bold tabular-nums ${
            myNetBalance > 0 ? 'text-neon-cyan neon-text-cyan' :
            myNetBalance < 0 ? 'text-neon-red' :
            'text-snow'
          }`}
        >
          {myNetBalance > 0
            ? `You are owed ${formatCents(myNetBalance)}`
            : myNetBalance < 0
              ? `You owe ${formatCents(-myNetBalance)}`
              : "You're all settled up"
          }
        </p>

        {userBalances.size > 0 && (
          <div className="mt-4 space-y-1.5">
            {Array.from(userBalances.entries()).map(([otherId, amount]) => {
              const other = PARTICIPANT_MAP[otherId as ParticipantId];
              return (
                <p key={otherId} className="text-sm">
                  {amount > 0 ? (
                    <>
                      <span style={{ color: other.color }}>{other.name}</span>
                      <span className="text-muted"> owes you </span>
                      <span className="text-neon-cyan tabular-nums">{formatCents(amount)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted">You owe </span>
                      <span style={{ color: other.color }}>{other.name}</span>
                      <span className="text-muted"> </span>
                      <span className="text-neon-red tabular-nums">{formatCents(-amount)}</span>
                    </>
                  )}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/add')}
          className="py-3 rounded-xl bg-neon-pink/20 border border-neon-pink/30 text-neon-pink font-semibold text-sm hover:bg-neon-pink/30 transition-colors cursor-pointer"
        >
          + Add Expense
        </button>
        <button
          onClick={() => navigate('/settle')}
          className="py-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan font-semibold text-sm hover:bg-neon-cyan/30 transition-colors cursor-pointer"
        >
          Settle Up
        </button>
      </div>

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-snow">Recent</h3>
            <button
              onClick={() => navigate('/expenses')}
              className="text-xs text-neon-pink cursor-pointer bg-transparent border-none"
            >
              See all
            </button>
          </div>
          <div className="space-y-2">
            {recentExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                activeUser={userId}
                onDelete={() => setPendingDeleteId(expense.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trip Summary */}
      <div className="rounded-xl border border-white/10 bg-bg-card p-4">
        <h3 className="font-display font-bold text-sm text-snow mb-3">Trip Summary</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-snow tabular-nums">{formatCents(totalSpend)}</p>
            <p className="text-[10px] text-muted uppercase">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-snow tabular-nums">{formatCents(perPersonAvg)}</p>
            <p className="text-[10px] text-muted uppercase">Per Person</p>
          </div>
          <div>
            <p className="text-lg font-bold text-snow tabular-nums">
              {biggestExpense ? formatCents(biggestExpense.amount) : '$0.00'}
            </p>
            <p className="text-[10px] text-muted uppercase">Biggest</p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {state.expenses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">{'\u{1F3D4}\uFE0F'}</p>
          <p className="font-retro text-xs text-muted mb-2">SHRED NOW</p>
          <p className="font-retro text-xs text-neon-pink animate-neon-pulse">SETTLE LATER</p>
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete Expense"
          message="This will permanently remove this expense and update all balances. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
