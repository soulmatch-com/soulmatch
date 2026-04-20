'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdminStore, adminAuthService, ADMIN_CONFIG } from '@/modules/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type AdminLoginInput = z.infer<typeof adminLoginSchema>

export function AdminLoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { setAdmin } = useAdminStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
  })

  const onSubmit = async (data: AdminLoginInput) => {
    setIsLoading(true)
    try {
      // Use admin service layer - easy to replace with microservice later
      const { admin } = await adminAuthService.login(data)

      // Set admin in store
      setAdmin(admin)

      // Show success message
      toast.success('Welcome back, Admin!')

      // Small delay to ensure store persists to localStorage
      await new Promise(resolve => setTimeout(resolve, 150))

      // Use window.location for a hard navigation to ensure clean state
      window.location.href = ADMIN_CONFIG.ROUTES.DASHBOARD
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      toast.error(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-header.png"
              alt="MyThirumanam.in"
              width={280}
              height={56}
              className="h-14 w-auto"
            />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Access the administrative panel</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@soulmatch.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in as Admin'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
