'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_profile: {
    id: string
    first_name: string
    last_name: string
    profile_photo_url: string | null
  } | null
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) return

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.notifications?.filter((n: Notification) => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`px-4 py-3 cursor-pointer ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => {
                markAsRead(notification.id)
              }}
            >
              <Link
                href={notification.related_profile ? `/profile/${notification.related_profile.id}` : '#'}
                className="flex gap-3 w-full"
              >
                {notification.related_profile && (
                  <div className="flex-shrink-0">
                    {notification.related_profile.profile_photo_url ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={notification.related_profile.profile_photo_url}
                          alt={notification.related_profile.first_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {notification.related_profile.first_name[0]}
                          {notification.related_profile.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                )}
              </Link>
            </DropdownMenuItem>
          ))
        )}

        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/interests">View all interests</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
