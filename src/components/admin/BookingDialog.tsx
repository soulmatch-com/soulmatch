'use client'

import type { ComponentProps, ReactNode } from 'react'
import { DialogContent } from '@/components/ui/dialog'
import { AlertDialogContent } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import styles from './BookingTheme.module.css'

export function BookingDialogContent({ className, layout, ...props }: ComponentProps<typeof DialogContent> & { layout?: 'audit' }) {
  return <DialogContent {...props} overlayClassName={styles.overlay} data-booking-theme="true" className={cn(styles.surface, styles.dialog, layout === 'audit' && styles.audit, className)} />
}

export function BookingAlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogContent>) {
  return <AlertDialogContent {...props} overlayClassName={styles.overlay} data-booking-theme="true" data-destructive="true" className={cn(styles.surface, styles.dialog, className)} />
}

export function BookingField({ label, hint, fullWidth, children }: { label: string; hint?: string; fullWidth?: boolean; children: ReactNode }) {
  return <label className={cn(styles.field, fullWidth && styles.fullWidth)}><span>{label}</span>{children}{hint && <span className={styles.fieldHint}>{hint}</span>}</label>
}

export function BookingFormGrid({ children }: { children: ReactNode }) {
  return <div className={styles.formGrid}>{children}</div>
}
