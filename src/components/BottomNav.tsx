import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/expenses', label: 'Expenses', icon: 'receipt' },
  { path: '/add', label: 'Add', icon: 'plus', isFab: true },
  { path: '/balances', label: 'Balances', icon: 'scale' },
  { path: '/settle', label: 'Settle', icon: 'handshake' },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? 'var(--color-neon-pink)' : 'var(--color-muted)';

  switch (icon) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'receipt':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="12" y2="16" />
        </svg>
      );
    case 'plus':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case 'scale':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" />
          <path d="M5 7l7-4 7 4" />
          <path d="M2 14l3-7 3 7" />
          <path d="M16 14l3-7 3 7" />
          <circle cx="5" cy="14" r="3" fill="none" />
          <circle cx="19" cy="14" r="3" fill="none" />
        </svg>
      );
    case 'handshake':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V8" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
          <circle cx="12" cy="5" r="3" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-white/5">
      <div className="max-w-[480px] mx-auto flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          if (item.isFab) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="
                  -mt-5 w-14 h-14 rounded-full bg-neon-pink
                  flex items-center justify-center
                  shadow-[0_0_20px_rgba(255,110,199,0.4)]
                  active:scale-90 transition-transform cursor-pointer
                  text-bg-primary
                "
              >
                <NavIcon icon={item.icon} active={false} />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center py-2 px-3 min-w-[56px] cursor-pointer bg-transparent border-none"
            >
              <NavIcon icon={item.icon} active={isActive} />
              <span className={`text-[10px] mt-1 ${isActive ? 'text-neon-pink' : 'text-muted'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
