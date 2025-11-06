# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SoulMatch Web** is a matrimonial/matchmaking web application built with Next.js 15.5.4, React 19, TypeScript, and Tailwind CSS v4. The application uses Supabase for authentication and database, Cloudinary for image uploads, and follows the Next.js App Router architecture.

## Development Commands

### Setup
```bash
cd soulmatch-web
npm install
```

### Development
```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build with Turbopack
npm start            # Start production server
npm run lint         # Run ESLint
```

## Architecture Overview

### Authentication & Database
- **Supabase Integration**: Uses `@supabase/ssr` for server-side rendering with cookie-based auth
  - **Client-side**: Use `createClient()` from `@/lib/supabase/client` in Client Components
  - **Server-side**: Use `await createClient()` from `@/lib/supabase/server` in Server Components and API routes
  - **Middleware**: Auth middleware in `src/lib/supabase/middleware.ts` protects dashboard routes

- **Authentication Flow**:
  1. Signup → Email confirmation → `/api/auth/callback` → Profile creation
  2. Login → Dashboard (if profile exists) or Profile creation
  3. Email redirect URLs must point to `/api/auth/callback` for proper session handling

### Route Organization

**App Router Structure** (`src/app/`):
- `(auth)/` - Route group for authentication pages (login, signup, verify-otp, forgot-password, reset-password)
  - Not protected by auth middleware
  - Uses auth layout without navigation
- `(dashboard)/` - Route group for authenticated user pages
  - Protected by middleware - redirects to `/login` if not authenticated
  - Includes: dashboard, search, profile (create/edit/[id])
- `admin/` - Admin portal with separate authentication system
  - Uses separate admin layout with AdminHeader
  - Separate authentication via adminStore (localStorage-persisted)
  - Routes: dashboard, users, profiles, verification-queue, active-profiles, success-stories, settings
  - API routes under `/api/admin/`
- `api/` - API routes
  - `api/auth/callback` - Handles email confirmation redirects
  - `api/auth/signout` - Signs out user and redirects to home
  - `api/upload` - Handles Cloudinary image uploads
  - `api/admin/*` - Admin-specific API endpoints

### Database Schema

**Profiles Table**: Core user profile data with 30+ fields across categories:
- Basic info: name, DOB, gender, marital status, location, photo
- Cultural: religion, caste, mother tongue
- Physical: height, weight, complexion, blood group
- Professional: education, occupation, company, income, employment type
- Family: parents' details, family type/status/values
- Siblings: detailed sibling breakdown
- Other: about_me, hobbies (array), profile_completion_percentage

**Success Stories Table**: Matrimonial success stories with moderation workflow:
- Couple information: names, location, marriage date
- Story content: story_text, couple_photo_url, wedding_photos (array)
- Publishing controls: is_featured, is_published, display_order
- Moderation: submission_type (admin/user_submitted), status (pending/approved/rejected)
- Audit trail: submitted_by, approved_by, created_at, updated_at

**Key Functions**:
- `calculate_profile_completion()`: Automatically calculates completion % based on 30 fields
- `update_profile_completion()`: Trigger that updates percentage on insert/update
- Profile completion function located in `database/update_profile_completion_function.sql`

### Type System

**Database Types** (`src/types/database.types.ts`):
- Generated TypeScript types for Supabase tables
- Includes Row, Insert, and Update types for profiles table
- When adding new database columns, update this file to match schema

### Image Uploads

**Cloudinary Integration**:
- Profile photos uploaded via `/api/upload` route
- Uses server-side Cloudinary SDK with credentials from env vars
- Photos stored in `soulmatch/profiles/` folder
- Returns secure HTTPS URL for storage in database

**Next.js Image Configuration**:
- Cloudinary hostname (`res.cloudinary.com`) whitelisted in `next.config.ts`
- Required for Next.js Image component optimization

### State Management

- **Zustand**: Global state management
  - `authStore.ts` - User authentication state (ephemeral)
  - `adminStore.ts` - Admin authentication state (localStorage-persisted with role-based access)
- **React Hook Form + Zod**: Form validation throughout app
- **TanStack Query**: For data fetching (installed but not yet implemented)

