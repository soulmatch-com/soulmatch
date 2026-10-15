import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const authorization=await requireActiveAdmin();if('response'in authorization)return authorization.response;const{id}=await params;const db=createAdminClient();const{data:payments,error}=await db.from('booking_payment_records').select('id').eq('booking_id',id);if(error)return NextResponse.json({error:'Unable to load payment activity'},{status:500});if(!payments?.length)return NextResponse.json({activities:[]});const{data,error:e}=await db.from('booking_payment_activities').select('id,payment_id,event_type,actor_id,metadata,created_at').in('payment_id',payments.map(p=>p.id)).order('created_at',{ascending:false});if(e)return NextResponse.json({error:'Unable to load payment activity'},{status:500});return NextResponse.json({activities:data??[]})
}
