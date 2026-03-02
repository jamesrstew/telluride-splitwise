import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../components/Toast';
import { ExpenseForm } from '../components/ExpenseForm';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function AddExpense() {
  const { expenseId } = useParams();
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const showToast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const existing = expenseId
    ? state.expenses.find((e) => e.id === expenseId)
    : undefined;

  function handleDelete() {
    if (!existing) return;
    dispatch({ type: 'DELETE_EXPENSE', expenseId: existing.id });
    showToast('Expense deleted', 'success');
    navigate('/');
  }

  return (
    <div>
      <h2 className="font-display font-bold text-lg text-snow mb-4">
        {existing ? 'Edit Expense' : 'Add Expense'}
      </h2>
      <ExpenseForm
        existing={existing}
        onDelete={existing ? () => setShowDeleteConfirm(true) : undefined}
      />

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Expense"
          message="This will permanently remove this expense and update all balances. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
