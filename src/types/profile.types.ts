import { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Gender = 'male' | 'female' | 'other'
export type MaritalStatus = 'never_married' | 'divorced' | 'widowed' | 'awaiting_divorce'
export type Complexion = 'fair' | 'wheatish' | 'dark' | 'very_fair'
export type ProfileStatus = 'incomplete' | 'pending' | 'active' | 'suspended' | 'deleted'

export interface ProfileFormData {
  // Basic Information
  firstName: string
  lastName: string
  dateOfBirth: Date | string
  gender: Gender
  maritalStatus: MaritalStatus

  // Physical Attributes
  heightCm?: number
  weightKg?: number
  complexion?: Complexion
  bloodGroup?: string
  disability?: string

  // Cultural Background
  religion?: string
  caste?: string
  subCaste?: string
  motherTongue?: string

  // Location
  city: string
  state: string
  country: string

  // Personal Details
  aboutMe?: string
  hobbies?: string[]

  // Photo
  profilePhotoUrl?: string
}
