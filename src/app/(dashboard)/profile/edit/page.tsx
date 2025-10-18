'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Image from 'next/image'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    religion: '',
    caste: '',
    subCaste: '',
    gothram: '',
    dosham: '',
    doshamDetails: '',
    motherTongue: '',
    city: '',
    state: '',
    country: 'India',
    aboutMe: '',
    hobbies: '',
    heightCm: '',
    weightKg: '',
    complexion: '',
    bloodGroup: '',
    // Professional Information
    education: '',
    occupation: '',
    companyName: '',
    annualIncome: '',
    incomeCurrency: 'INR',
    employmentType: '',
    workLocation: '',
    // Family Information
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    familyType: '',
    familyStatus: '',
    familyValues: '',
    // Sibling Information
    totalSiblings: '0',
    brothersMarried: '0',
    brothersUnmarried: '0',
    sistersMarried: '0',
    sistersUnmarried: '0',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        toast.error('Failed to load profile')
        return
      }

      if (profile) {
        setProfilePhotoUrl(profile.profile_photo_url || null)
        setFormData({
          // Basic Information
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          dateOfBirth: profile.date_of_birth || '',
          gender: profile.gender || '',
          maritalStatus: profile.marital_status || '',
          religion: profile.religion || '',
          caste: profile.caste || '',
          subCaste: profile.sub_caste || '',
          gothram: profile.gothram || '',
          dosham: profile.dosham || '',
          doshamDetails: profile.dosham_details || '',
          motherTongue: profile.mother_tongue || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || 'India',
          aboutMe: profile.about_me || '',
          hobbies: profile.hobbies?.join(', ') || '',
          heightCm: profile.height_cm?.toString() || '',
          weightKg: profile.weight_kg?.toString() || '',
          complexion: profile.complexion || '',
          bloodGroup: profile.blood_group || '',
          // Professional Information
          education: profile.education || '',
          occupation: profile.occupation || '',
          companyName: profile.company_name || '',
          annualIncome: profile.annual_income?.toString() || '',
          incomeCurrency: profile.income_currency || 'INR',
          employmentType: profile.employment_type || '',
          workLocation: profile.work_location || '',
          // Family Information
          fatherName: profile.father_name || '',
          fatherOccupation: profile.father_occupation || '',
          motherName: profile.mother_name || '',
          motherOccupation: profile.mother_occupation || '',
          familyType: profile.family_type || '',
          familyStatus: profile.family_status || '',
          familyValues: profile.family_values || '',
          // Sibling Information
          totalSiblings: profile.total_siblings?.toString() || '0',
          brothersMarried: profile.brothers_married?.toString() || '0',
          brothersUnmarried: profile.brothers_unmarried?.toString() || '0',
          sistersMarried: profile.sisters_married?.toString() || '0',
          sistersUnmarried: profile.sisters_unmarried?.toString() || '0',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You must be logged in')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          // Basic Information
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          marital_status: formData.maritalStatus,
          religion: formData.religion || null,
          caste: formData.caste || null,
          sub_caste: formData.subCaste || null,
          gothram: formData.gothram || null,
          dosham: formData.dosham || null,
          dosham_details: formData.doshamDetails || null,
          mother_tongue: formData.motherTongue,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          about_me: formData.aboutMe || null,
          hobbies: formData.hobbies ? formData.hobbies.split(',').map(h => h.trim()).filter(h => h) : null,
          height_cm: formData.heightCm ? parseInt(formData.heightCm) : null,
          weight_kg: formData.weightKg ? parseInt(formData.weightKg) : null,
          complexion: formData.complexion || null,
          blood_group: formData.bloodGroup || null,
          // Professional Information
          education: formData.education || null,
          occupation: formData.occupation || null,
          company_name: formData.companyName || null,
          annual_income: formData.annualIncome ? parseFloat(formData.annualIncome) : null,
          income_currency: formData.incomeCurrency || null,
          employment_type: formData.employmentType || null,
          work_location: formData.workLocation || null,
          // Family Information
          father_name: formData.fatherName || null,
          father_occupation: formData.fatherOccupation || null,
          mother_name: formData.motherName || null,
          mother_occupation: formData.motherOccupation || null,
          family_type: formData.familyType || null,
          family_status: formData.familyStatus || null,
          family_values: formData.familyValues || null,
          // Sibling Information
          total_siblings: formData.totalSiblings ? parseInt(formData.totalSiblings) : 0,
          brothers_married: formData.brothersMarried ? parseInt(formData.brothersMarried) : 0,
          brothers_unmarried: formData.brothersUnmarried ? parseInt(formData.brothersUnmarried) : 0,
          sisters_married: formData.sistersMarried ? parseInt(formData.sistersMarried) : 0,
          sisters_unmarried: formData.sistersUnmarried ? parseInt(formData.sistersUnmarried) : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Profile update error:', error)
        toast.error(error.message || 'Failed to update profile')
        return
      }

      toast.success('Profile updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setIsUploadingPhoto(true)
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
      setProfilePhotoUrl(data.url)

      // Update profile photo in database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: data.url })
          .eq('user_id', user.id)
      }

      toast.success('Photo uploaded successfully!')
    } catch (error) {
      console.error('Photo upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <p>Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Photo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Profile Photo</h3>

              <div className="flex items-center gap-6">
                {profilePhotoUrl ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-200">
                    <Image
                      src={profilePhotoUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Avatar className="w-32 h-32">
                    <AvatarFallback className="text-3xl">
                      {formData.firstName[0]}{formData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1">
                  <Label htmlFor="photoUpload" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingPhoto}
                        onClick={() => document.getElementById('photoUpload')?.click()}
                      >
                        {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                      </Button>
                    </div>
                  </Label>
                  <Input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Marital Status *</Label>
                <Select value={formData.maritalStatus} onValueChange={(value) => handleChange('maritalStatus', value)}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never_married">Never Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="awaiting_divorce">Awaiting Divorce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cultural Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Cultural Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="religion">Religion</Label>
                  <Input
                    id="religion"
                    value={formData.religion}
                    onChange={(e) => handleChange('religion', e.target.value)}
                    disabled={isLoading}
                    placeholder="Hindu, Muslim, Christian, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caste">Caste</Label>
                  <Input
                    id="caste"
                    value={formData.caste}
                    onChange={(e) => handleChange('caste', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subCaste">Sub Caste</Label>
                  <Input
                    id="subCaste"
                    value={formData.subCaste}
                    onChange={(e) => handleChange('subCaste', e.target.value)}
                    disabled={isLoading}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gothram">Gothram</Label>
                  <Input
                    id="gothram"
                    value={formData.gothram}
                    onChange={(e) => handleChange('gothram', e.target.value)}
                    disabled={isLoading}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dosham</Label>
                <Select value={formData.dosham} onValueChange={(value) => handleChange('dosham', value)}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="Select dosham status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="dont_know">Don't Know</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.dosham === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="doshamDetails">Dosham Details *</Label>
                  <Textarea
                    id="doshamDetails"
                    value={formData.doshamDetails}
                    onChange={(e) => handleChange('doshamDetails', e.target.value)}
                    disabled={isLoading}
                    placeholder="Please provide details about the dosham (e.g., Manglik, Chevvai, Kala Sarpa, etc.)"
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">
                    Please specify the type of dosham and any relevant details
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="motherTongue">Mother Tongue *</Label>
                <Input
                  id="motherTongue"
                  value={formData.motherTongue}
                  onChange={(e) => handleChange('motherTongue', e.target.value)}
                  disabled={isLoading}
                  required
                  placeholder="Hindi, English, Tamil, etc."
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Location</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Physical Attributes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Physical Attributes</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heightCm">Height (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    value={formData.heightCm}
                    onChange={(e) => handleChange('heightCm', e.target.value)}
                    disabled={isLoading}
                    placeholder="170"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (kg)</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    value={formData.weightKg}
                    onChange={(e) => handleChange('weightKg', e.target.value)}
                    disabled={isLoading}
                    placeholder="70"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => handleChange('bloodGroup', e.target.value)}
                    disabled={isLoading}
                    placeholder="A+"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Complexion</Label>
                <Select value={formData.complexion} onValueChange={(value) => handleChange('complexion', value)}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="Select complexion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_fair">Very Fair</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="wheatish">Wheatish</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Professional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => handleChange('education', e.target.value)}
                  disabled={isLoading}
                  placeholder="B.Tech, MBA, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    disabled={isLoading}
                    placeholder="Software Engineer, Doctor, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="annualIncome">Annual Income</Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    value={formData.annualIncome}
                    onChange={(e) => handleChange('annualIncome', e.target.value)}
                    disabled={isLoading}
                    placeholder="500000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.incomeCurrency} onValueChange={(value) => handleChange('incomeCurrency', value)}>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={formData.employmentType} onValueChange={(value) => handleChange('employmentType', value)}>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="self_employed">Self Employed</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="not_working">Not Working</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workLocation">Work Location</Label>
                  <Input
                    id="workLocation"
                    value={formData.workLocation}
                    onChange={(e) => handleChange('workLocation', e.target.value)}
                    disabled={isLoading}
                    placeholder="City or Remote"
                  />
                </div>
              </div>
            </div>

            {/* Family Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Family Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Father's Name</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => handleChange('fatherName', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                  <Input
                    id="fatherOccupation"
                    value={formData.fatherOccupation}
                    onChange={(e) => handleChange('fatherOccupation', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="motherName">Mother's Name</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName}
                    onChange={(e) => handleChange('motherName', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                  <Input
                    id="motherOccupation"
                    value={formData.motherOccupation}
                    onChange={(e) => handleChange('motherOccupation', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Family Type</Label>
                  <Select value={formData.familyType} onValueChange={(value) => handleChange('familyType', value)}>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuclear">Nuclear</SelectItem>
                      <SelectItem value="joint">Joint</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Family Status</Label>
                  <Select value={formData.familyStatus} onValueChange={(value) => handleChange('familyStatus', value)}>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lower_middle">Lower Middle Class</SelectItem>
                      <SelectItem value="middle">Middle Class</SelectItem>
                      <SelectItem value="upper_middle">Upper Middle Class</SelectItem>
                      <SelectItem value="rich">Rich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Family Values</Label>
                  <Select value={formData.familyValues} onValueChange={(value) => handleChange('familyValues', value)}>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select values" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traditional">Traditional</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="liberal">Liberal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sibling Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Sibling Information</h3>

              <div className="space-y-2">
                <Label htmlFor="totalSiblings">Total Siblings</Label>
                <Input
                  id="totalSiblings"
                  type="number"
                  min="0"
                  value={formData.totalSiblings}
                  onChange={(e) => handleChange('totalSiblings', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brothersMarried">Brothers (Married)</Label>
                  <Input
                    id="brothersMarried"
                    type="number"
                    min="0"
                    value={formData.brothersMarried}
                    onChange={(e) => handleChange('brothersMarried', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brothersUnmarried">Brothers (Unmarried)</Label>
                  <Input
                    id="brothersUnmarried"
                    type="number"
                    min="0"
                    value={formData.brothersUnmarried}
                    onChange={(e) => handleChange('brothersUnmarried', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sistersMarried">Sisters (Married)</Label>
                  <Input
                    id="sistersMarried"
                    type="number"
                    min="0"
                    value={formData.sistersMarried}
                    onChange={(e) => handleChange('sistersMarried', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sistersUnmarried">Sisters (Unmarried)</Label>
                  <Input
                    id="sistersUnmarried"
                    type="number"
                    min="0"
                    value={formData.sistersUnmarried}
                    onChange={(e) => handleChange('sistersUnmarried', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* About Me & Hobbies */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">About Me & Interests</h3>

              <div className="space-y-2">
                <Label htmlFor="aboutMe">About Me</Label>
                <Textarea
                  id="aboutMe"
                  value={formData.aboutMe}
                  onChange={(e) => handleChange('aboutMe', e.target.value)}
                  disabled={isLoading}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hobbies">Hobbies & Interests</Label>
                <Input
                  id="hobbies"
                  value={formData.hobbies}
                  onChange={(e) => handleChange('hobbies', e.target.value)}
                  disabled={isLoading}
                  placeholder="Reading, Traveling, Cooking, Music (comma-separated)"
                />
                <p className="text-xs text-slate-500">Separate multiple hobbies with commas</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
