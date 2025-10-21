'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function VerifyOTPContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to{' '}
          <span className="font-medium text-slate-900">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Click the link in the email to verify your account and complete the signup process.
        </p>
        <p className="text-sm text-slate-600">
          If you don&apos;t see the email, check your spam folder.
        </p>
      </CardContent>
    </Card>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<Card><CardContent className="py-10">Loading...</CardContent></Card>}>
      <VerifyOTPContent />
    </Suspense>
  )
}
