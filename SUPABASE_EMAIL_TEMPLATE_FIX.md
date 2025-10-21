# Fix Supabase Password Reset Email Template

## Problem
The password reset link is expiring immediately with `otp_expired` error because the email template is using the wrong format.

## Solution: Update Email Template in Supabase

### Step 1: Go to Email Templates

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/ggwzyfhvddhemzxsghmy
2. Navigate to **Authentication** → **Email Templates**
3. Click on **"Reset Password"** template

### Step 2: Update the Template

Replace the existing template with this:

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

### Step 3: Verify Site URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Check **Site URL** is set to: `http://localhost:3000`
3. In **Redirect URLs**, ensure you have:
   ```
   http://localhost:3000/**
   http://localhost:3000/api/auth/confirm
   http://localhost:3000/reset-password
   ```

### Step 4: Save and Test

1. Click **Save** on the email template
2. Go to your app: http://localhost:3000/forgot-password
3. Request a NEW password reset email
4. Check your email and click the NEW link
5. You should now successfully land on the reset password form

## Why This Works

- The new template uses `{{ .TokenHash }}` which is the PKCE-compliant token
- It redirects to `/api/auth/confirm` which properly exchanges the token
- The confirm route then redirects to `/reset-password` with an active session
- This prevents the `otp_expired` error

## Alternative: Use Implicit Flow (Not Recommended)

If you can't update the email template, you can use the implicit flow by setting:

1. Go to **Authentication** → **Settings**
2. Find **"Auth Flow Type"** or **"Password Recovery Flow"**
3. Change to **"Implicit"** (if available)
4. Update redirect URL back to `/reset-password` in your code

However, **PKCE is more secure**, so updating the email template is the better solution.
