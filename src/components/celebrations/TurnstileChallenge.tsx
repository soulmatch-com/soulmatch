'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { CELEBRATION_TURNSTILE_ACTION } from '@/lib/celebrations/bot-verification-core'

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: Record<string, unknown>): string
      reset(widgetId: string): void
      remove(widgetId: string): void
    }
  }
}

export function TurnstileChallenge({ siteKey, onTokenChange }: { siteKey: string; onTokenChange(token?: string): void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: CELEBRATION_TURNSTILE_ACTION,
      size: 'flexible',
      theme: 'auto',
      'response-field': false,
      callback: (token: string) => onTokenChange(token),
      'expired-callback': () => onTokenChange(undefined),
      'error-callback': () => { onTokenChange(undefined); return true },
    })
    return () => { if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current); widgetIdRef.current = null }
  }, [onTokenChange, scriptReady, siteKey])

  return <div aria-label="Submission verification" className="mt-6 min-h-[70px] max-w-full overflow-hidden">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
    <div ref={containerRef} />
    <p className="mt-2 text-sm text-stone-600" aria-live="polite">Complete the security verification before submitting.</p>
  </div>
}
