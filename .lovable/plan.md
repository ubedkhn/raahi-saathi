

# Raahi - Notifications, Terms, Navigation, Offline & Security Improvements

## Important Constraints

**LinkedIn OAuth is NOT supported** on Lovable Cloud. Only Google and Apple are available as OAuth providers. This cannot be implemented in the current setup.

**The `.env` file cannot be manually edited** - it's auto-managed by Lovable Cloud. The project will continue using the current Lovable Cloud backend (`sjtccojgvhtyftkybyom`).

---

## 1. Push Notifications (Supabase Realtime + Persisted)

**Database migration:**
- Create a `notifications` table: `id`, `user_id`, `type` (enum: `booking_accepted`, `ride_booked`, `ride_cancelled`, `payment_received`, etc.), `title`, `message`, `read` (boolean, default false), `metadata` (jsonb), `created_at`
- Enable RLS: users can only read/update their own notifications
- Add to `supabase_realtime` publication

**New hook: `src/hooks/useNotifications.ts`**
- Query unread notifications count and list
- Subscribe to realtime INSERT events on `notifications` table for current user
- Show toast on new notification arrival
- Provide `markAsRead` and `markAllAsRead` mutations

**Trigger notifications server-side:**
- Create a database trigger function `notify_on_booking_status_change()` that inserts into `notifications` when:
  - A booking status changes to `accepted` → notify the rider
  - A new booking is inserted → notify the driver (ride owner)
  - A booking is cancelled → notify the other party

**UI changes:**
- Add a `Bell` icon with badge counter to the Header component (next to admin badge area)
- Create a `/notifications` page listing all notifications with read/unread state
- Add notification badge to BottomNav or Header

---

## 2. Terms & Conditions Page

**New file: `src/pages/Terms.tsx`**
- Styled page with sections: User Responsibilities, Driver Requirements, Payment Policies, Privacy, Dispute Resolution
- Professional layout using Card components and proper headings

**Route:** Add `/terms` as a public route in `App.tsx` (no layout wrapper needed)

**Auth page:** Already has the terms checkbox and link to `/terms` on both login and signup forms - just need the page to exist.

---

## 3. Back Navigation Fix

**Problem:** `navigate(-1)` in the Header can fail if there's no history (e.g., user lands directly on a deep link).

**Fix in `src/components/layout/Header.tsx`:**
- Check `window.history.length > 1` before calling `navigate(-1)`
- Fallback to `/dashboard` if no history exists
- This is already using `navigate(-1)` which respects browser history stack - the core behavior is correct

---

## 4. LinkedIn OAuth

**Not possible.** Lovable Cloud only supports Google and Apple as OAuth providers. LinkedIn is not supported and cannot be implemented. I will skip this task.

---

## 5. Offline Support (IndexedDB)

**Enhance `src/lib/queryClient.ts`:**
- Replace localStorage persistence with IndexedDB using a lightweight wrapper (manual `idb` calls via native IndexedDB API - no new dependency needed)
- Cache: profiles, rides, bookings, vehicles, notifications
- On query fetch failure (network error), serve from IndexedDB cache

**New utility: `src/lib/offlineQueue.ts`**
- Queue mutations (booking requests, cancellations) in IndexedDB when offline
- On reconnect (`navigator.onLine` event), replay queued mutations
- Show toast indicating offline mode and pending sync

**UI indicator:**
- Add an offline banner component that shows when `!navigator.onLine`

---

## 6. Frontend Code Protection / Server-side Validation

**Edge function: `supabase/functions/validate-booking/index.ts`**
- Validate booking creation server-side: check ride exists, seats available, user isn't already booked, fare calculation is correct
- Use service role to insert booking after validation
- Frontend calls this edge function instead of direct Supabase insert

**Edge function: `supabase/functions/validate-ride/index.ts`**
- Validate ride posting: check driver has verified vehicle, KYC status, valid data
- Insert ride server-side after validation

**Enhance existing `process-payment` edge function:**
- Ensure all payment amounts are recalculated server-side from booking/ride data
- Never trust client-sent amounts

**Frontend changes:**
- Update `PostRide.tsx` to call `validate-ride` edge function instead of direct insert
- Update booking flows to call `validate-booking` edge function
- Remove any client-side fare calculation that could be manipulated

---

## Technical Summary

```text
Database Changes:
  - CREATE TABLE notifications (with RLS)
  - CREATE FUNCTION notify_on_booking_status_change() + trigger
  - ALTER PUBLICATION supabase_realtime ADD TABLE notifications

New Files:
  - src/pages/Terms.tsx
  - src/hooks/useNotifications.ts
  - src/lib/offlineQueue.ts
  - src/components/common/OfflineBanner.tsx
  - supabase/functions/validate-booking/index.ts
  - supabase/functions/validate-ride/index.ts

Modified Files:
  - src/App.tsx (add /terms and /notifications routes)
  - src/components/layout/Header.tsx (notification bell + back nav fix)
  - src/components/BottomNav.tsx (optional notification indicator)
  - src/lib/queryClient.ts (IndexedDB persistence)
  - src/pages/PostRide.tsx (use validate-ride edge function)
  - src/pages/DriverRequests.tsx (use validate-booking edge function)
  - supabase/config.toml (edge function JWT settings)

NOT Implemented:
  - LinkedIn OAuth (not supported on Lovable Cloud)
```

