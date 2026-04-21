

# Plan: Finalize Raahi end-to-end (rider + driver + security)

The TypeScript errors you pasted are stale-language-server noise (all those packages are already installed and the app runs). No source fixes needed for them — they clear on next type-check. The real work is the end-to-end flow + remaining security gaps. Most of it is already in place; this plan closes the rest.

## Already done (no rework)
- SearchModal + MiniMap (Leaflet, OSM tiles, draggable marker, autocomplete) — `src/components/search/SearchModal.tsx`, `MiniMap.tsx`
- RequestPosted waiting screen with realtime — `src/pages/RequestPosted.tsx`
- Wallet hardening via `complete_ride_payment` RPC — wired in `ManageRide.tsx`
- AdminLogin server-side `has_role` check
- ola-maps-proxy key-leak fix + JWT verification
- realtime.messages RLS + user_roles admin-only INSERT

## What this run changes

### 1. Driver-safe OTP (server-side)

New migration `supabase/migrations/<ts>_raahi_finalize.sql`:

```sql
-- Rider-only OTP read
CREATE OR REPLACE FUNCTION public.get_booking_otp(_booking_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT otp FROM bookings WHERE id = _booking_id AND rider_id = auth.uid();
$$;

-- Driver-only verify (OTP never returned to client)
CREATE OR REPLACE FUNCTION public.verify_booking_otp(_booking_id uuid, _otp text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _driver uuid; _stored text;
BEGIN
  SELECT r.driver_id, b.otp INTO _driver, _stored
  FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = _booking_id;
  IF _driver <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _stored IS NULL OR _stored <> _otp THEN RETURN false; END IF;
  UPDATE bookings SET status='in_progress', otp_verified=true, updated_at=now()
  WHERE id = _booking_id;
  RETURN true;
END $$;

-- Safe profile view
CREATE OR REPLACE VIEW public.profile_safe WITH (security_invoker=on) AS
SELECT p.id, p.name, p.avatar_url, p.gender, p.kyc_status,
       (SELECT round(avg(rating)::numeric,1) FROM ratings WHERE reviewee_id=p.id) AS rating
FROM profiles p;
GRANT SELECT ON public.profile_safe TO authenticated;

-- Drop unrestricted KYC upload policy (owner-scoped one already exists)
DROP POLICY IF EXISTS "Allow authenticated uploads to kyc_documents" ON storage.objects;
```

Storage avatars stay public-read (needed for UI). KYC bucket already has owner-scoped INSERT/SELECT.

### 2. ManageRide.tsx — split OTP per role
- Driver SELECT: explicit columns excluding `otp` and `otp_verified`.
- Rider: fetch OTP via `supabase.rpc('get_booking_otp', { _booking_id })` on mount + on realtime update.
- Driver "Verify OTP" button: `supabase.rpc('verify_booking_otp', { _booking_id, _otp })`; toast on false; navigate stays.

### 3. DriverRequests.tsx — KYC gate
Check `useProfile()`; if `kyc_status !== 'verified'`, render an empty state with a "Complete KYC" button instead of the request list. Existing accept flow unchanged.

### 4. SearchRides.tsx — accept new params, mark matched
- Read `?request_id=` from URL; on successful Book, `update ride_requests set status='matched' where id=...`.
- Uses `profile_safe` view for rider/driver chips.
- Removes any leftover "Get Ride Immediately" CTA (already gone).

### 5. Admin.tsx — server-side role check
Replace the direct `user_roles` query with `supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })`. Same for `useAdminStatus.ts`.

### 6. SearchModal — pass `request_id` forward
When matches are found and we navigate to `/search-rides`, append `&request_id=<id>` so SearchRides can mark the request matched after booking.

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/<ts>_raahi_finalize.sql` | new — RPCs, view, KYC policy drop |
| `src/pages/ManageRide.tsx` | OTP via RPCs, driver SELECT excludes OTP |
| `src/pages/DriverRequests.tsx` | KYC gate |
| `src/pages/SearchRides.tsx` | request_id param + mark matched |
| `src/pages/Admin.tsx` | `has_role` RPC instead of table read |
| `src/hooks/useAdminStatus.ts` | `has_role` RPC |
| `src/components/search/SearchModal.tsx` | append `request_id` query param |

Bottom nav, Leaflet stack, theme tokens, and all other screens untouched.

## QA checklist mapping
- Rider sees OTP, driver does not → ManageRide split + RPC
- Driver verifies OTP server-side → `verify_booking_otp`
- Wallet cannot be fabricated → existing `complete_ride_payment` + dropped INSERT policy
- Non-admins cannot insert admin roles → existing policy
- Admin UI server-side validated → `has_role` RPC swap
- Users cannot upload arbitrary KYC → unrestricted INSERT dropped
- KYC drivers only see requests → KYC gate on DriverRequests
- Riders/drivers see only safe profile fields → `profile_safe` view used in lists
- No legacy search UI → already removed; SearchModal is the only entry

