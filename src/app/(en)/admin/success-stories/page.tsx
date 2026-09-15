'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/modules/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Star, Eye, EyeOff, Pencil, Trash2, Check, X, Heart, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { successStorySchema } from '@/lib/validations/success-story.schema'
import { z } from 'zod'

interface SuccessStory {
  id: string
  couple_names: string
  location: string
  story_text: string
  couple_photo_url: string | null
  wedding_photos: string[] | null
  marriage_date: string | null
  is_featured: boolean
  is_published: boolean
  display_order: number
  submission_type: 'admin' | 'user_submitted'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface FormData {
  couple_names: string
  location: string
  story_text: string
  couple_photo_url: string
  marriage_date: string
  is_featured: boolean
  is_published: boolean
  display_order: number
}

export default function SuccessStoriesPage() {
  const { clearAdmin } = useAdminStore()
  const router = useRouter()
  const [stories, setStories] = useState<SuccessStory[]>([])
  const [filteredStories, setFilteredStories] = useState<SuccessStory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedStory, setSelectedStory] = useState<SuccessStory | null>(null)

  // Form state
  const [formData, setFormData] = useState<FormData>({
    couple_names: '',
    location: '',
    story_text: '',
    couple_photo_url: '',
    marriage_date: '',
    is_featured: false,
    is_published: false,
    display_order: 0
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchStories()
  }, [])

