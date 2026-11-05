'use client'

const eventName = 'booking-updated'

export function notifyBookingUpdated(bookingId: string) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: bookingId }))
}

export function subscribeToBookingUpdates(bookingId: string, refresh: () => void) {
  const listener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === bookingId) refresh()
  }
  window.addEventListener(eventName, listener)
  return () => window.removeEventListener(eventName, listener)
}
