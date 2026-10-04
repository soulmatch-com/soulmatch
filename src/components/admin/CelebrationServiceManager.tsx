'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Service = { id: string; code: string; name: string; description: string | null; icon: string | null; location: string; is_active: boolean; display_order: number }
type ServiceDraft = { name: string; description: string; icon: string; location: string; displayOrder: string; isActive: boolean }
type NewServiceDraft = ServiceDraft & { code: string }
type Pagination = { page: number; limit: number; total: number; totalPages: number }

const emptyNewService: NewServiceDraft = { code: '', name: '', description: '', icon: '', location: 'thirukadaiyur', displayOrder: '0', isActive: true }
const draftOf = (service: Service): ServiceDraft => ({ name: service.name, description: service.description || '', icon: service.icon || '', location: service.location, displayOrder: String(service.display_order), isActive: service.is_active })
const sortServices = (services: Service[]) => [...services].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))

type ServiceFormProps = { draft: NewServiceDraft | ServiceDraft; onChange: (field: string, value: string | boolean) => void; includeCode?: boolean }

function ServiceFormFields({ draft, onChange, includeCode = false }: ServiceFormProps) {
  return <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      {includeCode && <label className="text-sm font-medium text-slate-700">Service code
        <input required value={(draft as NewServiceDraft).code} onChange={(event) => onChange('code', event.target.value)} placeholder="e.g. catering" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Use lowercase letters, numbers, and underscores only.</span>
      </label>}
      <label className="text-sm font-medium text-slate-700">Service name<input required value={draft.name} onChange={(event) => onChange('name', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Location<input required value={draft.location} onChange={(event) => onChange('location', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Display order<input required type="number" min="0" value={draft.displayOrder} onChange={(event) => onChange('displayOrder', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Icon (optional)<input value={draft.icon} onChange={(event) => onChange('icon', event.target.value)} maxLength={80} placeholder="e.g. utensils" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
    </div>
    <label className="block text-sm font-medium text-slate-700">Description<textarea value={draft.description} onChange={(event) => onChange('description', event.target.value)} maxLength={1000} rows={4} className="mt-1.5 w-full rounded-md border border-slate-300 p-3" /></label>
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.isActive} onChange={(event) => onChange('isActive', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />Active — available for enquiries and quotations</label>
  </div>
}

export function CelebrationServiceManager() {
  const [services, setServices] = useState<Service[]>([])
  const [newService, setNewService] = useState<NewServiceDraft>(emptyNewService)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editDraft, setEditDraft] = useState<ServiceDraft | null>(null)
  const [deletingService, setDeletingService] = useState<Service | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('all')

  const loadServices = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (search.trim()) params.set('search', search.trim())
      if (location.trim()) params.set('location', location.trim())
      if (status !== 'all') params.set('status', status)
      const response = await fetch(`/api/admin/celebration-services?${params}`, { signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load services.')
      setServices(sortServices(data.services))
      setPagination(data.pagination)
      setError('')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(err instanceof Error ? err.message : 'Unable to load services.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [location, page, search, status])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void loadServices(controller.signal), 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [loadServices])

  function changeFilters(change: () => void) { change(); setPage(1) }
  function clearFilters() { setSearch(''); setLocation(''); setStatus('all'); setPage(1) }

  function openCreate() { setError(''); setNewService(emptyNewService); setIsCreateOpen(true) }
  function openEdit(service: Service) { setError(''); setEditingService(service); setEditDraft(draftOf(service)) }
  function closeEdit() { if (!saving) { setEditingService(null); setEditDraft(null) } }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch('/api/admin/celebration-services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newService, displayOrder: Number(newService.displayOrder) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create service.')
      setIsCreateOpen(false); setNewService(emptyNewService); setPage(1); await loadServices()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create service.') } finally { setSaving(false) }
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingService || !editDraft) return; setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/celebration-services/${editingService.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editDraft, displayOrder: Number(editDraft.displayOrder) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save service.')
      setEditingService(null); setEditDraft(null); await loadServices()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save service.') } finally { setSaving(false) }
  }

  async function deleteService() {
    if (!deletingService) return
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/celebration-services/${deletingService.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to delete service.')
      setDeletingService(null)
      const remainingOnPage = services.length - 1
      if (remainingOnPage === 0 && page > 1) setPage((current) => current - 1)
      else await loadServices()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete service.') } finally { setSaving(false) }
  }

  return <section className="rounded-xl border bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">Celebration service catalogue</h2><p className="mt-1 text-sm text-slate-600">Manage the services available in the public planning journey and quotations.</p></div><Button type="button" onClick={openCreate}><Plus className="h-4 w-4" />Create service</Button></div>
    {error && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
      <label className="text-sm font-medium text-slate-700">Search services<input value={search} onChange={(event) => changeFilters(() => setSearch(event.target.value))} placeholder="Name, code, description…" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
      <label className="text-sm font-medium text-slate-700">Location<input value={location} onChange={(event) => changeFilters(() => setLocation(event.target.value))} placeholder="e.g. Thirukadaiyur" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
      <label className="text-sm font-medium text-slate-700">Status<select value={status} onChange={(event) => changeFilters(() => setStatus(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-normal"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <div className="flex items-end"><Button type="button" variant="outline" onClick={clearFilters} disabled={!search && !location && status === 'all'}>Clear filters</Button></div>
    </div>
    <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Service</th><th className="p-3">Description</th><th className="p-3">Location</th><th className="p-3">Order</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y">
      {services.map((service) => <tr key={service.id}><td className="p-3"><p className="font-medium text-slate-900">{service.name}</p><p className="mt-1 font-mono text-xs text-slate-500">{service.code}</p></td><td className="max-w-sm p-3 text-slate-600">{service.description || <span className="text-slate-400">No description</span>}</td><td className="p-3 text-slate-700">{service.location}</td><td className="p-3 text-slate-700">{service.display_order}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${service.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{service.is_active ? 'Active' : 'Inactive'}</span></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><Button type="button" size="icon" variant="outline" aria-label={`Edit ${service.name}`} title="Edit" onClick={() => openEdit(service)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="destructive" aria-label={`Delete ${service.name}`} title="Delete" onClick={() => { setError(''); setDeletingService(service) }}><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}
      {!loading && services.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No celebration services have been added. Create one to get started.</td></tr>}{loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading services…</td></tr>}
    </tbody></table></div>
    {!loading && pagination.total > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><p>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} services</p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span aria-live="polite">Page {pagination.page} of {pagination.totalPages}</span><Button type="button" size="sm" variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>}
    <Dialog open={isCreateOpen} onOpenChange={(open) => !saving && setIsCreateOpen(open)}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Create celebration service</DialogTitle><DialogDescription>Add a service to the catalogue used for planning and quotations.</DialogDescription></DialogHeader><form onSubmit={createService}><ServiceFormFields draft={newService} includeCode onChange={(field, value) => setNewService((current) => ({ ...current, [field]: value }))} /><DialogFooter className="mt-6"><Button type="button" variant="outline" disabled={saving} onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button disabled={saving} type="submit">{saving ? 'Creating…' : 'Create service'}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={editingService !== null} onOpenChange={(open) => !open && closeEdit()}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Edit {editingService?.name}</DialogTitle><DialogDescription>The service code cannot be changed after creation.</DialogDescription></DialogHeader>{editDraft && <form onSubmit={saveService}><ServiceFormFields draft={editDraft} onChange={(field, value) => setEditDraft((current) => current ? { ...current, [field]: value } : current)} /><DialogFooter className="mt-6"><Button type="button" variant="outline" disabled={saving} onClick={closeEdit}>Cancel</Button><Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save changes'}</Button></DialogFooter></form>}</DialogContent></Dialog>
    <AlertDialog open={deletingService !== null} onOpenChange={(open) => !open && !saving && setDeletingService(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deletingService?.name}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the service from the celebration catalogue and it will no longer be available for enquiries or quotations.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={() => void deleteService()} className="bg-rose-700 text-white hover:bg-rose-800">{saving ? 'Deleting…' : 'Delete service'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}
