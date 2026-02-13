
# Raahi -- OTP Fix + Profile Redesign

## Summary

Two changes: (1) Fix OTP delivery so the rider gets a toast + sees the OTP reliably on ManageRide, and (2) completely redesign Profile.tsx to match the uploaded reference -- minimalist layout with avatar/name/rating header, Women-Only toggle, vehicles section, and Help links.

---

## 1. OTP Delivery Fix

**Diagnosis:** The database trigger `booking_otp_trigger` already generates a 4-digit OTP when booking status changes from `pending` to `accepted`. The rider can see it on ManageRide (line 539). However:
- The OTP only shows when status is `accepted` -- it should also show when `driver_arrived` (rider still needs to share it).
- The rider gets no toast notification when OTP arrives.
- No fallback if OTP is null after acceptance.

**File: `src/pages/ManageRide.tsx`**

Changes:
- Expand the OTP display condition from `status === 'accepted'` to include `driver_arrived` and `driver_arriving`.
- In `subscribeToBookingUpdates`, detect when `payload.new.otp` appears (and was previously null or status changed to accepted) and show a toast: "Your OTP is ready! Share it with your driver."
- Add fallback: if status is `accepted`/`driver_arrived` but `booking.otp` is null, show a warning message "OTP generation failed. Please contact support."

No database changes needed -- the trigger already works.

---

## 2. Profile Page Redesign

**File: `src/pages/Profile.tsx`** -- Full rewrite to match the uploaded reference design.

**New layout (top to bottom):**

### 2A. Header Section
- Large avatar (left) + Name + rating (star icon + average) + trip count + Edit button (pencil icon, navigates to /profile/edit)
- Verified badge (green, subtle) next to name if `kyc_status === 'verified'`

### 2B. Preferences Section
- **Women-Only Mode** toggle with icon and description "Ride only with other women"
  - Reads/writes from `preferences` table (`women_only_mode` field)
  - Uses Switch component
- **Notifications** toggle (UI only for MVP, no push infra)
- Clean separator between items

### 2C. My Vehicles Section
- Section header "MY VEHICLES" with a "+" button to open Add Vehicle dialog
- Vehicle cards: icon (bike/car), brand + model, registration number, type badge (2W/4W), verified badge
- Tap chevron to expand or navigate (keep existing delete dialog)
- Reuses existing vehicle CRUD hooks (`useMyVehicles`, `useAddVehicle`, `useDeleteVehicle`)

### 2D. Help and Support Section
- "HELP & SUPPORT" header
- Row items with icons + chevrons:
  - FAQs -> navigate to /settings (help tab)
  - Contact Support -> navigate to /support
  - Terms & Privacy -> navigate to /settings (about tab)

### 2E. Logout Button
- Full-width outlined button at bottom with red text and LogOut icon

**Removed from current Profile:**
- Stats cards grid (Rides Given, Rides Taken, Earned, Spent)
- "As Driver" / "As Rider" tabs with ride/booking/payment lists (this info lives on RecentRides/Wallet pages already)
- Quick Actions card (Settings, Help links consolidated into Help section)
- Delete Account button (moved to Settings page or hidden for MVP)

**New dependencies used from existing codebase:**
- `Switch` from `@/components/ui/switch`
- `Separator` from `@/components/ui/separator`
- Existing `Avatar`, `Badge`, `Card`, `Dialog`, `Button` components
- `useProfile` hook for profile data
- `useMyVehicles`, `useAddVehicle`, `useDeleteVehicle` hooks
- Supabase client for preferences table read/write

**Preferences logic:**
- On mount, fetch from `preferences` table where `user_id = auth.uid()`
- If no row exists, create one with defaults on first toggle
- Toggle `women_only_mode` updates the row immediately via upsert

---

## Technical Details

### Files Modified
```text
src/pages/ManageRide.tsx   -- OTP display fix (show on driver_arrived, toast on OTP arrival, null fallback)
src/pages/Profile.tsx      -- Full redesign matching reference mockup
```

### No Database Changes
- OTP trigger already exists and works
- Preferences table already exists with `women_only_mode` column

### Ratings Query
- To display average rating, query `ratings` table where `reviewee_id = user.id` and compute average
- Also count total completed rides + bookings for "X trips" display
