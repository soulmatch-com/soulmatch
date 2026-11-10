'use client'

import type { ComponentProps } from 'react'
import { DialogContent } from '@/components/ui/dialog'
import { AlertDialogContent } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import styles from './BookingLayout.module.css'

export function BookingDialogContent({ className, ...props }: ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props} className={cn(styles.dialog, className)} />
}

export function BookingAlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogContent>) {
  return <AlertDialogContent {...props} className={cn(styles.dialog, className)} />
}
