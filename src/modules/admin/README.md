# Admin Module

This module contains all admin-related functionality and is designed to be easily extracted into a separate microservice in the future.

## Structure

```
modules/admin/
├── README.md                 # This file
├── config/                   # Configuration
│   └── index.ts             # Admin config constants
├── types/                    # TypeScript types
│   └── index.ts             # Admin-specific types
├── services/                 # Service layer (API abstraction)
│   ├── index.ts             # Service exports
│   ├── auth.service.ts      # Admin authentication
│   └── user.service.ts      # User management
└── store/                    # State management
    └── adminStore.ts        # Admin auth state
```

## Migration to Microservice

When ready to extract this into a microservice:

### 1. **Backend Setup**
Create a new service (e.g., `soulmatch-admin-api`) with:
- Authentication endpoints
- User management endpoints
- Profile verification endpoints
- Analytics/stats endpoints

### 2. **Update Configuration**
Set environment variable:
```bash
NEXT_PUBLIC_ADMIN_API_URL=https://admin-api.soulmatch.com
```

### 3. **Service Layer**
The service layer (`services/`) is already abstracted. Just:
- Uncomment the API calls in service files
- Remove mock data
- Add proper error handling

### 4. **Authentication**
- Implement JWT token-based auth
- Update `adminAuthService` to use tokens
- Add token refresh logic

### 5. **State Management**
- Current: Zustand with localStorage
- Future: May need to sync with backend session

## Current Implementation

### Authentication
- Login: `/api/admin/auth/login`
- Credentials stored in `localStorage` via Zustand
- Test accounts in `/api/admin/auth/login/route.ts`

### Routes
- `/admin/login` - Admin login page
- `/admin/dashboard` - Main dashboard
- `/admin/users` - User management
- `/admin/profiles` - Profile verification
- `/admin/settings` - System settings

### Components
Located in `/src/components/admin/`:
- `AdminHeader.tsx` - Navigation header
- `AdminLoginForm.tsx` - Login form
- `AdminProtectedRoute.tsx` - Route guard

### Pages
Located in `/src/app/admin/`:
- `login/page.tsx`
- `dashboard/page.tsx`
- `users/page.tsx`
- `profiles/page.tsx`
- `settings/page.tsx`

## Best Practices

1. **Keep admin code isolated** - Don't import customer-facing code into admin module
2. **Use service layer** - Always call APIs through service classes
3. **Type everything** - Use types from `types/index.ts`
4. **Config centralization** - Use `ADMIN_CONFIG` for all constants
5. **No direct API calls** - Use service methods instead

## Dependencies on Main App

Currently shared:
- UI components (`@/components/ui/*`)
- Utilities (if any)
- Styling (Tailwind)

When extracting to microservice:
- Copy shared UI components or use a component library
- Set up independent styling
- Create separate deployment pipeline

## Testing

Test admin features independently:
```bash
# Test admin login
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@soulmatch.com","password":"admin123"}'
```

## Security Considerations

- [ ] Implement rate limiting on admin endpoints
- [ ] Add CSRF protection
- [ ] Use secure session management
- [ ] Implement role-based access control (RBAC)
- [ ] Add audit logging for admin actions
- [ ] Enable 2FA for admin accounts
- [ ] Restrict admin access by IP (optional)

## Future Enhancements

- [ ] Admin activity logging
- [ ] Advanced user search and filters
- [ ] Bulk user operations
- [ ] Email notification system
- [ ] Report generation
- [ ] Real-time dashboard updates
- [ ] Multi-language support
