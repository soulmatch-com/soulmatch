import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentRpcError } from '@/lib/payments/admin-payment-api'
const schema = z.object({ idempotencyKey: z.string().trim().min(8).max(160), amount: z.number().positive().finite(), currency: z.literal('INR'), reason: z.string().trim().min(1).max(2000), paymentDate: z.string().datetime({ offset: true }) })
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
 const authorization=await requireActiveAdmin(); if('response' in authorization)return authorization.response; let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})};const p=schema.safeParse(body);if(!p.success)return NextResponse.json({error:'Please check the refund details'},{status:400});const{id,paymentId}=await params;const v=p.data;const{data,error}=await createAdminClient().rpc('record_admin_booking_payment_refund',{p_booking_id:id,p_original_payment_id:paymentId,p_idempotency_key:v.idempotencyKey,p_amount:v.amount,p_currency:v.currency,p_reason:v.reason,p_payment_date:v.paymentDate,p_admin_id:authorization.admin.id});if(error)return paymentRpcError(error);return NextResponse.json({paymentId:data},{status:201})
}
