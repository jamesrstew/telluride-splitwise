# Splitluride — Product Requirements Document

**App Name:** Splitluride *(Splitwise + Telluride)*
**Tagline:** "Shred now. Settle later."
**Version:** 1.1
**Author:** James Stewart
**Date:** 2026-03-01
**Status:** Draft — Pending Approval

---

## 1. Overview

Splitluride is a purpose-built, mobile-first web app for splitting expenses from a guys' ski weekend in Telluride, CO. It replicates the core functionality of Splitwise — expense tracking, flexible splitting, balance calculation, and settlement optimization — without requiring user accounts or a traditional backend. It uses Firebase Realtime Database for automatic cross-device sync so all four participants see changes within seconds. It is designed for exactly four people, deployable to GitHub Pages, and built to be used once and used well.

### 1.1 Participants

| Name | Venmo Handle |
|------|-------------|
| James | @jamesrstewart |
| Kyle | @KyleLarson4 |
| Dylan | @Dylan-Christopher-1 |
| John Ross | @johnrosshicks |

### 1.2 Design Principles

1. **Mobile-first** — Designed for use on phones at the bar, on the gondola, or in the Airbnb. Touch targets, swipe gestures, and a layout that works on a 375px screen.
2. **Zero friction** — No sign-up, no login, no app install. Open the URL, pick your name, start logging expenses.
3. **Opinionated defaults** — "Split equally among everyone" is one tap. The 80% use case should take 5 seconds.
4. **Transparent math** — Every balance should be traceable back to the individual expenses that created it. No black-box totals.
5. **Retro ski weekend vibes** — The UI channels 1980s ski culture: neon colors, retro typography, VHS-era aesthetics, and the spirit of vintage Telluride. Think *Hot Dog... The Movie* meets *Better Off Dead*. This isn't enterprise accounting software — it's a rad time.

---

## 2. Architecture & Data Strategy

### 2.1 Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React (via Vite) | Fast build, excellent DX, lightweight output for GitHub Pages |
| Styling | Tailwind CSS | Utility-first, mobile-responsive, fast iteration |
| State | React Context + useReducer | Sufficient for 4 users and ~50 expenses. No Redux overhead needed. |
| Persistence | localStorage | Offline-first local store. Survives browser refresh. App works fully without network. |
| Sync | Firebase Realtime Database | Auto-sync across all devices within seconds. No manual sharing needed. |
| Sync (backup) | URL hash (lz-string compressed) | "Share" button serializes state into a compressed URL for manual sharing via group chat. |
| Hosting | GitHub Pages | Free, static, one-command deploy. |
| Build | Vite | Fast builds, tree-shaking, optimized output. |

### 2.2 Data Model

```typescript
interface Expense {
  id: string;                    // UUID
  description: string;           // "Lift tickets Day 1"
  amount: number;                // Total amount in USD (cents stored as integer)
  paidBy: ParticipantId;         // Who fronted the cost
  category: Category;            // See §3.3
  splitType: SplitType;          // 'equal' | 'exact' | 'percentage' | 'shares'
  splits: Split[];               // How the expense is divided
  date: string;                  // ISO date string
  notes?: string;                // Optional memo
  createdAt: string;             // ISO timestamp
}

interface Split {
  participantId: ParticipantId;
  value: number;                 // Interpretation depends on splitType:
                                 //   equal: 1 (included) or 0 (excluded)
                                 //   exact: dollar amount owed
                                 //   percentage: % of total (must sum to 100)
                                 //   shares: number of shares (e.g., 2 = double share)
}

interface Payment {
  id: string;
  fromId: ParticipantId;         // Who is paying
  toId: ParticipantId;           // Who is receiving
  amount: number;                // Amount in USD (cents)
  date: string;
  notes?: string;
  settled: boolean;              // Marked as paid via Venmo
}

type ParticipantId = 'james' | 'kyle' | 'dylan' | 'john-ross';
type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';
type Category = 'lodging' | 'lift-tickets' | 'nicotine' | 'food-dining'
              | 'groceries' | 'drinks-apres' | 'transportation' | 'gas'
              | 'activities' | 'tips' | 'other';

interface AppState {
  expenses: Expense[];
  payments: Payment[];           // Manual settlement payments recorded
  activeUser: ParticipantId;     // Current "logged in" user (selected via switcher)
}
```

