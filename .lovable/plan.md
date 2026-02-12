

# Raahi MVP Refinement -- My Rides Tabs, Wallet Cleanup, KYC Realtime, Active Ride Chat

## Summary

4 changes in one batch: restructure My Rides tabs to Upcoming/Active/History, add active ride detail with location sharing + call + quick-text chat, remove "Total Spent" from Wallet and inline transaction history, and wire KYC approval to instantly notify users via realtime.

---

## 1. My Rides Tab Restructure

**File: `src/pages/RecentRides.tsx`**

Current tabs: Upcoming | Completed | Cancelled

New tabs: **Upcoming | Active | History**

- **Upcoming**: bookings with status `pending`, `confirmed`, `scheduled` + rides with `scheduled`
- **Active**: bookings with status `accepted`, `driver_arriving`, `driver_arrived`, `in_progress` + rides with `active`
- **History**: bookings with status `completed` or `cancelled` + rides with `completed` or `cancelled`

Active ride cards become tappable -- clicking navigates to `/manage-ride/:bookingId` (already exists and has call, OTP, cancel logic). For driver rides without a booking, tapping shows the ride detail.

---

## 2. Active Ride Detail Enhancements

**File: `src/pages/ManageRide.tsx`**

Add 3 features to the existing manage ride page:

### 2A. Share Current Location Button
- Add a "Share Location" button that gets `navigator.geolocation.getCurrentPosition()` and opens `https://www.google.com/maps?q={lat},{lng}` in a new tab
- Visible when booking status is `accepted`, `driver_arrived`, or `in_progress`

### 2B. Quick-Text Chat
- Add a collapsible chat section below the contact info card
- 3 pre-written quick-text buttons: "I'm arriving", "Please wait", "Where are you?"
- Uses a new `ride_messages` table (needs DB migration) with columns: `id`, `booking_id`, `sender_id`, `message`, `created_at`
- Realtime subscription shows messages instantly
- Simple message list with sender name and timestamp

### 2C. Database Migration
Create `ride_messages` table:
```text
- id: uuid PK default gen_random_uuid()
- booking_id: uuid FK -> bookings(id) NOT NULL
- sender_id: uuid NOT NULL
- message: text NOT NULL
- created_at: timestamptz default now()
```

RLS policies:
- SELECT: user is rider or driver on the booking (via `is_ride_participant` check on the booking's ride_id)
- INSERT: same check, sender_id must equal auth.uid()

Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;`

---

## 3. Wallet Changes

**File: `src/pages/Wallet.tsx`**

- Remove the "Total Spent" card entirely (keep only Wallet Balance + Total Earned as 2-column grid)
- Add inline Transaction History section below the action cards (move logic from Passbook.tsx into Wallet.tsx)
- Show last 20 transactions with date, amount, type (credit/debit), and color coding (green/red)
- Keep the Passbook page as a "View All" link for the full table

---

## 4. KYC Approval Realtime Notification

**File: `src/hooks/useProfile.ts`** -- already has realtime subscription on profiles table. When `kyc_status` changes to `verified`, we need to show a toast.

**File: `src/hooks/useProfile.ts`**
- In the realtime callback, detect when `payload.new.kyc_status === 'verified'` and `payload.old?.kyc_status !== 'verified'`
- Import and call `toast` from sonner to show: "KYC Approved! You can now post rides."

**File: `src/pages/admin/KYCVerification.tsx`** -- already moves cards from Pending to Verified via local state update (instant). No changes needed -- it already works.

---

## Technical Details

### Files Modified
```text
src/pages/RecentRides.tsx        -- Restructure tabs: Upcoming/Active/History
src/pages/ManageRide.tsx         -- Add Share Location button + quick-text chat UI
src/pages/Wallet.tsx             -- Remove Total Spent, add inline transaction list
src/hooks/useProfile.ts          -- Add toast on KYC approval via realtime
```

### Database Migration
```text
1. CREATE TABLE ride_messages (id, booking_id, sender_id, message, created_at)
2. RLS: SELECT/INSERT for ride participants only
3. Enable realtime on ride_messages
```

### No New Dependencies
- Google Maps link uses native URL (no SDK needed)
- Chat uses existing Supabase realtime pattern (same as support_messages)
- Toast uses existing sonner import

### Risks / Edge Cases
- `ride_messages` table doesn't exist yet -- migration required before chat works
- The `is_ride_participant` function checks rides/bookings tables -- we'll use it for RLS on ride_messages
- Share Location requires geolocation permission (already requested elsewhere in the app)

