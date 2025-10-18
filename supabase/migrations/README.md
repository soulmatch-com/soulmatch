# Supabase Migration Scripts

This directory contains SQL migration scripts for the SoulMatch database.

## Migration Files

### 1. `ensure_profiles_constraints.sql` ⭐ **RECOMMENDED**
Comprehensive migration that ensures all constraints and columns are properly set:
- Adds `is_verified`, `verified_at`, `verified_by` columns
- Ensures `profile_status` has CHECK constraint with valid values: `incomplete`, `pending`, `active`, `suspended`, `deleted`
- Creates all necessary indexes
- Validates and cleans up existing data
- Includes documentation comments

**This is the main migration you should run. It's safe to run multiple times.**

### 2. `add_is_verified_column.sql`
Standalone migration to add verification tracking columns only:
- `is_verified` (BOOLEAN) - Whether profile has been verified by admin
- `verified_at` (TIMESTAMPTZ) - When profile was verified
- `verified_by` (UUID) - Admin user who verified the profile

### 3. `add_profile_status_constraint.sql`
Standalone migration to add CHECK constraint to profile_status column ensuring only valid status values.

### 4. `verify_profiles_schema.sql`
Verification script to check the current schema and data state.

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `ensure_profiles_constraints.sql`
5. Click **Run** to execute
6. Review the output to see profile status distribution
7. Verify by running `verify_profiles_schema.sql`

### Option 2: Using Supabase CLI
```bash
# Make sure you're in the project root
cd soulmatch-web

# Run the migration
supabase db push

# Or run specific migration file
psql $DATABASE_URL -f supabase/migrations/ensure_profiles_constraints.sql
```

### Option 3: Using psql directly
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/ensure_profiles_constraints.sql
```

## Verification Steps

After running the migration, verify it was successful:

1. Run the verification script:
   ```sql
   -- In Supabase SQL Editor, run:
   \i supabase/migrations/verify_profiles_schema.sql
   ```

2. Check that the following columns exist in profiles table:
   - `is_verified`
   - `verified_at`
   - `verified_by`
   - `profile_status` (with CHECK constraint)

3. Check that indexes were created:
   - `idx_profiles_status`
   - `idx_profiles_is_verified`
   - `idx_profiles_verified_at`

4. Check that constraints exist:
   - `profiles_profile_status_check` - Ensures only valid status values

## Post-Migration Tasks

### Optional: Update Existing Active Profiles
If you want to mark existing active profiles as verified, uncomment and run this line in the migration:
```sql
UPDATE profiles SET is_verified = TRUE WHERE profile_status = 'active';
```

### Update API Integration
The following API endpoints now support the `is_verified` column:
- `GET /api/admin/stats` - Returns active profiles count (verified only)
- Admin dashboard now displays accurate verification statistics

## Rollback (If Needed)

If you need to rollback this migration:
```sql
-- Remove CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_profile_status_check;

-- Remove indexes
DROP INDEX IF EXISTS idx_profiles_status;
DROP INDEX IF EXISTS idx_profiles_is_verified;
DROP INDEX IF EXISTS idx_profiles_verified_at;

-- Remove columns
ALTER TABLE profiles DROP COLUMN IF EXISTS is_verified;
ALTER TABLE profiles DROP COLUMN IF EXISTS verified_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS verified_by;

-- Note: profile_status column itself is not removed as it's a core column
```

## Schema Overview

### Profile Status Values
- `incomplete` - Profile not yet completed by user
- `pending` - Awaiting admin verification
- `active` - Active and verified profiles
- `suspended` - Temporarily suspended profiles
- `deleted` - Soft-deleted profiles

### Verification Workflow
1. User completes profile → `profile_status = 'incomplete'` or `'pending'`, `is_verified = false`
2. Admin reviews and approves → `profile_status = 'active'`, `is_verified = true`, `verified_at = NOW()`, `verified_by = admin_id`
3. Profile becomes searchable and matchable

### Pending Verification Logic
Profiles are considered "Pending Verification" when:
- `profile_status = 'pending'` (explicitly pending), OR
- `profile_status = 'active'` AND `is_verified = false` (active but not yet verified)

This ensures the admin dashboard shows all profiles that need admin review, regardless of their current status.

## Support

For issues or questions:
- Check Supabase logs in Dashboard → Logs
- Verify table structure using `verify_profiles_schema.sql`
- Review API error logs in browser console