### 2.3 Data Sync — Firebase Realtime Database

**Offline-first architecture:** All expense data is persisted in `localStorage` under a namespaced key (`splitluride-state`). The app works fully offline. Firebase Realtime Database provides automatic cross-device sync as an additive layer — if Firebase is unavailable, the app degrades gracefully to local-only mode.

**Firebase sync flow:**
1. User A adds/edits/deletes an expense on their phone → state saves to localStorage immediately.
2. The `useFirebaseSync` hook detects the local state change and writes the full state to Firebase via `set()`.
3. All other connected devices receive the update via `onValue` listeners within ~1 second.
4. On those devices, the incoming state replaces the local state via `REPLACE_STATE` dispatch.
5. A green/red dot in the header indicates real-time connection status.

**Initial load (merge):** The first Firebase snapshot uses `MERGE_STATE` — a union merge by expense `id` where the later `createdAt` wins. This preserves any offline edits made before reconnecting.

**Subsequent updates (replace):** All updates after the initial load use `REPLACE_STATE` so that deletes propagate correctly across devices.

**Echo loop prevention:** A `isWritingRef` flag suppresses the synchronous `onValue` callback that Firebase RTDB fires inside `set()`, preventing write → echo → write loops.

**Firebase project configuration:**
- **Project:** `splitluride` (Firebase Realtime Database)
- **Database path:** `/splitluride` — all state stored under this single node
- **Security rules:** `{ "rules": { "splitluride": { ".read": true, ".write": true } } }` — public read/write scoped to the app path. No auth required (trusted friend group, temporary trip app).
- **Data format:** Expenses and payments stored as `{ [id]: item }` maps (Firebase doesn't support arrays). Converted to/from arrays via `toFirebaseMap` / `fromFirebaseMap` helpers.
- **Config in source:** Firebase web configs are public identifiers (not secrets), safe to commit.

**Backup sync — Shareable URL:**

The URL share flow remains as a fallback. A "Share" button serializes the full `AppState` to JSON, compresses it with `lz-string`, and encodes it as a URL hash fragment:

```
https://<user>.github.io/splitluride/#s=eJzLSM3JyVEoSyzI...
```

When a recipient opens a shared URL, a merge dialog prompts: "Replace local data?" or "Merge?" — union merge by expense `id`, latest `createdAt` wins. This is useful when Firebase is unavailable or for sharing with someone who hasn't opened the app yet.

**Capacity estimate:** With 4 users and ~50 expenses, the Firebase payload is ~20KB — well within Realtime Database limits. The compressed URL backup is ~4-6KB.

---

## 3. Features

### 3.1 Person Switcher (Pseudo-Auth)

Since there are no user accounts, the app needs a lightweight way to know "who is using the app right now." This affects the dashboard view (what you owe vs. what you're owed) and defaults for "Paid by."

**Implementation:**
- On first visit (no localStorage state), a full-screen selector shows four avatar cards: James, Kyle, Dylan, John Ross.
- Selecting a person sets `activeUser` and navigates to the dashboard.
- A persistent avatar/name chip in the header allows switching users at any time via a dropdown.
- The active user is stored in localStorage separately from expense data (key: `splitluride-active-user`).
- Switching users does NOT change any expense data — it only changes the perspective of the dashboard and defaults.

**Visual design:** Each person gets a distinct neon color and a retro ski-themed avatar/icon (e.g., 80s ski goggles, retro helmet, neon ski suit silhouette). The first-visit selector is styled like an 80s arcade character select screen — four glowing cards with names in retro font, pulsing neon borders on hover/tap. Colors carry through the entire app for at-a-glance identification.

### 3.2 Dashboard (Home Screen)

The dashboard is the landing page after selecting a user. It provides an at-a-glance summary of the active user's financial position.

**Layout (mobile, top to bottom):**

1. **Header bar** — App logo ("Splitluride", tappable to navigate home), active user chip (tappable to switch), share icon with green/red sync status dot.
2. **Balance hero card** — Large, prominent display:
   - Net balance: "You owe $142.50" (red) or "You are owed $87.00" (green) or "You're all settled up" (neutral).
   - Breakdown below: individual balances with each other person (e.g., "You owe Kyle $50.00", "Dylan owes you $12.50").
3. **Quick actions row** — Two primary CTAs:
   - **"Add Expense"** button (primary, prominent).
   - **"Settle Up"** button (secondary).
4. **Recent activity feed** — Chronological list of recent expenses and payments:
   - Each row: icon (category), description, amount, who paid, date.
   - Tappable to view/edit details.
   - "See all" link to full expense list.
5. **Trip total summary** — Small card at bottom:
   - Total trip spend across all people.
   - Per-person average.
   - Biggest expense.

### 3.3 Add Expense

The core flow. Optimized for speed — the common case (equal split among all four) should take <10 seconds.

**Form fields:**

| Field | Type | Default | Required |
|-------|------|---------|----------|
| Description | Text input | — | Yes |
| Amount | Currency input ($) | — | Yes |
| Paid by | Person selector (4 avatars) | Active user | Yes |
| Category | Icon grid picker | Other | No |
| Split type | Segmented control | Equal | Yes |
| Split details | Dynamic (see below) | All 4 people, equal | Yes |
| Date | Date picker | Today | Yes |
| Notes | Text area | — | No |

**Split type details:**

- **Equal:** Toggle chips for each person (on/off). Default: all 4 on. Shows calculated per-person amount live. Supports "split among 2 of 4" etc.
- **Exact amounts:** Number input per person. Running total shown with validation (must equal expense amount). Remainder calculator helps.
- **Percentage:** Percentage input per person. Must sum to 100%. Live dollar equivalent shown.
- **Shares:** Integer input per person (default: 1 each). Useful for "John Ross had 2 beers, everyone else had 1" scenarios. Shows calculated amounts.

**Validation:**
- Amount must be > $0.
- At least one person must be included in the split.
- For exact: split amounts must sum to the expense total (with ±$0.01 tolerance for rounding).
- For percentage: must sum to 100%.
- Description is required (but can be short — "beer" is fine).

**After saving:** Return to dashboard with a brief toast confirmation ("$240 for Lift Tickets added"). The new expense appears at the top of the activity feed.

**Categories with icons:**

| Category | Icon | Example Expenses |
|----------|------|-----------------|
| Lodging | 🏠 | Airbnb, hotel |
| Lift Tickets | 🎿 | Day passes, multi-day |
| Nicotine Addiction | 🚬 | Zyn, vapes, cigarettes, dip |
| Food & Dining | 🍕 | Restaurants, delivery |
| Groceries | 🛒 | Cabin food, snacks |
| Drinks & Après | 🍺 | Bars, après-ski |
| Transportation | 🚗 | Uber, shuttle |
| Gas | ⛽ | Road trip fuel |
| Activities | 🎯 | Non-ski activities |
| Tips | 💵 | Service tips |
| Other | 📦 | Anything else |

### 3.4 Expense List & Detail

**Expense list view:**
- Filterable by category (horizontal scrollable chip bar) and by person (who paid).
- Sortable by date (default: newest first) or amount.
- Each row: category icon, description, total amount, paid by (avatar), date.
- Swipe-left to delete (with confirmation).
- Tap to open detail/edit view.

**Expense detail view:**
- Full expense info: description, amount, paid by, date, category, notes.
- Split breakdown: visual bar showing each person's share with dollar amounts.
- Edit button → opens the Add Expense form pre-populated.
- Delete button (with confirmation dialog).

### 3.5 Balances View

A dedicated tab/view showing the complete financial picture for the group.

**Pairwise balance matrix:**
- A clean visualization showing who owes whom and how much.
- Each pair: "Kyle owes James $47.50" with directional arrow.
- Only show pairs with non-zero balances.
- Color coded: red for debts, green for credits, gray for settled.

**Per-person summary cards:**
- For each of the 4 people: total paid, total share owed, net position.
- Visual indicator: net creditor (green, up arrow) or net debtor (red, down arrow).

**Expense drill-down:**
- Tapping any pairwise balance shows the list of expenses that contribute to it.
- Full transparency: "Kyle owes James $47.50 because: James paid $120 for Airbnb (Kyle's share: $30), James paid $70 for groceries (Kyle's share: $17.50)…"

### 3.6 Settle Up — Settlement Engine

The most important feature after expense tracking. Two modes:

#### 3.6.1 Optimized Settlement (Netting)

Uses a minimum-transactions algorithm to determine the fewest possible payments to settle all debts.

**Algorithm:** Classic debt simplification:
1. Calculate each person's net balance (total paid - total owed).
2. Separate into creditors (positive balance) and debtors (negative balance).
3. Greedily match the largest debtor with the largest creditor, settling up to the minimum of the two amounts.
4. Repeat until all balances are zero.

**Example output:**
> To settle up in the fewest payments:
> 1. Dylan pays James $142.50 → **[Pay with Venmo]**
> 2. Kyle pays John Ross $67.00 → **[Pay with Venmo]**
>
> *2 payments to settle everything.*

**Venmo deep links:** Each "Pay with Venmo" button opens:
```
venmo://paycharge?txn=pay&recipients=<handle>&amount=<amount>&note=Splitluride%20-%20Telluride%20ski%20trip
```
Falls back to `https://venmo.com/<handle>` on desktop or if the app isn't installed.

#### 3.6.2 Non-Optimized Settlement (Direct Debts)

Shows every individual pairwise debt without netting. More payments, but easier to understand and trace.

**Example output:**
> All individual debts:
> 1. Dylan pays James $85.00 → **[Pay with Venmo]**
> 2. Dylan pays Kyle $32.50 → **[Pay with Venmo]**
> 3. Kyle pays James $57.50 → **[Pay with Venmo]**
> 4. John Ross pays James $67.00 → **[Pay with Venmo]**
>
> *4 payments total.*

#### 3.6.3 Toggle & Comparison

A toggle switch at the top of the Settle Up screen lets users flip between "Simplified" (netted) and "Full" (non-netted) views. A small info tooltip explains the difference.

#### 3.6.4 Recording Settlements

When someone makes a Venmo payment:
1. Tap "Mark as Paid" next to the settlement row.
2. Optionally enter the Venmo transaction date.
3. The payment is recorded in `AppState.payments`.
4. The corresponding balance is updated.
5. Dashboard reflects the new balances.

Settlements can be un-marked if recorded in error.

### 3.7 Activity Log

A chronological feed of all actions in the app:
- Expense added/edited/deleted.
- Settlement recorded/un-recorded.
- Shows who performed the action, what changed, and when.
- Serves as an audit trail for transparency (avoids "who added that $500 expense?" disputes).

### 3.8 Real-Time Sync

**Automatic sync (Firebase):**
- When any user adds, edits, or deletes an expense or payment, all connected devices receive the update automatically within ~1 second.
- A green dot on the share button indicates an active Firebase connection. A red dot indicates the device is offline (local changes will sync when reconnected).
- No user action required — sync is fully transparent.

**Manual share button (header, backup):**
1. Serializes current `AppState` to JSON.
2. Compresses with lz-string.
3. Encodes as URL hash fragment.
4. Copies the full URL to clipboard.
5. Shows toast: "Link copied! Paste it in the group chat."

**Loading shared state (on URL open):**
1. App detects `#s=` parameter in URL hash.
2. Decodes and decompresses the state.
3. Compares with local state (if any).
4. Shows a merge dialog:
   - "Replace local data" — overwrites localStorage with URL state.
   - "Merge" — union merge by expense ID, latest-wins on conflicts.
   - "Cancel" — ignore URL state, keep local.
5. After merge, clears the hash from the URL (clean address bar).
6. Merged state is automatically pushed to Firebase for other devices.

---

## 4. Navigation & Information Architecture

Mobile-first bottom tab navigation:

| Tab | Icon | Label | Content |
|-----|------|-------|---------|
| 1 | Home icon | Dashboard | Balance hero, quick actions, recent activity (§3.2) |
| 2 | Receipt icon | Expenses | Full expense list with filters (§3.4) |
| 3 | + (FAB) | Add | Floating action button, always visible. Opens Add Expense (§3.3) |
| 4 | Scale icon | Balances | Pairwise balances and per-person summaries (§3.5) |
| 5 | Handshake icon | Settle Up | Settlement calculator with Venmo links (§3.6) |

The "Add Expense" button is elevated as a floating action button (FAB) centered in the bottom nav for maximum accessibility — this is the action users will perform most.

---

## 5. Visual Design & Theming

### 5.1 Design Language — "Retro Ski Lodge"

The visual identity blends 1980s ski culture with retro computing aesthetics. Think neon-on-dark, CRT glow, vintage ski poster typography, and the bold color blocking of 80s sportswear.

- **Palette:** Dark base with neon accents. Jet black (#0a0a0a) and deep charcoal (#1a1a2e) backgrounds. Neon pink/magenta (#ff6ec7) as the primary accent. Electric cyan (#00fff7) for secondary actions and positive balances. Hot yellow (#ffe66d) for warnings. Neon red (#ff3366) for debts. Snow white (#f0f0f0) for body text.
- **Typography:** Retro display font for headers (e.g., "Press Start 2P" or "Orbitron" from Google Fonts — pixelated/geometric, evokes 80s arcade). Clean sans-serif (Inter or system stack) for body text and dollar amounts to maintain legibility. Large, bold dollar amounts with a subtle neon text-shadow glow.
- **Cards:** Dark translucent cards with neon border accents (1px solid with glow via box-shadow). Slight frosted glass (backdrop-blur) layered over a subtle mountain/snow background texture.
- **Background:** Subtle gradient from dark navy to near-black, with a faint retro mountain range silhouette or geometric ski pattern (triangles/diamonds like 80s sweater knit patterns) as a fixed background.
- **Participant colors:** Each person gets a distinct neon color, consistent throughout:
  - James: Neon Blue (#4cc9f0)
  - Kyle: Neon Orange (#ff9e00)
  - Dylan: Neon Green (#39ff14)
  - John Ross: Neon Purple (#bf5af2)
- **Iconography:** Category icons use a retro/pixel style or bold line-art style. The app logo "Splitluride" uses a stylized 80s wordmark — think chrome/gradient text, angled italic, or vintage ski poster lettering.
- **Micro-interactions:** Neon flicker/pulse on balance changes. Retro "cha-ching" feel on expense additions. Subtle CRT scanline overlay on hero cards (CSS-only, very faint).
- **Dark mode only:** Neon-on-dark requires a dark background to pop. Also practical — ski trips mean bright snow and sun, so a dark UI reduces glare.
- **Easter eggs:** The person selector on first load could evoke an 80s character select screen (think *Street Fighter* or *Rad Racer*). Toast notifications could use retro phrasing ("Gnarly! Expense added." / "Bogus! Something went wrong.").

### 5.2 Responsive Behavior

- **Primary target:** 375px - 430px (iPhone). All designs start here.
- **Tablet/desktop:** Content maxes out at 480px centered, with generous padding. This is a phone app that happens to work on bigger screens.

---

## 6. Edge Cases & Business Rules

| Scenario | Handling |
|----------|----------|
| Expense split doesn't sum to total (exact mode) | Block save. Show remaining amount: "You have $12.50 unassigned." |
| Rounding errors on equal splits | Last person absorbs the penny. $100 / 3 = $33.33, $33.33, $33.34. |
| Expense paid by someone not in the split | Allowed. E.g., James pays $100 for lift tickets for Kyle and Dylan only. |
| All expenses deleted | Dashboard shows $0 balances. Settle Up shows "Nothing to settle!" |
| localStorage cleared/new browser | App starts fresh. Firebase initial sync merges remote state into the empty local state, restoring all data automatically. Shared URL is a manual fallback. |
| Firebase unavailable / offline | App works fully from localStorage. Red dot in header indicates offline status. Changes sync automatically when connectivity is restored. |
| Two users edit simultaneously | Last write wins (full-state `set()`). With 4 users and infrequent edits, conflicts are extremely unlikely. Both edits would be <1s apart and the later one overwrites. |
| Firebase DB empty (first load) | Initial `onValue` returns null. Local state is pushed to Firebase, seeding the database for other devices. |
| URL state is corrupt/invalid | Show error toast: "Couldn't load shared data. Ask the person to re-share." Fall back to local state. |
| Someone overpays via Venmo | Not tracked. The app records the intended amount. Overpayments are between friends. |
| Editing an expense after partial settlement | Allowed, but a warning is shown: "Changing this expense will affect settled balances." Settlement records are NOT auto-adjusted — manual reconciliation is expected. |
| Negative expense (refund) | Supported. Enter a negative amount. This credits the payer's balance. |
| $0 expense | Blocked. Must be non-zero. |

---

## 7. Technical Implementation Notes

### 7.1 Venmo Deep Links

```typescript
const VENMO_HANDLES: Record<ParticipantId, string> = {
  'james': 'jamesrstewart',
  'kyle': 'KyleLarson4',
  'dylan': 'Dylan-Christopher-1',
  'john-ross': 'johnrosshicks',
};

function getVenmoPayLink(toId: ParticipantId, amount: number, note: string): string {
  const handle = VENMO_HANDLES[toId];
  const encodedNote = encodeURIComponent(note);
  // Mobile deep link (opens Venmo app)
  return `venmo://paycharge?txn=pay&recipients=${handle}&amount=${(amount / 100).toFixed(2)}&note=${encodedNote}`;
}

function getVenmoFallbackLink(toId: ParticipantId): string {
  return `https://venmo.com/${VENMO_HANDLES[toId]}`;
}
```

### 7.2 Settlement Algorithm (Netting)

```
function simplifyDebts(balances: Map<ParticipantId, number>): Transaction[] {
  // balances: positive = owed money (creditor), negative = owes money (debtor)
  const creditors = [...balances].filter(([_, b]) => b > 0).sort((a, b) => b[1] - a[1]);
  const debtors = [...balances].filter(([_, b]) => b < 0).sort((a, b) => a[1] - b[1]);
  const transactions: Transaction[] = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i][1], creditors[j][1]);
    transactions.push({ from: debtors[i][0], to: creditors[j][0], amount });
    debtors[i][1] += amount;
    creditors[j][1] -= amount;
    if (debtors[i][1] === 0) i++;
    if (creditors[j][1] === 0) j++;
  }

  return transactions;
}
```

### 7.3 Firebase Realtime Sync

```typescript
// src/utils/firebase.ts — Core sync primitives
writeState(expenses, payments)     // set() full state to /splitluride
subscribeToState(callback)         // onValue listener, returns unsubscribe
subscribeToConnection(callback)    // .info/connected listener for online indicator

// src/hooks/useFirebaseSync.ts — React integration
useFirebaseSync({ state, dispatch })  // returns { isConnected, syncDispatch }
```

**Key implementation details:**

- **Full-state writes:** `writeState()` calls `set()` with the entire expenses + payments state. No granular updates needed for 4 users / ~50 expenses.
- **Array ↔ Map conversion:** Firebase doesn't support arrays. `toFirebaseMap()` converts `items[]` to `{ [id]: item }` for storage; `fromFirebaseMap()` converts back and sorts by `createdAt` descending to preserve chronological ordering.
- **`undefined` stripping:** Firebase `set()` throws synchronously on `undefined` values. A `stripUndefined()` helper (JSON round-trip) removes optional fields like `notes?: string` before writing.
- **Echo suppression:** `isWritingRef` flag brackets the `set()` call. Firebase fires `onValue` synchronously inside `set()` (local optimistic update); the flag prevents this echo from dispatching a redundant `REPLACE_STATE`.
- **Error resilience:** `writeState()` is wrapped in try/catch/finally so synchronous Firebase errors (validation, auth) don't crash the React component tree.
- **Empty state sentinel:** When both arrays are empty, a `_empty: true` key is written to prevent Firebase from stripping the node to `null` (which would make delete-all invisible to other clients).

### 7.4 URL State Compression (Backup Sync)

```typescript
import lzString from 'lz-string';

function encodeState(state: AppState): string {
  const json = JSON.stringify(state);
  return lzString.compressToEncodedURIComponent(json);
}

function decodeState(hash: string): AppState | null {
  try {
    const json = lzString.decompressFromEncodedURIComponent(hash);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}
```

### 7.5 GitHub Pages Deployment

```bash
# vite.config.ts — set base path for GitHub Pages
export default defineConfig({
  base: '/telluride-splitwise/',  // matches GitHub repo name
  // ...
});

# Deploy via gh-pages package or GitHub Actions
npm run build && npx gh-pages -d dist
```

---

## 8. Out of Scope (v1)

These are explicitly **not** included to keep scope tight:

- User authentication / accounts (Firebase rules are open for the trusted friend group)
- Multiple trip support (this is a one-trip app)
- Receipt photo upload / OCR
- Currency conversion (USD only)
- Recurring expenses
- Group management (fixed at 4 people)
- Push notifications
- Service worker / PWA install
- Export to CSV/PDF (could be a fast follow if desired)
- Conflict resolution UI (last-write-wins via full-state `set()` is sufficient for 4 users)

---

## 9. Success Criteria

This app is successful if:

1. All four participants can view accurate, up-to-date balances on their own devices — synced automatically, no manual sharing needed.
2. Settlement amounts are correct and traceable to individual expenses.
3. Venmo payments can be initiated directly from the app with pre-filled amounts.
4. The total time from "I need to log this expense" to "done" is under 15 seconds for an equal-split expense.
5. Changes made on one phone appear on all other phones within a few seconds.
6. No one says "let's just use Splitwise instead."

---

## 10. Resolved Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Custom domain or `<username>.github.io/splitluride/`? | **GitHub Pages default** — `<username>.github.io/telluride-splitwise/` (repo name). No custom domain. |
| 2 | Any additional people who might join the trip? | **No.** Fixed at 4 participants. No need for dynamic group management. |
| 3 | Should "Splitluride" be the final name? | **Yes.** Splitluride is confirmed. |
| 4 | How should data sync across devices? | **Firebase Realtime Database** (v1.1). Simplest option for small data with real-time `onValue` listeners. Offline-first — localStorage remains primary, Firebase is additive. URL share retained as backup. |
| 5 | Firebase auth required? | **No.** Public read/write rules scoped to `/splitluride`. Trusted friend group, temporary trip app. Firebase web config is a public identifier, safe to commit. |

---

*This PRD was crafted for a one-time, purpose-built ski trip expense splitter. It prioritizes speed, simplicity, and fun over enterprise durability. Ship it before the snow melts.* 🏔️
