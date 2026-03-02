import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useAppState() {
  const { state, dispatch, isConnected } = useContext(AppContext);
  return { state, dispatch, isConnected };
}
