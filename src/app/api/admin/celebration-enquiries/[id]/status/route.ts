import { NextRequest, NextResponse } from 'next/server'
import { CelebrationEnquiryStatusError, updateCelebrationEnquiryStatus } from '@/lib/celebrations/admin-status'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, body] = await Promise.all([params, request.json()])
    const result = await updateCelebrationEnquiryStatus({
      enquiryId: id,
      status: body?.status,
      remarks: body?.remarks,
    })

    return NextResponse.json({ message: 'Status updated successfully.', status: result.status })
  } catch (error) {
    if (error instanceof CelebrationEnquiryStatusError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ message: error.message, code: error.code }, { status })
    }

    console.error('Celebration enquiry status route failed')
    return NextResponse.json({ message: 'Unable to update status. Please try again.' }, { status: 500 })
  }
}
