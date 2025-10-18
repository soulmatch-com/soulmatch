'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { basicInfoSchema, type BasicInfoInput } from '@/lib/validations/profile.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BasicInfoFormProps {
  onSubmit: (data: BasicInfoInput) => void
  defaultValues?: Partial<BasicInfoInput>
  isLoading?: boolean
}

export function BasicInfoForm({ onSubmit, defaultValues, isLoading }: BasicInfoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BasicInfoInput>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues,
  })

  const gender = watch('gender')
  const maritalStatus = watch('maritalStatus')
  const dosham = watch('dosham')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            disabled={isLoading}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            {...register('lastName')}
            disabled={isLoading}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
        <Input
          id="dateOfBirth"
          type="date"
          {...register('dateOfBirth')}
          disabled={isLoading}
        />
        {errors.dateOfBirth && (
          <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Gender *</Label>
        <Select value={gender} onValueChange={(value) => setValue('gender', value as any)}>
          <SelectTrigger disabled={isLoading}>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.gender && (
          <p className="text-sm text-red-600">{errors.gender.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Marital Status *</Label>
        <Select value={maritalStatus} onValueChange={(value) => setValue('maritalStatus', value as any)}>
          <SelectTrigger disabled={isLoading}>
            <SelectValue placeholder="Select marital status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never_married">Never Married</SelectItem>
            <SelectItem value="divorced">Divorced</SelectItem>
            <SelectItem value="widowed">Widowed</SelectItem>
            <SelectItem value="awaiting_divorce">Awaiting Divorce</SelectItem>
          </SelectContent>
        </Select>
        {errors.maritalStatus && (
          <p className="text-sm text-red-600">{errors.maritalStatus.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="religion">Religion *</Label>
          <Input
            id="religion"
            {...register('religion')}
            disabled={isLoading}
            placeholder="Hindu, Muslim, Christian, etc."
          />
          {errors.religion && (
            <p className="text-sm text-red-600">{errors.religion.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="caste">Caste</Label>
          <Input
            id="caste"
            {...register('caste')}
            disabled={isLoading}
            placeholder="Optional"
          />
          {errors.caste && (
            <p className="text-sm text-red-600">{errors.caste.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subCaste">Sub Caste</Label>
          <Input
            id="subCaste"
            {...register('subCaste')}
            disabled={isLoading}
            placeholder="Optional"
          />
          {errors.subCaste && (
            <p className="text-sm text-red-600">{errors.subCaste.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gothram">Gothram</Label>
          <Input
            id="gothram"
            {...register('gothram')}
            disabled={isLoading}
            placeholder="Optional"
          />
          {errors.gothram && (
            <p className="text-sm text-red-600">{errors.gothram.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dosham</Label>
        <Select value={dosham} onValueChange={(value) => setValue('dosham', value as any)}>
          <SelectTrigger disabled={isLoading}>
            <SelectValue placeholder="Select dosham status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="dont_know">Don't Know</SelectItem>
          </SelectContent>
        </Select>
        {errors.dosham && (
          <p className="text-sm text-red-600">{errors.dosham.message}</p>
        )}
      </div>

      {dosham === 'yes' && (
        <div className="space-y-2">
          <Label htmlFor="doshamDetails">Dosham Details *</Label>
          <Textarea
            id="doshamDetails"
            {...register('doshamDetails')}
            disabled={isLoading}
            placeholder="Please provide details about the dosham (e.g., Manglik, Chevvai, Kala Sarpa, etc.)"
            rows={3}
          />
          {errors.doshamDetails && (
            <p className="text-sm text-red-600">{errors.doshamDetails.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Please specify the type of dosham and any relevant details
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="motherTongue">Mother Tongue *</Label>
        <Input
          id="motherTongue"
          {...register('motherTongue')}
          disabled={isLoading}
          placeholder="Hindi, English, Tamil, etc."
        />
        {errors.motherTongue && (
          <p className="text-sm text-red-600">{errors.motherTongue.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            {...register('city')}
            disabled={isLoading}
            placeholder="Mumbai"
          />
          {errors.city && (
            <p className="text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            {...register('state')}
            disabled={isLoading}
            placeholder="Maharashtra"
          />
          {errors.state && (
            <p className="text-sm text-red-600">{errors.state.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            {...register('country')}
            disabled={isLoading}
            defaultValue="India"
          />
          {errors.country && (
            <p className="text-sm text-red-600">{errors.country.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  )
}
