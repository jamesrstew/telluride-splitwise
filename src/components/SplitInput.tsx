import { PARTICIPANTS, PARTICIPANT_MAP } from '../constants';
import type { Split, SplitType, ParticipantId } from '../types';
import { formatCents } from '../utils/formatters';

interface SplitInputProps {
  splitType: SplitType;
  splits: Split[];
  totalCents: number;
  onChange: (splits: Split[]) => void;
}

export function SplitInput({ splitType, splits, totalCents, onChange }: SplitInputProps) {
  const getSplit = (pid: ParticipantId) =>
    splits.find((s) => s.participantId === pid)?.value ?? 0;

  const updateSplit = (pid: ParticipantId, value: number) => {
    onChange(
      splits.map((s) => (s.participantId === pid ? { ...s, value } : s))
    );
  };

  switch (splitType) {
    case 'equal': {
      const included = splits.filter((s) => s.value === 1);
      const perPerson = included.length > 0 ? Math.floor(totalCents / included.length) : 0;

      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {PARTICIPANTS.map((p) => {
              const isOn = getSplit(p.id) === 1;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateSplit(p.id, isOn ? 0 : 1)}
                  className={`
                    px-3 py-2 rounded-full text-sm font-medium
                    border transition-all cursor-pointer
                    ${isOn
                      ? 'border-current bg-current/10'
                      : 'border-white/10 bg-white/5 text-muted'
                    }
                  `}
                  style={isOn ? { color: p.color } : undefined}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {included.length > 0 && totalCents > 0 && (
            <p className="text-sm text-muted">
              = <span className="text-snow tabular-nums">{formatCents(perPerson)}</span> each
            </p>
          )}
        </div>
      );
    }

    case 'exact': {
      const total = splits.reduce((sum, s) => sum + s.value, 0);
      const remainder = totalCents - total;

      return (
        <div className="space-y-3">
          {PARTICIPANTS.map((p) => {
            const currentVal = getSplit(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm w-20 truncate" style={{ color: PARTICIPANT_MAP[p.id].color }}>
                  {p.name}
                </span>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentVal ? (currentVal / 100).toFixed(2) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) { updateSplit(p.id, 0); return; }
                      const parsed = parseFloat(val);
                      updateSplit(p.id, isNaN(parsed) ? 0 : Math.round(parsed * 100));
                    }}
                    className="w-full bg-bg-input border border-white/10 rounded-lg px-3 pl-7 py-2 text-sm text-snow tabular-nums focus:border-neon-pink/50 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            );
          })}
          <p className={`text-sm ${remainder === 0 ? 'text-neon-green' : 'text-neon-yellow'}`}>
            {remainder === 0
              ? 'Splits match total'
              : remainder > 0
                ? `${formatCents(remainder)} unassigned`
                : `${formatCents(-remainder)} over total`
            }
          </p>
        </div>
      );
    }

    case 'percentage': {
      const totalPct = splits.reduce((sum, s) => sum + s.value, 0);

      return (
        <div className="space-y-3">
          {PARTICIPANTS.map((p) => {
            const pct = getSplit(p.id);
            const dollarAmount = totalCents > 0 ? Math.round((totalCents * pct) / 100) : 0;

            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm w-20 truncate" style={{ color: PARTICIPANT_MAP[p.id].color }}>
                  {p.name}
                </span>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={pct || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) { updateSplit(p.id, 0); return; }
                      const parsed = parseInt(val, 10);
                      updateSplit(p.id, isNaN(parsed) ? 0 : parsed);
                    }}
                    className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-snow tabular-nums focus:border-neon-pink/50 outline-none"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                </div>
                {pct > 0 && (
                  <span className="text-xs text-muted tabular-nums w-16 text-right">
                    {formatCents(dollarAmount)}
                  </span>
                )}
              </div>
            );
          })}
          <p className={`text-sm ${totalPct === 100 ? 'text-neon-green' : 'text-neon-yellow'}`}>
            {totalPct === 100 ? 'Totals 100%' : `${totalPct}% of 100%`}
          </p>
        </div>
      );
    }

    case 'shares': {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);

      return (
        <div className="space-y-3">
          {PARTICIPANTS.map((p) => {
            const shares = getSplit(p.id);
            const dollarAmount = totalShares > 0 && totalCents > 0
              ? Math.round((totalCents * shares) / totalShares)
              : 0;

            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm w-20 truncate" style={{ color: PARTICIPANT_MAP[p.id].color }}>
                  {p.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSplit(p.id, Math.max(0, shares - 1))}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-snow flex items-center justify-center hover:bg-white/10 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">{shares}</span>
                  <button
                    type="button"
                    onClick={() => updateSplit(p.id, shares + 1)}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-snow flex items-center justify-center hover:bg-white/10 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {shares > 0 && totalShares > 0 && (
                  <span className="text-xs text-muted tabular-nums ml-auto">
                    {formatCents(dollarAmount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  }
}
