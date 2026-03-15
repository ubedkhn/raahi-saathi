

# Plan: Auth Redesign, Settings, SOS, Header & Avatar Fixes

## 1. Auth Redesign — Email Magic Link with Rapido-style UI (`src/pages/Auth.tsx`)

Replace the current tabbed login/signup with a multi-step flow:

- **Step 1**: Clean screen with Raahi branding + email input field + "Continue" button. Calls `supabase.auth.signInWithOtp({ email })` to send a magic link.
- **Step 2**: "Check your email" confirmation screen with a countdown timer and "Resend" button.
- **Step 3**: After magic link click lands back at `/auth?type=magiclink`, detect via `onAuthStateChange('SIGNED_IN')`. If the profile has no name set (new user), show a "Complete Profile" form asking for Full Name and Phone.
- **Step 4**: Permissions request screen — location access (`navigator.geolocation`), notification permission (`Notification.requestPermission()`). Skip phone calls permission (not available in web).
- **Step 5**: Navigate to `/dashboard`.

Keep existing Google OAuth and password reset flows as secondary options. The magic link flow becomes the primary path.

No database changes needed — the `handle_new_user` trigger already creates profiles. After Step 3 we call `useUpdateProfile` to set name/phone.

## 2. Settings Redesign (`src/pages/Settings.tsx`)

Replace the 5-tab layout with a grouped list layout (like iOS Settings):

- **Account**: Name, email, phone (read-only display with "Edit Profile" link)
- **Preferences**: Theme toggle, notifications toggle, women-only mode
- **Security**: Change password section, SOS settings link
- **App Info**: About, version 1.0.0, Terms & Privacy links

Use a clean card-based layout with section headers, icons, and chevron arrows. Remove the Contact Us tab (already accessible from Profile → Support).

## 3. SOS Button on Dashboard (`src/pages/Dashboard.tsx`)

Add a fixed-position SOS button (bottom-right, above the bottom nav) on the Dashboard:
```
<button className="fixed bottom-20 right-4 z-40 bg-destructive text-white rounded-full p-4 shadow-lg">
  <AlertTriangle />
</button>
```
Links to `/sos`. Already visible in the SOS page during active rides.

## 4. Header Text Alignment Fix (`src/components/layout/Header.tsx`)

The title is already centered between left/right sections. Fix: ensure the right-side div has `w-10` to match the left-side spacer width, keeping the title truly centered. Add `text-center` and `flex-1` to the title container for consistent centering.

Add missing route configs for `/driver`, `/wallet`, `/notifications`, `/emergency-contacts`, `/support`, `/driver-requests` pages.

## 5. Global Avatar Fix

Already partially done in `SearchRides.tsx` (joins profiles for avatar_url). Verify and fix:

- **SearchRides.tsx**: Already fetches `profiles(name, avatar_url)` — working.
- **DriverRequests.tsx**: Already updated to fetch from `public_profiles_view` — working.
- **ManageRide.tsx**: Check if it joins profiles for rider/driver avatars.
- **RecentRides.tsx**: Ensure profile join for avatar display.
- **Chats.tsx**: Ensure avatars shown in chat list.

Create a small reusable `UserAvatar` component that handles the avatar_url → image with initials fallback pattern consistently.

## Files to modify
- `src/pages/Auth.tsx` — Multi-step magic link flow
- `src/pages/Settings.tsx` — Grouped list redesign
- `src/pages/Dashboard.tsx` — Add SOS button
- `src/components/layout/Header.tsx` — Fix centering, add route configs
- `src/components/common/UserAvatar.tsx` (NEW) — Reusable avatar component
- `src/components/common/index.ts` — Export UserAvatar
- `src/pages/RecentRides.tsx` — Use UserAvatar
- `src/pages/ManageRide.tsx` — Use UserAvatar

