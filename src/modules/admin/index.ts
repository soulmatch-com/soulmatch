// Admin Module - Main export file
// Import everything admin-related from this single entry point

// Config
export { ADMIN_CONFIG } from './config'
export type { AdminRole } from './config'

// Types
export type {
  Admin,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminStats,
  AdminUser,
  AdminProfile,
} from './types'

// Services
export { adminAuthService, adminUserService } from './services'

// Store
export { useAdminStore } from './store/adminStore'
