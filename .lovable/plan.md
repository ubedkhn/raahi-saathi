

# Plan: Home Redesign, Driver Tab, Wallet Relocation

## 1. Home Section Redesign (`src/pages/Dashboard.tsx`)

Remove the entire `Tabs` component (Find a Ride / Offer a Ride tabs) and replace with:

- **Welcome header** (keep existing)
- **Search bar section**: A destination `LocationInput` field with the user's current location auto-filled as origin. Below it, a "Search" button that navigates to `/search-rides` with query params (origin coords + destination coords)
- **Nearby rides carousel** (keep existing map + cards)
- **Quick actions** (SOS, Admin - keep existing)

The search bar acts as a single entry point. No more dual tabs. Origin auto-fills from GPS, user types destination, taps search, lands on `/search-rides` pre-filled.

## 2. Bottom Nav: Replace Wallet with Driver (`src/components/BottomNav.tsx`)

Change nav items from:
`[Home, My Rides, (FAB), Wallet, Profile]`
to:
`[Home, My Rides, (FAB), Driver, Profile]`

The **Driver** tab navigates to a new `/driver` route.

## 3. New Driver Page (`src/pages/Driver.tsx`)

A dedicated driver hub with sections:
- **Post a Ride** card (links to `/post-ride`)
- **Rider Requests** card with badge showing open request count (links to `/driver-requests`)
- **Active Rides** list showing driver's scheduled/active rides with status badges
- **Notifications** section showing recent driver-relevant notifications (ride_booked, booking_accepted, etc.) with realtime subscription
- KYC status indicator if not verified

This consolidates the "Offer a Ride" tab content from Dashboard + driver-specific notifications.

## 4. Wallet Under Profile (`src/pages/Profile.tsx`)

Add a **Wallet** row in the Profile page (between Preferences and My Vehicles sections) that navigates to `/wallet`. The wallet page itself stays unchanged - it already has balance, transactions, and withdrawal.

Alternatively, add a tabbed layout to Profile: `[Profile, Wallet]` tabs at the top. But simpler approach: just add a prominent Wallet card/link in the Profile page since Wallet is already a full page.

## 5. Route Updates (`src/App.tsx`)

- Add `/driver` route pointing to new `Driver.tsx`
- Keep `/wallet` route (accessed from Profile now)

## Files to modify:
- `src/pages/Dashboard.tsx` - Remove tabs, add search bar
- `src/components/BottomNav.tsx` - Replace Wallet with Driver tab
- `src/pages/Driver.tsx` (NEW) - Driver hub page
- `src/pages/Profile.tsx` - Add Wallet navigation link
- `src/App.tsx` - Add `/driver` route

