// Admin Authentication Service
// Abstraction layer for admin auth - easy to replace with microservice API calls

import { ADMIN_CONFIG } from '../config'
import type { AdminLoginRequest, AdminLoginResponse } from '../types'

export class AdminAuthService {
  private baseUrl: string

  constructor() {
    this.baseUrl = ADMIN_CONFIG.API_BASE_URL
  }

  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Login failed')
    }

    return response.json()
  }

  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, { method: 'POST' })
    if (!response.ok) {
      throw new Error('Unable to sign out. Please try again.')
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    void token
    // Future: Verify token with microservice
    // const response = await fetch(`${this.baseUrl}/auth/verify`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // })
    // return response.ok
    return true
  }
}

// Singleton instance
export const adminAuthService = new AdminAuthService()
