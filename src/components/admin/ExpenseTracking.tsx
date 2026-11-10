'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookingDialogContent, BookingAlertDialogContent } from '@/components/admin/BookingDialog'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatBookingDate } from '@/lib/utils'
import { subscribeToBookingUpdates } from '@/lib/admin/booking-updates'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
type Assignment = { id: string; agreed_cost: number | null; event_vendors: { vendor_name: string } | null; celebration_booking_services: { service_name_snapshot: string } | null }
type Expense = { id: string; expense_reference: string; vendor_assignment_id: string | null; category: string; amount: number; expense_date: string; notes: string | null; event_vendor_assignments: Assignment | null }
type Data = { summary: { net_received: number; expenses_recorded: number; available_to_allocate: number }; expenses: Expense[]; assignments: Assignment[] }

export function ExpenseTracking({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [assignment, setAssignment] = useState('')
  const [notes, setNotes] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const requestKey = useRef('')
  const actionTrigger = useRef<HTMLButtonElement | null>(null)
  const recordTrigger = useRef<HTMLButtonElement>(null)
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/bookings/${bookingId}/expenses`)
    const value = await response.json()
    if (!response.ok) throw new Error(value.error)
    setData(value)
    setError('')
  }, [bookingId])
  useEffect(() => {
    const refresh = () => { void load().catch(e => setError(e instanceof Error ? e.message : 'Unable to load expenses')) }
    refresh()
    return subscribeToBookingUpdates(bookingId, refresh)
  }, [bookingId, load])

  function openForm(expense: Expense | null) {
    setEditing(expense)
    setAmount(expense ? String(expense.amount) : '')
    setCategory(expense?.category ?? '')
    setAssignment(expense?.vendor_assignment_id ?? '')
    setNotes(expense?.notes ?? '')
    setExpenseDate(expense?.expense_date ?? new Date().toISOString().slice(0, 10))
    setFormError('')
    requestKey.current = crypto.randomUUID()
    setOpen(true)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const value = Number(amount)
    if (!category.trim() || !Number.isFinite(value) || value <= 0 || !expenseDate) {
      setFormError('Enter a category, a positive amount and an expense date.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/expenses${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: requestKey.current, vendorAssignmentId: assignment || null, category, amount: value, expenseDate, notes }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setOpen(false)
      // A refresh failure must not leave the form open to submit a saved expense again.
      await load().catch(e => setError(e instanceof Error ? e.message : 'Unable to refresh expenses'))
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to save expense')
    } finally {
      setSaving(false)
    }
  }

  async function removeExpense() {
    if (!deletingExpense || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/expenses/${deletingExpense.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to delete expense')
      await load().catch(e => setError(e instanceof Error ? e.message : 'Unable to refresh expenses'))
      setDeletingExpense(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Unable to delete expense')
    } finally {
      setDeleting(false)
    }
  }

  function restoreActionFocus(event: Event) {
    const target = actionTrigger.current?.isConnected ? actionTrigger.current : recordTrigger.current
    if (target && !target.disabled) {
      event.preventDefault()
      target.focus()
    }
  }

  // Keep a previously selected assignment available even after it is completed or cancelled.
  const assignments = [...(data?.assignments ?? [])]
  if (editing?.vendor_assignment_id && !assignments.some(x => x.id === editing.vendor_assignment_id)) {
    assignments.push({
      id: editing.vendor_assignment_id, agreed_cost: null,
      event_vendors: editing.event_vendor_assignments?.event_vendors ?? null,
      celebration_booking_services: editing.event_vendor_assignments?.celebration_booking_services ?? null,
    })
  }

  return <section className="rounded-xl border bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Received Amount & Expenses</h2><p className="text-sm text-slate-500">Allocate verified customer receipts to vendor or operational expenses.</p></div>
      <Button ref={recordTrigger} size="sm" disabled={!data || Number(data.summary.available_to_allocate) <= 0} onClick={event => { actionTrigger.current = event.currentTarget; openForm(null) }}><Plus aria-hidden="true" className="h-4 w-4" />Record Expense</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {data ? <>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Net Received</dt><dd className="font-semibold">{money.format(Number(data.summary.net_received))}</dd></div>
        <div><dt className="text-slate-500">Expenses Recorded</dt><dd className="font-semibold">{money.format(Number(data.summary.expenses_recorded))}</dd></div>
        <div><dt className="text-slate-500">Available to Allocate</dt><dd className="font-semibold text-emerald-700">{money.format(Number(data.summary.available_to_allocate))}</dd></div>
      </dl>
      <div className="mt-5"><h3 className="text-sm font-semibold">Expense History</h3>
        {data.expenses.length ? <div className="mt-2 divide-y">{data.expenses.map(x => <div key={x.id} data-testid="expense-history-row" className="py-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span><b>{x.expense_reference}</b> · {x.category}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <b>{money.format(Number(x.amount))}</b>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="size-11 xl:size-9" aria-label="Edit" title="Edit expense" onClick={event => { actionTrigger.current = event.currentTarget; openForm(x) }}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" className="size-11 border-rose-200 xl:size-9 text-rose-700 hover:bg-rose-50 hover:text-rose-800" aria-label="Delete" title="Delete expense" onClick={event => { actionTrigger.current = event.currentTarget; setDeleteError(''); setDeletingExpense(x) }}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <p className="text-slate-500">{formatBookingDate(x.expense_date)}{x.event_vendor_assignments ? ` · ${x.event_vendor_assignments.event_vendors?.vendor_name || 'Vendor'} — ${x.event_vendor_assignments.celebration_booking_services?.service_name_snapshot || 'Service'}` : ''}{x.notes ? ` · ${x.notes}` : ''}</p>
        </div>)}</div> : <p className="mt-2 text-sm text-slate-500">No Expenses Recorded Yet.</p>}
      </div>
    </> : <p className="mt-3 text-sm text-slate-500">Loading Expense Tracking…</p>}
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value) }}>
      <BookingDialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={restoreActionFocus}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Expense' : 'Record Expense'}</DialogTitle>
          <DialogDescription>{editing ? `Update expense ${editing.expense_reference}.` : 'This expense is allocated against the amount already received from the customer.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
          <fieldset disabled={saving} className="grid gap-4">
            <label className="text-sm">Category<input aria-label="Expense category" required maxLength={100} className="mt-1 h-9 w-full rounded border px-2" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Catering advance" /></label>
            <label className="text-sm">Amount<input aria-label="Expense amount" required className="mt-1 h-9 w-full rounded border px-2" type="number" min="0.01" max="9999999999.99" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
            <label className="text-sm">Expense Date<input aria-label="Expense date" required className="mt-1 h-9 w-full rounded border px-2" type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} /></label>
            <label className="text-sm">Related Vendor Assignment (Optional)<select aria-label="Related vendor assignment" className="mt-1 h-9 w-full rounded border px-2" value={assignment} onChange={e => setAssignment(e.target.value)}>
              <option value="">General Operational Expense</option>
              {assignments.map(x => <option key={x.id} value={x.id}>{x.event_vendors?.vendor_name || 'Vendor'} — {x.celebration_booking_services?.service_name_snapshot || 'Service'}{x.agreed_cost !== null ? ` (${money.format(Number(x.agreed_cost))})` : ''}</option>)}
            </select></label>
            <label className="text-sm">Notes (Optional)<textarea aria-label="Expense notes" maxLength={2000} className="mt-1 w-full rounded border p-2" value={notes} onChange={e => setNotes(e.target.value)} /></label>
          </fieldset>
          <DialogFooter className="gap-2 sm:space-x-0"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Record expense'}</Button></DialogFooter>
        </form>
      </BookingDialogContent>
    </Dialog>
    <AlertDialog open={deletingExpense !== null} onOpenChange={value => { if (!value && !deleting) setDeletingExpense(null) }}>
      <BookingAlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg" onCloseAutoFocus={restoreActionFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete expense?</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete {deletingExpense?.expense_reference}{deletingExpense ? ` (${deletingExpense.category}, ${money.format(Number(deletingExpense.amount))})` : ''}? Its amount will become available to allocate again. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteError && <p role="alert" className="text-sm text-rose-700">{deleteError}</p>}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={deleting} onClick={event => { event.preventDefault(); void removeExpense() }}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />{deleting ? 'Deleting…' : 'Delete expense'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </BookingAlertDialogContent>
    </AlertDialog>
  </section>
}
