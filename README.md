# Splitluride

**Shred now. Settle later.**

A purpose-built expense splitter for a 4-person ski trip to Telluride, CO. Think Splitwise, but with no accounts and an 80s retro ski aesthetic.

Deployed to GitHub Pages with Firebase Realtime Database for automatic cross-device sync. All data is also persisted in localStorage so the app works fully offline.

## Features

- **4 split types** -- Equal, exact amounts, percentage, and share-based splitting
- **Settlement optimization** -- Greedy algorithm minimizes the number of Venmo payments needed to settle up
- **Venmo deep links** -- One tap opens Venmo with the recipient, amount, and note pre-filled
- **Real-time sync** -- Firebase Realtime Database pushes changes to all connected devices within seconds. Green/red dot in the header shows connection status
- **URL-based sync (backup)** -- Compress and share the full app state via a URL in the group chat. Recipients can merge or replace their local data
- **Integer cent math** -- All financial calculations use integer cents with last-person-absorbs-penny rounding. 100 tests verify conservation of money across every split type and edge case
- **Offline-first** -- localStorage is the primary store. Firebase is additive. App works fully if the network is down

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router (HashRouter for GitHub Pages) |
| State | React Context + useReducer |
| Persistence | localStorage (offline-first) |
| Sync | Firebase Realtime Database |
| Sync (backup) | lz-string compressed URL fragments |
| Testing | Vitest (100 tests) |
| Hosting | GitHub Pages |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/telluride-splitwise/](http://localhost:5173/telluride-splitwise/) and pick your player.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm test` | Run all tests |
| `npm run deploy` | Build and deploy to GitHub Pages |

## Architecture

```
src/
  types.ts              # Expense, Payment, Split, AppState types
  constants.ts          # Participants, categories, storage keys
  context/
    reducer.ts          # 9 action types, pure state transitions
    AppContext.tsx       # Provider with localStorage + Firebase sync
  hooks/
    useAppState.ts      # Context consumer hook
    useFirebaseSync.ts  # Real-time sync with echo suppression
  utils/
    balances.ts         # Split calculation, net balances, pairwise debts
    settlement.ts       # Greedy debt simplification algorithm
    firebase.ts         # Firebase init, read/write, connection listener
    formatters.ts       # Currency formatting (cents <-> display)
    venmo.ts            # Deep link + web fallback URL generation
    urlState.ts         # lz-string encode/decode for URL sharing
    merge.ts            # Union merge by ID, latest-createdAt wins
    __tests__/          # 100 tests covering all financial math
  components/           # Reusable UI (ExpenseForm, SplitInput, etc.)
  pages/                # Route-level views (Dashboard, Expenses, etc.)
```

### Financial Integrity

All money is stored and calculated as integer cents to avoid floating-point errors. The `calculateExpenseSplits` function handles four split types with a remainder-absorption strategy that guarantees splits always sum exactly to the expense amount. The test suite verifies this invariant across 13 different dollar amounts, 4 split configurations, and both positive and negative (refund) expenses.

The settlement algorithm produces the minimum number of payment transactions by greedily matching the largest debtor to the largest creditor. Tests verify that executing the proposed transactions zeroes out all balances.

## How Sync Works

### Automatic (Firebase)

When anyone adds, edits, or deletes an expense, the full state is written to Firebase Realtime Database via `set()`. All other connected devices receive the update through `onValue` listeners within ~1 second. The first load uses a union merge (preserving offline edits); all subsequent updates are full replacements so deletes propagate correctly.

### Manual (URL backup)

1. Tap the share icon in the header
2. The full expense/payment state is serialized to JSON, compressed with lz-string, and encoded into a URL hash fragment
3. The URL is copied to your clipboard -- paste it in the group chat
4. When someone opens the link, the app extracts the shared state before React mounts (avoiding hash routing conflicts), then presents a merge dialog: **Replace**, **Merge** (union by ID, latest wins), or **Cancel**

The `activeUser` field is excluded from both sync methods so each person keeps their own identity.

## License

MIT
