import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Users, Heart, MessageSquare, TrendingUp, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">
                  Welcome Back
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Continue your journey to discover compatible families
                </p>
              </div>
              <Link href="/search">
                <Button size="lg" className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 shadow-lg hover:shadow-xl transition-all">
                  <Users className="mr-2 h-5 w-5" />
                  Search Profiles
                </Button>
              </Link>
            </div>
          </div>

          {!profile ? (
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl border border-blue-100 dark:border-blue-900">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <AlertCircle className="h-16 w-16 text-blue-700" />
                </div>
                <CardTitle className="text-2xl">Welcome to MyThirumanam.in</CardTitle>
                <CardDescription className="text-base">
                  Create your verified profile to begin discovering compatible families
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Link href="/profile/create">
                  <Button size="lg" className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 group">
                    <CheckCircle className="mr-2 h-5 w-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" />
                    Create Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Card - Spans 2 columns */}
              <Card className="lg:col-span-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl border border-blue-100 dark:border-blue-900">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Profile Photo & Progress Ring */}
                    <div className="flex flex-col items-center gap-4">
                      {profile.profile_photo_url ? (
                        <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-blue-200 dark:ring-blue-800">
                          <Image
                            src={profile.profile_photo_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                      ) : (
                        <Avatar className="w-32 h-32 ring-4 ring-blue-200 dark:ring-blue-800">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900 text-blue-700 dark:text-blue-300">
                            {profile.first_name[0]}{profile.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <ProgressRing progress={profile.profile_completion_percentage || 0} size={100} />
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {profile.first_name} {profile.last_name}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <span>{profile.city}, {profile.state}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                          <p className="text-slate-500 dark:text-slate-400 text-xs">Status</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{profile.profile_status}</p>
                        </div>
                        {profile.occupation && (
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Occupation</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{profile.occupation}</p>
                          </div>
                        )}
                        {profile.education && (
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Education</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{profile.education}</p>
                          </div>
                        )}
                        {profile.marital_status && (
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Marital Status</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{profile.marital_status.replace('_', ' ')}</p>
                          </div>
                        )}
                      </div>

                      <Link href="/profile/edit">
                        <Button variant="outline" className="w-full md:w-auto group">
                          <Settings className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                          Edit Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl border border-blue-100 dark:border-blue-900">
                <CardHeader>
                  <CardTitle className="text-lg">Activity Overview</CardTitle>
                  <CardDescription>Your profile engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Heart className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">0</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Compatible Prospects</p>
                        </div>
                      </div>
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                          <Users className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">0</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Family Connections</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">0</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Messages</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
