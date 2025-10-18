import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/search">
            <Button>Find Matches</Button>
          </Link>
        </div>

        {!profile ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to SoulMatch!</CardTitle>
              <CardDescription>
                Complete your profile to start finding matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile/create">
                <Button>Create Profile</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Profile completion: {profile.profile_completion_percentage}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  {/* Profile Photo */}
                  <div className="flex-shrink-0">
                    {profile.profile_photo_url ? (
                      <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-200">
                        <Image
                          src={profile.profile_photo_url}
                          alt={`${profile.first_name} ${profile.last_name}`}
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    ) : (
                      <Avatar className="w-32 h-32">
                        <AvatarFallback className="text-3xl">
                          {profile.first_name[0]}{profile.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-2xl font-semibold">{profile.first_name} {profile.last_name}</h3>
                      <p className="text-slate-600">{profile.city}, {profile.state}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Status</p>
                        <p className="font-medium capitalize">{profile.profile_status}</p>
                      </div>
                      {profile.occupation && (
                        <div>
                          <p className="text-slate-600">Occupation</p>
                          <p className="font-medium">{profile.occupation}</p>
                        </div>
                      )}
                      {profile.education && (
                        <div>
                          <p className="text-slate-600">Education</p>
                          <p className="font-medium">{profile.education}</p>
                        </div>
                      )}
                      {profile.marital_status && (
                        <div>
                          <p className="text-slate-600">Marital Status</p>
                          <p className="font-medium capitalize">{profile.marital_status.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>

                    <Link href="/profile/edit">
                      <Button variant="outline">Edit Profile</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-slate-600">Matches</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-slate-600">Interests</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-slate-600">Messages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
