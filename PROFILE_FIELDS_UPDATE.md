# Profile Fields Update - Sub Caste, Gothram & Dosham

## Summary

Added new matrimonial profile fields to support traditional matchmaking requirements:
- **Sub Caste**: Optional field (already existed in schema, now added to UI)
- **Gothram**: Optional field for family lineage information
- **Dosham**: Dropdown with Yes/No/Don't Know options
- **Dosham Details**: Conditional text area that appears when "Yes" is selected

## Changes Made

### 1. Database Schema (`/supabase/migrations/add_gothram_and_dosham_fields.sql`)
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gothram TEXT,
  ADD COLUMN IF NOT EXISTS dosham TEXT CHECK (dosham IN ('yes', 'no', 'dont_know')),
  ADD COLUMN IF NOT EXISTS dosham_details TEXT;
```

### 2. Validation Schema (`src/lib/validations/profile.schema.ts`)
- Added `gothram: z.string().max(50).optional()`
- Added `dosham: z.enum(['yes', 'no', 'dont_know']).optional()`
- Added `doshamDetails: z.string().max(500).optional()`
- Added validation rule: doshamDetails is required when dosham is 'yes'

### 3. Profile Form UI (`src/components/profile/BasicInfoForm.tsx`)
Added fields in the following order:
1. Religion* | Caste (existing)
2. **Sub Caste | Gothram** (new row)
3. **Dosham** (dropdown)
4. **Dosham Details** (conditional textarea - appears only when Dosham = "Yes")

## How to Apply Changes

### Step 1: Run Database Migration

Run the migration in your Supabase SQL Editor:

```bash
# Navigate to Supabase dashboard
# Go to SQL Editor
# Copy and paste the content from:
/supabase/migrations/add_gothram_and_dosham_fields.sql
# Execute the SQL
```

Or if using Supabase CLI:
```bash
cd soulmatch-web
supabase db push
```

### Step 2: Verify Database Changes

Run this query in Supabase SQL Editor to verify:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('gothram', 'dosham', 'dosham_details');
```

Expected output:
```
column_name    | data_type | is_nullable
---------------|-----------|------------
gothram        | text      | YES
dosham         | text      | YES
dosham_details | text      | YES
```

### Step 3: Test the Form

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to profile creation/edit**:
   - Create: `http://localhost:3000/profile/create`
   - Edit: `http://localhost:3000/profile/edit`

3. **Test the new fields**:

   **Test Case 1: Optional Fields**
   - Leave Sub Caste empty
   - Leave Gothram empty
   - Leave Dosham unselected
   - Form should submit successfully

   **Test Case 2: Dosham - No**
   - Select Dosham: "No"
   - Dosham Details field should NOT appear
   - Form should submit successfully

   **Test Case 3: Dosham - Don't Know**
   - Select Dosham: "Don't Know"
   - Dosham Details field should NOT appear
   - Form should submit successfully

   **Test Case 4: Dosham - Yes (without details)**
   - Select Dosham: "Yes"
   - Dosham Details field should appear
   - Try to submit without entering details
   - Should show validation error: "Please provide dosham details"

   **Test Case 5: Dosham - Yes (with details)**
   - Select Dosham: "Yes"
   - Enter details: e.g., "Manglik - Mars in 7th house"
   - Form should submit successfully

## Field Specifications

### Sub Caste
- **Type**: Text input
- **Required**: No
- **Max Length**: 50 characters
- **Placeholder**: "Optional"

### Gothram
- **Type**: Text input
- **Required**: No
- **Max Length**: 50 characters
- **Placeholder**: "Optional"
- **Description**: Family lineage/gotra information

### Dosham
- **Type**: Dropdown select
- **Required**: No
- **Options**:
  - Yes
  - No
  - Don't Know
- **Behavior**: Shows/hides Dosham Details field

### Dosham Details
- **Type**: Textarea (3 rows)
- **Required**: Yes (when Dosham = "Yes")
- **Max Length**: 500 characters
- **Placeholder**: "Please provide details about the dosham (e.g., Manglik, Chevvai, Kala Sarpa, etc.)"
- **Visibility**: Conditional - only appears when Dosham = "Yes"

## Common Dosham Types (for reference)

Users might enter:
- **Manglik/Mangal Dosha**: Mars (Mangal) in certain positions
- **Chevvai Dosham**: Tamil term for Manglik
- **Kala Sarpa Dosha**: When all planets are between Rahu and Ketu
- **Nadi Dosha**: Related to pulse/energy compatibility
- **Bhakoot Dosha**: Moon sign compatibility issue
- **Rahu/Ketu Dosha**: Related to shadow planets

## UI/UX Notes

1. **Conditional Field**: Dosham Details appears with smooth transition when "Yes" is selected
2. **Help Text**: Includes examples of common dosham types
3. **Validation**: Real-time validation shows error if user selects "Yes" but leaves details empty
4. **Layout**: Two-column grid on desktop, single column on mobile
5. **Form Flow**: Fields appear after Caste/Religion and before Mother Tongue

## Database Indexing

An index has been added on the `dosham` field for efficient filtering:
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_dosham ON profiles(dosham);
```

This enables fast filtering like:
```sql
-- Find profiles without dosham
SELECT * FROM profiles WHERE dosham = 'no';

-- Find profiles with dosham
SELECT * FROM profiles WHERE dosham = 'yes';
```

## TypeScript Types

The types are automatically inferred from the Zod schema:
```typescript
type BasicInfoInput = {
  // ... other fields
  subCaste?: string;
  gothram?: string;
  dosham?: 'yes' | 'no' | 'dont_know';
  doshamDetails?: string;
}
```

## Future Enhancements

Consider adding:
1. **Dosham Type Dropdown**: Predefined list of common dosham types
2. **Horoscope Upload**: Allow users to upload birth chart/kundli
3. **Astrology Details**: Birth time, birth place for horoscope matching
4. **Nakshatra/Star**: Birth star information
5. **Rashi**: Moon sign information

## Rollback (if needed)

If you need to rollback the database changes:
```sql
ALTER TABLE profiles
  DROP COLUMN IF EXISTS gothram,
  DROP COLUMN IF EXISTS dosham,
  DROP COLUMN IF EXISTS dosham_details;

DROP INDEX IF EXISTS idx_profiles_dosham;
```

## Support

For questions or issues:
- Check browser console for validation errors
- Verify database migration was applied successfully
- Ensure dev server was restarted after schema changes
