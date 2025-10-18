# Final Steps to Fix Admin Dashboard

## The Problem
Your admin dashboard shows all zeros because of **RLS (Row Level Security)** policies blocking the queries.

## The Solution
We updated the admin API to use a **service role key** which bypasses RLS policies.

---

## 🚀 What You Need to Do Now:

### Step 1: Get Your Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/ggwzyfhvddhemzxsghmy/settings/api
2. Scroll to **Project API keys** section
3. Find the **service_role** key
4. Click **Reveal** or **Copy**

### Step 2: Update `.env.local`

Open `/var/www/html/project/soulmatch-web/.env.local` and replace:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

With your actual key:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnd3p5Zmh2ZGRoZW16eHNnaG15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzOTA3OSwiZXhwIjoyMDc1MjE1MDc5fQ.PASTE_YOUR_KEY_HERE
```

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Step 4: Test the Dashboard

1. Open admin dashboard: http://localhost:3000/admin/dashboard
2. Press **Ctrl+Shift+R** (hard refresh)
3. You should now see:
   - **Pending Verification: 1**
   - **Souriraj Selvaraj** in the verification queue

### Step 5: Verify in DevTools

1. Press **F12** → **Network** tab
2. Find `/api/admin/stats` request
3. Check the response - should show:

```json
{
  "stats": {
    "totalUsers": 1,
    "activeProfiles": 0,
    "pendingVerification": 1,
    "incompleteProfiles": 0,
    "suspendedProfiles": 0,
    "recentRegistrations": 1
  },
  "latestUsers": [
    {
      "first_name": "Souriraj",
      "last_name": "Selvaraj",
      "profile_status": "pending"
    }
  ],
  "pendingProfiles": [
    {
      "first_name": "Souriraj",
      "last_name": "Selvaraj",
      "profile_status": "pending",
      "is_verified": false
    }
  ]
}
```

---

## ✅ What We Changed:

1. **Migration**: Added `is_verified`, `verified_at`, `verified_by` columns ✅
2. **API Client**: Created `src/lib/supabase/admin.ts` for admin operations ✅
3. **API Endpoint**: Updated `/api/admin/stats` to use admin client ✅
4. **Documentation**: Created troubleshooting guides ✅

---

## 🔒 Security Notes

The service role key:
- ✅ Bypasses RLS policies
- ✅ Has full database access
- ✅ Should ONLY be used in server-side API routes
- ✅ Is already in `.gitignore` (won't be committed)
- ⚠️ Keep it secret like a password!

---

## 📚 Reference Files:

- **Migration Script**: `supabase/migrations/ensure_profiles_constraints.sql` ✅ (Already run)
- **Admin Client**: `src/lib/supabase/admin.ts` ✅ (Created)
- **API Endpoint**: `src/app/api/admin/stats/route.ts` ✅ (Updated)
- **Troubleshooting**: `supabase/migrations/TROUBLESHOOTING.md`
- **Get Service Key**: `GET_SERVICE_ROLE_KEY.md`

---

## 🎯 Expected Result:

After completing these steps, your admin dashboard will show:

**Stats Cards:**
- Total Users: **1**
- Active Profiles: **0**
- Pending Verification: **1** ← Should show Souriraj
- Incomplete Profiles: **0**

**Profile Verification Queue:**
- **Souriraj Selvaraj**
- Status: pending
- Badge: "Pending" (yellow)

---

## ❓ Still Not Working?

1. **Check server logs** in the terminal where `npm run dev` is running
2. **Check browser console** (F12 → Console) for errors
3. **Verify the key** is correct (should start with `eyJ...`)
4. **Restart the server** after updating `.env.local`
5. **Hard refresh** the browser (Ctrl+Shift+R)

---

## Alternative Solution (If you prefer not to use service role)

Instead of using the service role key, you can add an RLS policy:

```sql
-- Run in Supabase SQL Editor:
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
```

Then revert the API changes to use the regular client.

---

**Ready to test!** 🚀 Just get the service role key and restart the server.
