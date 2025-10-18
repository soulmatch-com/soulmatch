'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Shield, Copy, CheckCircle2, AlertCircle } from 'lucide-react'

export function TwoFactorSetup() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    checkTwoFactorStatus()
  }, [])

  const checkTwoFactorStatus = async () => {
    setCheckingStatus(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Please sign in to manage 2FA settings')
        router.push('/login')
        return
      }

      // Check if user has MFA enabled
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const has2FA = factors?.totp && factors.totp.length > 0
      setIs2FAEnabled(!!has2FA)
    } catch (error) {
      toast.error('Failed to check 2FA status')
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleEnroll2FA = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data) {
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        toast.success('Scan the QR code with your authenticator app')
      }
    } catch (error) {
      toast.error('Failed to set up 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const factor = factors?.totp?.[0]

      if (!factor) {
        toast.error('No 2FA factor found. Please try again.')
        return
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: verificationCode,
      })

      if (error) {
        toast.error('Invalid verification code. Please try again.')
        return
      }

      toast.success('Two-factor authentication enabled!')
      setIs2FAEnabled(true)
      setQrCode(null)
      setSecret(null)
      setVerificationCode('')
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setIsLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const factor = factors?.totp?.[0]

      if (!factor) {
        toast.error('No 2FA factor found')
        return
      }

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Two-factor authentication disabled')
      setIs2FAEnabled(false)
    } catch (error) {
      toast.error('Failed to disable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-slate-600">Checking 2FA status...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Two-Factor Authentication</h1>
        <p className="text-slate-600">
          Add an extra layer of security to your account
        </p>
      </div>

      {is2FAEnabled ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>2FA is Enabled</CardTitle>
                <CardDescription>
                  Your account is protected with two-factor authentication
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              You'll be asked to enter a verification code from your authenticator app each time you sign in.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={isLoading}
            >
              {isLoading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </CardFooter>
        </Card>
      ) : qrCode ? (
        <Card>
          <CardHeader>
            <CardTitle>Set up your authenticator app</CardTitle>
            <CardDescription>
              Scan the QR code below with your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="w-full">
                <Label>Or enter this code manually</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={secret || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(secret || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <Label htmlFor="verification-code">Verification Code</Label>
              <p className="text-sm text-slate-600 mb-3">
                Enter the 6-digit code from your authenticator app
              </p>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setQrCode(null)
                setSecret(null)
                setVerificationCode('')
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyAndEnable}
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify and Enable'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Enable 2FA</CardTitle>
                <CardDescription>
                  Protect your account with two-factor authentication
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <p className="font-medium">What you'll need:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
                <li>Your phone or device with the app installed</li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Important</p>
                    <p>
                      Once enabled, you'll need to enter a code from your authenticator app each time you sign in.
                      Make sure you have access to your authenticator app before enabling this feature.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleEnroll2FA} disabled={isLoading}>
              {isLoading ? 'Setting up...' : 'Set up 2FA'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
