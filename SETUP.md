# SoulMatch - Phase 1 Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier)
- Cloudinary account (free tier)

## Step 1: Install Dependencies

```bash
cd soulmatch-web
npm install
```

## Step 2: Set Up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to **Project Settings** → **API**
4. Copy the following values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### Create Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `database/schema.sql` from this project
3. Copy and paste the entire SQL content
4. Click **Run** to execute the schema creation

This will:
- Create the `profiles` table
- Set up Row Level Security (RLS) policies
- Create indexes for performance
- Add triggers for auto-updating timestamps and profile completion

## Step 3: Set Up Cloudinary

1. Go to [Cloudinary](https://cloudinary.com) and create a free account
2. From the Dashboard, copy:
   - `Cloud Name` → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `API Key` → `CLOUDINARY_API_KEY`
   - `API Secret` → `CLOUDINARY_API_SECRET`

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all the values from Steps 2 and 3:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_secret_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Configure Supabase Authentication

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/verify-otp`

3. Go to **Authentication** → **Email Templates**
4. Customize the email verification template if desired

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Application

### Test User Registration Flow

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click **Get Started** or **Sign Up**
3. Fill in email and password
4. Check your email for verification link
5. Click the verification link
6. You'll be redirected to create your profile
7. Fill in basic information
8. Upload a profile photo
9. Submit to create your profile
10. You'll be redirected to the dashboard

### Test Login Flow

1. Navigate to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter your registered email and password
3. Click **Sign In**
4. You'll be redirected to the dashboard

## Project Structure

```
soulmatch-web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup, verify)
│   │   ├── (dashboard)/       # Protected pages (dashboard, profile)
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── auth/              # Auth-related components
│   │   ├── profile/           # Profile-related components
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── supabase/          # Supabase client configurations
│   │   ├── validations/       # Zod validation schemas
│   │   ├── cloudinary.ts      # Cloudinary helpers
│   │   └── utils.ts           # Utility functions
│   ├── hooks/                 # React hooks
│   ├── store/                 # Zustand stores
│   └── types/                 # TypeScript type definitions
├── database/
│   └── schema.sql             # Database schema
├── middleware.ts              # Next.js middleware for auth
└── .env.local                 # Environment variables (create this)
```

## Available Features (Phase 1)

- ✅ User registration with email verification
- ✅ Login/logout functionality
- ✅ Protected routes (middleware-based)
- ✅ Basic profile creation
- ✅ Profile photo upload (via Cloudinary)
- ✅ Profile completion tracking
- ✅ Responsive UI with Tailwind CSS
- ✅ Form validation with Zod
- ✅ Toast notifications

## Common Issues & Solutions

### Issue: Supabase RLS policies blocking access

**Solution**: Make sure you're logged in and check the policies in Supabase dashboard under **Database** → **Policies**.

### Issue: Image upload failing

**Solution**:
1. Verify Cloudinary credentials in `.env.local`
2. Check browser console for errors
3. Ensure image is less than 5MB

### Issue: Email verification not working

**Solution**:
1. Check spam folder
2. Verify Supabase email settings in dashboard
3. Make sure redirect URLs are configured correctly

### Issue: Build errors with TypeScript

**Solution**: Run `npm run build` to see detailed errors. Most common issues are missing type definitions or incorrect imports.

## Next Steps (Phase 2)

Once Phase 1 is working:
1. Extended profile forms (education, occupation, family)
2. Partner preferences
3. Profile search and filtering
4. Match recommendations

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Support

For issues or questions:
1. Check this documentation
2. Review the DEVELOPMENT_PLAN.md file
3. Check Supabase and Cloudinary documentation
4. Review Next.js 15 documentation

## Security Notes

- Never commit `.env.local` to version control
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Keep `CLOUDINARY_API_SECRET` secret
- Use HTTPS in production
- Enable RLS policies on all tables
