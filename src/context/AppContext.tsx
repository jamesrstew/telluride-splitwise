import { createContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import { appReducer, initialState, type AppAction } from './reducer';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import type { AppState } from '../types';
import { STORAGE_KEY, ACTIVE_USER_KEY } from '../constants';

export const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
  isConnected: boolean;
}>({
  state: initialState,
  dispatch: () => undefined,
  isConnected: false,
});

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const activeUser = localStorage.getItem(ACTIVE_USER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      expenses: parsed.expenses || [],
      payments: parsed.payments || [],
      activeUser: activeUser as AppState['activeUser'],
    };
  } catch {
    return initialState;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, loadState);
  const { isConnected, syncDispatch } = useFirebaseSync({ state, dispatch });

  // Persist data state to localStorage
  useEffect(() => {
    const payload = { expenses: state.expenses, payments: state.payments };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [state.expenses, state.payments]);

  // Persist active user separately
  useEffect(() => {
    if (state.activeUser) {
      localStorage.setItem(ACTIVE_USER_KEY, state.activeUser);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }, [state.activeUser]);

  return (
    <AppContext.Provider value={{ state, dispatch: syncDispatch, isConnected }}>
      {children}
    </AppContext.Provider>
  );
}
