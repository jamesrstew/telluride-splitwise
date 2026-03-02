import { PARTICIPANTS } from '../constants';
import { useAppState } from '../hooks/useAppState';

const SKI_EMOJIS = ['\u{1F3BF}', '\u{1F3C2}', '\u26F7\uFE0F', '\u{1F3D4}\uFE0F'];

export function PersonSelector() {
  const { dispatch } = useAppState();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden crt-overlay">
      <h1 className="font-retro text-neon-pink text-xs sm:text-sm mb-2 neon-text-pink tracking-wider">
        SELECT YOUR
      </h1>
      <h2 className="font-retro text-neon-cyan text-lg sm:text-xl mb-10 neon-text-cyan">
        PLAYER
      </h2>

      <div className="grid grid-cols-2 gap-4 w-full max-w-[340px]">
        {PARTICIPANTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_USER', userId: p.id })}
            className="
              relative flex flex-col items-center justify-center
              py-8 px-4 rounded-xl
              bg-bg-card border-2 border-transparent
              hover:border-current active:scale-95
              transition-all duration-200 cursor-pointer
              group
            "
            style={{
              color: p.color,
              '--glow-color': p.color,
            } as React.CSSProperties}
          >
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                boxShadow: `0 0 15px ${p.color}40, inset 0 0 15px ${p.color}10`,
              }}
            />
            <span className="text-4xl mb-3 relative z-10">{SKI_EMOJIS[i]}</span>
            <span className="font-retro text-[10px] sm:text-xs relative z-10 text-center leading-relaxed">
              {p.name.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-10 text-muted text-xs font-retro">
        PRESS START
      </p>
    </div>
  );
}
