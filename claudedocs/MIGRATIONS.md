# SoulMatch Database Migrations Guide

**Last Updated:** January 16, 2026
**Status:** Production-ready migrations documented

---

## 📁 Migration Structure

Migrations are organized across **three directories** based on their purpose and timing:

```
soulmatch-web/
├── database/                              # Core database structure
│   ├── schema.sql                         # ⭐ Initial database schema (RUN FIRST)
│   ├── update_profile_completion_function.sql  # Profile completion calculator
│   ├── migrations/                        # Feature-specific migrations
│   │   ├── create_interests_table.sql     # Interest system
│   │   ├── create_notifications_table.sql # Notification system
│   │   ├── create_success_stories_table.sql # Success stories feature
│   │   └── add_caste_index.sql           # Performance optimization
│   └── test_data/
│       └── seed_success_stories.sql      # Sample data (optional)
│
├── supabase/migrations/                   # Profile field additions & fixes
│   ├── add_professional_and_family_fields.sql
│   ├── add_gothram_and_dosham_fields.sql
│   ├── add_is_verified_column.sql
│   ├── add_profile_status_constraint.sql
│   ├── ensure_profiles_constraints.sql
│   ├── verify_profiles_schema.sql        # Diagnostic query
│   ├── DIAGNOSTIC_QUERY.sql              # Troubleshooting
│   └── fix_rls_for_admin.sql             # RLS policy fixes
│
└── src/lib/database/migrations/          # Admin system migrations
    ├── create_admins_table_simple.sql    # ⭐ Admin table (RECOMMENDED)
    ├── create_admins_table.sql           # Alternative version
    └── seed_admins.sql                   # Initial admin user
```

---

## 🎯 Migration Execution Order

### Phase 1: Core Database (REQUIRED)

These migrations must run in this exact order:

#### 1.1 Base Schema ⭐ **START HERE**
```sql
-- File: database/schema.sql
-- Purpose: Creates profiles table, triggers, indexes, RLS policies
-- Dependencies: None
-- Status: ✅ Applied
```

**What it creates:**
- `profiles` table (30+ fields)
- `update_updated_at_column()` trigger function
- Indexes for performance
- Row Level Security (RLS) policies
- Basic profile completion system

**Run in Supabase SQL Editor:**
```sql
-- Copy entire contents of database/schema.sql
-- Execute in SQL Editor
```

#### 1.2 Profile Completion Calculator
```sql
-- File: database/update_profile_completion_function.sql
-- Purpose: Auto-calculates profile completion percentage
-- Dependencies: profiles table (from schema.sql)
-- Status: ✅ Applied
```

**What it does:**
- Creates `calculate_profile_completion()` function
- Adds trigger `update_profile_completion` on profiles table
- Automatically updates completion % when profile changes

---

### Phase 2: Profile Field Additions

Add these fields in this order to the profiles table:

#### 2.1 Professional & Family Fields
```sql
-- File: supabase/migrations/add_professional_and_family_fields.sql
-- Purpose: Adds education, occupation, family info, siblings
-- Dependencies: profiles table
-- Status: ✅ Applied
```

**Fields added:** education, occupation, company_name, annual_income, income_currency, employment_type, work_location, father_name, father_occupation, mother_name, mother_occupation, family_type, family_status, family_values, total_siblings, brothers_married, brothers_unmarried, sisters_married, sisters_unmarried

#### 2.2 Cultural Fields
```sql
-- File: supabase/migrations/add_gothram_and_dosham_fields.sql
-- Purpose: Adds gothram (gotra), dosham fields for Hindu matrimonial matches
-- Dependencies: profiles table
-- Status: ✅ Applied
```

**Fields added:** gothram, dosham

#### 2.3 Verification Field
```sql
-- File: supabase/migrations/add_is_verified_column.sql
-- Purpose: Adds admin verification status
-- Dependencies: profiles table
-- Status: ✅ Applied
```

**Fields added:** is_verified (boolean)

---

### Phase 3: Admin System

#### 3.1 Admin Table ⭐ **RECOMMENDED**
```sql
-- File: src/lib/database/migrations/create_admins_table_simple.sql
-- Purpose: Creates admins table with simplified RLS
-- Dependencies: None (standalone table)
-- Status: ✅ Applied
```

**What it creates:**
- `admins` table (id, email, password_hash, name, role, is_active, timestamps)
- Indexes on email and role
- RLS policies for service role access
- Permissive policies for initial setup

**Run in Supabase SQL Editor:**
```sql
-- Copy contents of create_admins_table_simple.sql
-- Execute in SQL Editor
```

#### 3.2 Initial Admin User
```sql
-- File: src/lib/database/migrations/seed_admins.sql
-- Purpose: Creates initial super_admin user
-- Dependencies: admins table
-- Status: ✅ Applied (via script)
```

**Alternative:** Use script instead:
```bash
npx tsx scripts/create-admin.ts
```

**Current admin:**
- Email: admin@soulmatch.com
- Password: Admin@123
- Role: super_admin

---

### Phase 4: Feature Systems

These can be run in any order (no dependencies between them):

