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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Heart, MessageSquare, Star, Loader2, X, ChevronDown, ChevronUp, ChevronRight, Search as SearchIcon, Sparkles, Info, Filter, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { SendInterestButton } from '@/components/interests/SendInterestButton'

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
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<{ gender: string; religion: string | null; caste: string | null } | null>(null)
  const [autoFiltersApplied, setAutoFiltersApplied] = useState(false)
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true)
  const [sortBy, setSortBy] = useState<'newest' | 'recommended' | 'distance'>('newest')

  // Quick filter toggles
  const [quickFilters, setQuickFilters] = useState({
    newlyJoined: false,
    notSeen: false,
    withPhoto: false,
    verified: false,
    neverMarried: false,
  })

  // Search filters
  const [filters, setFilters] = useState({
    gender: '',
    minAge: '',
    maxAge: '',
    religion: '',
    caste: '',
    maritalStatus: '',
    state: '',
    city: '',
    education: '',
    minHeight: '',
    maxHeight: '',
  })

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'any').length

  useEffect(() => {
    fetchCurrentUserProfile()
  }, [])

  // Trigger search when quick filters or sort changes
  useEffect(() => {
    if (!isLoadingUserProfile && profiles.length >= 0) {
      loadProfiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickFilters, sortBy])

  const fetchCurrentUserProfile = async () => {
    setIsLoadingUserProfile(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingUserProfile(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('gender, religion, caste')
        .eq('user_id', user.id)
        .single()

      if (error || !profile) {
        console.error('Failed to load user profile:', error)
        setIsLoadingUserProfile(false)
        // Still load profiles even if user profile not found
        loadProfiles()
        return
      }

      setCurrentUserProfile(profile)
      applyAutoFilters(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setIsLoadingUserProfile(false)
      loadProfiles()
    }
  }

  const applyAutoFilters = (userProfile: { gender: string; religion: string | null; caste: string | null }) => {
    const autoFilters = { ...filters }
    let filtersApplied = false

    // 1. Opposite Gender Filter
    if (userProfile.gender === 'male') {
      autoFilters.gender = 'female'
      filtersApplied = true
    } else if (userProfile.gender === 'female') {
      autoFilters.gender = 'male'
      filtersApplied = true
    }
    // If gender is 'other', don't auto-apply gender filter

    // 2. Same Religion Filter
    if (userProfile.religion) {
      autoFilters.religion = userProfile.religion
      filtersApplied = true
    }

    // 3. Same Caste Filter
    if (userProfile.caste) {
      autoFilters.caste = userProfile.caste
      filtersApplied = true
    }

    setFilters(autoFilters)
    setAutoFiltersApplied(filtersApplied)
    setIsLoadingUserProfile(false)

    // Automatically trigger search with auto-filters
    loadProfilesWithFilters(autoFilters)
  }

  const loadProfilesWithFilters = async (filterOverride?: typeof filters) => {
    setIsLoading(true)
    const activeFilters = filterOverride || filters

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

      // Apply quick filters
      if (!quickFilters.verified) {
        query = query.eq('is_verified', true)
      }
      if (quickFilters.withPhoto) {
        query = query.not('photo_url', 'is', null)
      }
      if (quickFilters.neverMarried) {
        query = query.eq('marital_status', 'never_married')
      }

      // Apply advanced filters
      if (activeFilters.gender && activeFilters.gender !== 'any') {
        query = query.eq('gender', activeFilters.gender)
      }
      if (activeFilters.religion) {
        query = query.eq('religion', activeFilters.religion)
      }
      if (activeFilters.caste) {
        query = query.eq('caste', activeFilters.caste)
      }
      if (activeFilters.maritalStatus && activeFilters.maritalStatus !== 'any') {
        query = query.eq('marital_status', activeFilters.maritalStatus)
      }
      if (activeFilters.state) {
        query = query.eq('state', activeFilters.state)
      }
      if (activeFilters.city) {
        query = query.ilike('city', `%${activeFilters.city}%`)
      }
      if (activeFilters.education) {
        query = query.ilike('education', `%${activeFilters.education}%`)
      }
      if (activeFilters.minHeight) {
        query = query.gte('height_cm', parseInt(activeFilters.minHeight))
      }
      if (activeFilters.maxHeight) {
        query = query.lte('height_cm', parseInt(activeFilters.maxHeight))
      }

      // Apply sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'recommended') {
        query = query.order('profile_completion_percentage', { ascending: false })
      }
      // Note: 'distance' sorting would require location data and calculation

      const { data, error } = await query.limit(20)

      if (error) {
        console.error('Search error:', error)
        toast.error('Failed to load profiles')
        return
      }

      // Filter by age if specified
      let filteredData = data || []
      if (activeFilters.minAge || activeFilters.maxAge) {
        const currentYear = new Date().getFullYear()
        filteredData = filteredData.filter(profile => {
          const birthYear = new Date(profile.date_of_birth).getFullYear()
          const age = currentYear - birthYear

          if (activeFilters.minAge && age < parseInt(activeFilters.minAge)) return false
          if (activeFilters.maxAge && age > parseInt(activeFilters.maxAge)) return false
          return true
        })
      }

      // Apply client-side quick filters (for features not in DB query)
      if (quickFilters.newlyJoined) {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        filteredData = filteredData.filter(profile =>
          new Date(profile.created_at) >= sevenDaysAgo
        )
      }

      // Note: 'notSeen' filter would require a separate user interaction tracking table
      // For now, we'll skip implementing it until that table exists

      setProfiles(filteredData)
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const loadProfiles = async () => {
    loadProfilesWithFilters()
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
      caste: '',
      maritalStatus: '',
      state: '',
      city: '',
      education: '',
      minHeight: '',
      maxHeight: '',
    })
    setAutoFiltersApplied(false) // User explicitly cleared, don't re-apply auto-filters
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

          {/* Auto-Filter Info Banner */}
          {autoFiltersApplied && currentUserProfile && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2 flex-wrap">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>Auto-filtered based on your profile:</span>
                {currentUserProfile.gender && (currentUserProfile.gender === 'male' || currentUserProfile.gender === 'female') && (
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {currentUserProfile.gender === 'male' ? 'Female' : 'Male'} profiles
                  </Badge>
                )}
                {currentUserProfile.religion && (
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {currentUserProfile.religion}
                  </Badge>
                )}
                {currentUserProfile.caste && (
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {currentUserProfile.caste}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Horizontal Scrollable Filter Bar */}
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterDrawer(true)}
              className="flex-shrink-0 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                  Sort by
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  {sortBy === 'newest' && '✓ '}Newest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('recommended')}>
                  {sortBy === 'recommended' && '✓ '}Recommended
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('distance')}>
                  {sortBy === 'distance' && '✓ '}Distance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Filter Chips */}
            <Badge
              variant={quickFilters.newlyJoined ? "default" : "outline"}
              className={`cursor-pointer flex-shrink-0 ${quickFilters.newlyJoined ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              onClick={() => setQuickFilters(prev => ({ ...prev, newlyJoined: !prev.newlyJoined }))}
            >
              Newly joined
            </Badge>

            <Badge
              variant={quickFilters.notSeen ? "default" : "outline"}
              className={`cursor-pointer flex-shrink-0 ${quickFilters.notSeen ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              onClick={() => setQuickFilters(prev => ({ ...prev, notSeen: !prev.notSeen }))}
            >
              Not seen
            </Badge>

            <Badge
              variant={quickFilters.withPhoto ? "default" : "outline"}
              className={`cursor-pointer flex-shrink-0 ${quickFilters.withPhoto ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              onClick={() => setQuickFilters(prev => ({ ...prev, withPhoto: !prev.withPhoto }))}
            >
              Profiles with photo
            </Badge>

            <Badge
              variant={quickFilters.verified ? "default" : "outline"}
              className={`cursor-pointer flex-shrink-0 ${quickFilters.verified ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              onClick={() => setQuickFilters(prev => ({ ...prev, verified: !prev.verified }))}
            >
              Verified
            </Badge>

            <Badge
              variant={quickFilters.neverMarried ? "default" : "outline"}
              className={`cursor-pointer flex-shrink-0 ${quickFilters.neverMarried ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              onClick={() => setQuickFilters(prev => ({ ...prev, neverMarried: !prev.neverMarried }))}
            >
              Never married
            </Badge>

            {/* Scroll Indicator */}
            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-auto" />
          </div>

          {/* Active Filter Chips Below */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {filters.religion && (
                <Badge
                  variant={autoFiltersApplied && currentUserProfile?.religion === filters.religion ? "default" : "outline"}
                  className={`gap-1 ${autoFiltersApplied && currentUserProfile?.religion === filters.religion ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200' : ''}`}
                >
                  {autoFiltersApplied && currentUserProfile?.religion === filters.religion && <Sparkles className="h-3 w-3" />}
                  Religion: {filters.religion}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleFilterChange('religion', '')}
                  />
                </Badge>
              )}
              {filters.caste && (
                <Badge
                  variant={autoFiltersApplied && currentUserProfile?.caste === filters.caste ? "default" : "outline"}
                  className={`gap-1 ${autoFiltersApplied && currentUserProfile?.caste === filters.caste ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200' : ''}`}
                >
                  {autoFiltersApplied && currentUserProfile?.caste === filters.caste && <Sparkles className="h-3 w-3" />}
                  Caste: {filters.caste}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleFilterChange('caste', '')}
                  />
                </Badge>
              )}
              {filters.minAge && (
                <Badge variant="outline" className="gap-1">
                  Min Age: {filters.minAge}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleFilterChange('minAge', '')}
                  />
                </Badge>
              )}
              {filters.maxAge && (
                <Badge variant="outline" className="gap-1">
                  Max Age: {filters.maxAge}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleFilterChange('maxAge', '')}
                  />
                </Badge>
              )}
              {filters.city && (
                <Badge variant="outline" className="gap-1">
                  City: {filters.city}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleFilterChange('city', '')}
                  />
                </Badge>
              )}
              {filters.maritalStatus && filters.maritalStatus !== 'any' && (
                <Badge variant="outline" className="gap-1">
                  Marital: {filters.maritalStatus.replace('_', ' ')}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleFilterChange('maritalStatus', '')}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Advanced Filters Drawer */}
          <Sheet open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters
                </SheetTitle>
                <SheetDescription>
                  Refine your search with detailed criteria
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Age Range */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Age Range</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>

                {/* Cultural Preferences */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Cultural Preferences</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Religion</Label>
                      <Input
                        placeholder="Hindu, Muslim, etc."
                        value={filters.religion}
                        onChange={(e) => handleFilterChange('religion', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Caste</Label>
                      <Input
                        placeholder="Brahmin, Kshatriya, etc."
                        value={filters.caste}
                        onChange={(e) => handleFilterChange('caste', e.target.value)}
                      />
                    </div>
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
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Location</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        placeholder="Maharashtra"
                        value={filters.state}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="Mumbai"
                        value={filters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Education</h3>
                  <div className="space-y-2">
                    <Label>Education Level</Label>
                    <Input
                      placeholder="B.Tech, MBA, etc."
                      value={filters.education}
                      onChange={(e) => handleFilterChange('education', e.target.value)}
                    />
                  </div>
                </div>

                {/* Height Range */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Height Range (cm)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Height</Label>
                      <Input
                        type="number"
                        placeholder="150"
                        value={filters.minHeight}
                        onChange={(e) => handleFilterChange('minHeight', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Height</Label>
                      <Input
                        type="number"
                        placeholder="200"
                        value={filters.maxHeight}
                        onChange={(e) => handleFilterChange('maxHeight', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6 flex gap-2">
                <Button
                  onClick={() => {
                    handleSearch()
                    setShowFilterDrawer(false)
                  }}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SearchIcon className="mr-2 h-4 w-4" />
                  )}
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleClearFilters()
                    setShowFilterDrawer(false)
                  }}
                  disabled={isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

        {/* Results */}
        {(isLoading || isLoadingUserProfile) ? (
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
              <p className="text-slate-600 mb-2">No profiles found matching your criteria.</p>
              {autoFiltersApplied && (
                <p className="text-sm text-slate-500 mb-4">
                  Try removing some auto-applied filters to see more profiles
                </p>
              )}
              <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                Clear All Filters
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

                        <div className="flex gap-2 mt-6">
                          <SendInterestButton receiverProfileId={profile.id} onInterestSent={loadProfiles} />
                          <Button variant="outline" className="flex-1" asChild>
                            <Link href={`/profile/${profile.id}`}>
                              View Profile
                            </Link>
                          </Button>
                        </div>
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
