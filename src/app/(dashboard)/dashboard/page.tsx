import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Users, Heart, MessageSquare, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Welcome back!
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Continue your journey to find your perfect match
                </p>
              </div>
              <Link href="/search">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all">
                  <Users className="mr-2 h-5 w-5" />
                  Find Matches
                </Button>
              </Link>
            </div>
          </div>

          {!profile ? (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <AlertCircle className="h-16 w-16 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Welcome to SoulMatch!</CardTitle>
                <CardDescription className="text-base">
                  Complete your profile to start finding your perfect match
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Link href="/profile/create">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Create Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Card - Spans 2 columns */}
              <Card className="lg:col-span-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Profile Photo & Progress Ring */}
                    <div className="flex flex-col items-center gap-4">
                      {profile.profile_photo_url ? (
                        <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-purple-200 dark:ring-purple-800">
                          <Image
                            src={profile.profile_photo_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                      ) : (
                        <Avatar className="w-32 h-32 ring-4 ring-purple-200 dark:ring-purple-800">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-700 dark:text-purple-300">
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
                        <Button variant="outline" className="w-full md:w-auto">
                          Edit Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                  <CardDescription>Your activity overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <Heart className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">0</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Matches</p>
                        </div>
                      </div>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
                          <Users className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">0</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Interests</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">0</p>
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
