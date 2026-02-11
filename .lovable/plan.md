

# Raahi MVP Refinement Plan

This is a large scope request. To stay within credit constraints, I'm grouping changes into **3 batches** ranked by impact. Each batch is a single prompt to minimize credit usage.

---

## Batch 1: Dashboard Cleanup + My Rides Tabs (Highest Impact)

### 1A. Dashboard (Home) Cleanup
**Changes to `src/pages/Dashboard.tsx`:**
- Remove the "Verified" badge from the welcome header (keep it only in Profile)
- Remove the "Ride History" quick action card at the bottom
- Remove the "Your Bookings" card from the "Find a Ride" tab (redundant with My Rides)
- Change "Offer a Ride" button variant from `variant="offer-ride"` to a yellow/amber style
- Keep only: "Request a Ride" card, "Find a Ride" card, Nearby Rides, Post a Ride card, SOS card

### 1B. Remove Avatar from Header
**Changes to `src/components/layout/Header.tsx`:**
- Remove the avatar icon from the right side of the dashboard header
- Keep the Admin badge if applicable

### 1C. My Rides with Tabs (Upcoming / Completed / Cancelled)
**Changes to `src/pages/RecentRides.tsx`:**
- Add `Tabs` component with 3 tabs: Upcoming, Completed, Cancelled
- Each tab filters both bookings (as rider) and rides (as driver) by status
- Upcoming = `pending`, `accepted`, `scheduled`, `in_progress`, `driver_arrived`
- Completed = `completed`
- Cancelled = `cancelled`
- Add a "Rate Driver" button on completed bookings (links to rating flow in Batch 3)

---

## Batch 2: Search Flow + Location Improvements

### 2A. Search Rides UI Cleanup
**Changes to `src/pages/SearchRides.tsx`:**
- Remove the "From" and "To" label text above the location inputs
- Keep just the `LocationInput` fields with placeholder text ("Pickup location", "Where to?")
- Auto-fill pickup with user's current location on page load using `navigator.geolocation` + reverse geocoding

### 2B. Auto-detect Location on App Open
**Changes to `src/pages/Dashboard.tsx`:**
- Already fetches `userLocation` via geolocation -- this is working
- Pass current location context to search page via navigation state so it pre-fills

---

## Batch 3: Post-Ride Rating + Ride Cancellation

### 3A. Rating System After Ride Completion
**New component `src/components/ride-tracking/RatingModal.tsx`:**
- Star rating (1-5) + optional comment textarea
- Submits to existing `ratings` table
- Triggered from completed rides in "My Rides" page

### 3B. Cancel Ride Flow
**Changes to `src/pages/ManageRide.tsx` and `src/pages/SearchRides.tsx`:**
- Add "Cancel Ride" button for rider on accepted/pending bookings
- When rider cancels: booking status -> `cancelled`, ride stays available for others
- When driver cancels (rejects): booking status -> `cancelled`
- Both sides see updated status via existing realtime subscription

---

## What Gets Deferred (Not MVP-Critical)

These features require significant infrastructure and should be post-launch:

| Feature | Why Deferred |
|---------|-------------|
| Live location sharing popup with map | Requires Mapbox GL integration, realtime lat/lng streaming, significant UI work -- 3+ credits alone |
| Push notifications on accept/cancel | Requires Capacitor Push plugin + backend function + FCM setup -- separate effort |
| Dynamic QR code from driver-entered amount | Current static QR + cash flow works for MVP |
| "50% less than Ola" comparison | Needs external pricing data or hardcoded benchmarks -- cosmetic, not functional |
| Capacitor native build | Already documented in project context; user should follow existing Capacitor setup guide after code is stable |

---

## Technical Details

### Files Modified

```text
Batch 1 (1 credit):
  - src/pages/Dashboard.tsx        (remove badge, history card, bookings card, yellow button)
  - src/components/layout/Header.tsx (remove avatar)
  - src/pages/RecentRides.tsx      (add Upcoming/Completed/Cancelled tabs)

Batch 2 (1 credit):
  - src/pages/SearchRides.tsx      (remove labels, auto-fill current location)

Batch 3 (1 credit):
  - src/components/ride-tracking/RatingModal.tsx (new)
  - src/pages/RecentRides.tsx      (add Rate button on completed rides)
  - src/pages/ManageRide.tsx       (cancel button for active bookings)
```

### No Database Migrations Needed
- `ratings` table already exists with proper RLS
- `bookings` status enum already supports `cancelled`, `completed`
- `ride_requests` table already exists

### Strategic Notes
- Ship Batch 1 first -- it's the most visible improvement for zero backend risk
- The "live location popup with map" is a post-MVP feature. For now, the ManageRide page with phone number visibility is sufficient
- For Play Store: focus on privacy policy, permissions declarations, and APK signing -- those are blocking items, not code features

