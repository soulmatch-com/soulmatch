import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { calculateAgeFromDateOnly, localDateToDateOnly } from '@/lib/celebrations/date'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string'
    ? dateOfBirth.length >= 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? dateOfBirth.slice(0, 10)
      : localDateToDateOnly(new Date(dateOfBirth))
    : localDateToDateOnly(dateOfBirth)

  return calculateAgeFromDateOnly(dob)
}

export function formatHeight(heightInCm: number): string {
  const feet = Math.floor(heightInCm / 30.48)
  const inches = Math.round((heightInCm % 30.48) / 2.54)
  return `${feet}' ${inches}"`
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
