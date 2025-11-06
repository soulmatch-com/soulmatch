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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
