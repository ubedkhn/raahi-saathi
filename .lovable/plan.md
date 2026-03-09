

# Raahi -- Ride Flow Fixes, Cancel Button, Auto-Expire, Auth Page Cleanup

## Summary

8 changes across 4 files plus 1 database function: fix active panel sync by auto-accepting bookings created from DriverRequests, add rider cancel button in Upcoming tab, create a database function to auto-expire old ride requests, clean up Auth page text/checkbox, and wire Google OAuth properly via Lovable Cloud.

---

## 1. Active Panel Sync Fix

**File: `src/pages/DriverRequests.tsx`**

**Problem:** When a driver accepts a rider request, the booking is created with `status: "pending"`. The OTP trigger only fires when status changes from `pending` to `accepted`. Since the driver created this booking on behalf of the rider, it should be immediately accepted.

**Fix:** Change the booking insert status from `"pending"` to `"accepted"` in `handleAcceptRequest`. This triggers the OTP trigger on the database side (the trigger fires on UPDATE, so we need a two-step approach: insert as pending, then immediately update to accepted).

Actually, since the trigger is a BEFORE UPDATE trigger that checks `NEW.status = 'accepted' AND OLD.status = 'pending'`, we need to:
1. Insert booking with `status: "pending"` (current behavior -- keep this)
2. Immediately update the booking to `status: "accepted"` after insert

This two-step approach fires the OTP trigger correctly. Add this right after the booking insert succeeds and before the ride_request status update.

Also update the ride status from `"scheduled"` to `"active"` so it appears in the Active tab for the driver.

**File: `src/hooks/useRides.ts`**

Add realtime subscriptions to `useMyBookings` and `useMyRides` so both rider and driver see changes instantly. Use `queryClient.invalidateQueries` on realtime events for bookings and rides tables.

---

## 2. OTP Delivery

**Status:** Already implemented. The OTP trigger generates OTP on status change to `accepted`. ManageRide already shows OTP for rider in `accepted`, `driver_arriving`, `driver_arrived` statuses with toast notification. The fix in section 1 (auto-accepting the booking) ensures the OTP is generated when the driver accepts a request from DriverRequests.

No additional changes needed.

---

## 3. Rider Cancel Button in Upcoming Tab

**File: `src/pages/RecentRides.tsx`**

Add a "Cancel" button on each booking card in the Upcoming tab (when `tab === 'upcoming'`). On click:
- Update the booking status to `cancelled`
- If the booking has an associated ride_request (check by matching rider_id + pickup/drop), restore the ride_request status to `open`
- Show toast confirmation
- Invalidate queries

Also add a cancel button for ride requests that haven't been matched yet (need to query `ride_requests` table for current user's open requests and display them in Upcoming tab).

**New addition to Upcoming tab:** Show the user's own open `ride_requests` as cards with a cancel button, separately from bookings.

---

## 4. Auto-Expire Ride Requests

**Database migration:** Create a database function `expire_old_ride_requests()` that marks open ride requests as `expired` when `preferred_time < now()`.

**Scheduled job:** Set up a `pg_cron` job to run this function every 15 minutes.

```text
Function: expire_old_ride_requests()
  UPDATE ride_requests SET status = 'expired' 
  WHERE status = 'open' AND preferred_time < now();

Cron: */15 * * * * -- every 15 minutes
```

---

## 5. Auth Page Text Cleanup

**File: `src/pages/Auth.tsx`**

Line-level changes:
- Line 361: Change tagline from `"Join India's peer-to-peer ride sharing community"` to `"Join India's First peer-to-peer ride sharing community"`
- Line 610: Change placeholder from `"John Doe"` to `"Your Name"`
- Lines 545-548 (login checkbox): Change from `"I am 18 or older"` to `"I am 18 or older and accept all terms and conditions"` with "terms and conditions" as a link
- Lines 702-711 (signup checkbox): Same change as login checkbox

---

## 6. Google Auth Fix

**File: `src/pages/Auth.tsx`**

The current implementation uses `supabase.auth.signInWithOAuth` directly. For Lovable Cloud, this needs to use the `lovable.auth.signInWithOAuth` function instead. This requires:
1. Running the Configure Social Login tool to generate the Lovable module
2. Updating `handleGoogleSignIn` to import and use `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`

---

## 7. Forgot Password Enhancement

**Status:** Already implemented with proper flow:
- `handleForgotPassword` sends reset email with toast "Check your inbox"
- Reset mode detects `?reset=true` query param and `PASSWORD_RECOVERY` event
- Password update form with validation works

One small fix: the toast message says "Check your inbox for a password reset link" -- update to "Reset link sent. Check your inbox." per requirements.

---

## Technical Details

### Files Modified
```text
src/pages/DriverRequests.tsx  -- Auto-accept booking after insert (2-step), set ride to active
src/pages/RecentRides.tsx     -- Add cancel button for upcoming bookings + show open ride requests
src/pages/Auth.tsx            -- Text cleanup, checkbox update, Google OAuth via Lovable Cloud, forgot password toast
src/hooks/useRides.ts         -- Add realtime invalidation for bookings/rides queries
```

### Database Changes
```text
1. CREATE FUNCTION expire_old_ride_requests() -- marks expired requests
2. pg_cron job every 15 minutes to call the function
```

### Dependencies
- Lovable Cloud auth module (generated by Configure Social Login tool) for Google OAuth
- pg_cron + pg_net extensions for auto-expire (need to be enabled)

### Sequencing
1. Database migration (expire function) -- can run independently
2. Configure Social Login tool for Google OAuth -- must run before Auth.tsx changes
3. All file edits can happen in parallel after steps 1-2

