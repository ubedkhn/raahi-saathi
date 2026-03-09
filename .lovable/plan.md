

# Plan: Wire up edge functions + verify existing features

## What's already done
- `/terms` page exists with all sections, route registered
- `/notifications` page exists with realtime hook, bell icon in header
- Back navigation fix in Header already implemented
- Offline banner + IndexedDB persistence already in place
- `validate-ride` and `validate-booking` edge functions deployed
- DB trigger `notify_on_booking_status_change` created

## What still needs to be done

### 1. Update PostRide.tsx to use `validate-ride` edge function
**Lines 379-394** currently do a direct `supabase.from('rides').insert(...)`. Replace with:
```typescript
const { data, error } = await supabase.functions.invoke('validate-ride', {
  body: { vehicle_id, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, start_time, seats_available, price_per_km }
});
```
This ensures server-side validation of KYC status, vehicle ownership/verification, future date, and price range.

### 2. Update SearchRides.tsx `handleBook` to use `validate-booking` edge function
**Lines 147-158** currently do a direct `supabase.from('bookings').insert(...)` with client-calculated fare. Replace with:
```typescript
const { data, error } = await supabase.functions.invoke('validate-booking', {
  body: { ride_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng }
});
```
This moves fare calculation and seat availability checks to the server. Also remove the fake auto-accept `setTimeout` (lines 170-180) since that bypasses the real flow.

### 3. Update DriverRequests.tsx `handleAcceptRequest` to use edge functions
**Lines 96-114** insert rides directly. Replace the ride creation with `validate-ride` edge function call, then the booking creation with `validate-booking` or keep the booking insert since the driver is creating on behalf of the rider (the edge function checks `rider_id !== driver_id`). For this flow, we'll keep the direct insert for the booking since the driver is accepting a request (service-role validation happens in the edge function for ride creation only).

### 4. Update PostRide.tsx `handleAcceptRequest` (lines 130-146)
Same pattern as DriverRequests - replace direct ride insert with `validate-ride` edge function.

## Technical details

- Edge functions already have `verify_jwt = false` in `config.toml` and validate auth via Authorization header internally
- Frontend calls use `supabase.functions.invoke()` which automatically passes the auth token
- Error handling: parse the response body for `{ error }` messages and show in toast

## Files to modify
- `src/pages/PostRide.tsx` — two places: `handlePostRide` and `handleAcceptRequest`
- `src/pages/SearchRides.tsx` — `handleBook`
- `src/pages/DriverRequests.tsx` — `handleAcceptRequest`

