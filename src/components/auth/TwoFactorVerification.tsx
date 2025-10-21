'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Shield } from 'lucide-react'

interface TwoFactorVerificationProps {
  factorId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function TwoFactorVerification({ factorId, onSuccess, onCancel }: TwoFactorVerificationProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const supabase = createClient()

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode,
      })

      if (error) {
        toast.error('Invalid verification code. Please try again.')
        setVerificationCode('')
        return
      }

      toast.success('Successfully verified!')

      if (onSuccess) {
        onSuccess()
      } else {
        // Check if user has completed their profile
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, profile_status')
            .eq('user_id', user.id)
            .single()

          // Redirect to profile creation if no profile exists
          if (!profile) {
            router.push('/profile/create')
          } else {
            router.push('/dashboard')
          }
        } else {
          router.push('/dashboard')
        }
        router.refresh()
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.')
      setVerificationCode('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify()
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="000000"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            autoFocus
            className="text-center text-2xl tracking-widest font-mono"
          />
          <p className="text-xs text-slate-500">
            Open your authenticator app to view your verification code
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleVerify}
          disabled={isLoading || verificationCode.length !== 6}
          className="flex-1"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </CardFooter>
    </Card>
  )
}
