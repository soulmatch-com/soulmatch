# Authentication Enhancement Guide

This guide covers the enhanced authentication features added to SoulMatch Web, including password reset, social login, and two-factor authentication (2FA).

## Features Implemented

### 1. Password Reset Flow ✅

Users can now reset their password if they forget it.

**Pages Created:**
- `/forgot-password` - Request password reset email
- `/reset-password` - Set new password

**Components:**
- `ForgotPasswordForm.tsx` - Handles email submission for password reset
- `ResetPasswordForm.tsx` - Handles setting the new password

**User Flow:**
1. User clicks "Forgot password?" on login page
2. User enters their email address
3. Supabase sends a password reset email
4. User clicks the link in the email
5. User is redirected to `/reset-password` page
6. User enters and confirms new password
7. Password is updated and user is redirected to login

### 2. Social Login (OAuth) ✅

Users can sign in/up using Google or GitHub accounts.

**Component:**
- `SocialLogin.tsx` - Displays social login buttons

**Supported Providers:**
- Google
- GitHub

**Setup Required:**

#### Enable OAuth Providers in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable and configure each provider:

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Add authorized redirect URIs:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
6. Copy Client ID and Client Secret to Supabase

**GitHub OAuth:**
1. Go to GitHub **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in the details:
   - Application name: SoulMatch Web
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

#### Update Redirect URLs

In your Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add your site URL: `http://localhost:3000` (for development)
3. Add redirect URLs:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-production-domain.com/api/auth/callback` (for production)

### 3. Two-Factor Authentication (2FA) ✅

Users can enable TOTP-based 2FA for enhanced security.

**Pages Created:**
- `/2fa-setup` - Configure 2FA settings

**Components:**
- `TwoFactorSetup.tsx` - Handles 2FA enrollment and management
- `TwoFactorVerification.tsx` - Handles 2FA code verification during login

**User Flow:**

**Enabling 2FA:**
1. User navigates to `/2fa-setup`
2. User clicks "Set up 2FA"
3. QR code and secret key are displayed
4. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
5. User enters 6-digit verification code from app
6. 2FA is enabled

**Login with 2FA:**
1. User enters email and password
2. If 2FA is enabled, verification screen appears
3. User enters 6-digit code from authenticator app
4. User is logged in

**Disabling 2FA:**
1. User navigates to `/2fa-setup`
2. User clicks "Disable 2FA"
3. 2FA is disabled

**Setup Required:**

#### Enable MFA in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Multi-Factor Authentication**
3. Enable **TOTP (Time-based One-Time Password)**
4. Save changes

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx          # NEW: Password reset request
│   │   ├── reset-password/
│   │   │   └── page.tsx          # NEW: Password reset form
│   │   └── 2fa-setup/
│   │       └── page.tsx          # NEW: 2FA configuration
│   └── api/
│       └── auth/
│           └── callback/
│               └── route.ts      # OAuth callback handler
└── components/
    └── auth/
        ├── LoginForm.tsx         # UPDATED: Added social login + 2FA
        ├── SignupForm.tsx        # UPDATED: Added social login
        ├── SocialLogin.tsx       # NEW: Social login buttons
        ├── ForgotPasswordForm.tsx # NEW: Request password reset
        ├── ResetPasswordForm.tsx  # NEW: Set new password
        ├── TwoFactorSetup.tsx     # NEW: 2FA management
        └── TwoFactorVerification.tsx # NEW: 2FA verification
```

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Email Configuration

For password reset to work, you need to configure email settings in Supabase:

1. Go to **Project Settings** → **Auth** → **Email Templates**
2. Customize the "Reset Password" template if needed
3. Configure SMTP settings (or use Supabase default for development)

For production:
1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your email provider (SendGrid, AWS SES, etc.)

## Testing

### Test Password Reset
1. Navigate to `/login`
2. Click "Forgot password?"
3. Enter a registered email
4. Check email for reset link
5. Click link and set new password

### Test Social Login
1. Navigate to `/login`
2. Click "Google" or "GitHub" button
3. Authorize the application
4. You should be logged in and redirected to dashboard

### Test 2FA
1. Log in to your account
2. Navigate to `/2fa-setup`
3. Click "Set up 2FA"
4. Scan QR code with authenticator app
5. Enter verification code
6. Log out and log back in
7. You should be prompted for 2FA code

## Security Considerations

1. **Rate Limiting**: Consider implementing rate limiting for password reset requests
2. **Email Verification**: Ensure email verification is enabled for new signups
3. **Session Management**: Configure session timeout appropriately in Supabase
4. **2FA Recovery**: Consider implementing backup codes for 2FA recovery
5. **HTTPS**: Always use HTTPS in production for secure authentication

## User Experience Enhancements

1. **Remember Device**: Consider implementing "Remember this device" for 2FA
2. **Biometric Auth**: Consider adding biometric authentication for mobile
3. **Password Strength**: Add password strength indicator
4. **Account Recovery**: Implement account recovery options for 2FA

## Navigation Links

Add these links to your user settings/profile page:

```tsx
<Link href="/2fa-setup">Manage Two-Factor Authentication</Link>
<Link href="/forgot-password">Reset Password</Link>
```

## Troubleshooting

### Password Reset Email Not Received
- Check spam folder
- Verify email is configured in Supabase
- Check Supabase logs for errors

### Social Login Redirect Error
- Verify OAuth provider credentials
- Check redirect URLs are correct
- Ensure callback route exists at `/api/auth/callback`

### 2FA Not Working
- Ensure MFA is enabled in Supabase
- Verify time on device is synchronized
- Check authenticator app is generating 6-digit codes

## Next Steps

1. **Add account linking** - Allow users to link multiple OAuth providers
2. **Implement backup codes** - Generate recovery codes for 2FA
3. **Add security logs** - Track login attempts and security events
4. **Email notifications** - Notify users of security-related events
5. **Device management** - Allow users to manage trusted devices

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs/guides/auth
- Review error messages in browser console
- Check Supabase project logs
