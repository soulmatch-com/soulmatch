# Password Reset Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Failed to send reset email" or API error

#### Solution 1: Check Redirect URL Configuration

The redirect URL must be in Supabase's allowed list.

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add these URLs to the **Redirect URLs** list:
   ```
   http://localhost:3000/reset-password
   http://localhost:3000/*
   https://your-domain.com/reset-password
   https://your-domain.com/*
   ```
4. Save changes

#### Solution 2: Verify Email Settings

1. Go to **Project Settings** → **Auth**
2. Scroll to **Email Auth**
3. Ensure "Enable Email Confirmations" is configured
4. Check **Email Templates** → "Reset Password" template exists

#### Solution 3: Configure SMTP (For Production)

Development uses Supabase's default email service, but production needs SMTP:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable custom SMTP
3. Configure your email provider:
   - **SendGrid**: Use API key
   - **AWS SES**: Use SMTP credentials
   - **Mailgun**: Use SMTP credentials
   - **Gmail** (not recommended for production)

Example SendGrid configuration:
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: YOUR_SENDGRID_API_KEY
```

#### Solution 4: Check Email Rate Limits

Supabase has rate limits on password reset emails:
- Development: 3-4 emails per hour per email address
- Production: Depends on your SMTP provider

If you're testing repeatedly, wait 1 hour or use different email addresses.

#### Solution 5: Verify User Exists

For security, Supabase returns success even if the email doesn't exist. To verify:

1. Go to **Authentication** → **Users** in Supabase
2. Search for the email address
3. Ensure the user exists and is confirmed

### Browser Console Debugging

Open browser console (F12) when submitting forgot password form. Look for:

```javascript
// You should see these logs:
Sending password reset email to: user@example.com
Redirect URL: http://localhost:3000/reset-password
Reset password response: { resetData: null, error: null }
```

**Common Error Messages:**

1. **"Invalid redirect URL"**
   - Add the redirect URL to Supabase allowed list (Solution 1)

2. **"Email rate limit exceeded"**
   - Wait 1 hour or use a different email (Solution 4)

3. **"SMTP not configured"**
   - Configure SMTP settings (Solution 3)

4. **"Invalid email"**
   - Check email format is valid
   - Verify user exists in database

### Test Email Delivery

To test if emails are being sent:

1. Use a real email address you can access
2. Check spam/junk folder
3. Wait 1-2 minutes for delivery
4. Check Supabase logs:
   - Go to **Logs** → **Auth Logs** in Supabase dashboard
   - Filter for "password_recovery" events
   - Check for errors

### Manual Testing Steps

1. **Navigate to**: http://localhost:3000/forgot-password
2. **Enter email**: Use a registered user's email
3. **Submit form**
4. **Check console**: Should show success logs
5. **Check email**: Look for reset email (check spam)
6. **Click link**: Should redirect to reset-password page
7. **Enter new password**: Should update successfully

### Quick Fix Checklist

- [ ] Redirect URL is in Supabase allowed list
- [ ] User email exists in database
- [ ] Email is confirmed (if confirmations required)
- [ ] SMTP is configured (for production)
- [ ] Not hitting rate limits (wait 1 hour)
- [ ] Checked spam folder
- [ ] Browser console shows no errors
- [ ] Supabase auth logs show no errors

### Development Workaround

If emails aren't working in development, you can get the reset link from Supabase logs:

1. Submit the forgot password form
2. Go to Supabase **Logs** → **Auth Logs**
3. Find the "password_recovery" event
4. The log will contain the reset token/link
5. Copy and use it directly

### Still Not Working?

1. **Check Supabase Status**: https://status.supabase.com/
2. **Review Supabase Docs**: https://supabase.com/docs/guides/auth/passwords
3. **Check Environment Variables**:
   ```bash
   # .env.local should have:
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```
4. **Restart Dev Server**: `npm run dev`
5. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)

### Contact Support

If none of these solutions work:
1. Check Supabase Discord: https://discord.supabase.com/
2. Check GitHub issues: https://github.com/supabase/supabase/issues
3. Share browser console logs and Supabase auth logs
