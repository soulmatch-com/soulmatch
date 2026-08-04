'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[a-z]/, 'Include at least one lowercase letter')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/\d/, 'Include at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from the current password',
  path: ['newPassword'],
})

const passwordSetSchema = passwordUpdateSchema.omit({ currentPassword: true })

type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>
type PasswordSetInput = z.infer<typeof passwordSetSchema>
type PasswordFormInput = PasswordUpdateInput | PasswordSetInput

type PasswordMode = 'loading' | 'update' | 'set'

function calculatePasswordStrength(password: string) {
  let strength = 0
  if (password.length >= 8) strength += 25
  if (password.length >= 12) strength += 15
  if (/[a-z]/.test(password)) strength += 15
  if (/[A-Z]/.test(password)) strength += 15
  if (/\d/.test(password)) strength += 15
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15
  return Math.min(strength, 100)
}

function strengthLabel(strength: number) {
  if (strength === 0) return ''
  if (strength < 45) return 'Weak'
  if (strength < 75) return 'Medium'
  return 'Strong'
}

function strengthColor(strength: number) {
  if (strength < 45) return 'bg-red-500'
  if (strength < 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function shouldSetPassword(user: {
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
  user_metadata?: {
    provider?: string
    providers?: string[]
    iss?: string
  }
  identities?: Array<{ provider?: string }>
}) {
  const primaryProvider = user.app_metadata?.provider
  const metadataProviders = user.app_metadata?.providers || []
  const userMetadataProvider = user.user_metadata?.provider
  const userMetadataProviders = user.user_metadata?.providers || []
  const issuer = user.user_metadata?.iss || ''
  const identityProviders = user.identities?.map(identity => identity.provider).filter(Boolean) || []
  const providers = new Set([
    primaryProvider,
    ...metadataProviders,
    userMetadataProvider,
    ...userMetadataProviders,
    ...identityProviders,
  ].filter(Boolean))

  return providers.has('google') || issuer.includes('accounts.google.com')
}

export function PasswordUpdateForm() {
  const supabase = createClient()
  const [mode, setMode] = useState<PasswordMode>('loading')
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updated, setUpdated] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordFormInput>({
    resolver: zodResolver(mode === 'update' ? passwordUpdateSchema : passwordSetSchema),
  })

  const newPassword = watch('newPassword') || ''
  const passwordStrength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword])
  const isSetMode = mode === 'set'

  useEffect(() => {
    const loadAuthProvider = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        setMode('update')
        return
      }

      setMode(shouldSetPassword(user) ? 'set' : 'update')
    }

    loadAuthProvider()
  }, [supabase])

  const onSubmit = async (values: PasswordFormInput) => {
    setIsLoading(true)
    setUpdated(false)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user?.email) {
        toast.error('Please sign in again to update your password')
        return
      }

      if (mode === 'update') {
        const currentPassword = 'currentPassword' in values ? values.currentPassword : ''
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        })

        if (verifyError) {
          toast.error('Current password is incorrect')
          return
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      })

      if (updateError) {
        toast.error(updateError.message)
        return
      }

      reset()
      setUpdated(true)
      toast.success(isSetMode ? 'Password set successfully' : 'Password updated successfully')
    } catch (error) {
      console.error('Password update error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
            <KeyRound className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <CardTitle>{isSetMode ? 'Set Password' : 'Update Password'}</CardTitle>
            <CardDescription>
              {isSetMode
                ? 'Create a password so you can sign in with email and password as well.'
                : 'Change the password used to sign in to your account.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          {mode === 'loading' && (
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking account sign-in method...
            </div>
          )}

          {updated && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {isSetMode
                ? 'Password set. You can now sign in with email and password.'
                : 'Password updated. Use the new password the next time you sign in.'}
            </div>
          )}

          {isSetMode && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Your account is currently signed in with Google. No current password is required.
            </div>
          )}

          {mode === 'update' && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pl-9 pr-10"
                  disabled={isLoading}
                  {...register('currentPassword' as keyof PasswordFormInput)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                  onClick={() => setShowCurrentPassword(value => !value)}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {'currentPassword' in errors && errors.currentPassword && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">{isSetMode ? 'Password' : 'New Password'}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pl-9 pr-10"
                disabled={isLoading}
                {...register('newPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                onClick={() => setShowNewPassword(value => !value)}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {passwordStrength > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Password strength</span>
                  <span className="font-medium text-slate-700">{strengthLabel(passwordStrength)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all ${strengthColor(passwordStrength)}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}

            {errors.newPassword && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pl-9 pr-10"
                disabled={isLoading}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                onClick={() => setShowConfirmPassword(value => !value)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={isLoading || mode === 'loading'}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading
              ? isSetMode ? 'Setting...' : 'Updating...'
              : isSetMode ? 'Set Password' : 'Update Password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
