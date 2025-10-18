# Quick Start - Database Migration

## What This Does
Adds verification tracking and ensures data integrity for the profiles table in your SoulMatch application.

## Run This Migration

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run Migration
Copy the entire contents of `ensure_profiles_constraints.sql` and paste into the SQL Editor, then click **Run**.

### Step 3: Verify Success
You should see output showing:
- Profile status distribution table
- All operations completed successfully

## What Gets Added

### New Columns
```
is_verified        BOOLEAN       (default: false)    - Admin verification status
verified_at        TIMESTAMPTZ   (nullable)          - When it was verified
verified_by        UUID          (nullable)          - Which admin verified it
```

### New Constraint
```
profile_status CHECK constraint ensures only these values:
- incomplete
- pending
- active
- suspended
- deleted
```

### New Indexes (for performance)
```
idx_profiles_status
idx_profiles_is_verified
idx_profiles_verified_at
```

## After Migration

Your admin dashboard at `/admin/dashboard` will now show:
- **Active Profiles**: Only profiles with `profile_status = 'active'` AND `is_verified = true`
- **Pending Verification**: Profiles with `profile_status = 'pending'`
- **Incomplete Profiles**: Profiles with `profile_status = 'incomplete'`

## Troubleshooting

### Error: "column already exists"
No problem! The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### Error: "constraint already exists"
The migration drops and recreates constraints, so this shouldn't happen. If it does, the old constraint will be replaced.

### Data looks wrong after migration
Run the verification script `verify_profiles_schema.sql` to check your data distribution.

### Need to undo?
See the Rollback section in `README.md`

## Next Steps

After running the migration:
1. Test the admin dashboard at `/admin/dashboard`
2. Verify profile counts match your database
3. Test creating a new profile (should be `incomplete` status)
4. Test admin verification workflow (set `is_verified = true`)

---

**Questions?** Check the full `README.md` for detailed documentation.
