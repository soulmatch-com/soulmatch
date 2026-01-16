  -- SoulMatch - Notifications Table Migration
  -- This table stores notification events for users
  -- Run this in Supabase SQL Editor AFTER creating interests table

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

  -- Enable Row Level Security
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

  -- RLS Policies for notifications table

  -- Users can only view their own notifications
  CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  -- Users can create their own notifications (for system events)
  CREATE POLICY "Users can create own notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

  -- Users can update their own notifications (mark as read)
  CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

  -- Grant necessary permissions
  GRANT USAGE ON SCHEMA public TO authenticated;
  GRANT ALL ON notifications TO authenticated;

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
