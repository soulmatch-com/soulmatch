'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth.schema'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { SocialLogin } from '@/components/auth/SocialLogin'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react'

export function SignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const supabase = createClient()

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 15
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20
    if (/\d/.test(password)) strength += 20
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20
    return Math.min(strength, 100)
  }

  const getStrengthColor = (strength: number): string => {
    if (strength < 40) return 'bg-red-500'
    if (strength < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthLabel = (strength: number): string => {
    if (strength === 0) return ''
    if (strength < 40) return 'Weak'
    if (strength < 70) return 'Medium'
    return 'Strong'
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true)
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        console.error('Signup error:', error)
        toast.error(error.message)
        return
      }

      console.log('Signup response:', signUpData)

      // Check if email confirmation is disabled (auto-confirm)
      if (signUpData.user && signUpData.session) {
        toast.success('Account created! Redirecting...')
        router.push('/profile/create')
        return
      }

      // Email confirmation required
      if (signUpData.user && !signUpData.session) {
        toast.success('Verification email sent! Please check your inbox (including spam folder).')
        toast.info(`Email sent to: ${data.email}`)
        router.push('/verify-otp?email=' + encodeURIComponent(data.email))
        return
      }

      toast.warning('Unexpected response. Please contact support.')
    } catch (error) {
      console.error('Signup exception:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-2xl border-purple-100 dark:border-purple-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
        <CardDescription className="text-center">Enter your details to get started</CardDescription>
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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', {
                  onChange: (e) => setPasswordStrength(calculatePasswordStrength(e.target.value))
                })}
                disabled={isLoading}
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordStrength > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Password strength</span>
                  <span className={`font-medium ${passwordStrength < 40 ? 'text-red-600' : passwordStrength < 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {getStrengthLabel(passwordStrength)}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}
            {errors.password && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p>{errors.password.message}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
                disabled={isLoading}
                className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p>{errors.confirmPassword.message}</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating account...' : 'Sign up'}
          </Button>

          <SocialLogin />

          <p className="text-sm text-center text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
