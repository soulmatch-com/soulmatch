'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Image from 'next/image'

interface PhotoUploadProps {
  onUpload: (url: string) => void
  currentPhotoUrl?: string
  isLoading?: boolean
}

export function PhotoUpload({ onUpload, currentPhotoUrl, isLoading }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to server
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      onUpload(data.url)
      toast.success('Photo uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload photo')
      setPreview(currentPhotoUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <Label>Profile Photo *</Label>

      <div className="flex flex-col items-center gap-4">
        {preview ? (
          <div className="relative">
            <Avatar className="h-32 w-32">
              <AvatarImage src={preview} alt="Profile photo" />
              <AvatarFallback>Photo</AvatarFallback>
            </Avatar>
            {!isLoading && !uploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="h-32 w-32 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
            <Upload className="h-8 w-8 text-slate-400" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading || uploading}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || uploading}
        >
          {uploading ? 'Uploading...' : preview ? 'Change Photo' : 'Upload Photo'}
        </Button>

        <p className="text-sm text-slate-500 text-center">
          Upload a clear photo of yourself. Max size: 5MB
        </p>
      </div>
    </div>
  )
}
