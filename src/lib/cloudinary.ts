import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

// Helper function to generate signature for client-side uploads
export function generateSignature(paramsToSign: Record<string, string>) {
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  )
  return signature
}

// Helper function to get upload URL
export function getUploadUrl() {
  return `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
}

// Helper function to get optimized image URL
export function getOptimizedImageUrl(publicId: string, options?: {
  width?: number
  height?: number
  crop?: string
  quality?: string | number
}) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width: options?.width || 800,
        height: options?.height,
        crop: options?.crop || 'fill',
        quality: options?.quality || 'auto',
        fetch_format: 'auto',
      },
    ],
  })
}
