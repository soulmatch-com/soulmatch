// Admin Module Types - Self-contained for future microservice extraction

export interface Admin {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'moderator'
}

export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminLoginResponse {
  admin: Admin
  message: string
  token?: string
}

export interface AdminStats {
  totalUsers: number
  activeProfiles: number
  totalMatches: number
  messages: number
}

export interface AdminUser {
  id: string
  email: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
}

export interface AdminProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  status: 'pending' | 'verified' | 'rejected'
  submittedAt: string
}
