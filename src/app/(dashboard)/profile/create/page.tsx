'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BasicInfoForm } from '@/components/profile/BasicInfoForm'
import { PhotoUpload } from '@/components/profile/PhotoUpload'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { BasicInfoInput } from '@/lib/validations/profile.schema'

export default function CreateProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<BasicInfoInput & { profilePhotoUrl: string }>>({})

  const handleBasicInfoSubmit = (data: BasicInfoInput) => {
    setFormData((prev) => ({ ...prev, ...data }))
    setStep(2)
  }

  const handlePhotoUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, profilePhotoUrl: url }))
  }

  const handleFinalSubmit = async () => {
    if (!formData.profilePhotoUrl) {
      toast.error('Please upload a profile photo')
      return
    }

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You must be logged in to create a profile')
        return
      }

      // Convert form data to match database schema
      // Convert date to YYYY-MM-DD format for PostgreSQL
      const dateOfBirth = typeof formData.dateOfBirth === 'string'
        ? formData.dateOfBirth
        : formData.dateOfBirth instanceof Date
          ? formData.dateOfBirth.toISOString().split('T')[0]
          : formData.dateOfBirth!.toString().split('T')[0]

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        first_name: formData.firstName!,
        last_name: formData.lastName!,
        date_of_birth: dateOfBirth,
        gender: formData.gender!,
        marital_status: formData.maritalStatus!,
        religion: formData.religion || null,
        caste: formData.caste || null,
        sub_caste: formData.subCaste || null,
        gothram: formData.gothram || null,
        dosham: formData.dosham || null,
        dosham_details: formData.doshamDetails || null,
        mother_tongue: formData.motherTongue!,
        city: formData.city!,
        state: formData.state!,
        country: formData.country || 'India',
        profile_photo_url: formData.profilePhotoUrl,
        profile_status: 'active',
      })

      if (error) {
        console.error('Profile creation error:', error)
        toast.error(error.message || 'Failed to create profile')
        return
      }

      toast.success('Profile created successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 2: {step === 1 ? 'Basic Information' : 'Profile Photo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <BasicInfoForm
              onSubmit={handleBasicInfoSubmit}
              defaultValues={formData}
              isLoading={isLoading}
            />
          )}

          {step === 2 && (
            <div className="space-y-6">
              <PhotoUpload
                onUpload={handlePhotoUpload}
                currentPhotoUrl={formData.profilePhotoUrl}
                isLoading={isLoading}
              />

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={!formData.profilePhotoUrl || isLoading}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Profile...' : 'Create Profile'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
