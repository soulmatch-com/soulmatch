# Admin Module - Microservice Migration Guide

## Current Structure

The admin functionality is now organized as a self-contained module in `/src/modules/admin/` for easy extraction into a microservice.

```
src/
├── modules/admin/           # Admin module (microservice-ready)
│   ├── README.md           # Admin module documentation
│   ├── index.ts            # Main export
│   ├── config/             # Configuration
│   ├── types/              # TypeScript types
│   ├── services/           # API service layer
│   └── store/              # State management
├── components/admin/        # Admin UI components
├── app/admin/              # Admin routes
└── app/api/admin/          # Admin API endpoints (temporary)
```

## What's Been Done

✅ **Modular Structure**: All admin code isolated in `/modules/admin/`
✅ **Service Layer**: API calls abstracted in service classes
✅ **Type Safety**: All types defined in one place
✅ **Config Management**: Centralized configuration
✅ **Single Import**: Import everything from `@/modules/admin`

## Benefits

1. **Easy Migration**: Copy `/modules/admin/` to new microservice
2. **No Code Duplication**: Service layer ready to use
3. **Type Sharing**: Share types between frontend and backend
4. **Configuration**: Change API URL via environment variable
5. **Testing**: Test admin features independently

## Migration Steps (When Ready)

### Step 1: Create Admin Microservice
```bash
# Create new Node.js/Express/Nest.js service
mkdir soulmatch-admin-api
cd soulmatch-admin-api
npm init -y
```

### Step 2: Implement Backend Endpoints
Based on service methods in `/src/modules/admin/services/`:
- POST `/auth/login` - Admin authentication
- POST `/auth/logout` - Admin logout
- GET `/users` - List users
- GET `/users/:id` - Get user details
- PATCH `/users/:id/status` - Update user status
- etc.

### Step 3: Update Environment Variables
```env
# .env.local
NEXT_PUBLIC_ADMIN_API_URL=https://admin-api.soulmatch.com
```

### Step 4: Enable Service Layer API Calls
In `/src/modules/admin/services/*.service.ts`, uncomment the actual API calls and remove mock data.

### Step 5: Deploy Admin API
Deploy the microservice to your cloud provider.

### Step 6: Test
Ensure all admin functionality works with the new microservice.

## Current Usage

Import everything from the admin module:

```typescript
// ✅ Good - Import from module
import {
  useAdminStore,
  adminAuthService,
  ADMIN_CONFIG,
  type Admin,
  type AdminLoginRequest
} from '@/modules/admin'

// ❌ Bad - Don't import from old locations
import { useAdminStore } from '@/store/adminStore' // Old
```

## Test Credentials

- **Super Admin**: admin@soulmatch.com / admin123
- **Moderator**: moderator@soulmatch.com / moderator123

## Admin Routes

- `/admin/login` - Login page
- `/admin/dashboard` - Main dashboard
- `/admin/users` - User management
- `/admin/profiles` - Profile verification
- `/admin/settings` - Settings

## Security Checklist (Before Production)

- [ ] Replace mock authentication with real auth
- [ ] Implement JWT token-based authentication
- [ ] Add rate limiting
- [ ] Enable HTTPS only
- [ ] Add CSRF protection
- [ ] Implement role-based access control
- [ ] Add audit logging
- [ ] Enable 2FA for admin accounts
- [ ] Set up IP whitelisting (optional)
- [ ] Regular security audits

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         SoulMatch Web (Next.js)             │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │     /modules/admin/                   │ │
│  │  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │   Config    │  │   Types     │    │ │
│  │  └─────────────┘  └─────────────┘    │ │
│  │  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │  Services   │  │   Store     │    │ │
│  │  └─────────────┘  └─────────────┘    │ │
│  └───────────────────────────────────────┘ │
│           │                                 │
│           │ API Calls                       │
│           ▼                                 │
│  ┌───────────────────────────────────────┐ │
│  │  /app/api/admin/* (temporary)         │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
              │
              │ Future: Replace with ▼
              │
┌─────────────────────────────────────────────┐
│    Admin API Microservice (Future)          │
│         (Node.js/Express/Nest.js)           │
│                                             │
│  - JWT Authentication                       │
│  - User Management API                      │
│  - Profile Verification API                 │
│  - Analytics API                            │
│  - Audit Logging                            │
└─────────────────────────────────────────────┘
```

## Questions?

See `/src/modules/admin/README.md` for detailed documentation.
