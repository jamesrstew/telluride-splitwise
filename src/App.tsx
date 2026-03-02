import { HashRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import { PersonSelector } from './components/PersonSelector';
import { Layout } from './components/Layout';
import { MergeDialog } from './components/MergeDialog';
import { useAppState } from './hooks/useAppState';
import { decodeState } from './utils/urlState';
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { AddExpense } from './pages/AddExpense';
import { Balances } from './pages/Balances';
import { SettleUp } from './pages/SettleUp';
import type { Expense, Payment } from './types';

function AppRoutes() {
  const { state, dispatch } = useAppState();
  const [pendingMerge, setPendingMerge] = useState<{
    expenses: Expense[];
    payments: Payment[];
  } | null>(null);

  // Check for pending merge data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('splitluride-pending-merge');
    if (raw) {
      const decoded = decodeState(raw);
      if (decoded) {
        setPendingMerge({ expenses: decoded.expenses, payments: decoded.payments });
      }
      sessionStorage.removeItem('splitluride-pending-merge');
    }
  }, []);

  if (!state.activeUser) {
    return (
      <>
        <PersonSelector />
        {pendingMerge && (
          <MergeDialog
            incomingExpenses={pendingMerge.expenses}
            incomingPayments={pendingMerge.payments}
            onReplace={() => {
              dispatch({
                type: 'REPLACE_STATE',
                expenses: pendingMerge.expenses,
                payments: pendingMerge.payments,
              });
              setPendingMerge(null);
            }}
            onMerge={() => {
              dispatch({
                type: 'MERGE_STATE',
                expenses: pendingMerge.expenses,
                payments: pendingMerge.payments,
              });
              setPendingMerge(null);
            }}
            onCancel={() => setPendingMerge(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/add/:expenseId" element={<AddExpense />} />
          <Route path="/balances" element={<Balances />} />
          <Route path="/settle" element={<SettleUp />} />
        </Route>
      </Routes>
      {pendingMerge && (
        <MergeDialog
          incomingExpenses={pendingMerge.expenses}
          incomingPayments={pendingMerge.payments}
          onReplace={() => {
            dispatch({
              type: 'REPLACE_STATE',
              expenses: pendingMerge.expenses,
              payments: pendingMerge.payments,
            });
            setPendingMerge(null);
          }}
          onMerge={() => {
            dispatch({
              type: 'MERGE_STATE',
              expenses: pendingMerge.expenses,
              payments: pendingMerge.payments,
            });
            setPendingMerge(null);
          }}
          onCancel={() => setPendingMerge(null)}
        />
      )}
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
}
