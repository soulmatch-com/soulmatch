# Admin Authentication Setup Guide

The admin system now uses **database-based authentication** with bcrypt password hashing.

## 📋 Prerequisites

- Supabase project set up
- Database access
- bcryptjs package installed

## 🚀 Setup Steps

### Step 1: Install Dependencies

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### Step 2: Create Admin Table

Run the SQL migration in your Supabase SQL Editor:

**File**: `src/lib/database/migrations/create_admins_table.sql`

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the entire SQL file
3. Click "Run" to create the `admins` table

This creates:
- ✅ `admins` table with proper schema
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Auto-update triggers

### Step 3: Generate Password Hashes

Run the hash generation script:

```bash
npx tsx src/scripts/hash-password.ts
```

This will output bcrypt hashes for common passwords (admin123, moderator123).

### Step 4: Seed Initial Admin Users

**Option A: Manual SQL Insert**

1. Copy the hashes from Step 3
2. Edit `src/lib/database/migrations/seed_admins.sql`
3. Replace `$2a$10$XYZ...` with actual hashes
4. Run the SQL in Supabase SQL Editor

**Option B: Use Create Admin Script**

```bash
# Set environment variables first
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the script
npx tsx src/scripts/create-admin.ts
```

Follow the prompts to create admin users.

### Step 5: Test Login

1. Start your Next.js app: `npm run dev`
2. Go to: `http://localhost:3000/admin/login`
3. Login with your created admin credentials

## 👤 Creating Admin Users

### Method 1: Interactive Script (Recommended)

```bash
npx tsx src/scripts/create-admin.ts
```

Then enter:
- Email
- Password
- Name
- Role (super_admin/admin/moderator)

### Method 2: Direct SQL Insert

```sql
INSERT INTO admins (email, password_hash, name, role)
VALUES (
  'admin@soulmatch.com',
  '$2a$10$...',  -- Use hash from hash-password.ts
  'Super Admin',
  'super_admin'
);
```

### Method 3: Programmatically

```typescript
import { createClient } from '@/lib
/supabase/server'
import { hashPassword } from '@/lib/utils/password'

const supabase = await createClient()
const passwordHash = await hashPassword('your-password')

await supabase.from('admins').insert({
  email: 'admin@example.com',
  password_hash: passwordHash,
  name: 'Admin Name',
  role: 'super_admin',
})
```

## 🔐 Admin Roles

| Role | Permissions |
|------|-------------|
| **super_admin** | Full access - can create/delete admins |
| **admin** | Manage users and profiles |
| **moderator** | View only, verify profiles |

## 📁 Files Created

### Database Schema
- `src/lib/database/migrations/create_admins_table.sql` - Table creation
- `src/lib/database/migrations/seed_admins.sql` - Seed data template

### Utilities
- `src/lib/utils/password.ts` - Password hashing functions

### Scripts
- `src/scripts/create-admin.ts` - Interactive admin creation
- `src/scripts/hash-password.ts` - Generate password hashes

### API Routes
- `src/app/api/admin/auth/login/route.ts` - Login endpoint (updated)

## 🔒 Security Features

✅ **Bcrypt password hashing** - Industry standard with salt rounds
✅ **Row Level Security (RLS)** - Database-level access control
✅ **Active status check** - Disabled accounts cannot login
✅ **Last login tracking** - Audit trail
✅ **Email case normalization** - Prevents duplicate accounts
✅ **Password hash exclusion** - Never sent to client

## 🧪 Testing

### Test Login API

```bash
# Generate a hash first
npx tsx src/scripts/hash-password.ts

# Create admin in database (use hash from above)

# Test login
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@soulmatch.com",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "admin": {
    "id": "...",
    "email": "admin@soulmatch.com",
    "name": "Super Admin",
    "role": "super_admin",
    "is_active": true
  },
  "message": "Login successful"
}
```

## ⚠️ Important Notes

1. **Service Role Key**: The create-admin script needs `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
2. **Password Security**: Never commit passwords or hashes to git
3. **First Admin**: Create at least one super_admin first
4. **RLS Policies**: Ensure RLS is enabled on admins table

## 🔄 Migration from Static Users

The old static admin credentials are removed. All authentication now uses the database.

**Old (removed)**:
```typescript
const ADMIN_CREDENTIALS = [...]  // ❌ No longer used
```

**New (database)**:
```typescript
const admin = await supabase
  .from('admins')
  .select('*')
  .eq('email', email)
  .single()  // ✅ Database-driven
```

## 📚 Next Steps

1. ✅ Run database migration
2. ✅ Create your first super_admin
3. ✅ Test login at `/admin/login`
4. ✅ Create additional admin users as needed
5. ⏭️ Consider adding 2FA (future enhancement)

## 🔄 Reset Admin Password

If you forgot your admin password or need to reset it:

```bash
# Quick reset (recommended)
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com NewPassword123

# Or without arguments to see usage
npx tsx scripts/quick-reset-admin.ts
```

**See:** `ADMIN_PASSWORD_RESET.md` for detailed instructions

---

## 🆘 Troubleshooting

**Error: "Missing Supabase environment variables"**
- Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Error: "relation 'admins' does not exist"**
- Run the `create_admins_table.sql` migration

**Error: "Invalid email or password"**
- Reset password: `npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com NewPass123`
- Verify admin exists: `npx tsx scripts/verify-admin-table.ts`
- Check password hash is correct
- Ensure `is_active = true`

**Error: "Account is inactive"**
- Update admin: `UPDATE admins SET is_active = true WHERE email = '...'`

**Can't login to admin portal?**
- See: `ADMIN_PASSWORD_RESET.md` for complete troubleshooting guide