### UI Components

**Shadcn/UI Components** (`src/components/ui/`):
- Built on Radix UI primitives
- Styled with Tailwind CSS
- Common components: Button, Card, Input, Select, Avatar, Dialog, Textarea

**Form Validation**:
- Zod schemas in `src/lib/validations/`
- `auth.schema.ts`: Login, signup validation
- `profile.schema.ts`: Profile form validation
- `success-story.schema.ts`: Success story submission validation

## Important Implementation Details

### Date Handling
- **Critical**: When saving dates to PostgreSQL, convert to `YYYY-MM-DD` format
- Use `.toISOString().split('T')[0]` for Date objects
- Timezone-aware strings like "GMT+0530" will cause database errors

### Select Components
- **Never use empty string** `value=""` in Radix Select components
- Use `value="any"` or other non-empty string for "Any" options
- Use `value={field || undefined}` to handle empty initial state

### Profile Completion
- Completion percentage auto-calculates on profile insert/update via database trigger
- Counts 30 fields across all categories
- Update the calculation function when adding new fields to ensure accurate tracking

### Authentication Redirects
- Email confirmation links must go to `/api/auth/callback`
- Callback route exchanges code for session, then redirects to destination
- Do not redirect email confirmations directly to protected routes

### Middleware Behavior
- Middleware defined in `middleware.ts` (root level) delegates to `src/lib/supabase/middleware.ts`
- **Public routes** (no auth required): `/`, `/login`, `/signup`, `/verify-otp`, `/forgot-password`, `/reset-password`
- **Protected routes**: All other routes except API auth endpoints
- **Profile enforcement**: Authenticated users without complete profiles redirected to `/profile/create`
- Unauthenticated users redirected to `/login`
- Auth state managed via Supabase cookies
- **Admin portal**: Separate authentication system, not managed by Supabase middleware

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key (server-only)

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=  # Cloudinary cloud name
CLOUDINARY_API_KEY=                 # Cloudinary API key
CLOUDINARY_API_SECRET=              # Cloudinary API secret

NEXT_PUBLIC_APP_URL=                # Application URL (e.g., http://localhost:3000)
```

## Database Migrations

**Location**: `database/` and `supabase/migrations/`

**Key Migrations**:
1. `database/schema.sql` - Initial schema with profiles table, triggers, RLS policies
2. `supabase/migrations/add_professional_and_family_fields.sql` - Adds professional, family, sibling fields
3. `database/update_profile_completion_function.sql` - Updates completion calculation for new fields
4. `database/migrations/create_success_stories_table.sql` - Success stories table with moderation workflow

**Running Migrations**:
- Execute SQL files in Supabase SQL Editor
- Or use Supabase CLI: `supabase db push`
- After schema changes, update `src/types/database.types.ts`

## Common Patterns

### Creating a New Protected Page
1. Add route under `src/app/(dashboard)/`
2. Use `'use client'` for client components
3. Import Supabase client: `import { createClient } from '@/lib/supabase/client'`
4. Fetch user with: `const { data: { user } } = await supabase.auth.getUser()`

### Adding a New Database Field
1. Add column in Supabase via SQL or dashboard
2. Update `src/types/database.types.ts` (Row, Insert, Update)
3. Update `database/update_profile_completion_function.sql` if field should count toward completion
4. Add field to relevant forms (create/edit profile)

### Form Validation
1. Define Zod schema in `src/lib/validations/`
2. Use with React Hook Form: `resolver: zodResolver(yourSchema)`
3. Access errors: `formState: { errors }`

### Admin Portal Development
1. Admin routes go under `src/app/admin/`
2. Admin API endpoints under `src/app/api/admin/`
3. Use `useAdminStore` for admin authentication state
4. Admin config centralized in `src/modules/admin/config/index.ts`
5. Admin components in `src/components/admin/`

## Path Aliases

- `@/*` maps to `./src/*`
- Import example: `import { Button } from '@/components/ui/button'`

## Styling

- **Tailwind CSS v4** with PostCSS
- Custom font variables: `--font-geist-sans`, `--font-geist-mono`
- Dark mode support ready via CSS classes
- Component styles follow shadcn/ui conventions
