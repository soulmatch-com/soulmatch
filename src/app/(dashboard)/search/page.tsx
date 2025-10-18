'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface Profile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  marital_status: string
  religion: string | null
  caste: string | null
  mother_tongue: string | null
  city: string
  state: string
  country: string
  profile_photo_url: string | null
  height_cm: number | null
  education: string | null
  occupation: string | null
  annual_income: number | null
  about_me: string | null
  profile_status: string
}

export default function SearchPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search filters
  const [filters, setFilters] = useState({
    gender: '',
    minAge: '',
    maxAge: '',
    religion: '',
    maritalStatus: '',
    state: '',
    city: '',
    education: '',
    minHeight: '',
    maxHeight: '',
  })

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Please login to search for matches')
        return
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('profile_status', 'active')
        .neq('user_id', user.id)

      // Apply filters
      if (filters.gender && filters.gender !== 'any') {
        query = query.eq('gender', filters.gender)
      }
      if (filters.religion) {
        query = query.eq('religion', filters.religion)
      }
      if (filters.maritalStatus && filters.maritalStatus !== 'any') {
        query = query.eq('marital_status', filters.maritalStatus)
      }
      if (filters.state) {
        query = query.eq('state', filters.state)
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`)
      }
      if (filters.education) {
        query = query.ilike('education', `%${filters.education}%`)
      }
      if (filters.minHeight) {
        query = query.gte('height_cm', parseInt(filters.minHeight))
      }
      if (filters.maxHeight) {
        query = query.lte('height_cm', parseInt(filters.maxHeight))
      }

      const { data, error } = await query.limit(20)

      if (error) {
        console.error('Search error:', error)
        toast.error('Failed to load profiles')
        return
      }

      // Filter by age if specified
      let filteredData = data || []
      if (filters.minAge || filters.maxAge) {
        const currentYear = new Date().getFullYear()
        filteredData = filteredData.filter(profile => {
          const birthYear = new Date(profile.date_of_birth).getFullYear()
          const age = currentYear - birthYear

          if (filters.minAge && age < parseInt(filters.minAge)) return false
          if (filters.maxAge && age > parseInt(filters.maxAge)) return false
          return true
        })
      }

      setProfiles(filteredData)
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    loadProfiles()
  }

  const handleClearFilters = () => {
    setFilters({
      gender: '',
      minAge: '',
      maxAge: '',
      religion: '',
      maritalStatus: '',
      state: '',
      city: '',
      education: '',
      minHeight: '',
      maxHeight: '',
    })
    setTimeout(() => loadProfiles(), 100)
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Find Your Match</h1>
          <p className="text-slate-600 mt-2">Search for compatible partners</p>
        </div>

        {/* Search Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>Refine your search criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Gender */}
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={filters.gender || undefined} onValueChange={(value) => handleFilterChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Range */}
              <div className="space-y-2">
                <Label>Min Age</Label>
                <Input
                  type="number"
                  placeholder="18"
                  value={filters.minAge}
                  onChange={(e) => handleFilterChange('minAge', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Age</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={filters.maxAge}
                  onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                />
              </div>

              {/* Religion */}
              <div className="space-y-2">
                <Label>Religion</Label>
                <Input
                  placeholder="Hindu, Muslim, etc."
                  value={filters.religion}
                  onChange={(e) => handleFilterChange('religion', e.target.value)}
                />
              </div>

              {/* Marital Status */}
              <div className="space-y-2">
                <Label>Marital Status</Label>
                <Select value={filters.maritalStatus || undefined} onValueChange={(value) => handleFilterChange('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="never_married">Never Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  placeholder="Maharashtra"
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Mumbai"
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </div>

              {/* Education */}
              <div className="space-y-2">
                <Label>Education</Label>
                <Input
                  placeholder="B.Tech, MBA, etc."
                  value={filters.education}
                  onChange={(e) => handleFilterChange('education', e.target.value)}
                />
              </div>

              {/* Height Range */}
              <div className="space-y-2">
                <Label>Min Height (cm)</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={filters.minHeight}
                  onChange={(e) => handleFilterChange('minHeight', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Height (cm)</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={filters.maxHeight}
                  onChange={(e) => handleFilterChange('maxHeight', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={handleSearch}>Search</Button>
              <Button variant="outline" onClick={handleClearFilters}>Clear Filters</Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-slate-600">Loading profiles...</p>
          </div>
        ) : profiles.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-slate-600">No profiles found matching your criteria.</p>
              <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Found {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      {/* Profile Photo */}
                      {profile.profile_photo_url ? (
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-200 mb-4">
                          <Image
                            src={profile.profile_photo_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="w-32 h-32 mb-4">
                          <AvatarFallback className="text-3xl">
                            {profile.first_name[0]}{profile.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Profile Info */}
                      <h3 className="text-xl font-semibold mb-1">
                        {profile.first_name} {profile.last_name[0]}.
                      </h3>
                      <p className="text-sm text-slate-600 mb-4">
                        {calculateAge(profile.date_of_birth)} years • {profile.city}, {profile.state}
                      </p>

                      <div className="w-full space-y-2 text-left text-sm">
                        {profile.education && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Education:</span>
                            <span className="font-medium">{profile.education}</span>
                          </div>
                        )}
                        {profile.occupation && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Occupation:</span>
                            <span className="font-medium">{profile.occupation}</span>
                          </div>
                        )}
                        {profile.height_cm && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Height:</span>
                            <span className="font-medium">{profile.height_cm} cm</span>
                          </div>
                        )}
                        {profile.religion && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Religion:</span>
                            <span className="font-medium">{profile.religion}</span>
                          </div>
                        )}
                        {profile.mother_tongue && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Mother Tongue:</span>
                            <span className="font-medium">{profile.mother_tongue}</span>
                          </div>
                        )}
                      </div>

                      <Button className="w-full mt-6" asChild>
                        <Link href={`/profile/${profile.id}`}>View Profile</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
