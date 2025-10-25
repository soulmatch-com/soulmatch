'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { SocialLogin } from '@/components/auth/SocialLogin'
import { TwoFactorVerification } from '@/components/auth/TwoFactorVerification'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, LogIn } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const supabase = createClient()
  const { setUser } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      // Check if 2FA is required
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.[0]

      if (totpFactor && totpFactor.status === 'verified') {
        // User has 2FA enabled, show verification screen
        setFactorId(totpFactor.id)
        setRequires2FA(true)
        toast.info('Please enter your 2FA code')
        return
      }

      // Update auth store with user data
      if (authData.user) {
        setUser(authData.user)
      }

      // Check if user has completed their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, profile_status')
        .eq('user_id', authData.user.id)
        .single()

      toast.success('Welcome back!')

      // Redirect to profile creation if no profile exists
      if (!profile) {
        router.push('/profile/create')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FASuccess = () => {
    toast.success('Welcome back!')
    router.push('/dashboard')
    router.refresh()
  }

  const handle2FACancel = () => {
    setRequires2FA(false)
    setFactorId(null)
  }

  if (requires2FA && factorId) {
    return (
      <TwoFactorVerification
        factorId={factorId}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    )
  }

  return (
    <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-2xl border-blue-100 dark:border-blue-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">Sign in to continue your matrimonial journey</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isLoading}
                className={`pl-10 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
            </div>
            {errors.email && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p>{errors.email.message}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p>{errors.password.message}</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 shadow-lg hover:shadow-xl transition-all group"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <LogIn className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </Button>

          <SocialLogin />

          <p className="text-sm text-center text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-700 dark:text-blue-400 font-medium hover:underline">
              Register Now
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
