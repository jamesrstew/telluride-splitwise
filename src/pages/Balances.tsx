import { PARTICIPANTS, PARTICIPANT_MAP } from '../constants';
import { useAppState } from '../hooks/useAppState';
import { formatCents } from '../utils/formatters';
import { calculateNetBalances, calculatePairwiseDebts, calculateExpenseSplits } from '../utils/balances';
import type { ParticipantId } from '../types';

export function Balances() {
  const { state } = useAppState();
  const netBalances = calculateNetBalances(state.expenses, state.payments);
  const pairwiseDebts = calculatePairwiseDebts(state.expenses, state.payments);

  const totalPaidByPerson = new Map<ParticipantId, number>();
  const totalShareByPerson = new Map<ParticipantId, number>();

  PARTICIPANTS.forEach((p) => {
    totalPaidByPerson.set(p.id, 0);
    totalShareByPerson.set(p.id, 0);
  });

  for (const expense of state.expenses) {
    totalPaidByPerson.set(expense.paidBy, (totalPaidByPerson.get(expense.paidBy) || 0) + expense.amount);

    const splits = calculateExpenseSplits(expense);
    splits.forEach((amount, pid) => {
      totalShareByPerson.set(pid, (totalShareByPerson.get(pid) || 0) + amount);
    });
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display font-bold text-lg text-snow">Balances</h2>

      {/* Per-person balance cards */}
      <div className="grid grid-cols-2 gap-3">
        {PARTICIPANTS.map((p) => {
          const net = netBalances.get(p.id) || 0;
          const paid = totalPaidByPerson.get(p.id) || 0;
          const share = totalShareByPerson.get(p.id) || 0;

          return (
            <div
              key={p.id}
              className="rounded-xl border border-white/10 bg-bg-card p-4"
              style={{ borderColor: p.color + '30' }}
            >
              <p className="font-semibold text-sm mb-2" style={{ color: p.color }}>
                {p.name}
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Paid</span>
                  <span className="text-snow tabular-nums">{formatCents(paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Share</span>
                  <span className="text-snow tabular-nums">{formatCents(share)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-muted">Net</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      net > 0 ? 'text-neon-cyan' : net < 0 ? 'text-neon-red' : 'text-muted'
                    }`}
                  >
                    {net > 0 ? '+' : ''}{formatCents(net)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pairwise debts */}
      <div>
        <h3 className="font-display font-bold text-sm text-snow mb-3">Who Owes Whom</h3>
        {pairwiseDebts.size === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">{'\u2728'}</p>
            <p className="text-muted text-sm">All squared up</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from(pairwiseDebts.entries()).map(([key, amount]) => {
              const [fromId, toId] = key.split('->') as [ParticipantId, ParticipantId];
              const from = PARTICIPANT_MAP[fromId];
              const to = PARTICIPANT_MAP[toId];

              return (
                <div
                  key={key}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl bg-bg-card border border-white/5"
                >
                  <span className="text-sm font-medium" style={{ color: from.color }}>
                    {from.name}
                  </span>
                  <svg width="20" height="12" viewBox="0 0 20 12" className="text-muted shrink-0">
                    <line x1="0" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" />
                    <polyline points="13,2 17,6 13,10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: to.color }}>
                    {to.name}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-neon-red tabular-nums">
                    {formatCents(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
