

# Plan: New Search Modal + End-to-End Flow + Security Fixes

## What you'll get

A completely rebuilt Search experience on the Home screen using **react-leaflet + OpenStreetMap** (no API keys, no CORS issues), proper request/match flow, and three security hardening fixes.

## 1. New SearchModal (replaces the old full-screen "Search Destination" view in `Dashboard.tsx`)

A single bottom-sheet style modal that opens when the user taps "Where to?" on Home:

```text
┌─────────────────────────────────────┐
│ ← Plan your ride                    │
├─────────────────────────────────────┤
│ 🟢 From  [editable input.........]  │  ← prefilled via GPS reverse-geocode
│  │       suggestions dropdown ▼     │
│ 🔴 To    [editable input.........]  │
│          suggestions dropdown ▼     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │   Inline Leaflet map (180px)   │ │
│ │   draggable marker = From       │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  │
│ │ 🚀 Instant   │  │ 📅 Schedule  │  │
│ │ Find Now     │  │ Plan Later   │  │
│ │ orange CTA   │  │ green CTA    │  │
│ └──────────────┘  └──────────────┘  │
│  3 drivers nearby · Save ₹200      │
└─────────────────────────────────────┘
```

Behavior:
- **From** auto-fills from GPS reverse geocode (via existing `ola-maps-proxy`); fully editable; dragging the map marker updates it live.
- **To** is empty with placeholder "Where to?"; debounced autocomplete via `ola-maps-proxy` (already wired and working).
- CTAs are **disabled until both have valid lat/lng**.
- The legacy full-screen search view and the post-select Dialog (lines 455–602 of `Dashboard.tsx`) are **deleted** so there is no UI regression.

## 2. CTA flow

**Instant Ride (orange):**
1. Insert a row into `ride_requests` with `status='open'`, `preferred_time = now()`, both coords + addresses.
2. Run a client-side match query against `rides` (status=scheduled, future start_time, origin within ~3 km AND destination within ~3 km using lat/lng bounding box + Haversine in JS).
3. If matches found → navigate to `/search-rides?...` showing matching rides list (existing screen, already supports Book Now → OTP-protected booking).
4. If no matches → navigate to a new lightweight **"Request posted — waiting for driver"** screen at `/request-posted/:requestId` with realtime status (Supabase channel on `ride_requests` row).

**Schedule Ride (green):**
1. Open inline schedule sheet inside the modal (date picker, time picker, seats 1–6 with 2W cap of 1, fare suggestion ₹6–7/km for 2W vs ₹10–12/km for 4W).
2. Submit creates `ride_requests` with chosen `preferred_time` and `seats_needed`.
3. Same match → matches list or "Request posted" confirmation.

Drivers already see open `ride_requests` in `/driver-requests` (KYC-verified gating already in place there).

## 3. Security fixes (migration + RLS)

**a) Profile PII leak to ride participants** — current policy `Ride participants can view basic info` exposes the full `profiles` row (Aadhaar, DL, KYC docs).
- Drop that policy.
- Create SECURITY DEFINER function `public.get_ride_participant_profile_safe(_id uuid)` returning only `id, name, avatar_url, gender, kyc_status` (no PII).
- Update `Dashboard.tsx`, `SearchRides.tsx`, `DriverRequests.tsx` queries that join `profiles` to either select only safe columns or call the new function.

**b) Vehicle registration publicly readable** — current policy `Anyone can view verified vehicles` exposes registration numbers.
- Drop that policy.
- Replace with: `Ride participants can view ride vehicle` — allows SELECT only when the requesting user is the driver OR has a booking on a `rides` row that uses this `vehicle_id`. Owner-self SELECT policy stays.
- Dashboard's nearby-rides card will continue to show vehicle brand/model/type via the existing `rides → vehicles` join, restricted by the new policy (drivers' own vehicles + booked riders).
- For the public Home feed where we need brand/model only (not registration), add a SECURITY DEFINER function `public.get_ride_vehicle_public(_ride_id uuid)` returning only `type, brand, model, verified` and refactor the Dashboard nearby-rides query to use it.

**c) Verbose Supabase errors** — Add a small `friendlyError(error)` helper in `src/lib/utils.ts` mapping known codes/messages to generic strings ("Something went wrong, please try again", "Email already in use", etc.); replace `error.message` toasts in `Auth.tsx`, `RequestRide.tsx`, `SearchRides.tsx`, and the new SearchModal.

(Admin client-side check note from the scanner is already mitigated by RLS on admin tables; no code change needed there beyond what exists.)

## 4. Files

**Create:**
- `src/components/search/SearchModal.tsx` — the new modal (Leaflet map, two inputs, autocomplete, CTAs, schedule sheet).
- `src/components/search/MiniMap.tsx` — react-leaflet wrapper with draggable marker.
- `src/pages/RequestPosted.tsx` — "waiting for driver" screen with realtime updates.
- `supabase/migrations/<ts>_secure_profiles_vehicles.sql` — security fixes (a) and (b).

**Modify:**
- `src/pages/Dashboard.tsx` — remove old full-screen search + post-select dialog; mount `<SearchModal />`; refactor nearby-rides query to use safe RPC.
- `src/pages/SearchRides.tsx` — accept new query params, drop `Get Ride Immediately` button (handled by Instant CTA now), use friendly errors, use safe profile select.
- `src/pages/DriverRequests.tsx` — use safe profile select.
- `src/pages/Auth.tsx`, `src/pages/RequestRide.tsx` — use `friendlyError()`.
- `src/lib/utils.ts` — add `friendlyError()` helper.
- `src/App.tsx` — register `/request-posted/:requestId`.
- `src/pages/Profile.tsx` — fix the `Navigator.share` permission-denied error (wrap in try/catch and fall back to `navigator.clipboard.writeText` when share is unavailable or denied).
- `package.json` — add `leaflet`, `react-leaflet`, `@types/leaflet`.

**No changes** to the bottom navigation, OTP triggers, payment functions, or Auth flow logic.

## 5. Tech notes

- **Leaflet tiles:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with proper attribution. Map sized 100% × 180px inside the modal — mobile-friendly, no scroll trap (gestureHandling = single-finger drag only).
- **Geocoding stays on `ola-maps-proxy`** (already deployed, key is set, autocomplete works). No need to add Nominatim — it would just duplicate functionality and add rate-limit risk. The Leaflet map only renders OSM tiles; geocoding is independent.
- **Matching heuristic:** Haversine in JS, 3 km radius on both endpoints, `match% = round(100 - (originDistKm + destDistKm) * 10)` clamped to 60–99.
- **Realtime** for `/request-posted/:id` via Supabase channel on `ride_requests` filtered by `id=eq.<id>`; when a driver inserts a booking against a matched ride, navigate to `/manage-ride/:bookingId`.
- **Theme:** uses existing tokens — `gradient-action` (orange) for Instant, `bg-success` (green) for Schedule, `gradient-hero` for modal header.

## QA runbook

1. Tap "Where to?" on Home → SearchModal opens with From prefilled and editable, To empty.
2. Drag the map marker → From input updates within ~500 ms.
3. Type "BKC" in To → suggestions appear → tap one → CTAs become enabled.
4. Tap **Instant Ride** → if a matching scheduled ride exists, lands on `/search-rides` showing it; otherwise lands on `/request-posted/<id>` with "Waiting for driver" copy.
5. Tap **Schedule Ride** → schedule sheet opens → pick date/time/seats/fare → submit → same matches/waiting branch.

