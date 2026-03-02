import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../components/Toast';
import { PARTICIPANT_MAP } from '../constants';
import { formatCents } from '../utils/formatters';
import { simplifyDebts, directDebts } from '../utils/settlement';
import { getVenmoPayLink, getVenmoFallbackLink } from '../utils/venmo';
import type { Transaction } from '../types';

export function SettleUp() {
  const { state, dispatch } = useAppState();
  const showToast = useToast();
  const [mode, setMode] = useState<'simplified' | 'full'>('simplified');

  const transactions: Transaction[] =
    mode === 'simplified'
      ? simplifyDebts(state.expenses, state.payments)
      : directDebts(state.expenses, state.payments);

  function handleVenmo(tx: Transaction) {
    const deepLink = getVenmoPayLink(tx.to, tx.amount);
    const fallback = getVenmoFallbackLink(tx.to);

    // Try deep link first, fall back to web after timeout
    const start = Date.now();
    window.location.href = deepLink;

    setTimeout(() => {
      // If we're still here after 1.5s, the app didn't open
      if (Date.now() - start < 2000) {
        window.open(fallback, '_blank');
      }
    }, 1500);
  }

  function handleMarkPaid(tx: Transaction) {
    dispatch({
      type: 'ADD_PAYMENT',
      payment: {
        id: uuid(),
        fromId: tx.from,
        toId: tx.to,
        amount: tx.amount,
        date: new Date().toISOString().slice(0, 10),
        settled: true,
        createdAt: new Date().toISOString(),
      },
    });
    showToast(`${PARTICIPANT_MAP[tx.from].name}'s payment recorded`, 'success');
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display font-bold text-lg text-snow">Settle Up</h2>

      {/* Mode toggle */}
      <div className="flex bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setMode('simplified')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
            mode === 'simplified' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-muted'
          }`}
        >
          Simplified
        </button>
        <button
          onClick={() => setMode('full')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
            mode === 'full' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-muted'
          }`}
        >
          Full
        </button>
      </div>

      {mode === 'simplified' && (
        <p className="text-xs text-muted">
          Minimized payments — fewer transactions to settle everything.
        </p>
      )}
      {mode === 'full' && (
        <p className="text-xs text-muted">
          Every individual pairwise debt shown separately.
        </p>
      )}

      {/* Transactions */}
      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{'\u{1F389}'}</p>
          <p className="font-display font-bold text-neon-cyan text-lg mb-1">All Squared Up!</p>
          <p className="text-muted text-sm">No payments needed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx, i) => {
            const from = PARTICIPANT_MAP[tx.from];
            const to = PARTICIPANT_MAP[tx.to];

            return (
              <div
                key={`${tx.from}-${tx.to}-${i}`}
                className="rounded-xl border border-white/10 bg-bg-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-sm" style={{ color: from.color }}>
                    {from.name}
                  </span>
                  <span className="text-muted text-sm">pays</span>
                  <span className="font-semibold text-sm" style={{ color: to.color }}>
                    {to.name}
                  </span>
                  <span className="ml-auto text-lg font-bold text-snow tabular-nums">
                    {formatCents(tx.amount)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleVenmo(tx)}
                    className="flex-1 py-2.5 rounded-lg bg-[#008CFF]/20 border border-[#008CFF]/30 text-[#008CFF] text-sm font-medium hover:bg-[#008CFF]/30 transition-colors cursor-pointer"
                  >
                    Pay with Venmo
                  </button>
                  <button
                    onClick={() => handleMarkPaid(tx)}
                    className="py-2.5 px-4 rounded-lg bg-neon-green/20 border border-neon-green/30 text-neon-green text-sm font-medium hover:bg-neon-green/30 transition-colors cursor-pointer"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {transactions.length > 0 && (
        <p className="text-center text-sm text-muted">
          {transactions.length} payment{transactions.length !== 1 ? 's' : ''} to settle everything
        </p>
      )}

      {/* Recorded payments */}
      {state.payments.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-sm text-snow mb-3">Recorded Payments</h3>
          <div className="space-y-2">
            {state.payments.map((p) => {
              const from = PARTICIPANT_MAP[p.fromId];
              const to = PARTICIPANT_MAP[p.toId];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 py-3 px-4 rounded-xl bg-bg-card border border-white/5"
                >
                  <span className="text-sm" style={{ color: from.color }}>{from.name}</span>
                  <span className="text-xs text-muted">{'\u2192'}</span>
                  <span className="text-sm" style={{ color: to.color }}>{to.name}</span>
                  <span className="ml-auto text-sm font-semibold text-snow tabular-nums">
                    {formatCents(p.amount)}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_PAYMENT_SETTLED', paymentId: p.id })}
                    className={`ml-2 p-1 rounded cursor-pointer ${
                      p.settled ? 'text-neon-green' : 'text-muted'
                    }`}
                    title={p.settled ? 'Mark as unpaid' : 'Mark as paid'}
                  >
                    {p.settled ? '\u2705' : '\u2B1C'}
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_PAYMENT', paymentId: p.id })}
                    className="p-1 rounded text-neon-red/50 hover:text-neon-red cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
