'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore, ADMIN_CONFIG } from '@/modules/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, UserCog, Eye, Ban, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface User {
  user_id: string
  first_name: string
  last_name: string
  email: string
  profile_status: string
  is_verified: boolean
  created_at: string
  city?: string
  state?: string
}

export default function AdminUsersPage() {
  const { isAuthenticated } = useAdminStore()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  async function fetchUsers() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`)
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        if (response.status === 401 || response.status === 403) {
          router.push(ADMIN_CONFIG.ROUTES.LOGIN)
        }
        throw new Error(body?.message || `Failed to fetch users (${response.status})`)
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      toast.error('Failed to load users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(ADMIN_CONFIG.ROUTES.LOGIN)
    } else {
      fetchUsers()
    }
  }, [isAuthenticated, router])

  const handleSearch = () => {
    fetchUsers()
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowDialog(true)
  }

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_status: status }),
      })

      if (!response.ok) throw new Error('Failed to update user')

      toast.success('User status updated')
      fetchUsers()
      setShowDialog(false)
    } catch {
      toast.error('Failed to update user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyUser = async (userId: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: true }),
      })

      if (!response.ok) throw new Error('Failed to verify user')

      toast.success('User verified successfully')
      fetchUsers()
      setShowDialog(false)
    } catch {
      toast.error('Failed to verify user')
    } finally {
      setActionLoading(false)
    }
  }

  if (!isAuthenticated()) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 mt-2">Manage all registered users</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage user accounts</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9 w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No users found
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between border-b border-slate-200 pb-4 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <UserCog className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                        {user.city && user.state && (
                          <p className="text-xs text-slate-400">
                            {user.city}, {user.state}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {user.is_verified && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(user.profile_status)}`}>
                        {user.profile_status}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Manage user information and status</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Name</p>
                  <p className="text-slate-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Email</p>
                  <p className="text-slate-900">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <span className={`text-xs px-2 py-1 rounded capitalize inline-block ${getStatusColor(selectedUser.profile_status)}`}>
                    {selectedUser.profile_status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Verified</p>
                  <p className="text-slate-900">{selectedUser.is_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Joined</p>
                  <p className="text-slate-900">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                {selectedUser.city && selectedUser.state && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Location</p>
                    <p className="text-slate-900">{selectedUser.city}, {selectedUser.state}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedUser && !selectedUser.is_verified && (
              <Button
                onClick={() => handleVerifyUser(selectedUser.user_id)}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Verify User
              </Button>
            )}
            {selectedUser && selectedUser.profile_status !== 'suspended' && (
              <Button
                onClick={() => handleUpdateStatus(selectedUser.user_id, 'suspended')}
                disabled={actionLoading}
                variant="destructive"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                Suspend
              </Button>
            )}
            {selectedUser && selectedUser.profile_status === 'suspended' && (
              <Button
                onClick={() => handleUpdateStatus(selectedUser.user_id, 'active')}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Activate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
