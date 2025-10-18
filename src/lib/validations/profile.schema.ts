import { z } from 'zod'

export const profileSchema = z.object({
  // Basic Information
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name too long'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name too long'),
  dateOfBirth: z.coerce.date({
    required_error: 'Date of birth is required',
    invalid_type_error: 'Invalid date',
  }).refine((date) => {
    const age = new Date().getFullYear() - date.getFullYear()
    return age >= 18 && age <= 100
  }, 'Age must be between 18 and 100 years'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender',
  }),
  maritalStatus: z.enum(['never_married', 'divorced', 'widowed', 'awaiting_divorce'], {
    required_error: 'Please select marital status',
  }),

  // Physical Attributes
  heightCm: z.number()
    .min(120, 'Height must be at least 120 cm')
    .max(250, 'Height must be less than 250 cm')
    .optional(),
  weightKg: z.number()
    .min(30, 'Weight must be at least 30 kg')
    .max(200, 'Weight must be less than 200 kg')
    .optional(),
  complexion: z.enum(['fair', 'wheatish', 'dark', 'very_fair']).optional(),
  bloodGroup: z.string().optional(),
  disability: z.string().max(200).optional(),

  // Cultural Background
  religion: z.string().min(1, 'Religion is required').max(50),
  caste: z.string().max(50).optional(),
  subCaste: z.string().max(50).optional(),
  gothram: z.string().max(50).optional(),
  dosham: z.enum(['yes', 'no', 'dont_know']).optional(),
  doshamDetails: z.string().max(500, 'Dosham details must be less than 500 characters').optional(),
  motherTongue: z.string().min(1, 'Mother tongue is required').max(50),

  // Location
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  country: z.string().min(2, 'Country is required').max(100).default('India'),

  // Personal Details
  aboutMe: z.string()
    .max(1000, 'About me must be less than 1000 characters')
    .optional(),
  hobbies: z.array(z.string()).max(10, 'Maximum 10 hobbies allowed').optional(),

  // Photo
  profilePhotoUrl: z.string().url('Invalid photo URL').optional(),
})

export const basicInfoSchema = profileSchema.pick({
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  maritalStatus: true,
  religion: true,
  caste: true,
  subCaste: true,
  gothram: true,
  dosham: true,
  doshamDetails: true,
  motherTongue: true,
  city: true,
  state: true,
  country: true,
}).refine((data) => {
  // If dosham is 'yes', doshamDetails should be required
  if (data.dosham === 'yes' && !data.doshamDetails) {
    return false
  }
  return true
}, {
  message: 'Please provide dosham details',
  path: ['doshamDetails'],
})

export const physicalAttributesSchema = profileSchema.pick({
  heightCm: true,
  weightKg: true,
  complexion: true,
  bloodGroup: true,
  disability: true,
})

export const personalDetailsSchema = profileSchema.pick({
  aboutMe: true,
  hobbies: true,
})

export const photoUploadSchema = profileSchema.pick({
  profilePhotoUrl: true,
})

export type ProfileInput = z.infer<typeof profileSchema>
export type BasicInfoInput = z.infer<typeof basicInfoSchema>
export type PhysicalAttributesInput = z.infer<typeof physicalAttributesSchema>
export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>
