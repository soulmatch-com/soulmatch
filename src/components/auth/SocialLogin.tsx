'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Chrome, Github } from 'lucide-react'

type Provider = 'google' | 'github' | 'facebook'

export function SocialLogin() {
  const [isLoading, setIsLoading] = useState<Provider | null>(null)
  const supabase = createClient()

  const handleSocialLogin = async (provider: Provider) => {
    setIsLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        toast.error(error.message)
        setIsLoading(null)
      }
      // Note: The page will redirect, so we don't need to setIsLoading(null) on success
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('google')}
          disabled={!!isLoading}
        >
          {isLoading === 'google' ? (
            'Loading...'
          ) : (
            <>
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('github')}
          disabled={!!isLoading}
        >
          {isLoading === 'github' ? (
            'Loading...'
          ) : (
            <>
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
