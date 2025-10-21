# Profile Completion Enforcement

## Overview

The application now enforces profile completion before users can access the main application features. Users must complete their profile creation before accessing the dashboard or other protected routes.

## Implementation Details

### 1. Middleware Protection ([middleware.ts:62-76](src/lib/supabase/middleware.ts#L62-L76))

The middleware checks if authenticated users have created a profile:

```typescript
// Check if authenticated user has completed their profile
if (user && !isPublicRoute && !isApiAuthRoute && !isProfileCreateRoute) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_status')
    .eq('user_id', user.id)
    .single()

  // If no profile exists, redirect to profile creation
  if (!profile) {
    const url = request.nextUrl.clone()
    url.pathname = '/profile/create'
    return NextResponse.redirect(url)
  }
}
```

**What this does:**
- Runs on every authenticated request
- Checks if user has a profile in the database
- Redirects to `/profile/create` if no profile exists
- Allows access to `/profile/create` route without infinite redirect loop

### 2. Login Form Enhancement ([LoginForm.tsx:65-80](src/components/auth/LoginForm.tsx#L65-L80))

After successful login, checks for profile completion:

```typescript
// Check if user has completed their profile
const { data: profile } = await supabase
  .from('profiles')
  .select('id, profile_status')
  .eq('user_id', authData.user.id)
  .single()

// Redirect to profile creation if no profile exists
if (!profile) {
  router.push('/profile/create')
} else {
  router.push('/dashboard')
}
```

### 3. Two-Factor Verification ([TwoFactorVerification.tsx:49-68](src/components/auth/TwoFactorVerification.tsx#L49-L68))

After 2FA verification, checks for profile completion:

```typescript
// Check if user has completed their profile
const { data: { user } } = await supabase.auth.getUser()

if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_status')
    .eq('user_id', user.id)
    .single()

  // Redirect to profile creation if no profile exists
  if (!profile) {
    router.push('/profile/create')
  } else {
    router.push('/dashboard')
  }
}
```

### 4. Auth Callback ([callback/route.ts:7](src/app/api/auth/callback/route.ts#L7))

Defaults to profile creation for new users:

```typescript
const next = requestUrl.searchParams.get('next') || '/profile/create'
```

## User Flow

### New User Registration:
1. User signs up → Email verification → Redirected to `/profile/create`
2. User completes profile (Step 1: Basic Info, Step 2: Photo)
3. Profile saved to database
4. User redirected to `/dashboard`

### Existing User Login:
1. User logs in → System checks for profile
2. **If profile exists:** Redirect to `/dashboard`
3. **If no profile:** Redirect to `/profile/create`

### Password Reset:
1. User resets password → Redirected to `/reset-password`
2. After password update → Redirected to `/login`
3. After login → Profile check (same as login flow above)

## Protected Routes

All routes require authentication EXCEPT:
- `/` (home page)
- `/login`
- `/signup`
- `/verify-otp`
- `/forgot-password`
- `/reset-password`
- `/api/auth/*` (auth endpoints)

All authenticated routes except `/profile/create` require a completed profile.

## Profile Creation Page

Location: [/profile/create](src/app/(dashboard)/profile/create/page.tsx)

**Two-step process:**
1. **Step 1:** Basic Information Form
   - Name, date of birth, gender, marital status
   - Religion, caste, sub-caste (optional)
   - Mother tongue, location

2. **Step 2:** Profile Photo Upload
   - Required to complete profile
   - Uploaded to Supabase Storage

**Database Insert:**
- Creates record in `profiles` table
- Links to user via `user_id`
- Sets `profile_status` to `'active'`

## Testing

### Test Scenario 1: New User
1. Sign up with new email
2. Verify email
3. Should be redirected to `/profile/create`
4. Complete profile
5. Should be redirected to `/dashboard`
6. Try to manually navigate to `/profile/create` - middleware allows it
7. Try to navigate to other protected routes - middleware allows it (profile exists)

### Test Scenario 2: Existing User Without Profile
1. Create user account directly in Supabase
2. Login with credentials
3. Should be redirected to `/profile/create`
4. Cannot access `/dashboard` or other routes until profile is completed

### Test Scenario 3: Existing User With Profile
1. Login with existing account that has profile
2. Should be redirected to `/dashboard`
3. Can access all protected routes

## Benefits

✅ **Enforces data completeness** - All users must have profiles
✅ **Better UX** - Clear onboarding flow for new users
✅ **Data integrity** - No orphaned user accounts without profiles
✅ **Security** - Middleware-level protection on every request
✅ **Flexible** - Can be extended to check `profile_status` or completion percentage

## Future Enhancements

- Check `profile_status` field (incomplete, pending, active)
- Check `profile_completion_percentage` and prompt for incomplete profiles
- Allow partial profile creation with "Complete Later" option
- Add profile edit flow with validation
