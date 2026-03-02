import { useEffect, useRef, useCallback, useState, type Dispatch } from 'react';
import { writeState, subscribeToState, subscribeToConnection } from '../utils/firebase';
import type { AppAction } from '../context/reducer';
import type { AppState } from '../types';

type WriteSource = 'local' | 'initial' | null;

export function useFirebaseSync({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}) {
  const lastWriteSourceRef = useRef<WriteSource>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isFirstSnapshotRef = useRef(true);
  // Bug fix #1: Guard against the synchronous onValue echo that Firebase RTDB
  // fires inside set(). Without this, every local write triggers a spurious
  // REPLACE_STATE dispatch because onValue fires before writeState() returns.
  const isWritingRef = useRef(false);

  // Bug fix #6: Only tag actions that change expenses/payments as 'local'.
  // SET_ACTIVE_USER only touches activeUser (not synced), so tagging it would
  // leave the ref stuck at 'local' until the next state change.
  const syncDispatch = useCallback(
    (action: AppAction) => {
      if (action.type !== 'SET_ACTIVE_USER') {
        lastWriteSourceRef.current = 'local';
      }
      dispatch(action);
    },
    [dispatch],
  );

  // Subscribe to Firebase state changes
  useEffect(() => {
    isFirstSnapshotRef.current = true;

    const unsubState = subscribeToState((data) => {
      // Bug fix #1: Skip the synchronous echo fired by our own set() call.
      if (isWritingRef.current) return;

      if (isFirstSnapshotRef.current) {
        isFirstSnapshotRef.current = false;
        // Bug fix #3: Even if data has empty arrays (Firebase was brand new),
        // we still dispatch MERGE_STATE so the write effect fires and pushes
        // local data to Firebase. MERGE_STATE with empty incoming is a no-op
        // for the data but produces new array references, triggering the write.
        lastWriteSourceRef.current = 'initial';
        dispatch({
          type: 'MERGE_STATE',
          expenses: data.expenses,
          payments: data.payments,
        });
      } else {
        // Bug fix #2: REPLACE_STATE with empty arrays correctly propagates
        // "everything deleted" to other clients now that subscribeToState
        // delivers empty arrays instead of returning early on null.
        dispatch({
          type: 'REPLACE_STATE',
          expenses: data.expenses,
          payments: data.payments,
        });
      }
    });

    const unsubConn = subscribeToConnection(setIsConnected);

    return () => {
      unsubState();
      unsubConn();
    };
  }, [dispatch]);

  // Write to Firebase when state changes from local or initial sources
  useEffect(() => {
    const source = lastWriteSourceRef.current;
    if (source === 'local' || source === 'initial') {
      // Bug fix #1: Bracket the write so the synchronous onValue echo is
      // suppressed. Firebase RTDB fires local listeners synchronously inside
      // set(), so isWritingRef is true for the duration of that callback.
      try {
        isWritingRef.current = true;
        writeState(state.expenses, state.payments);
      } catch (err) {
        console.error('Firebase sync write failed:', err);
      } finally {
        isWritingRef.current = false;
        lastWriteSourceRef.current = null;
      }
    }
  }, [state.expenses, state.payments]);

  return { isConnected, syncDispatch };
}
