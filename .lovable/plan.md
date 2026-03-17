

# Plan: Auth OTP Flow, Google Fix, Distance Display, Dashboard Enhancements & DB Migration

## Database Migration

Add saved address columns to profiles:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_address text,
  ADD COLUMN IF NOT EXISTS home_lat numeric,
  ADD COLUMN IF NOT EXISTS home_lng numeric,
  ADD COLUMN IF NOT EXISTS work_address text,
  ADD COLUMN IF NOT EXISTS work_lat numeric,
  ADD COLUMN IF NOT EXISTS work_lng numeric;
```

## 1. Auth.tsx — Email OTP (Replace Magic Link) + Google OAuth Fix

Replace the magic link flow with an in-tab OTP verification flow:

- **Step 1 (email)**: User enters email, calls `supabase.auth.signInWithOtp({ email })` — Supabase sends a 6-digit OTP code by default.
- **Step 2 (verify-otp)**: New step replacing "check-email". Show 6 OTP input fields. User enters the code received via email. Call `supabase.auth.verifyOtp({ email, token: otp, type: 'email' })`. On success, `SIGNED_IN` fires.
- **Step 3+**: Profile completion and permissions remain unchanged.

**Google OAuth fix**: In the `onAuthStateChange` handler, add a retry with 1s delay if profile fetch returns null (race condition with `handle_new_user` trigger). Also add explicit error handling in `handleGoogleSignIn` with descriptive toast messages.

**Type change**: `AuthStep = "email" | "verify-otp" | "complete-profile" | "permissions" | "reset-password"`

## 2. DriverRequests.tsx — Distance Display

- Add `driverLocation` state populated via `navigator.geolocation.getCurrentPosition`
- Add Haversine helper function
- Display a `Badge` showing "X.X km away" on each request card between the rider info and route info

## 3. Profile.tsx — Settings Link Fix

Replace the "FAQs" `HelpCircle` link with a "Settings" link using a `Settings` (gear) icon pointing to `/settings`.

## 4. Dashboard.tsx — Recent Destinations, Saved Addresses, Hero Animation, Search Modal

- **Recent destinations**: Fetch last 3 bookings with `status = 'completed'` ordered by `created_at desc`, display `drop_address`. Clicking navigates to search with that destination pre-filled.
- **Saved addresses**: Read `home_address`/`work_address` from profile. Quick destination buttons show actual saved addresses or "Add home"/"Add work". Tapping an unsaved one opens a dialog with `LocationInput` to save the address to profiles via `useUpdateProfile`.
- **Hero animation**: Add an inline SVG with a car moving along a dashed road using CSS `@keyframes`. Small, decorative, uses `translateX` animation.
- **Search modal**: Show saved Home/Work shortcuts and recent destinations inside the modal above the "Start typing" text. Auto-focus the LocationInput on open.

## 5. Header.tsx — No changes needed

The header centering is already correct with `flex-1 text-center` between two `w-12` spacers.

## Files to modify
- `src/pages/Auth.tsx` — OTP flow + Google fix + retry logic
- `src/pages/Dashboard.tsx` — Recent destinations, saved addresses, hero SVG animation, search modal polish
- `src/pages/DriverRequests.tsx` — Distance badge
- `src/pages/Profile.tsx` — Settings link rename
- DB migration — Add home/work address columns

