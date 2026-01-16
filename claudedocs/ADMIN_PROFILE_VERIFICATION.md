# Admin Profile Verification System

## Overview

The admin module now includes a comprehensive profile verification system that allows administrators to review and verify user profiles. This ensures profile quality and authenticity on the platform.

## Features

### 1. Profile Management Dashboard

**Location:** `/admin/profiles`

**Features:**
- View all user profiles with detailed information
- Filter profiles by verification status (All, Verified, Unverified)
- Paginated list view (20 profiles per page)
- Visual verification badges
- Quick verify/unverify actions

### 2. Verification Status Tracking

Each profile has the following verification fields:

- `is_verified` (boolean) - Whether the profile is verified
- `verified_at` (timestamp) - When the profile was verified
- `verified_by` (UUID) - Admin user who verified the profile

### 3. Admin Actions

**Verify Profile:**
- Click the green "Verify" button
- Sets `is_verified = true`
- Records `verified_at` timestamp
- Records `verified_by` admin ID

**Unverify Profile:**
- Click the red "Unverify" button
- Sets `is_verified = false`
- Clears `verified_at` and `verified_by` fields

## API Endpoints

### GET `/api/admin/profiles`

Fetch profiles with filtering and pagination.

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `status` (string) - Profile status filter
- `verified` (boolean) - Filter by verification status

**Response:**
```json
{
  "profiles": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "gender": "male",
      "marital_status": "never_married",
      "city": "Mumbai",
      "state": "Maharashtra",
      "profile_status": "active",
      "is_verified": true,
      "verified_at": "2025-10-19T10:30:00Z",
      "created_at": "2025-10-15T08:00:00Z",
      "profile_photo_url": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST `/api/admin/profiles/verify`

Verify or unverify a profile.

**Request Body:**
```json
{
  "profileId": "uuid",
  "verified": true
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "is_verified": true,
    "verified_at": "2025-10-19T10:30:00Z",
    "verified_by": "admin-user-id"
  },
  "message": "Profile verified successfully"
}
```

## Database Schema

### Migration Applied

File: `supabase/migrations/add_is_verified_column.sql`

**Added Columns:**
```sql
-- Verification status
ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Verification timestamp
ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMPTZ;

-- Admin who verified
ALTER TABLE profiles ADD COLUMN verified_by UUID REFERENCES auth.users(id);

-- Performance indexes
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX idx_profiles_verified_at ON profiles(verified_at);
```

## UI Components

### Profile Card

Each profile displays:
- Profile photo (or initials if no photo)
- Name
- Verification badge (green for verified, gray for unverified)
- Gender and marital status
- Location (city, state)
- Created date
- Verified date (if applicable)
- Action buttons (View, Verify/Unverify)

### Filters

Three filter options:
1. **All Profiles** - Show all profiles
2. **Verified** - Show only verified profiles
3. **Unverified** - Show only unverified profiles

### Pagination

- Previous/Next buttons
- Page indicator (Page X of Y)
- 20 profiles per page
- Disabled buttons at boundaries

## Security

### Admin Authentication

Both API routes verify:
1. User is authenticated
2. User has `is_admin = true` in their profile
3. Returns 401 (Unauthorized) if not authenticated
4. Returns 403 (Forbidden) if not admin

### Row Level Security (RLS)

The verification fields are protected by existing RLS policies:
- Only admins can update verification status
- Regular users can see verification badges but cannot modify them

## Usage Flow

### For Admins:

1. Navigate to `/admin/profiles`
2. Log in with admin credentials (if not already logged in)
3. Browse profiles or use filters to find unverified profiles
4. Click "View" to see full profile details (opens profile page)
5. Click "Verify" to approve a profile
6. Click "Unverify" to remove verification (if needed)

### For Users:

- Verification badge appears on profile
- Verified profiles may have higher visibility in matchmaking
- Verification status is read-only for regular users

## Future Enhancements

Potential improvements:
- [ ] Bulk verification actions
- [ ] Verification notes/comments
- [ ] Verification history log
- [ ] Email notifications when profile is verified
- [ ] Verification criteria checklist
- [ ] Auto-verification based on rules
- [ ] Profile quality score
- [ ] Pending verification queue
- [ ] Verification required for certain features

## Testing

### Test Admin Verification:

1. **Create test admin user:**
   ```sql
   -- In Supabase SQL Editor
   UPDATE profiles
   SET is_admin = true
   WHERE user_id = 'your-user-id';
   ```

2. **Create test profiles:**
   - Sign up multiple test users
   - Complete their profiles
   - Some should be verified, some unverified

3. **Test verification flow:**
   - Login as admin
   - Go to `/admin/profiles`
   - Filter by "Unverified"
   - Verify a profile
   - Check database to confirm fields are set
   - Filter by "Verified" to see the verified profile

4. **Test unverification:**
   - Click "Unverify" on a verified profile
   - Confirm fields are cleared in database

### Database Verification Query:

```sql
-- Check verification status
SELECT
  id,
  first_name,
  last_name,
  is_verified,
  verified_at,
  verified_by,
  created_at
FROM profiles
WHERE profile_status = 'active'
ORDER BY created_at DESC;
```

## Troubleshooting

### "Forbidden - Admin access required"

**Cause:** User is not marked as admin in database

**Solution:**
```sql
UPDATE profiles
SET is_admin = true
WHERE user_id = 'your-user-id';
```

### Profiles not loading

**Cause:** Migration not applied

**Solution:** Run the migration:
```bash
supabase db push
```

Or manually run the SQL from `add_is_verified_column.sql`

### Verification button not working

**Cause:** API route error or permission issue

**Solution:**
1. Check browser console for errors
2. Verify admin authentication
3. Check server logs
4. Ensure RLS policies allow admin updates

## Related Files

- `/src/app/admin/profiles/page.tsx` - Admin profiles UI
- `/src/app/api/admin/profiles/route.ts` - Profiles list API
- `/src/app/api/admin/profiles/verify/route.ts` - Verification API
- `/src/components/ui/badge.tsx` - Badge component
- `/supabase/migrations/add_is_verified_column.sql` - Database migration

## Summary

The admin profile verification system provides a complete solution for managing profile quality and authenticity. Admins can easily review, verify, and manage user profiles through an intuitive interface with proper security and tracking.
