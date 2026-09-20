import { redirect } from 'next/navigation'

import BlogEditorForm from '@/components/admin/BlogEditorForm'
import { requireActiveAdmin } from '@/lib/admin-auth'

export default async function NewAdminBlogPage() {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')

  return <div className="container mx-auto px-4 py-10"><div className="mx-auto max-w-4xl"><div className="mb-8"><h1 className="text-3xl font-bold text-slate-900">Add Blog</h1><p className="mt-2 text-slate-600">Create an English, Tamil or bilingual blog draft.</p></div><BlogEditorForm /></div></div>
}
