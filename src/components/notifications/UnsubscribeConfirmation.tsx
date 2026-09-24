'use client'

import { useState } from 'react'

export function UnsubscribeConfirmation({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  async function confirm() {
    if (state === 'submitting') return
    setState('submitting')
    try {
      const response = await fetch('/api/notifications/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      if (!response.ok) throw new Error('Unable to unsubscribe.')
      setState('success')
    } catch {
      setState('error')
    }
  }
  if (state === 'success') return <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 leading-7 text-emerald-900">You have been unsubscribed. You will no longer receive MyThirumanam blog and planning-guide emails.</p>
  return <><button type="button" disabled={state === 'submitting'} onClick={confirm} className="mt-6 min-h-12 rounded-xl bg-[#681c24] px-6 py-3 font-bold text-white hover:bg-[#52151c] disabled:cursor-not-allowed disabled:opacity-70">{state === 'submitting' ? 'Unsubscribing...' : 'Confirm Unsubscribe'}</button>{state === 'error' ? <p role="alert" className="mt-4 text-sm font-medium text-red-800">Unable to process this unsubscribe request. Please try again.</p> : null}</>
}
