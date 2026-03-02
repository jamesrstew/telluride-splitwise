import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../components/Toast';
import { ExpenseCard } from '../components/ExpenseCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CATEGORIES, PARTICIPANTS } from '../constants';
import type { Category, ParticipantId } from '../types';

export function Expenses() {
  const { state, dispatch } = useAppState();
  const showToast = useToast();
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [paidByFilter, setPaidByFilter] = useState<ParticipantId | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'amount'>('newest');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  let filtered = [...state.expenses];

  if (categoryFilter !== 'all') {
    filtered = filtered.filter((e) => e.category === categoryFilter);
  }
  if (paidByFilter !== 'all') {
    filtered = filtered.filter((e) => e.paidBy === paidByFilter);
  }

  filtered.sort((a, b) => {
    if (sort === 'amount') return b.amount - a.amount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function confirmDelete() {
    if (!pendingDeleteId) return;
    dispatch({ type: 'DELETE_EXPENSE', expenseId: pendingDeleteId });
    showToast('Expense deleted', 'success');
    setPendingDeleteId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-snow">Expenses</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'amount')}
          className="bg-bg-input border border-white/10 rounded-lg px-2 py-1 text-xs text-snow outline-none"
        >
          <option value="newest">Newest</option>
          <option value="amount">Highest $</option>
        </select>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-4 px-4 scrollbar-none">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            categoryFilter === 'all'
              ? 'border-neon-pink/50 bg-neon-pink/10 text-neon-pink'
              : 'border-white/10 text-muted'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              categoryFilter === cat.id
                ? 'border-neon-pink/50 bg-neon-pink/10 text-neon-pink'
                : 'border-white/10 text-muted'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Paid by filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPaidByFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            paidByFilter === 'all'
              ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
              : 'border-white/10 text-muted'
          }`}
        >
          All payers
        </button>
        {PARTICIPANTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPaidByFilter(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer`}
            style={
              paidByFilter === p.id
                ? { borderColor: p.color + '80', backgroundColor: p.color + '15', color: p.color }
                : { borderColor: 'rgba(255,255,255,0.1)', color: 'var(--color-muted)' }
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">{'\u{1F3BF}'}</p>
          <p className="text-muted text-sm">No expenses yet</p>
          <p className="text-muted text-xs mt-1">Hit the + button to add one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              activeUser={state.activeUser!}
              onDelete={() => setPendingDeleteId(expense.id)}
            />
          ))}
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
