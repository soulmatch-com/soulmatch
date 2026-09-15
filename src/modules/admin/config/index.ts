// Admin Module Configuration
// This file centralizes all admin-related configuration

export const ADMIN_CONFIG = {
  // API endpoints (will become microservice URLs in future)
  API_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL || '/api/admin',

  // Routes
  ROUTES: {
    LOGIN: '/admin/login',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    PROFILES: '/admin/profiles',
    CELEBRATION_ENQUIRIES: '/admin/celebration-enquiries',
    SUCCESS_STORIES: '/admin/success-stories',
    SETTINGS: '/admin/settings',
  },

  // Auth
  AUTH: {
    STORAGE_KEY: 'admin-storage',
    TOKEN_KEY: 'admin-token',
  },

  // Roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  } as const,
} as const

export type AdminRole = typeof ADMIN_CONFIG.ROLES[keyof typeof ADMIN_CONFIG.ROLES]