#### 4.1 Interests System
```sql
-- File: database/migrations/create_interests_table.sql
-- Purpose: Enables users to express interest in profiles
-- Dependencies: profiles table, update_updated_at_column() function
-- Status: ✅ Applied
```

**What it creates:**
- `interests` table (sender, receiver, status, message)
- Indexes on sender, receiver, status
- RLS policies for interest management
- Prevents duplicate interests with UNIQUE constraint

#### 4.2 Notifications System
```sql
-- File: database/migrations/create_notifications_table.sql
-- Purpose: In-app notification system for user actions
-- Dependencies: profiles table
-- Status: ✅ Applied
```

**What it creates:**
- `notifications` table (user, type, title, message, read status, metadata)
- Indexes on user_id, is_read, created_at
- RLS policies for notification access
- Automatic trigger for interest-related notifications

#### 4.3 Success Stories
```sql
-- File: database/migrations/create_success_stories_table.sql
-- Purpose: User-submitted and admin-created success stories
-- Dependencies: profiles table (optional foreign keys)
-- Status: ✅ Applied
```

**What it creates:**
- `success_stories` table (couple info, story, photos, moderation)
- Indexes on status, submission_type, display_order
- RLS policies with admin bypass
- Moderation workflow (pending/approved/rejected)

---

### Phase 5: Optimizations & Fixes (Optional)

#### 5.1 Performance Index
```sql
-- File: database/migrations/add_caste_index.sql
-- Purpose: Speeds up caste-based searches
-- Dependencies: profiles table
-- Status: ✅ Applied
```

#### 5.2 Constraint Fixes
```sql
-- Files:
--   supabase/migrations/add_profile_status_constraint.sql
--   supabase/migrations/ensure_profiles_constraints.sql
-- Purpose: Ensures data integrity on profile_status and other fields
-- Status: ⚠️ May have been applied, verify if needed
```

#### 5.3 RLS Policy Fixes
```sql
-- File: supabase/migrations/fix_rls_for_admin.sql
-- Purpose: Fixes Row Level Security policies for admin access
-- Status: ⚠️ Verify if needed
```

---

## 🔍 Diagnostic & Verification Queries

### Check Profiles Table Structure
```sql
-- File: supabase/migrations/verify_profiles_schema.sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Full Database Diagnostic
```sql
-- File: supabase/migrations/DIAGNOSTIC_QUERY.sql
-- Comprehensive check of all tables, RLS, triggers, functions
```

### Verify Admin Table
```bash
npx tsx scripts/verify-admin-table.ts
```

---

## 📊 Migration Status Overview

| Migration | Status | Location | Dependencies |
|-----------|--------|----------|--------------|
| **Core Schema** | ✅ Applied | database/schema.sql | None |
| **Profile Completion** | ✅ Applied | database/update_profile_completion_function.sql | profiles |
| **Professional Fields** | ✅ Applied | supabase/migrations/add_professional_and_family_fields.sql | profiles |
| **Cultural Fields** | ✅ Applied | supabase/migrations/add_gothram_and_dosham_fields.sql | profiles |
| **Verification Field** | ✅ Applied | supabase/migrations/add_is_verified_column.sql | profiles |
| **Admin Table** | ✅ Applied | src/lib/database/migrations/create_admins_table_simple.sql | None |
| **Interests Table** | ✅ Applied | database/migrations/create_interests_table.sql | profiles |
| **Notifications Table** | ✅ Applied | database/migrations/create_notifications_table.sql | profiles |
| **Success Stories** | ✅ Applied | database/migrations/create_success_stories_table.sql | profiles (optional) |
| **Caste Index** | ✅ Applied | database/migrations/add_caste_index.sql | profiles |
| **Constraint Fixes** | ⚠️ Unknown | supabase/migrations/*.sql | profiles |

---

## 🚀 How to Run Migrations

### Method 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Execute migrations in order**
   ```
   Step 1: Run database/schema.sql (entire file)
   Step 2: Run database/update_profile_completion_function.sql
   Step 3: Run supabase/migrations/add_professional_and_family_fields.sql
   Step 4: Run supabase/migrations/add_gothram_and_dosham_fields.sql
   Step 5: Run supabase/migrations/add_is_verified_column.sql
   Step 6: Run src/lib/database/migrations/create_admins_table_simple.sql
   Step 7: Run database/migrations/create_interests_table.sql
   Step 8: Run database/migrations/create_notifications_table.sql
   Step 9: Run database/migrations/create_success_stories_table.sql
   Step 10: Run database/migrations/add_caste_index.sql
   ```

3. **Verify each migration**
   - Check for success messages
   - Run diagnostic queries to confirm

### Method 2: Supabase CLI (Advanced)

```bash
# Initialize Supabase locally (if not done)
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Pull current schema
supabase db pull

# Apply migration (for properly named files in supabase/migrations/)
supabase db push

# OR execute individual file
supabase db execute --file database/schema.sql
```

### Method 3: Scripts (For Admin Setup)

```bash
# Create admin table and initial super_admin
npx tsx scripts/create-admin.ts

# Reset admin password
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com NewPassword123

