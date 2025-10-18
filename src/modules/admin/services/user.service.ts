// Admin User Management Service
// Abstraction layer for user management - easy to replace with microservice API calls

import { ADMIN_CONFIG } from '../config'
import type { AdminUser } from '../types'

export class AdminUserService {
  private baseUrl: string

  constructor() {
    this.baseUrl = ADMIN_CONFIG.API_BASE_URL
  }

  async getUsers(params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<AdminUser[]> {
    // Future: Call microservice endpoint
    // const query = new URLSearchParams(params as any)
    // const response = await fetch(`${this.baseUrl}/users?${query}`)
    // return response.json()

    // Mock data for now
    return []
  }

  async getUserById(id: string): Promise<AdminUser> {
    // Future: Call microservice endpoint
    // const response = await fetch(`${this.baseUrl}/users/${id}`)
    // return response.json()

    throw new Error('Not implemented')
  }

  async updateUserStatus(
    userId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    // Future: Call microservice endpoint
    // await fetch(`${this.baseUrl}/users/${userId}/status`, {
    //   method: 'PATCH',
    //   body: JSON.stringify({ status })
    // })
  }

  async deleteUser(userId: string): Promise<void> {
    // Future: Call microservice endpoint
    // await fetch(`${this.baseUrl}/users/${userId}`, { method: 'DELETE' })
  }
}

// Singleton instance
export const adminUserService = new AdminUserService()
