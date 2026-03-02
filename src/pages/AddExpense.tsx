import { useParams } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { ExpenseForm } from '../components/ExpenseForm';

export function AddExpense() {
  const { expenseId } = useParams();
  const { state } = useAppState();

  const existing = expenseId
    ? state.expenses.find((e) => e.id === expenseId)
    : undefined;

  return (
    <div>
      <h2 className="font-display font-bold text-lg text-snow mb-4">
        {existing ? 'Edit Expense' : 'Add Expense'}
      </h2>
      <ExpenseForm existing={existing} />
    </div>
  );
}
