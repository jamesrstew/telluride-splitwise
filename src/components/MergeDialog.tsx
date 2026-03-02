import type { Expense, Payment } from '../types';

interface MergeDialogProps {
  incomingExpenses: Expense[];
  incomingPayments: Payment[];
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export function MergeDialog({
  incomingExpenses,
  incomingPayments,
  onReplace,
  onMerge,
  onCancel,
}: MergeDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-neon-cyan/30 rounded-xl p-6 max-w-sm w-full neon-glow-cyan">
        <h2 className="font-display font-bold text-lg text-neon-cyan mb-4">
          Incoming Data
        </h2>
        <p className="text-snow/80 text-sm mb-2">
          Shared data detected:
        </p>
        <ul className="text-sm text-snow/60 mb-6 space-y-1">
          <li>{incomingExpenses.length} expense{incomingExpenses.length !== 1 ? 's' : ''}</li>
          <li>{incomingPayments.length} payment{incomingPayments.length !== 1 ? 's' : ''}</li>
        </ul>

        <div className="flex flex-col gap-2">
          <button
            onClick={onReplace}
            className="w-full py-3 rounded-lg bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan font-medium text-sm hover:bg-neon-cyan/30 transition-colors cursor-pointer"
          >
            Replace My Data
          </button>
          <button
            onClick={onMerge}
            className="w-full py-3 rounded-lg bg-neon-pink/20 border border-neon-pink/40 text-neon-pink font-medium text-sm hover:bg-neon-pink/30 transition-colors cursor-pointer"
          >
            Merge
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-snow/60 font-medium text-sm hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