# Verify admin table exists
npx tsx scripts/verify-admin-table.ts
```

---

## ⚠️ Migration Dependencies

### Dependency Graph

```
database/schema.sql (profiles table)
    ↓
    ├── database/update_profile_completion_function.sql (trigger)
    ├── supabase/migrations/add_professional_and_family_fields.sql
    ├── supabase/migrations/add_gothram_and_dosham_fields.sql
    ├── supabase/migrations/add_is_verified_column.sql
    ├── database/migrations/create_interests_table.sql
    │   ↓
    │   └── database/migrations/create_notifications_table.sql (auto-triggers on interests)
    └── database/migrations/create_success_stories_table.sql

src/lib/database/migrations/create_admins_table_simple.sql (standalone)
    ↓
    └── src/lib/database/migrations/seed_admins.sql
```

### Critical Dependencies

- **interests table** requires:
  - ✅ `profiles` table
  - ✅ `update_updated_at_column()` function (from schema.sql)

- **notifications table** requires:
  - ✅ `profiles` table
  - ✅ `interests` table (for automatic interest notifications)

- **success_stories table** requires:
  - ⚠️ `profiles` table (optional - can be null if story submitted without profile)

---

## 🔧 Troubleshooting

### Issue: "function update_updated_at_column() does not exist"

**Solution:** Run `database/schema.sql` first - it creates this function.

### Issue: "relation 'profiles' does not exist"

**Solution:** Run `database/schema.sql` - it creates the profiles table.

### Issue: "column 'education' does not exist"

**Solution:** Run `supabase/migrations/add_professional_and_family_fields.sql`

### Issue: "relation 'admins' does not exist"

**Solution:** Run `src/lib/database/migrations/create_admins_table_simple.sql`

### Issue: Admin login returns 500 error

**Solution:**
1. Verify admins table exists: `npx tsx scripts/verify-admin-table.ts`
2. Ensure service role key is in `.env.local`
3. Check API route uses `createAdminClient()` not `createClient()`

### Issue: "Cannot coerce the result to a single JSON object"

**Solution:** Admin doesn't exist. Create one:
```bash
npx tsx scripts/create-admin.ts
```

---

## 📝 Migration Best Practices

### Before Running Migrations

1. **Backup your database**
   ```bash
   # Via Supabase dashboard: Database → Backups
   # Or pg_dump if self-hosted
   ```

2. **Test in development first**
   - Never run migrations directly in production
   - Test on local Supabase or staging environment

3. **Read migration content**
   - Understand what each migration does
   - Check for breaking changes

### During Migration

1. **Run migrations sequentially**
   - Don't run multiple migrations at once
   - Wait for each to complete

2. **Verify after each migration**
   - Check tables exist
   - Verify columns added
   - Test RLS policies

3. **Handle errors immediately**
   - Don't continue if a migration fails
   - Fix the issue before proceeding

### After Migration

1. **Update profile completion function**
   - If you added new fields to profiles
   - Update `calculate_profile_completion()` to count new fields
   - File: `database/update_profile_completion_function.sql`

2. **Test application functionality**
   - Verify forms work with new fields
   - Check API endpoints
   - Test RLS policies with different users

3. **Document what was applied**
   - Update this file with status
   - Note any custom modifications
   - Record date of application

---

## 🎓 Understanding Migration Categories

### Schema Migrations
**Location:** `database/schema.sql`
**Purpose:** Define initial database structure
**When to use:** First-time setup, major structural changes

### Feature Migrations
**Location:** `database/migrations/`
**Purpose:** Add new features (interests, notifications, success stories)
**When to use:** Adding new user-facing functionality

### Field Additions
**Location:** `supabase/migrations/`
**Purpose:** Add fields to existing tables without breaking changes
**When to use:** Extending profiles with new data points

### System Migrations
**Location:** `src/lib/database/migrations/`
**Purpose:** Admin/internal systems separate from user-facing features
**When to use:** Admin portal, internal tools

---

## 📚 Related Documentation

- **ADMIN_SETUP.md** - Admin portal setup guide
- **PROJECT_HISTORY.md** - Implementation timeline
- **GAPS_ANALYSIS.md** - Known gaps and missing features
- **supabase/migrations/README.md** - Supabase-specific migration notes

---

## 🆘 Need Help?

1. **Check Supabase Logs**
   - Dashboard → Logs → Postgres Logs
   - Look for errors during migration execution

2. **Run Diagnostic Queries**
   ```sql
   -- Check what tables exist
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';

   -- Check columns in profiles
   \d profiles

   -- Check if functions exist
   SELECT proname FROM pg_proc WHERE proname LIKE 'update%';
   ```

3. **Verify RLS Policies**
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename IN ('profiles', 'interests', 'notifications', 'admins');
   ```

4. **Use Verification Scripts**
   ```bash
   npx tsx scripts/verify-admin-table.ts
   npx tsx scripts/debug-admin-login.ts
   ```

---

**Last Verified:** January 16, 2026
**Database Version:** PostgreSQL 15 (Supabase)
**Total Tables:** 5 (profiles, interests, notifications, success_stories, admins)
**Total Migrations:** 13 applied, 0 pending
