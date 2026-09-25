export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      email_subscribers: {
        Row: {
          id: string
          email: string
          preferred_locale: 'en' | 'ta' | null
          status: 'subscribed' | 'unsubscribed'
          consent_source: 'blog_listing' | 'blog_article'
          consented_at: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          preferred_locale?: 'en' | 'ta' | null
          status?: 'subscribed' | 'unsubscribed'
          consent_source: 'blog_listing' | 'blog_article'
          consented_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          preferred_locale?: 'en' | 'ta' | null
          status?: 'subscribed' | 'unsubscribed'
          consent_source?: 'blog_listing' | 'blog_article'
          consented_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
      }
      email_suppressions: {
        Row: { id: string; subscriber_id: string; reason: 'bounce' | 'complaint' | 'provider_suppression' | 'manual_admin'; source: 'provider' | 'admin' | 'system'; suppressed_at: string; released_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; subscriber_id: string; reason: 'bounce' | 'complaint' | 'provider_suppression' | 'manual_admin'; source: 'provider' | 'admin' | 'system'; suppressed_at?: string; released_at?: string | null; created_at?: string; updated_at?: string }
        Update: { released_at?: string | null; updated_at?: string }
      }
      notification_campaigns: {
        Row: {
          id: string
          campaign_type: 'blog_publication'
          source_type: 'blog'
          source_id: string
          locale: 'en' | 'ta' | null
          channel: 'email'
          subject: string
          preheader: string | null
          headline: string
          summary: string | null
          target_url: string
          source_published_at: string
          status: 'draft' | 'queued' | 'processing' | 'completed' | 'partially_failed' | 'failed' | 'cancelled'
          created_by: string | null
          queued_by: string | null
          created_at: string
          updated_at: string
          queued_at: string | null
          started_at: string | null
          completed_at: string | null
          recipient_count: number
          sent_count: number
          failed_count: number
          skipped_count: number
        }
        Insert: {
          id?: string
          campaign_type: 'blog_publication'
          source_type: 'blog'
          source_id: string
          locale?: 'en' | 'ta' | null
          channel: 'email'
          subject: string
          preheader?: string | null
          headline: string
          summary?: string | null
          target_url: string
          source_published_at: string
          status?: 'draft' | 'queued' | 'processing' | 'completed' | 'partially_failed' | 'failed' | 'cancelled'
          created_by?: string | null
          queued_by?: string | null
          created_at?: string
          updated_at?: string
          queued_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          recipient_count?: number
          sent_count?: number
          failed_count?: number
          skipped_count?: number
        }
        Update: {
          status?: 'draft' | 'queued' | 'processing' | 'completed' | 'partially_failed' | 'failed' | 'cancelled'
          queued_by?: string | null
          updated_at?: string
          queued_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          recipient_count?: number
          sent_count?: number
          failed_count?: number
          skipped_count?: number
        }
      }
      notification_jobs: {
        Row: {
          id: string
          campaign_id: string
          subscriber_id: string
          channel: 'email'
          status: 'pending' | 'processing' | 'retry' | 'sent' | 'failed' | 'skipped'
          attempt_count: number
          next_attempt_at: string | null
          claimed_at: string | null
          processed_at: string | null
          provider_message_id: string | null
          last_error_code: string | null
          delivery_status: 'delivered' | 'delayed' | 'bounced' | 'complained' | 'suppressed' | 'failed' | null
          delivery_updated_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          subscriber_id: string
          channel: 'email'
          status?: 'pending' | 'processing' | 'retry' | 'sent' | 'failed' | 'skipped'
          attempt_count?: number
          next_attempt_at?: string | null
          claimed_at?: string | null
          processed_at?: string | null
          provider_message_id?: string | null
          last_error_code?: string | null
          delivery_status?: 'delivered' | 'delayed' | 'bounced' | 'complained' | 'suppressed' | 'failed' | null
          delivery_updated_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'processing' | 'retry' | 'sent' | 'failed' | 'skipped'
          attempt_count?: number
          next_attempt_at?: string | null
          claimed_at?: string | null
          processed_at?: string | null
          provider_message_id?: string | null
          last_error_code?: string | null
          delivery_status?: 'delivered' | 'delayed' | 'bounced' | 'complained' | 'suppressed' | 'failed' | null
          delivery_updated_at?: string | null
          delivered_at?: string | null
          updated_at?: string
        }
      }
      notification_provider_events: {
        Row: { id: string; provider: 'resend'; provider_event_id: string; provider_message_id: string | null; event_type: string; job_id: string | null; campaign_id: string | null; occurred_at: string | null; processing_status: 'processed' | 'ignored' | 'unmatched'; created_at: string; updated_at: string }
        Insert: { id?: string; provider: 'resend'; provider_event_id: string; provider_message_id?: string | null; event_type: string; job_id?: string | null; campaign_id?: string | null; occurred_at?: string | null; processing_status: 'processed' | 'ignored' | 'unmatched'; created_at?: string; updated_at?: string }
        Update: { processing_status?: 'processed' | 'ignored' | 'unmatched'; job_id?: string | null; campaign_id?: string | null; updated_at?: string }
      }
      celebration_services: {
        Row: {
          id: string
          enquiry_reference: string | null
          code: string
          name: string
          description: string | null
          icon: string | null
          location: string
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enquiry_reference?: string | null
          code: string
          name: string
          description?: string | null
          icon?: string | null
          location: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enquiry_reference?: string | null
          code?: string
          name?: string
          description?: string | null
          icon?: string | null
          location?: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      celebration_enquiries: {
        Row: {
          id: string
          location: string
          celebration_type: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
          husband_name: string | null
          wife_name: string | null
          husband_dob: string | null
          wife_dob: string | null
          husband_nakshatra: string | null
          wife_nakshatra: string | null
          husband_rasi: string | null
          wife_rasi: string | null
          preferred_date: string
          alternative_date: string | null
          guest_count_range: 'below-20' | '20-50' | '51-100' | '100-plus'
          travelling_from: string | null
          arrangement_preference: 'ceremony-only' | 'ceremony-food' | 'ceremony-stay' | 'complete-arrangement' | 'need-guidance'
          expected_guest_count: number | null
          plan_type: 'basic' | 'premium' | null
          plan_version: number | null
          special_requirements: string | null
          ceremony_duration: 'one_session' | 'two_sessions' | null
          contact_name: string
          mobile: string
          email: string | null
          relationship: string | null
          preferred_contact_method: 'phone' | 'whatsapp' | 'email'
          other_service_details: string | null
          notes: string | null
          status: 'new' | 'contacted' | 'planning' | 'confirmed' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location: string
          celebration_type: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
          husband_name?: string | null
          wife_name?: string | null
          husband_dob?: string | null
          wife_dob?: string | null
          husband_nakshatra?: string | null
          wife_nakshatra?: string | null
          husband_rasi?: string | null
          wife_rasi?: string | null
          preferred_date: string
          alternative_date?: string | null
          guest_count_range: 'below-20' | '20-50' | '51-100' | '100-plus'
          travelling_from?: string | null
          arrangement_preference: 'ceremony-only' | 'ceremony-food' | 'ceremony-stay' | 'complete-arrangement' | 'need-guidance'
          expected_guest_count?: number | null
          plan_type?: 'basic' | 'premium' | null
          plan_version?: number | null
          special_requirements?: string | null
          ceremony_duration?: 'one_session' | 'two_sessions' | null
          contact_name: string
          mobile: string
          email?: string | null
          relationship?: string | null
          preferred_contact_method: 'phone' | 'whatsapp' | 'email'
          other_service_details?: string | null
          notes?: string | null
          status?: 'new' | 'contacted' | 'planning' | 'confirmed' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location?: string
          celebration_type?: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
          husband_name?: string | null
          wife_name?: string | null
          husband_dob?: string | null
          wife_dob?: string | null
          husband_nakshatra?: string | null
          wife_nakshatra?: string | null
          husband_rasi?: string | null
          wife_rasi?: string | null
          preferred_date?: string
          alternative_date?: string | null
          guest_count_range?: 'below-20' | '20-50' | '51-100' | '100-plus'
          travelling_from?: string | null
          arrangement_preference?: 'ceremony-only' | 'ceremony-food' | 'ceremony-stay' | 'complete-arrangement' | 'need-guidance'
          expected_guest_count?: number | null
          plan_type?: 'basic' | 'premium' | null
          plan_version?: number | null
          special_requirements?: string | null
          ceremony_duration?: 'one_session' | 'two_sessions' | null
          contact_name?: string
          mobile?: string
          email?: string | null
          relationship?: string | null
          preferred_contact_method?: 'phone' | 'whatsapp' | 'email'
          other_service_details?: string | null
          notes?: string | null
          status?: 'new' | 'contacted' | 'planning' | 'confirmed' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      celebration_enquiry_services: {
        Row: {
          enquiry_id: string
          service_id: string
          created_at: string
        }
        Insert: {
          enquiry_id: string
          service_id: string
          created_at?: string
        }
        Update: {
          enquiry_id?: string
          service_id?: string
          created_at?: string
        }
      }
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
      success_stories: {
        Row: {
          id: string
          profile1_id: string | null
          profile2_id: string | null
          couple_names: string
          location: string
          story_text: string
          couple_photo_url: string | null
          wedding_photos: string[] | null
          marriage_date: string | null
          is_featured: boolean
          is_published: boolean
          display_order: number
          submission_type: 'admin' | 'user_submitted'
          status: 'pending' | 'approved' | 'rejected'
          submitted_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile1_id?: string | null
          profile2_id?: string | null
          couple_names: string
          location: string
          story_text: string
          couple_photo_url?: string | null
          wedding_photos?: string[] | null
          marriage_date?: string | null
          is_featured?: boolean
          is_published?: boolean
          display_order?: number
          submission_type?: 'admin' | 'user_submitted'
          status?: 'pending' | 'approved' | 'rejected'
          submitted_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile1_id?: string | null
          profile2_id?: string | null
          couple_names?: string
          location?: string
          story_text?: string
          couple_photo_url?: string | null
          wedding_photos?: string[] | null
          marriage_date?: string | null
          is_featured?: boolean
          is_published?: boolean
          display_order?: number
          submission_type?: 'admin' | 'user_submitted'
          status?: 'pending' | 'approved' | 'rejected'
          submitted_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: 'male' | 'female' | 'other'
          marital_status: 'never_married' | 'divorced' | 'widowed' | 'awaiting_divorce'
          religion: string | null
          caste: string | null
          sub_caste: string | null
          mother_tongue: string | null
          height_cm: number | null
          weight_kg: number | null
          complexion: 'fair' | 'wheatish' | 'dark' | 'very_fair' | null
          blood_group: string | null
          disability: string | null
          city: string
          state: string
          country: string
          profile_photo_url: string | null
          about_me: string | null
          hobbies: string[] | null
          // Professional Information
          education: string | null
          occupation: string | null
          company_name: string | null
          annual_income: number | null
          income_currency: string | null
          employment_type: string | null
          work_location: string | null
          // Family Information
          father_name: string | null
          father_occupation: string | null
          mother_name: string | null
          mother_occupation: string | null
          family_type: string | null
          family_status: string | null
          family_values: string | null
          // Sibling Information
          total_siblings: number | null
          brothers_married: number | null
          brothers_unmarried: number | null
          sisters_married: number | null
          sisters_unmarried: number | null
          profile_status: 'incomplete' | 'pending' | 'active' | 'suspended' | 'deleted'
          profile_completion_percentage: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: 'male' | 'female' | 'other'
          marital_status: 'never_married' | 'divorced' | 'widowed' | 'awaiting_divorce'
          religion?: string | null
          caste?: string | null
          sub_caste?: string | null
          mother_tongue?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          complexion?: 'fair' | 'wheatish' | 'dark' | 'very_fair' | null
          blood_group?: string | null
          disability?: string | null
          city: string
          state: string
          country?: string
          profile_photo_url?: string | null
          about_me?: string | null
          hobbies?: string[] | null
          // Professional Information
          education?: string | null
          occupation?: string | null
          company_name?: string | null
          annual_income?: number | null
          income_currency?: string | null
          employment_type?: string | null
          work_location?: string | null
          // Family Information
          father_name?: string | null
          father_occupation?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          family_type?: string | null
          family_status?: string | null
          family_values?: string | null
          // Sibling Information
          total_siblings?: number | null
          brothers_married?: number | null
          brothers_unmarried?: number | null
          sisters_married?: number | null
          sisters_unmarried?: number | null
          profile_status?: 'incomplete' | 'pending' | 'active' | 'suspended' | 'deleted'
          profile_completion_percentage?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          marital_status?: 'never_married' | 'divorced' | 'widowed' | 'awaiting_divorce'
          religion?: string | null
          caste?: string | null
          sub_caste?: string | null
          mother_tongue?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          complexion?: 'fair' | 'wheatish' | 'dark' | 'very_fair' | null
          blood_group?: string | null
          disability?: string | null
          city?: string
          state?: string
          country?: string
          profile_photo_url?: string | null
          about_me?: string | null
          hobbies?: string[] | null
          // Professional Information
          education?: string | null
          occupation?: string | null
          company_name?: string | null
          annual_income?: number | null
          income_currency?: string | null
          employment_type?: string | null
          work_location?: string | null
          // Family Information
          father_name?: string | null
          father_occupation?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          family_type?: string | null
          family_status?: string | null
          family_values?: string | null
          // Sibling Information
          total_siblings?: number | null
          brothers_married?: number | null
          brothers_unmarried?: number | null
          sisters_married?: number | null
          sisters_unmarried?: number | null
          profile_status?: 'incomplete' | 'pending' | 'active' | 'suspended' | 'deleted'
          profile_completion_percentage?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_celebration_enquiry: {
        Args: {
          p_location: string
          p_celebration_type: string
          p_husband_name: string | null
          p_wife_name: string | null
          p_husband_dob: string | null
          p_wife_dob: string | null
          p_preferred_date: string
          p_guest_count_range: string
          p_arrangement_preference: string
          p_contact_name: string
          p_mobile: string
          p_preferred_contact_method: string
          p_service_ids?: string[]
          p_alternative_date?: string | null
          p_husband_nakshatra?: string | null
          p_wife_nakshatra?: string | null
          p_husband_rasi?: string | null
          p_wife_rasi?: string | null
          p_travelling_from?: string | null
          p_email?: string | null
          p_relationship?: string | null
          p_other_service_details?: string | null
          p_notes?: string | null
          p_expected_guest_count?: number | null
          p_plan_type?: string | null
          p_plan_version?: number | null
          p_special_requirements?: string | null
          p_ceremony_duration?: string | null
        }
        Returns: string
      }
      queue_notification_campaign: {
        Args: { p_campaign_id: string; p_queued_by?: string | null }
        Returns: { status: string; campaign_id: string; recipient_count: number }[]
      }
      count_notification_campaign_recipients: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      claim_notification_jobs: {
        Args: { p_batch_size: number }
        Returns: { id: string; campaign_id: string; subscriber_id: string; channel: 'email'; attempt_count: number }[]
      }
      record_notification_job_outcome: {
        Args: { p_job_id: string; p_outcome: string; p_attempt_count: number; p_provider_message_id?: string | null; p_error_code?: string | null; p_next_attempt_at?: string | null }
        Returns: boolean
      }
      process_notification_provider_event: {
        Args: { p_provider: string; p_provider_event_id: string; p_provider_message_id: string | null; p_event_type: string; p_occurred_at: string | null; p_delivery_status: string | null; p_suppression_reason: string | null }
        Returns: { processing_status: string; job_id: string | null; campaign_id: string | null }[]
      }
      get_notification_campaign_delivery_summary: {
        Args: { p_campaign_id: string }
        Returns: { delivered: number; delayed: number; bounced: number; complained: number; suppressed: number; failed: number }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
