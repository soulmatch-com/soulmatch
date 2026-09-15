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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Membership Tabs Section */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 py-3">
            <button className="px-6 py-2 text-sm font-medium text-orange-600 border-b-2 border-orange-600">
              Regular
            </button>
            <button className="px-6 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
              PRIME ⭐
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {!profile ? (
            <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <AlertCircle className="h-16 w-16 text-orange-500" />
                </div>
                <CardTitle className="text-2xl">Welcome to MyThirumanam.in</CardTitle>
                <CardDescription className="text-base">
                  Create your verified profile to begin discovering compatible families
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Link href="/profile/create">
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Create Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Profile Sidebar - 1 column (25%) */}
              <div className="lg:col-span-1">
                <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Profile Avatar */}
                      {profile.profile_photo_url ? (
                        <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700">
                          <Image
                            src={profile.profile_photo_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                      ) : (
                        <Avatar className="w-28 h-28 ring-2 ring-slate-200 dark:ring-slate-700">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-950 text-orange-700 dark:text-orange-300">
                            {profile.first_name[0]}{profile.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Name & Badge */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {profile.first_name} {profile.last_name}
                        </h3>
                        <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center justify-center gap-1 mt-1">
                          <CheckCircle className="h-4 w-4" />
                          MyThirumanam
                        </p>
                      </div>

                      {/* Profile ID */}
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          T{user.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>

                      {/* Membership Status */}
                      <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Free member</p>
                      </div>

                      {/* Upgrade Prompt */}
                      <div className="w-full">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Upgrade membership to call
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content - 3 columns (75%) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Profile Completion Widget */}
                <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          Complete Your Profile
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Profile completeness score {profile.profile_completion_percentage || 0}%
                          </span>
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 transition-all duration-300"
                              style={{ width: `${profile.profile_completion_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Cards - 3 columns */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <Link href="/profile/edit">
                          <div className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all cursor-pointer">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-slate-100">Add Photo(s)</p>
                            </div>
                          </div>
                        </Link>

                        <Link href="/profile/edit">
                          <div className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all cursor-pointer">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-slate-100">Verify Profile</p>
                            </div>
                          </div>
                        </Link>

                        <Link href="/profile/edit">
                          <div className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all cursor-pointer">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-slate-100">Family Details</p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Recommendations */}
                <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Daily Recommendations</CardTitle>
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                        Time left to view
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Heart className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        No recommendations available yet
                      </p>
                      <Link href="/search">
                        <Button className="mt-4 bg-orange-500 hover:bg-orange-600">
                          <Users className="mr-2 h-4 w-4" />
                          Browse Profiles
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