  useEffect(() => {
    filterStories()
  }, [stories, activeTab])

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/admin/success-stories')
      if (response.ok) {
        const data = await response.json()
        setStories(data.stories || [])
      } else if (response.status === 401 || response.status === 403) {
        clearAdmin()
        router.replace('/admin/login')
      } else {
        toast.error('Failed to fetch success stories')
      }
    } catch (error) {
      console.error('Failed to fetch success stories:', error)
      toast.error('Failed to fetch success stories')
    } finally {
      setLoading(false)
    }
  }

  const filterStories = () => {
    let filtered = stories

    switch (activeTab) {
      case 'pending':
        filtered = stories.filter(s => s.status === 'pending')
        break
      case 'published':
        filtered = stories.filter(s => s.is_published)
        break
      case 'drafts':
        filtered = stories.filter(s => !s.is_published)
        break
      default:
        filtered = stories
    }

    setFilteredStories(filtered)
  }

  const resetForm = () => {
    setFormData({
      couple_names: '',
      location: '',
      story_text: '',
      couple_photo_url: '',
      marriage_date: '',
      is_featured: false,
      is_published: false,
      display_order: 0
    })
    setFormErrors({})
  }

  const handleCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const handleEdit = (story: SuccessStory) => {
    setSelectedStory(story)
    setFormData({
      couple_names: story.couple_names,
      location: story.location,
      story_text: story.story_text,
      couple_photo_url: story.couple_photo_url || '',
      marriage_date: story.marriage_date || '',
      is_featured: story.is_featured,
      is_published: story.is_published,
      display_order: story.display_order
    })
    setFormErrors({})
    setIsEditOpen(true)
  }

  const handleDelete = (story: SuccessStory) => {
    setSelectedStory(story)
    setIsDeleteOpen(true)
  }

  const validateForm = () => {
    try {
      successStorySchema.parse({
        ...formData,
        couple_photo_url: formData.couple_photo_url || null,
        marriage_date: formData.marriage_date || null,
        wedding_photos: null
      })
      setFormErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message
          }
        })
        setFormErrors(errors)
      }
      return false
    }
  }

  const submitForm = async (isEdit: boolean) => {
    if (!validateForm()) {
      toast.error('Please fix validation errors')
      return
    }

    try {
      const url = isEdit && selectedStory
        ? `/api/admin/success-stories/${selectedStory.id}`
        : '/api/admin/success-stories'

      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          couple_photo_url: formData.couple_photo_url || null,
          marriage_date: formData.marriage_date || null,
          submission_type: 'admin',
          status: 'approved'
        })
      })

      if (response.ok) {
        toast.success(isEdit ? 'Story updated successfully' : 'Story created successfully')
        setIsCreateOpen(false)
        setIsEditOpen(false)
        fetchStories()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save story')
      }
    } catch (error) {
      console.error('Failed to save story:', error)
      toast.error('Failed to save story')
    }
  }

  const confirmDelete = async () => {
    if (!selectedStory) return

    try {
      const response = await fetch(`/api/admin/success-stories/${selectedStory.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Story deleted successfully')
        setIsDeleteOpen(false)
        setSelectedStory(null)
        fetchStories()
      } else {
        toast.error('Failed to delete story')
      }
    } catch (error) {
      console.error('Failed to delete story:', error)
      toast.error('Failed to delete story')
    }
  }

  const toggleFeatured = async (story: SuccessStory) => {
    try {
      const response = await fetch(`/api/admin/success-stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !story.is_featured })
      })

      if (response.ok) {
        toast.success(`Story ${!story.is_featured ? 'featured' : 'unfeatured'}`)
        fetchStories()
      } else {
        toast.error('Failed to update story')
      }
    } catch (error) {
      console.error('Failed to update story:', error)
      toast.error('Failed to update story')
    }
  }

  const togglePublished = async (story: SuccessStory) => {
    try {
      const response = await fetch(`/api/admin/success-stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !story.is_published })
      })

      if (response.ok) {
        toast.success(`Story ${!story.is_published ? 'published' : 'unpublished'}`)
        fetchStories()
      } else {
        toast.error('Failed to update story')
      }
    } catch (error) {
      console.error('Failed to update story:', error)
      toast.error('Failed to update story')
    }
  }

  const approveStory = async (story: SuccessStory) => {
    try {
      const response = await fetch(`/api/admin/success-stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          is_published: true
        })
      })

      if (response.ok) {
        toast.success('Story approved and published')
        fetchStories()
      } else {
        toast.error('Failed to approve story')
      }
    } catch (error) {
      console.error('Failed to approve story:', error)
      toast.error('Failed to approve story')
    }
  }

  const rejectStory = async (story: SuccessStory) => {
    try {
      const response = await fetch(`/api/admin/success-stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })

      if (response.ok) {
        toast.success('Story rejected')
        fetchStories()
      } else {
        toast.error('Failed to reject story')
      }
    } catch (error) {
      console.error('Failed to reject story:', error)
      toast.error('Failed to reject story')
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const { url } = await response.json()
        setFormData(prev => ({ ...prev, couple_photo_url: url }))
        toast.success('Photo uploaded successfully')
      } else {
        toast.error('Failed to upload photo')
      }
    } catch (error) {
      console.error('Failed to upload photo:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (story: SuccessStory) => {
    if (story.status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
    }
    if (story.status === 'approved') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
  }

  const stats = {
    total: stories.length,
    published: stories.filter(s => s.is_published).length,
    pending: stories.filter(s => s.status === 'pending').length,
    featured: stories.filter(s => s.is_featured).length
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Heart className="h-8 w-8 text-rose-600" />
              Success Stories Management
            </h1>
            <p className="text-slate-600 mt-2">Manage family success stories for the homepage</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} className="bg-gradient-to-r from-blue-700 to-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Create New Story
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Success Story</DialogTitle>
                <DialogDescription>Add a new family success story to showcase on the homepage</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="couple_names">Couple Names *</Label>
                  <Input
                    id="couple_names"
                    placeholder="e.g., Priya & Rahul"
                    value={formData.couple_names}
                    onChange={(e) => setFormData({...formData, couple_names: e.target.value})}
                  />
                  {formErrors.couple_names && <p className="text-sm text-red-600">{formErrors.couple_names}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Mumbai, Maharashtra"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                  {formErrors.location && <p className="text-sm text-red-600">{formErrors.location}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story_text">Story Text * (50-1000 characters)</Label>
                  <Textarea
                    id="story_text"
                    placeholder="Share the couple's success story..."
                    rows={5}
                    value={formData.story_text}
                    onChange={(e) => setFormData({...formData, story_text: e.target.value})}
                  />
                  <div className="flex justify-between text-xs">
                    <span className={formData.story_text.length < 50 || formData.story_text.length > 1000 ? 'text-red-600' : 'text-slate-500'}>
                      {formData.story_text.length} / 1000 characters
                    </span>
                  </div>
                  {formErrors.story_text && <p className="text-sm text-red-600">{formErrors.story_text}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="couple_photo">Couple Photo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="couple_photo_upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                    {uploading && <p className="text-sm text-slate-500">Uploading...</p>}
                  </div>
                  {formData.couple_photo_url && (
                    <img src={formData.couple_photo_url} alt="Preview" className="mt-2 h-20 w-20 rounded-full object-cover" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marriage_date">Marriage Date</Label>
                  <Input
                    id="marriage_date"
                    type="date"
                    value={formData.marriage_date}
                    onChange={(e) => setFormData({...formData, marriage_date: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="0"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-xs text-slate-500">Higher numbers appear first</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Featured (show first on homepage)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Published (visible on homepage)</span>
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={() => submitForm(false)} className="bg-gradient-to-r from-blue-700 to-emerald-700">
                  Create Story
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Stories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Featured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{stats.featured}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="pending">Pending Approval ({stats.pending})</TabsTrigger>
                <TabsTrigger value="published">Published ({stats.published})</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({stats.total - stats.published})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Couple</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Featured</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Published</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Order</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStories.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No success stories found
                      </td>
                    </tr>
                  ) : (
                    filteredStories.map((story) => (
                      <tr key={story.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {story.couple_photo_url ? (
                              <img src={story.couple_photo_url} alt={story.couple_names} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                                {story.couple_names.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{story.couple_names}</p>
                              <p className="text-xs text-slate-500">{story.submission_type === 'user_submitted' ? 'User Submitted' : 'Admin Created'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{story.location}</td>
                        <td className="py-3 px-4">
                          {getStatusBadge(story)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleFeatured(story)}
                            className={`p-1 rounded hover:bg-slate-100 ${story.is_featured ? 'text-yellow-500' : 'text-slate-300'}`}
                          >
                            <Star className={`h-5 w-5 ${story.is_featured ? 'fill-yellow-500' : ''}`} />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => togglePublished(story)}
                            className={`p-1 rounded hover:bg-slate-100 ${story.is_published ? 'text-green-600' : 'text-slate-400'}`}
                          >
                            {story.is_published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-slate-700 font-medium">{story.display_order}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {story.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveStory(story)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectStory(story)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(story)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(story)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Success Story</DialogTitle>
              <DialogDescription>Update the success story details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_couple_names">Couple Names *</Label>
                <Input
                  id="edit_couple_names"
                  placeholder="e.g., Priya & Rahul"
                  value={formData.couple_names}
                  onChange={(e) => setFormData({...formData, couple_names: e.target.value})}
                />
                {formErrors.couple_names && <p className="text-sm text-red-600">{formErrors.couple_names}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_location">Location *</Label>
                <Input
                  id="edit_location"
                  placeholder="e.g., Mumbai, Maharashtra"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
                {formErrors.location && <p className="text-sm text-red-600">{formErrors.location}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_story_text">Story Text * (50-1000 characters)</Label>
                <Textarea
                  id="edit_story_text"
                  placeholder="Share the couple's success story..."
                  rows={5}
                  value={formData.story_text}
                  onChange={(e) => setFormData({...formData, story_text: e.target.value})}
                />
                <div className="flex justify-between text-xs">
                  <span className={formData.story_text.length < 50 || formData.story_text.length > 1000 ? 'text-red-600' : 'text-slate-500'}>
                    {formData.story_text.length} / 1000 characters
                  </span>
                </div>
                {formErrors.story_text && <p className="text-sm text-red-600">{formErrors.story_text}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_couple_photo">Couple Photo</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit_couple_photo_upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-slate-500">Uploading...</p>}
                </div>
                {formData.couple_photo_url && (
                  <img src={formData.couple_photo_url} alt="Preview" className="mt-2 h-20 w-20 rounded-full object-cover" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_marriage_date">Marriage Date</Label>
                <Input
                  id="edit_marriage_date"
                  type="date"
                  value={formData.marriage_date}
                  onChange={(e) => setFormData({...formData, marriage_date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_display_order">Display Order</Label>
                  <Input
                    id="edit_display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                  />
                  <p className="text-xs text-slate-500">Higher numbers appear first</p>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Featured (show first on homepage)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Published (visible on homepage)</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={() => submitForm(true)} className="bg-gradient-to-r from-blue-700 to-emerald-700">
                Update Story
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Success Story?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the success story for <strong>{selectedStory?.couple_names}</strong>?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
