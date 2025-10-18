# How to Get Your Supabase Service Role Key

## Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your project: **ggwzyfhvddhemzxsghmy**

## Step 2: Navigate to API Settings

1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** under Project Settings

## Step 3: Copy Service Role Key

1. Scroll down to **Project API keys** section
2. Find the **service_role** key (it's a JWT token starting with `eyJ...`)
3. Click the **Copy** button or **Reveal** to show it
4. Copy the entire key

## Step 4: Update .env.local

1. Open `/var/www/html/project/soulmatch-web/.env.local`
2. Replace this line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   With:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnd3p5Zmh2ZGRoZW16eHNnaG15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzOTA3OSwiZXhwIjoyMDc1MjE1MDc5fQ.YOUR_ACTUAL_KEY_HERE
   ```

## Step 5: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 6: Test the Dashboard

1. Refresh your admin dashboard
2. Open DevTools (F12) → Network tab
3. Check `/api/admin/stats` response
4. You should now see:
   ```json
   {
     "stats": {
       "totalUsers": 1,
       "pendingVerification": 1,
       ...
     },
     "pendingProfiles": [
       {
         "first_name": "Souriraj",
         "last_name": "Selvaraj",
         ...
       }
     ]
   }
   ```

---

## Important Security Notes

⚠️ **NEVER commit the service role key to version control!**

The service role key bypasses RLS and has full database access. Keep it secure:

- ✅ Store in `.env.local` (which should be in `.gitignore`)
- ✅ Use only in server-side API routes
- ✅ Never expose to client-side code
- ✅ Keep it secret like a password

---

## Alternative: Use RLS Policy Instead

If you prefer not to use the service role key, you can add an RLS policy instead:

Run this in Supabase SQL Editor:
```sql
-- Option: Create admin policy (instead of using service role)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
```

Then revert the API to use the regular client:
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

---

## Troubleshooting

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"
- Make sure you saved `.env.local`
- Restart the dev server
- Check the key is on the correct line

### Still showing 0 profiles
- Verify the service role key is correct
- Check it's the `service_role` key, not the `anon` key
- Check server logs for errors
- Make sure dev server was restarted

### Where to find the key
Project: https://supabase.com/dashboard/project/ggwzyfhvddhemzxsghmy/settings/api
