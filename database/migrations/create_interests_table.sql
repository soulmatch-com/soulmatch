-- SoulMatch - Interests Table Migration
-- This table tracks interest sent from one profile to another
-- Run this in Supabase SQL Editor

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

-- Updated_at trigger (uses existing function)
CREATE TRIGGER update_interests_updated_at
  BEFORE UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interests table

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON interests TO authenticated;
