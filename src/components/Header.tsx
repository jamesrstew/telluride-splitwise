import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useToast } from './Toast';
import { PARTICIPANTS, PARTICIPANT_MAP } from '../constants';
import { getShareUrl } from '../utils/urlState';
import type { ParticipantId } from '../types';

export function Header() {
  const { state, dispatch } = useAppState();
  const showToast = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = state.activeUser ? PARTICIPANT_MAP[state.activeUser] : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleShare() {
    const url = getShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied! Paste it in the group chat.', 'info');
    } catch {
      showToast('Could not copy link', 'error');
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-bg-primary/90 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="font-display font-black text-xl text-neon-pink neon-text-pink tracking-wide">
          Splitluride
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-snow cursor-pointer"
            aria-label="Share"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                style={{ color: user.color }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: user.color + '22' }}>
                  {user.name[0]}
                </span>
                <span className="text-sm font-medium">{user.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-bg-card border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[160px]">
                  {PARTICIPANTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        dispatch({ type: 'SET_ACTIVE_USER', userId: p.id as ParticipantId });
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
                      style={{ color: p.color }}
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: p.color + '22' }}>
                        {p.name[0]}
                      </span>
                      <span className="text-sm">{p.name}</span>
                      {p.id === state.activeUser && (
                        <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
