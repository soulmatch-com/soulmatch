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
          husband_name: string
          wife_name: string
          husband_dob: string
          wife_dob: string
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
	          legacy_status: 'new' | 'contacted' | 'planning' | 'confirmed' | 'completed' | 'cancelled' | null
	          status: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | null
	          status_updated_at: string | null
	          status_updated_by: string | null
	          created_at: string
	          updated_at: string
	        }
        Insert: {
          id?: string
          location: string
          celebration_type: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
          husband_name: string
          wife_name: string
          husband_dob: string
          wife_dob: string
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
	          legacy_status?: 'new' | 'contacted' | 'planning' | 'confirmed' | 'completed' | 'cancelled' | null
	          status?: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | null
	          status_updated_at?: string | null
	          status_updated_by?: string | null
	          created_at?: string
	          updated_at?: string
	        }
        Update: {
          id?: string
          location?: string
          celebration_type?: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
          husband_name?: string
          wife_name?: string
          husband_dob?: string
          wife_dob?: string
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
	          legacy_status?: 'new' | 'contacted' | 'planning' | 'confirmed' | 'completed' | 'cancelled' | null
	          status?: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | null
	          status_updated_at?: string | null
	          status_updated_by?: string | null
	          created_at?: string
	          updated_at?: string
	        }
	      }
	      celebration_enquiry_status_history: {
	        Row: {
	          id: string
	          enquiry_id: string
	          from_status: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | null
	          to_status: 'pending' | 'contacted' | 'confirmed' | 'cancelled'
	          remarks: string
	          changed_by: string | null
	          changed_at: string
	        }
	        Insert: {
	          id?: string
	          enquiry_id: string
	          from_status?: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | null
	          to_status: 'pending' | 'contacted' | 'confirmed' | 'cancelled'
	          remarks: string
	          changed_by?: string | null
	          changed_at?: string
	        }
	        Update: {
	          id?: string
	          enquiry_id?: string
	          from_status?: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | null
	          to_status?: 'pending' | 'contacted' | 'confirmed' | 'cancelled'
	          remarks?: string
	          changed_by?: string | null
	          changed_at?: string
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
          p_husband_name: string
          p_wife_name: string
          p_husband_dob: string
          p_wife_dob: string
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
	      update_celebration_enquiry_status: {
	        Args: {
	          p_enquiry_id: string
	          p_new_status: string
	          p_remarks: string
	          p_changed_by: string
	        }
	        Returns: {
	          enquiry_id: string
	          status: 'pending' | 'contacted' | 'confirmed' | 'cancelled'
	          status_updated_at: string
	          history_id: string
	        }[]
	      }
	    }
    Enums: {
      [_ in never]: never
    }
  }
}
