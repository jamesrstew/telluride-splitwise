import { useNavigate } from 'react-router-dom';
import type { Expense, ParticipantId } from '../types';
import { CATEGORY_MAP, PARTICIPANT_MAP } from '../constants';
import { formatCents, formatDate } from '../utils/formatters';
import { calculateExpenseSplits } from '../utils/balances';

interface ExpenseCardProps {
  expense: Expense;
  activeUser: ParticipantId;
  onDelete?: () => void;
}

export function ExpenseCard({ expense, activeUser, onDelete }: ExpenseCardProps) {
  const navigate = useNavigate();
  const cat = CATEGORY_MAP[expense.category];
  const payer = PARTICIPANT_MAP[expense.paidBy];
  const splits = calculateExpenseSplits(expense);
  const myShare = splits.get(activeUser) || 0;

  let context = '';
  let contextColor = 'text-muted';

  if (expense.paidBy === activeUser) {
    const othersOwe = expense.amount - myShare;
    if (othersOwe > 0) {
      context = `you lent ${formatCents(othersOwe)}`;
      contextColor = 'text-neon-cyan';
    }
  } else if (myShare > 0) {
    context = `you owe ${formatCents(myShare)}`;
    contextColor = 'text-neon-red';
  }

  return (
    <div
      onClick={() => navigate(`/add/${expense.id}`)}
      className="flex items-center gap-3 py-3 px-3 rounded-xl bg-bg-card border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
    >
      <span className="text-xl w-9 text-center shrink-0">{cat?.emoji ?? '\u{1F4E6}'}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-snow truncate">{expense.description}</p>
        <p className="text-xs text-muted">
          <span style={{ color: payer.color }}>{payer.name}</span> paid
          {' \u00B7 '}
          {formatDate(expense.date)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-snow tabular-nums">{formatCents(expense.amount)}</p>
        {context && (
          <p className={`text-xs ${contextColor} tabular-nums`}>{context}</p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 ml-1 p-1.5 rounded-lg hover:bg-neon-red/20 text-neon-red transition-all cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  );
}
