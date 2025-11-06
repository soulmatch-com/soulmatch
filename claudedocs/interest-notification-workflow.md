# Interest & Notification Module - Implementation Workflow

## Executive Summary

**Feature**: Profile Interest & Notification System
**Objective**: Enable users to send interest to profiles and receive notifications when someone expresses interest in their profile
**Complexity**: Moderate (Database, Backend API, Frontend UI, Real-time notifications)
**Estimated Timeline**: 3-5 days
**Priority**: High (Core matrimonial feature)

---

## Phase 1: Database Schema Design

### 1.1 Interests Table

**Purpose**: Track interest sent from one profile to another

```sql
-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  message TEXT, -- Optional message when sending interest
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate interests
  UNIQUE(sender_profile_id, receiver_profile_id)
);

-- Indexes for performance
CREATE INDEX idx_interests_sender ON interests(sender_profile_id);
CREATE INDEX idx_interests_receiver ON interests(receiver_profile_id);
CREATE INDEX idx_interests_status ON interests(status);
CREATE INDEX idx_interests_created_at ON interests(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_interests_updated_at
  BEFORE UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Notifications Table

**Purpose**: Store notification events for users

```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('interest_received', 'interest_accepted', 'interest_declined', 'message_received', 'profile_view')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Profile that triggered the notification
  related_interest_id UUID REFERENCES interests(id) ON DELETE CASCADE, -- Interest that triggered notification
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### 1.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Interests RLS Policies
-- Users can view interests they sent or received
CREATE POLICY "Users can view their interests"
  ON interests FOR SELECT
  TO authenticated
  USING (
    sender_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Users can send interests
CREATE POLICY "Users can send interests"
  ON interests FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Users can update interests they sent or received
CREATE POLICY "Users can update their interests"
  ON interests FOR UPDATE
  TO authenticated
  USING (
    sender_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Notifications RLS Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
```

### 1.4 Database Functions & Triggers

```sql
-- Function to create notification when interest is sent
CREATE OR REPLACE FUNCTION create_interest_notification()
RETURNS TRIGGER AS $$
DECLARE
  receiver_user_id UUID;
  sender_profile profiles%ROWTYPE;
BEGIN
  -- Get receiver's user_id
  SELECT user_id INTO receiver_user_id
  FROM profiles
  WHERE id = NEW.receiver_profile_id;

  -- Get sender profile details
  SELECT * INTO sender_profile
  FROM profiles
  WHERE id = NEW.sender_profile_id;

  -- Create notification for receiver
  INSERT INTO notifications (
    user_id,
    profile_id,
    type,
    title,
    message,
    related_profile_id,
    related_interest_id
  ) VALUES (
    receiver_user_id,
    NEW.receiver_profile_id,
    'interest_received',
    'New Interest Received',
    sender_profile.first_name || ' ' || sender_profile.last_name || ' has expressed interest in your profile',
    NEW.sender_profile_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on interest insert
CREATE TRIGGER interest_notification_trigger
  AFTER INSERT ON interests
  FOR EACH ROW
  EXECUTE FUNCTION create_interest_notification();

-- Function to create notification when interest status changes
CREATE OR REPLACE FUNCTION create_interest_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_user_id UUID;
  receiver_profile profiles%ROWTYPE;
BEGIN
  -- Only notify on status change (not initial creation)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get sender's user_id
  SELECT user_id INTO sender_user_id
  FROM profiles
  WHERE id = NEW.sender_profile_id;

  -- Get receiver profile details
  SELECT * INTO receiver_profile
  FROM profiles
  WHERE id = NEW.receiver_profile_id;

  -- Create notification based on new status
  IF NEW.status = 'accepted' THEN
    INSERT INTO notifications (
      user_id,
      profile_id,
      type,
      title,
      message,
      related_profile_id,
      related_interest_id
    ) VALUES (
      sender_user_id,
      NEW.sender_profile_id,
      'interest_accepted',
      'Interest Accepted',
      receiver_profile.first_name || ' ' || receiver_profile.last_name || ' has accepted your interest',
      NEW.receiver_profile_id,
      NEW.id
    );
  ELSIF NEW.status = 'declined' THEN
    INSERT INTO notifications (
      user_id,
      profile_id,
      type,
      title,
      message,
      related_profile_id,
      related_interest_id
    ) VALUES (
      sender_user_id,
      NEW.sender_profile_id,
      'interest_declined',
      'Interest Declined',
      receiver_profile.first_name || ' ' || receiver_profile.last_name || ' has declined your interest',
      NEW.receiver_profile_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on interest status update
CREATE TRIGGER interest_status_notification_trigger
  AFTER UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION create_interest_status_notification();
```

**Files to create**:
- `database/migrations/create_interests_table.sql`
- `database/migrations/create_notifications_table.sql`

---

## Phase 2: TypeScript Type Definitions

### 2.1 Update `src/types/database.types.ts`

```typescript
export interface Database {
  public: {
    Tables: {
      // ... existing tables
      interests: {
        Row: {
          id: string
          sender_profile_id: string
          receiver_profile_id: string
          status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_profile_id: string
          receiver_profile_id: string
          status?: 'pending' | 'accepted' | 'declined' | 'withdrawn'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_profile_id?: string
          receiver_profile_id?: string
          status?: 'pending' | 'accepted' | 'declined' | 'withdrawn'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          profile_id: string
          type: 'interest_received' | 'interest_accepted' | 'interest_declined' | 'message_received' | 'profile_view'
          title: string
          message: string
          related_profile_id: string | null
          related_interest_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_id: string
          type: 'interest_received' | 'interest_accepted' | 'interest_declined' | 'message_received' | 'profile_view'
          title: string
          message: string
          related_profile_id?: string | null
          related_interest_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_id?: string
          type?: 'interest_received' | 'interest_accepted' | 'interest_declined' | 'message_received' | 'profile_view'
          title?: string
          message?: string
          related_profile_id?: string | null
          related_interest_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
```

---

## Phase 3: Backend API Implementation

### 3.1 Interests API Routes

**File**: `src/app/api/interests/send/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { receiver_profile_id, message } = await request.json()

  if (!receiver_profile_id) {
    return NextResponse.json({ error: 'receiver_profile_id is required' }, { status: 400 })
  }

  // Get sender's profile
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!senderProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Check if interest already exists
  const { data: existingInterest } = await supabase
    .from('interests')
    .select('*')
    .eq('sender_profile_id', senderProfile.id)
    .eq('receiver_profile_id', receiver_profile_id)
    .single()

  if (existingInterest) {
    return NextResponse.json({ error: 'Interest already sent' }, { status: 400 })
  }

  // Prevent self-interest
  if (senderProfile.id === receiver_profile_id) {
    return NextResponse.json({ error: 'Cannot send interest to yourself' }, { status: 400 })
  }

  // Create interest
  const { data: interest, error } = await supabase
    .from('interests')
    .insert({
      sender_profile_id: senderProfile.id,
      receiver_profile_id,
      message,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating interest:', error)
    return NextResponse.json({ error: 'Failed to send interest' }, { status: 500 })
  }

  return NextResponse.json({ success: true, interest }, { status: 201 })
}
```

**File**: `src/app/api/interests/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch interests (sent and received)
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'sent' or 'received'

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  let query = supabase
    .from('interests')
    .select(`
      *,
      sender_profile:sender_profile_id(id, first_name, last_name, profile_photo_url, city, state, education, occupation),
      receiver_profile:receiver_profile_id(id, first_name, last_name, profile_photo_url, city, state, education, occupation)
    `)

  if (type === 'sent') {
    query = query.eq('sender_profile_id', profile.id)
  } else if (type === 'received') {
    query = query.eq('receiver_profile_id', profile.id)
  } else {
    // Return both sent and received
    query = query.or(`sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`)
  }

  query = query.order('created_at', { ascending: false })

  const { data: interests, error } = await query

  if (error) {
    console.error('Error fetching interests:', error)
    return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 })
  }

  return NextResponse.json({ interests }, { status: 200 })
}
```

**File**: `src/app/api/interests/[id]/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH: Update interest status (accept/decline/withdraw)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await request.json()

  if (!['accepted', 'declined', 'withdrawn'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get interest to verify ownership
  const { data: interest } = await supabase
    .from('interests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!interest) {
    return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
  }

  // Verify user can update this interest
  const canUpdate = interest.receiver_profile_id === profile.id || interest.sender_profile_id === profile.id

  if (!canUpdate) {
    return NextResponse.json({ error: 'Not authorized to update this interest' }, { status: 403 })
  }

  // Update interest
  const { data: updatedInterest, error } = await supabase
    .from('interests')
    .update({ status })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating interest:', error)
    return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 })
  }

  return NextResponse.json({ success: true, interest: updatedInterest }, { status: 200 })
}
```

### 3.2 Notifications API Routes

**File**: `src/app/api/notifications/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch user notifications
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = supabase
    .from('notifications')
    .select(`
      *,
      related_profile:related_profile_id(id, first_name, last_name, profile_photo_url)
    `)
    .eq('user_id', user.id)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  query = query.order('created_at', { ascending: false }).limit(50)

  const { data: notifications, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  return NextResponse.json({ notifications }, { status: 200 })
}
```

**File**: `src/app/api/notifications/[id]/read/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH: Mark notification as read
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }

  return NextResponse.json({ success: true, notification }, { status: 200 })
}
```

**File**: `src/app/api/notifications/mark-all-read/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Mark all notifications as read
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
```

---

## Phase 4: Frontend Implementation

### 4.1 Send Interest Button Component

**File**: `src/components/interests/SendInterestButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface SendInterestButtonProps {
  receiverProfileId: string
  onInterestSent?: () => void
}

export function SendInterestButton({ receiverProfileId, onInterestSent }: SendInterestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [message, setMessage] = useState('')

  const handleSendInterest = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/interests/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_profile_id: receiverProfileId,
          message: message.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send interest')
        return
      }

      toast.success('Interest sent successfully!')
      setShowDialog(false)
      setMessage('')
      onInterestSent?.()
    } catch (error) {
      console.error('Error sending interest:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
      >
        <Heart className="mr-2 h-4 w-4" />
        Send Interest
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Interest</DialogTitle>
            <DialogDescription>
              Express your interest in this profile. You can optionally include a message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Write a brief introduction message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-slate-500">
                {message.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInterest}
              disabled={isLoading}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Send Interest
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### 4.2 Notifications Bell Component

**File**: `src/components/notifications/NotificationBell.tsx`

```typescript
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
            <Link href="/dashboard/notifications">View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 4.3 Integrate SendInterestButton in Search Page

**Modification**: `src/app/(dashboard)/search/page.tsx`

Add import:
```typescript
import { SendInterestButton } from '@/components/interests/SendInterestButton'
```

Replace the "View Full Profile" button (around line 773-778) with:
```typescript
<div className="flex gap-2 mt-6">
  <SendInterestButton receiverProfileId={profile.id} />
  <Button variant="outline" className="flex-1" asChild>
    <Link href={`/profile/${profile.id}`}>
      View Profile
    </Link>
  </Button>
</div>
```

### 4.4 Add NotificationBell to Dashboard Header

**Modification**: `src/app/(dashboard)/layout.tsx` or create a dashboard header component

Add the NotificationBell component to the dashboard navigation bar.

### 4.5 Interests Page (Sent & Received)

**File**: `src/app/(dashboard)/interests/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
                  "{interest.message}"
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
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Interests</h1>

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
  )
}
```

---

## Phase 5: Testing & Quality Assurance

### 5.1 Manual Testing Checklist

**Database Tests**:
- [ ] Create interests table migration runs without errors
- [ ] Create notifications table migration runs without errors
- [ ] RLS policies prevent unauthorized access
- [ ] Triggers create notifications automatically
- [ ] Unique constraint prevents duplicate interests

**API Tests**:
- [ ] POST /api/interests/send creates interest and notification
- [ ] GET /api/interests returns sent and received interests
- [ ] PATCH /api/interests/[id] updates interest status
- [ ] GET /api/notifications returns user notifications
- [ ] PATCH /api/notifications/[id]/read marks notification as read
- [ ] POST /api/notifications/mark-all-read marks all as read

**Frontend Tests**:
- [ ] SendInterestButton appears on profile cards
- [ ] Interest dialog opens with message input
- [ ] Interest sends successfully with toast confirmation
- [ ] NotificationBell shows unread count
- [ ] Notification dropdown displays recent notifications
- [ ] Clicking notification marks it as read
- [ ] Interests page shows sent and received tabs
- [ ] Accept/Decline buttons work on received interests
- [ ] Status badges update correctly

**Edge Cases**:
- [ ] Cannot send interest to self
- [ ] Cannot send duplicate interest
- [ ] Interest status changes trigger notifications
- [ ] Notification polling works correctly
- [ ] RLS prevents viewing others' interests/notifications

### 5.2 Integration Testing

Test complete user flow:
1. User A sends interest to User B
2. User B receives notification
3. User B accepts interest
4. User A receives acceptance notification
5. Both users can see interest status

---

## Phase 6: Deployment

### 6.1 Database Migration Deployment

**Order of execution**:
1. Run `database/migrations/create_interests_table.sql` in Supabase SQL Editor
2. Run `database/migrations/create_notifications_table.sql` in Supabase SQL Editor
3. Verify tables, triggers, and RLS policies created successfully

### 6.2 Code Deployment

**Deployment checklist**:
- [ ] Update `src/types/database.types.ts` with new table types
- [ ] Create all API routes under `src/app/api/`
- [ ] Create UI components under `src/components/`
- [ ] Create Interests page under `src/app/(dashboard)/interests/`
- [ ] Integrate SendInterestButton in search page
- [ ] Add NotificationBell to dashboard layout
- [ ] Test on local development environment
- [ ] Run `npm run build` to verify no build errors
- [ ] Deploy to Vercel or production environment
- [ ] Monitor error logs for issues

### 6.3 Post-Deployment Monitoring

**Monitor**:
- API response times for interest operations
- Database query performance on interests/notifications tables
- Error rates in Supabase logs
- User feedback on notification delivery
- Notification polling performance

---

## Phase 7: Future Enhancements

### 7.1 Real-time Notifications (Optional)

**Supabase Realtime Integration**:
- Subscribe to notifications table changes
- Push real-time updates to NotificationBell
- Show live toast notifications for new interests

### 7.2 Email Notifications (Optional)

**Email Integration**:
- Send email when interest received (daily digest)
- Send email when interest accepted/declined
- User preferences for email notifications

### 7.3 Analytics & Insights (Optional)

**Interest Analytics**:
- Track interest acceptance rates
- Profile view to interest conversion
- Most active users/profiles
- Admin dashboard for interest statistics

---

## Summary

**Implementation Phases**:
1. ✅ **Phase 1**: Database schema (interests, notifications tables)
2. ✅ **Phase 2**: TypeScript types update
3. ✅ **Phase 3**: Backend API (interests, notifications endpoints)
4. ✅ **Phase 4**: Frontend UI (SendInterestButton, NotificationBell, Interests page)
5. ✅ **Phase 5**: Testing & QA
6. ✅ **Phase 6**: Deployment
7. ✅ **Phase 7**: Future enhancements

**Estimated Timeline**: 3-5 days for full implementation

**Key Files to Create**:
- Database migrations (2 files)
- Type definitions update (1 file)
- API routes (7 files)
- UI components (3 files)
- Interests page (1 file)

**Total New Files**: ~14 files + modifications to 2 existing files
