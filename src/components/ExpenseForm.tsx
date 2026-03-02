import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { useAppState } from '../hooks/useAppState';
import { useToast } from './Toast';
import { PARTICIPANTS } from '../constants';
import { CategoryPicker } from './CategoryPicker';
import { SplitInput } from './SplitInput';
import { formatCents, parseCurrencyInput } from '../utils/formatters';
import type { Category, ParticipantId, Split, SplitType, Expense } from '../types';

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equal' },
  { value: 'exact', label: 'Exact' },
  { value: 'percentage', label: '%' },
  { value: 'shares', label: 'Shares' },
];

function defaultSplits(splitType: SplitType): Split[] {
  return PARTICIPANTS.map((p) => ({
    participantId: p.id,
    value: splitType === 'equal' ? 1 : splitType === 'shares' ? 1 : 0,
  }));
}

interface ExpenseFormProps {
  existing?: Expense;
  onDelete?: () => void;
}

export function ExpenseForm({ existing, onDelete }: ExpenseFormProps) {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const showToast = useToast();

  const [description, setDescription] = useState(existing?.description ?? '');
  const [amountStr, setAmountStr] = useState(
    existing ? (existing.amount / 100).toFixed(2) : ''
  );
  const [paidBy, setPaidBy] = useState<ParticipantId>(
    existing?.paidBy ?? state.activeUser ?? 'james'
  );
  const [category, setCategory] = useState<Category>(existing?.category ?? 'other');
  const [splitType, setSplitType] = useState<SplitType>(existing?.splitType ?? 'equal');
  const [splits, setSplits] = useState<Split[]>(existing?.splits ?? defaultSplits('equal'));
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const amountCents = parseCurrencyInput(amountStr);

  const [initialSplitType] = useState(splitType);

  // When split type changes, reset splits to defaults.
  // In edit mode, only reset if the type actually changed from the original.
  useEffect(() => {
    if (existing && splitType === initialSplitType) return;
    setSplits(defaultSplits(splitType));
  }, [splitType]);

  function validate(): string | null {
    if (!description.trim()) return 'Description is required';
    if (amountCents === 0) return 'Amount must be non-zero';

    if (splitType === 'equal') {
      const included = splits.filter((s) => s.value === 1);
      if (included.length === 0) return 'At least one person must be included';
    }

    if (splitType === 'exact') {
      const total = splits.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(total - Math.abs(amountCents)) > 1) {
        return `Split amounts must equal ${formatCents(Math.abs(amountCents))}`;
      }
    }

    if (splitType === 'percentage') {
      const total = splits.reduce((sum, s) => sum + s.value, 0);
      if (total !== 100) return 'Percentages must sum to 100%';
    }

    if (splitType === 'shares') {
      const total = splits.reduce((sum, s) => sum + s.value, 0);
      if (total === 0) return 'At least one person must have shares';
    }

    return null;
  }

  function handleSave() {
    const error = validate();
    if (error) {
      showToast(error, 'error');
      return;
    }

    const expense: Expense = {
      id: existing?.id ?? uuid(),
      description: description.trim(),
      amount: amountCents,
      paidBy,
      category,
      splitType,
      splits,
      date,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (existing) {
      dispatch({ type: 'UPDATE_EXPENSE', expense });
      showToast('Expense updated', 'success');
    } else {
      dispatch({ type: 'ADD_EXPENSE', expense });
      showToast(`${formatCents(amountCents)} for ${description.trim()} added`, 'success');
    }

    navigate('/');
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Description */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Lift tickets, dinner, etc."
          className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-snow placeholder:text-white/20 focus:border-neon-pink/50 outline-none"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-lg">$</span>
          <input
            type="number"
            step="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className="w-full bg-bg-input border border-white/10 rounded-lg pl-9 pr-4 py-3 text-snow text-xl tabular-nums font-semibold placeholder:text-white/20 focus:border-neon-pink/50 outline-none"
          />
        </div>
      </div>

      {/* Paid By */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Paid by</label>
        <div className="flex gap-2">
          {PARTICIPANTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaidBy(p.id)}
              className={`
                flex-1 py-2.5 rounded-lg text-sm font-medium
                border transition-all cursor-pointer
                ${paidBy === p.id
                  ? 'border-current bg-current/10'
                  : 'border-white/10 bg-white/5 text-muted'
                }
              `}
              style={paidBy === p.id ? { color: p.color } : undefined}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Category</label>
        <CategoryPicker selected={category} onChange={setCategory} />
      </div>

      {/* Split Type */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Split</label>
        <div className="flex bg-white/5 rounded-lg p-1 mb-3">
          {SPLIT_TYPES.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setSplitType(st.value)}
              className={`
                flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer
                ${splitType === st.value
                  ? 'bg-neon-pink/20 text-neon-pink'
                  : 'text-muted hover:text-snow'
                }
              `}
            >
              {st.label}
            </button>
          ))}
        </div>
        <SplitInput
          splitType={splitType}
          splits={splits}
          totalCents={Math.abs(amountCents)}
          onChange={setSplits}
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-snow focus:border-neon-pink/50 outline-none"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any details..."
          rows={2}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-snow placeholder:text-white/20 focus:border-neon-pink/50 outline-none resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-4 rounded-xl bg-neon-pink text-bg-primary font-bold text-base shadow-[0_0_20px_rgba(255,110,199,0.3)] active:scale-[0.98] transition-transform cursor-pointer"
      >
        {existing ? 'Update Expense' : 'Add Expense'}
      </button>

      {/* Delete (edit mode only) */}
      {existing && onDelete && (
        <button
          onClick={onDelete}
          className="w-full py-3 rounded-xl bg-transparent border border-neon-red/30 text-neon-red/70 font-medium text-sm hover:bg-neon-red/10 hover:text-neon-red transition-colors cursor-pointer"
        >
          Delete Expense
        </button>
      )}
    </div>
  );
}
