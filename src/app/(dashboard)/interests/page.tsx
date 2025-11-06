'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

interface Interest {
  id: string
  status: string
  message: string | null
  created_at: string
  sender_profile: {
    id: string
    first_name: string
    last_name: string
    profile_photo_url: string | null
    city: string
    state: string
    education: string | null
    occupation: string | null
  }
  receiver_profile: {
    id: string
    first_name: string
    last_name: string
    profile_photo_url: string | null
    city: string
    state: string
    education: string | null
    occupation: string | null
  }
}

export default function InterestsPage() {
  const [sentInterests, setSentInterests] = useState<Interest[]>([])
  const [receivedInterests, setReceivedInterests] = useState<Interest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchInterests()
  }, [])

  const fetchInterests = async () => {
    setIsLoading(true)
    try {
      const [sentRes, receivedRes] = await Promise.all([
        fetch('/api/interests?type=sent'),
        fetch('/api/interests?type=received')
      ])

      const sentData = await sentRes.json()
      const receivedData = await receivedRes.json()

      setSentInterests(sentData.interests || [])
      setReceivedInterests(receivedData.interests || [])
    } catch (error) {
      console.error('Error fetching interests:', error)
      toast.error('Failed to load interests')
    } finally {
      setIsLoading(false)
    }
  }

  const updateInterestStatus = async (interestId: string, status: string) => {
    setProcessingId(interestId)
    try {
      const response = await fetch(`/api/interests/${interestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to update interest')
        return
      }

      toast.success(`Interest ${status}`)
      fetchInterests()
    } catch (error) {
      console.error('Error updating interest:', error)
      toast.error('Something went wrong')
    } finally {
      setProcessingId(null)
    }
  }

  const renderInterestCard = (interest: Interest, type: 'sent' | 'received') => {
    const profile = type === 'sent' ? interest.receiver_profile : interest.sender_profile
    const isProcessing = processingId === interest.id

    return (
      <Card key={interest.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Link href={`/profile/${profile.id}`}>
              {profile.profile_photo_url ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={profile.profile_photo_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <Avatar className="w-16 h-16 flex-shrink-0">
                  <AvatarFallback>
                    {profile.first_name[0]}{profile.last_name[0]}
                  </AvatarFallback>
                </Avatar>
              )}
            </Link>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/profile/${profile.id}`}>
                    <h3 className="font-semibold hover:underline">
                      {profile.first_name} {profile.last_name}
                    </h3>
                  </Link>
                  <p className="text-sm text-slate-600">
                    {profile.city}, {profile.state}
                  </p>
                  {profile.occupation && (
                    <p className="text-sm text-slate-500">{profile.occupation}</p>
                  )}
                </div>
                <Badge
                  variant={
                    interest.status === 'accepted' ? 'default' :
                    interest.status === 'declined' ? 'destructive' :
                    interest.status === 'pending' ? 'secondary' : 'outline'
                  }
                >
                  {interest.status}
                </Badge>
              </div>

              {interest.message && (
                <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                  &quot;{interest.message}&quot;
                </p>
              )}

              <p className="text-xs text-slate-500 mt-2">
                {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
              </p>

              {type === 'received' && interest.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => updateInterestStatus(interest.id, 'accepted')}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateInterestStatus(interest.id, 'declined')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1 h-4 w-4" />
                        Decline
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">
            Interests
          </h1>

          <Tabs defaultValue="received" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">
                Received ({receivedInterests.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({sentInterests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-4 mt-6">
              {isLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </div>
              ) : receivedInterests.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Heart className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">No interests received yet</p>
                  </CardContent>
                </Card>
              ) : (
                receivedInterests.map(interest => renderInterestCard(interest, 'received'))
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4 mt-6">
              {isLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </div>
              ) : sentInterests.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Heart className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">No interests sent yet</p>
                    <Button className="mt-4" asChild>
                      <Link href="/search">Browse Profiles</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sentInterests.map(interest => renderInterestCard(interest, 'sent'))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
