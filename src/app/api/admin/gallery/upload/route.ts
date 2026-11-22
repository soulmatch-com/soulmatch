import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { requireActiveAdmin } from '@/lib/admin-auth'

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 10 * 1024 * 1024

cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Gallery upload is unavailable because Cloudinary is not fully configured.')
    return NextResponse.json({ message: 'Image uploads are temporarily unavailable because Cloudinary is not configured.' }, { status: 503 })
  }
  try {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || !supportedTypes.has(file.type) || file.size > maxBytes) return NextResponse.json({ message: 'Upload a JPG, PNG, or WebP image smaller than 10 MB.' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await new Promise<{ secure_url: string; public_id: string; width: number; height: number }>((resolve, reject) => cloudinary.uploader.upload_stream({ folder: 'soulmatch/gallery', resource_type: 'image', transformation: [{ width: 2400, height: 2400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }], strip_transformation: true }, (error, upload) => error || !upload ? reject(error ?? new Error('Upload failed')) : resolve(upload as { secure_url: string; public_id: string; width: number; height: number })).end(buffer))
    return NextResponse.json({ imageUrl: result.secure_url, cloudinaryPublicId: result.public_id, width: result.width, height: result.height })
  } catch (error) { console.error('Gallery upload failed', error); return NextResponse.json({ message: 'Upload failed.' }, { status: 500 }) }
}
