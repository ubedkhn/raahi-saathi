

# Plan: Fix Signup, Theme, Search Text & Ola Maps Integration

## Key Findings

1. **Signup/OTP Issue**: The screenshot confirms Supabase is sending magic links ("One-time login link" with a "Log In" button) instead of OTP codes. The `signInWithOtp` API in Supabase sends magic links by default. To get a 6-digit code, the email template must be configured for OTP, OR we need to use a different approach. Since we cannot modify Supabase auth config directly, the practical fix is to **keep the magic link flow but handle it properly in-tab** — or switch to email/password signup for new users and use magic link for returning users. The cleanest approach: use `signInWithOtp` but detect when the user clicks the magic link (which redirects back to `/auth`) and handle it via `onAuthStateChange`. The current code already does this but the email says "login link" not "OTP code" — this is a Supabase configuration issue. We'll add a custom auth edge function that sends a real OTP via email.

   **Actually**, the simpler fix: For new user creation, use `supabase.auth.signUp({ email, password })` with a generated temp password, then immediately send OTP. But the cleanest: just embrace the magic link flow — change the UI to say "Check your email for a login link" instead of showing OTP boxes.

2. **Theme Toggle**: `next-themes` is installed and `ThemeProvider` wraps the app with `attribute="class"` and `enableSystem`. The Settings page uses `useTheme()`. This should work. Let me check if there's a CSS issue — the `index.css` likely has proper `.dark` class definitions. The issue might be that the theme isn't persisting or the `storageKey` isn't set.

3. **Search bar text**: Line 136 in Dashboard.tsx — easy text change.

4. **Ola Maps**: Need to replace Google Maps (DashboardMap, NearbyRidesMap) and Mapbox (geocoding, DriverArrivingMap, TripInProgressMap) with Ola Maps APIs. Ola Maps has a Web SDK (`olamaps-web-sdk` npm package) and REST APIs for geocoding, autocomplete, directions, and distance matrix.

## Tasks

### 1. Fix Signup — Switch to Magic Link UI (not fake OTP)

The root cause: `supabase.auth.signInWithOtp({ email })` sends a magic link email, not an OTP code. Supabase only sends OTP codes for phone-based OTP, not email. The email "OTP" is actually a magic link.

**Fix**: Change the verify step UI from "Enter 6-digit OTP" to "Check your email for a login link." Remove the OTP input boxes. Show a waiting screen with a "Resend" button. When the user clicks the magic link in the email, `onAuthStateChange('SIGNED_IN')` fires and the profile completion flow continues.

This matches what Supabase actually sends (as shown in the screenshot).

### 2. Fix Theme Toggle

Check `src/index.css` for `.dark` class styles. The ThemeProvider config looks correct. Possible issue: `next-themes` needs `storageKey` or there's a CSS specificity issue. Will verify and fix.

### 3. Search Bar Text Change

In `Dashboard.tsx` line 136, change `"Where are you going?"` to use the user's name: `Where you wanna go, {profile?.name?.split(' ')[0] || 'there'}?`

### 4. Ola Maps Integration

**Requires OLA_MAPS_API_KEY as a secret.** All API calls go through edge functions.

#### New Edge Functions:
- `supabase/functions/ola-maps-proxy/index.ts` — Single proxy for all Ola Maps API calls:
  - Autocomplete: `GET https://api.olamaps.io/places/v1/autocomplete?input=...&api_key=...`
  - Geocode: `GET https://api.olamaps.io/places/v1/geocode?address=...&api_key=...`
  - Reverse Geocode: `GET https://api.olamaps.io/places/v1/reverse-geocode?latlng=...&api_key=...`
  - Directions: `POST https://api.olamaps.io/routing/v1/directions?origin=...&destination=...&api_key=...`
  - Distance Matrix: `GET https://api.olamaps.io/routing/v1/distanceMatrix?origins=...&destinations=...&api_key=...`

#### Frontend Changes:
- **Remove** `mapbox-gl` dependency, `@types/google.maps` reference
- **Replace** `supabase/functions/mapbox-geocode/index.ts` with Ola Maps proxy calls
- **Replace** `supabase/functions/google-maps-key/index.ts` — delete
- **Update** `src/utils/geocoding.ts` to call `ola-maps-proxy` instead of `mapbox-geocode`
- **Rewrite** `DashboardMap.tsx` to use Ola Maps Web SDK (`olamaps-web-sdk` npm package) instead of Google Maps
- **Rewrite** `NearbyRidesMap.tsx` same
- **Rewrite** `DriverArrivingMap.tsx` and `TripInProgressMap.tsx` to use Ola Maps instead of Mapbox
- **Update** `LocationInput.tsx` to use Ola Maps autocomplete via the proxy edge function
- **Update** `DriverRequests.tsx` distance calculation to use Ola Maps Distance Matrix API (or keep Haversine — simpler and no API call needed)

#### Install:
- `olamaps-web-sdk` npm package
- Remove `mapbox-gl` dependency

## Files to Create/Modify

**New:**
- `supabase/functions/ola-maps-proxy/index.ts`

**Modified:**
- `src/pages/Auth.tsx` — Magic link waiting screen instead of OTP boxes
- `src/pages/Dashboard.tsx` — Search bar text with user name
- `src/pages/Settings.tsx` — Verify theme toggle works (may need minor fix)
- `src/utils/geocoding.ts` — Use ola-maps-proxy
- `src/components/dashboard/DashboardMap.tsx` — Ola Maps Web SDK
- `src/components/dashboard/NearbyRidesMap.tsx` — Ola Maps Web SDK
- `src/components/ride-tracking/DriverArrivingMap.tsx` — Ola Maps Web SDK
- `src/components/ride-tracking/TripInProgressMap.tsx` — Ola Maps Web SDK
- `src/components/common/LocationInput.tsx` — Ola Maps autocomplete
- `supabase/config.toml` — Add ola-maps-proxy function config
- `src/vite-env.d.ts` — Remove Google Maps types reference

**Delete:**
- `supabase/functions/google-maps-key/index.ts` (replaced by ola-maps-proxy)
- `supabase/functions/mapbox-geocode/index.ts` (replaced by ola-maps-proxy)

## Prerequisites

Before implementation, the **OLA_MAPS_API_KEY** secret must be added. I'll use the `add_secret` tool to request it from the user.

