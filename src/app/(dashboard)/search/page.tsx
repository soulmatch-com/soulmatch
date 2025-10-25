'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProfileCardSkeleton } from '@/components/dashboard/ProfileCardSkeleton'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageSquare, Star, Loader2, X, ChevronDown, ChevronUp, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

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
  const [showFilters, setShowFilters] = useState(false)

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

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'any').length

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
        .eq('is_verified', true)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">
              Search Compatible Profiles
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Discover verified families who share your cultural values and traditions
            </p>
          </div>

          {/* Search Filters */}
          <Card className="mb-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl border border-blue-100 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <SearchIcon className="h-5 w-5 text-blue-700" />
                    Compatibility Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                        {activeFiltersCount} active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Refine by cultural values and family preferences</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden"
                >
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {/* Active Filter Chips */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {filters.gender && filters.gender !== 'any' && (
                    <Badge variant="outline" className="gap-1">
                      Gender: {filters.gender}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleFilterChange('gender', '')}
                      />
                    </Badge>
                  )}
                  {filters.minAge && (
                    <Badge variant="outline" className="gap-1">
                      Min Age: {filters.minAge}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleFilterChange('minAge', '')}
                      />
                    </Badge>
                  )}
                  {filters.maxAge && (
                    <Badge variant="outline" className="gap-1">
                      Max Age: {filters.maxAge}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleFilterChange('maxAge', '')}
                      />
                    </Badge>
                  )}
                  {filters.city && (
                    <Badge variant="outline" className="gap-1">
                      City: {filters.city}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleFilterChange('city', '')}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className={`${showFilters ? 'block' : 'hidden'} md:block`}>
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
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 group"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SearchIcon className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                )}
                Search Profiles
              </Button>
              <Button variant="outline" onClick={handleClearFilters} disabled={isLoading} className="border-slate-300 dark:border-slate-600 group">
                <X className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
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
                <Card key={profile.id} className="hover:shadow-xl transition-all border border-blue-100 dark:border-blue-900 bg-white/90 dark:bg-slate-800/90 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      {/* Profile Photo */}
                      {profile.profile_photo_url ? (
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 dark:border-blue-800 mb-4 shadow-md">
                          <Image
                            src={profile.profile_photo_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="w-32 h-32 mb-4 border-4 border-blue-200 dark:border-blue-800">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900 text-blue-700 dark:text-blue-300">
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

                        <Button className="w-full mt-6 bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 group" asChild>
                          <Link href={`/profile/${profile.id}`}>
                            View Full Profile
                            <Heart className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          </Link>
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
    </div>
  )
}
