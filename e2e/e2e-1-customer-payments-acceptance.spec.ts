import { expect, test, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

type F={marker:string;adminId?:string;leadId?:string;quoteId?:string;bookingId?:string}
const env=(s:string)=>Object.fromEntries(s.split('\n').flatMap(x=>{const m=x.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);return m?[[m[1],m[2].replace(/^['"]|['"]$/g,'')]]:[]}))
async function db():Promise<SupabaseClient>{const v=env(await readFile('.env.local','utf8')),u=v.NEXT_PUBLIC_SUPABASE_URL,k=v.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k||!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u))throw Error('Refusing Scenario G without verified loopback credentials');const{stdout}=await promisify(execFile)('supabase',['status','--output','json']);const s=JSON.parse(stdout);if(!s.API_URL||s.linked_project||new URL(s.API_URL).origin!==new URL(u).origin)throw Error('Refusing Scenario G against non-local Supabase');return createClient(u,k,{auth:{autoRefreshToken:false,persistSession:false}})}
const now=()=>new Date().toISOString(), key=(s:string)=>`sc-g-${s}-${crypto.randomUUID()}`
async function fixture():Promise<F>{const f:F={marker:`SC-G-${crypto.randomUUID().slice(0,8)}`},c=await db();const{data:a}=await c.from('admins').select('id').eq('is_active',true).limit(1).single();f.adminId=a!.id;const{data:l}=await c.from('leads').insert({source:'call',status:'new',contact_name:f.marker,mobile:'9876543210'}).select('id').single();f.leadId=l!.id;const{data:s}=await c.from('celebration_services').select('id').eq('is_active',true).limit(1).single();const{data:q,error}=await c.rpc('create_admin_quotation',{p_quotation_number:`${f.marker}-Q`,p_valid_until:new Date(Date.now()+86400000).toISOString().slice(0,10),p_notes:f.marker,p_created_by:f.adminId,p_items:[{service_id:s!.id,quantity:1,unit_price:100}],p_lead_ids:[f.leadId]});expect(error).toBeNull();f.quoteId=q as string;for(const to of ['sent','accepted'])expect((await c.rpc('transition_admin_quotation',{p_quotation_id:f.quoteId,p_to_status:to,p_admin_id:f.adminId,p_reopen_valid_until:null})).error).toBeNull();const{data:b,error:be}=await c.rpc('create_admin_booking',{p_quotation_id:f.quoteId,p_admin_id:f.adminId});expect(be).toBeNull();f.bookingId=b as string;expect((await c.rpc('transition_admin_booking',{p_booking_id:f.bookingId,p_to_status:'confirmed',p_admin_id:f.adminId,p_cancellation_reason:null})).error).toBeNull();return f}
async function clean(f:F){const c=await db();if(f.bookingId){const{data:p}=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId);if(p?.length)expect((await c.from('booking_payment_activities').delete().in('payment_id',p.map(x=>x.id))).error).toBeNull();expect((await c.from('booking_payment_records').delete().eq('booking_id',f.bookingId)).error).toBeNull();expect((await c.from('celebration_bookings').delete().eq('id',f.bookingId)).error).toBeNull()}if(f.quoteId)expect((await c.from('quotations').delete().eq('id',f.quoteId)).error).toBeNull();if(f.leadId)expect((await c.from('leads').delete().eq('id',f.leadId)).error).toBeNull()}
async function login(p:Page){const a=JSON.parse(await readFile('.playwright/local-admin.json','utf8'));await p.goto('/admin/login');await p.getByLabel('Email').fill(a.email);await p.getByLabel('Password').fill(a.password);await p.getByRole('button',{name:'Sign in as Admin'}).click();await expect(p).toHaveURL(/\/admin\/dashboard$/)}
const post=(p:Page,f:F,path:string,body:unknown)=>p.request.post(`/api/admin/bookings/${f.bookingId}${path}`,{data:body})

test('Scenario G records customer receipts in the authenticated UI and preserves financial snapshots',async({page})=>{test.setTimeout(90000);const f=await fixture();try{await login(page);const c=await db();const before=await c.from('celebration_booking_services').select('total_price_snapshot').eq('booking_id',f.bookingId);await page.goto(`/admin/bookings/${f.bookingId}`);const payments=page.getByRole('heading',{name:'Customer payments'}).locator('xpath=ancestor::section');await expect(payments).toBeVisible();await payments.getByRole('button',{name:'Record payment'}).click();const d=page.getByRole('dialog');await d.getByLabel('Amount').fill('30');await d.getByLabel('Payment method').selectOption('upi');await d.getByRole('button',{name:'Record payment'}).click();await expect(d).toBeHidden();const{data:r}=await c.from('booking_payment_records').select('*').eq('booking_id',f.bookingId).eq('transaction_type','receipt');expect(r).toHaveLength(1);expect(Number(r![0].amount)).toBe(30);expect(r![0].payment_reference).toMatch(/^RCPT-/);const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId});expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:30,net_received:30,outstanding_balance:70,payment_status:'partially_paid'});expect((await c.from('celebration_booking_services').select('total_price_snapshot').eq('booking_id',f.bookingId)).data).toEqual(before.data);const pdf=await page.request.get(`/api/admin/bookings/${f.bookingId}/payments/${r![0].id}/receipt`);expect(pdf.status()).toBe(200);expect(pdf.headers()['content-type']).toContain('application/pdf');expect((await pdf.body()).subarray(0,4).toString()).toBe('%PDF');}finally{await clean(f)}})

test('Scenario G settles, corrects, authorizes and idempotently protects the append-only ledger',async({page,request})=>{test.setTimeout(90000);const f=await fixture();try{await login(page);const base={currency:'INR',method:'cash',paymentDate:now()};expect((await request.post(`/api/admin/bookings/${f.bookingId}/payments`,{data:{...base,idempotencyKey:key('anon'),amount:1}})).status()).toBe(401);const first=await post(page,f,'/payments',{...base,idempotencyKey:key('one'),amount:60});expect(first.status()).toBe(201);const firstId=(await first.json()).paymentId;const duplicateKey=key('dup');const a=await post(page,f,'/payments',{...base,idempotencyKey:duplicateKey,amount:20}),b=await post(page,f,'/payments',{...base,idempotencyKey:duplicateKey,amount:20});expect([a.status(),b.status()]).toEqual([201,201]);expect((await a.json()).paymentId).toBe((await b.json()).paymentId);expect((await post(page,f,'/payments',{...base,idempotencyKey:key('over'),amount:30})).status()).toBe(409);const refund=await post(page,f,`/payments/${firstId}/refund`,{idempotencyKey:key('refund'),amount:10,currency:'INR',reason:'customer change',paymentDate:now()});expect(refund.status()).toBe(201);expect((await post(page,f,`/payments/${firstId}/refund`,{idempotencyKey:key('badrefund'),amount:51,currency:'INR',reason:'too much',paymentDate:now()})).status()).toBe(409);const reversal=await post(page,f,`/payments/${firstId}/reverse`,{idempotencyKey:key('reverse'),amount:20,currency:'INR',reason:'entry correction',paymentDate:now()});expect(reversal.status()).toBe(201);const c=await db();const{data:rows}=await c.from('booking_payment_records').select('transaction_type,original_payment_id,amount').eq('booking_id',f.bookingId);expect(rows).toHaveLength(4);expect(rows?.filter(x=>x.transaction_type==='receipt')).toHaveLength(2);expect(rows?.filter(x=>x.transaction_type==='refund'&&x.original_payment_id===firstId)).toHaveLength(1);expect(rows?.filter(x=>x.transaction_type==='reversal'&&x.original_payment_id===firstId)).toHaveLength(1);const s=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId});expect(s.data?.[0]).toMatchObject({gross_received:80,total_refunded:10,total_reversed:20,net_received:50,outstanding_balance:50,payment_status:'partially_paid'});expect((await c.from('booking_payment_activities').select('id').in('payment_id',(rows??[]).map(x=>(x as any).id).filter(Boolean))).error).toBeNull();expect((await page.request.get(`/api/admin/bookings/00000000-0000-0000-0000-000000000000/payments/${firstId}/receipt`)).status()).toBe(404)}finally{await clean(f)}})

test('Scenario G refund and reversal dialogs validate, cancel, retain focus and append corrections',async({page})=>{const f=await fixture();try{await login(page);const base={currency:'INR',method:'cash',paymentDate:now()};const x=await post(page,f,'/payments',{...base,idempotencyKey:key('r1'),amount:40}),y=await post(page,f,'/payments',{...base,idempotencyKey:key('r2'),amount:30});const xid=(await x.json()).paymentId,yid=(await y.json()).paymentId;const client=await db(),{data:targets}=await client.from('booking_payment_records').select('id,payment_reference').in('id',[xid,yid]);const target=targets!.find(x=>x.id===yid)!,refundTarget=targets!.find(x=>x.id===xid)!;await page.goto(`/admin/bookings/${f.bookingId}`);const payment=page.getByRole('heading',{name:'Customer payments'}).locator('xpath=ancestor::section');const refund=page.getByTestId('payment-history-row').filter({hasText:refundTarget.payment_reference}).getByRole('button',{name:'Refund',exact:true});await refund.focus();await refund.press('Enter');let d=page.getByRole('dialog');await expect(d.getByRole('heading',{name:'Record refund'})).toBeVisible();await expect(d.locator(':focus')).toHaveCount(1);await d.getByLabel('Amount').fill('10');await d.getByLabel('Reason').fill('customer request');await d.getByRole('button',{name:'Confirm refund'}).click();await expect(d).toBeHidden();const reverse=page.getByTestId('payment-history-row').filter({hasText:target.payment_reference}).getByRole('button',{name:'Reverse',exact:true});await reverse.focus();await reverse.press('Enter');d=page.getByRole('dialog');await expect(d.getByRole('heading',{name:'Reverse payment'})).toBeVisible();await d.getByRole('button',{name:'Cancel'}).click();await expect(reverse).toBeFocused();const reversalRequest=page.waitForRequest(r=>r.url().includes(`/payments/${yid}/reverse`)&&r.method()==='POST');await reverse.click();await d.getByLabel('Amount').fill('5');await d.getByLabel('Reason').fill('entry correction');await d.getByRole('button',{name:'Confirm reversal'}).click();await reversalRequest;await expect(d).toBeHidden();const c=await db(),{data:rows}=await c.from('booking_payment_records').select('transaction_type,original_payment_id,amount').eq('booking_id',f.bookingId);expect(rows?.filter(r=>r.transaction_type==='refund'&&r.original_payment_id===xid)).toHaveLength(1);expect(rows?.filter(r=>r.transaction_type==='reversal'&&r.original_payment_id===yid)).toHaveLength(1);expect((await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})).data?.[0]).toMatchObject({gross_received:70,total_refunded:10,total_reversed:5,net_received:55,outstanding_balance:45});}finally{await clean(f)}})

test('Scenario G payment HTTP 500 recovery',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await page.getByRole('button',{name:'Record payment'}).click()
    const d=page.getByRole('dialog'),paymentPath=`/api/admin/bookings/${f.bookingId}/payments`,isPaymentMutation=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===paymentPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('25')
    await page.route(`**${paymentPath}`,r=>r.fulfill({status:500,json:{error:'Synthetic 500'}}))
    const failed=page.waitForResponse(isPaymentMutation),errorAlert=expect(page.locator('[role="alert"]').filter({hasText:'Synthetic 500'})).toContainText('Synthetic 500')
    await d.getByRole('button',{name:'Record payment'}).click()
    const failedResponse=await failed
    expect(failedResponse.status()).toBe(500)
    await failedResponse.finished()
    await errorAlert
    await expect(d).toBeVisible()
    await expect(d.getByRole('button',{name:'Record payment'})).toBeEnabled()
    const c=await db(),failedPayments=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId)
    expect(failedPayments.error).toBeNull()
    expect(failedPayments.data).toHaveLength(0)
    const failedActivities=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
    expect(failedActivities.error).toBeNull()
    expect(failedActivities.data).toHaveLength(0)
    await page.unroute(`**${paymentPath}`)
    const retried=page.waitForResponse(isPaymentMutation)
    await d.getByRole('button',{name:'Record payment'}).click()
    expect((await retried).status()).toBe(201)
    await expect(d).toBeHidden()
    const{data:p,error:paymentError}=await c.from('booking_payment_records').select('id,transaction_type,amount').eq('booking_id',f.bookingId)
    expect(paymentError).toBeNull()
    expect(p).toEqual([expect.objectContaining({transaction_type:'receipt',amount:25})])
    const{data:a,error:activityError}=await c.from('booking_payment_activities').select('id,event_type').eq('payment_id',p![0].id)
    expect(activityError).toBeNull()
    expect(a).toEqual([expect.objectContaining({event_type:'recorded'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:25,total_refunded:0,total_reversed:0,net_received:25,outstanding_balance:75,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G refund HTTP 400 recovery retains the dialog and commits one real retry',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    const receipt=await post(page,f,'/payments',{currency:'INR',method:'cash',paymentDate:now(),idempotencyKey:key('refund-400-receipt'),amount:60})
    expect(receipt.status()).toBe(201)
    const receiptId=(await receipt.json()).paymentId as string
    const c=await db(),{data:original,error:originalError}=await c.from('booking_payment_records').select('id,payment_reference').eq('id',receiptId).single()
    expect(originalError).toBeNull()
    await page.goto(`/admin/bookings/${f.bookingId}`)
    const row=page.getByTestId('payment-history-row').filter({hasText:original!.payment_reference})
    await row.getByRole('button',{name:'Refund',exact:true}).click()
    const d=page.getByRole('dialog'),refundPath=`/api/admin/bookings/${f.bookingId}/payments/${receiptId}/refund`,isRefund=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===refundPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('15')
    await d.getByLabel('Reason').fill('customer request')
    const beforeRefunds=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','refund')
    const beforeAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
    expect(beforeRefunds.error).toBeNull()
    expect(beforeAudit.error).toBeNull()
    let routed=true
    await page.route(`**${refundPath}`,route=>route.fulfill({status:400,json:{error:'Please check the refund details'}}))
    try{
      const failed=page.waitForResponse(isRefund)
      await d.getByRole('button',{name:'Confirm refund'}).click()
      const failedResponse=await failed
      expect(failedResponse.status()).toBe(400)
      await failedResponse.finished()
      await expect(page.locator('p[role="alert"]')).toContainText('Please check the refund details')
      await expect(d).toBeVisible()
      await expect(d.getByRole('button',{name:'Confirm refund'})).toBeEnabled()
      const failedRefunds=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','refund')
      const failedAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
      expect(failedRefunds.data).toHaveLength(beforeRefunds.data!.length)
      expect(failedAudit.data).toHaveLength(beforeAudit.data!.length)
      await page.unroute(`**${refundPath}`)
      routed=false
      const retried=page.waitForResponse(isRefund)
      await d.getByRole('button',{name:'Confirm refund'}).click()
      expect((await retried).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{if(routed)await page.unroute(`**${refundPath}`)}
    const{data:refunds,error:refundError}=await c.from('booking_payment_records').select('id,original_payment_id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','refund')
    expect(refundError).toBeNull()
    expect(refunds).toEqual([expect.objectContaining({original_payment_id:receiptId,transaction_type:'refund',amount:15})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',refunds![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'refunded'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:60,total_refunded:15,total_reversed:0,net_received:45,outstanding_balance:55,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G refund HTTP 409 recovery refreshes financial state and commits one real retry',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    const receipt=await post(page,f,'/payments',{currency:'INR',method:'cash',paymentDate:now(),idempotencyKey:key('refund-409-receipt'),amount:60})
    expect(receipt.status()).toBe(201)
    const receiptId=(await receipt.json()).paymentId as string
    const c=await db(),{data:original,error:originalError}=await c.from('booking_payment_records').select('id,payment_reference').eq('id',receiptId).single()
    expect(originalError).toBeNull()
    await page.goto(`/admin/bookings/${f.bookingId}`)
    const row=page.getByTestId('payment-history-row').filter({hasText:original!.payment_reference})
    await row.getByRole('button',{name:'Refund',exact:true}).click()
    const d=page.getByRole('dialog'),refundPath=`/api/admin/bookings/${f.bookingId}/payments/${receiptId}/refund`,summaryPath=`/api/admin/bookings/${f.bookingId}/payment-summary`,isRefund=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===refundPath&&r.request().method()==='POST',isSummary=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===summaryPath&&r.request().method()==='GET'
    await d.getByLabel('Amount').fill('15')
    await d.getByLabel('Reason').fill('customer request')
    const beforeRefunds=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','refund')
    const beforeAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
    expect(beforeRefunds.data).toHaveLength(0)
    expect(beforeAudit.data).toHaveLength(1)
    let routed=true
    await page.route(`**${refundPath}`,route=>route.fulfill({status:409,json:{error:'Refund conflicts with the current receipt balance'}}))
    try{
      const failed=page.waitForResponse(isRefund),refreshed=page.waitForResponse(isSummary)
      await d.getByRole('button',{name:'Confirm refund'}).click()
      const failedResponse=await failed
      expect(failedResponse.status()).toBe(409)
      await failedResponse.finished()
      expect((await refreshed).status()).toBe(200)
      await expect(page.locator('p[role="alert"]')).toContainText('Refund conflicts with the current receipt balance')
      await expect(d).toBeVisible()
      await expect(d.getByRole('button',{name:'Confirm refund'})).toBeEnabled()
      await expect(page.locator('dt').filter({hasText:'Net received'}).locator('xpath=following-sibling::dd')).toHaveText('₹60.00')
      await expect(page.locator('dt').filter({hasText:'Outstanding'}).locator('xpath=following-sibling::dd')).toHaveText('₹40.00')
      const failedRefunds=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','refund')
      const failedAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
      expect(failedRefunds.data).toHaveLength(beforeRefunds.data!.length)
      expect(failedAudit.data).toHaveLength(beforeAudit.data!.length)
      await page.unroute(`**${refundPath}`)
      routed=false
      const retried=page.waitForResponse(isRefund)
      await d.getByRole('button',{name:'Confirm refund'}).click()
      expect((await retried).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{if(routed)await page.unroute(`**${refundPath}`)}
    const{data:refunds,error:refundError}=await c.from('booking_payment_records').select('id,original_payment_id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','refund')
    expect(refundError).toBeNull()
    expect(refunds).toEqual([expect.objectContaining({original_payment_id:receiptId,transaction_type:'refund',amount:15})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',refunds![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'refunded'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:60,total_refunded:15,total_reversed:0,net_received:45,outstanding_balance:55,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G reversal HTTP 500 recovery retains the dialog and commits one real retry',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    const receipt=await post(page,f,'/payments',{currency:'INR',method:'cash',paymentDate:now(),idempotencyKey:key('reversal-500-receipt'),amount:60})
    expect(receipt.status()).toBe(201)
    const receiptId=(await receipt.json()).paymentId as string
    const c=await db(),{data:original,error:originalError}=await c.from('booking_payment_records').select('id,payment_reference').eq('id',receiptId).single()
    expect(originalError).toBeNull()
    await page.goto(`/admin/bookings/${f.bookingId}`)
    const row=page.getByTestId('payment-history-row').filter({hasText:original!.payment_reference})
    await row.getByRole('button',{name:'Reverse',exact:true}).click()
    const d=page.getByRole('dialog'),reversalPath=`/api/admin/bookings/${f.bookingId}/payments/${receiptId}/reverse`,isReversal=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===reversalPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('15')
    await d.getByLabel('Reason').fill('entry correction')
    const beforeReversals=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
    const beforeAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
    expect(beforeReversals.data).toHaveLength(0)
    expect(beforeAudit.data).toHaveLength(1)
    let routed=true
    await page.route(`**${reversalPath}`,route=>route.fulfill({status:500,json:{error:'Unable to complete payment operation'}}))
    try{
      const failed=page.waitForResponse(isReversal)
      await d.getByRole('button',{name:'Confirm reversal'}).click()
      const failedResponse=await failed
      expect(failedResponse.status()).toBe(500)
      await failedResponse.finished()
      await expect(page.locator('p[role="alert"]')).toContainText('Unable to complete payment operation')
      await expect(d).toBeVisible()
      await expect(d.getByRole('button',{name:'Confirm reversal'})).toBeEnabled()
      const failedReversals=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
      const failedAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
      expect(failedReversals.data).toHaveLength(0)
      expect(failedAudit.data).toHaveLength(1)
      await page.unroute(`**${reversalPath}`)
      routed=false
      const retried=page.waitForResponse(isReversal)
      await d.getByRole('button',{name:'Confirm reversal'}).click()
      expect((await retried).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{if(routed)await page.unroute(`**${reversalPath}`)}
    const{data:reversals,error:reversalError}=await c.from('booking_payment_records').select('id,original_payment_id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
    expect(reversalError).toBeNull()
    expect(reversals).toEqual([expect.objectContaining({original_payment_id:receiptId,transaction_type:'reversal',amount:15})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',reversals![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'reversed'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:60,total_refunded:0,total_reversed:15,net_received:45,outstanding_balance:55,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G reversal network-abort recovery retains the dialog and commits one real retry',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    const receipt=await post(page,f,'/payments',{currency:'INR',method:'cash',paymentDate:now(),idempotencyKey:key('reversal-abort-receipt'),amount:60})
    expect(receipt.status()).toBe(201)
    const receiptId=(await receipt.json()).paymentId as string
    const c=await db(),{data:original,error:originalError}=await c.from('booking_payment_records').select('id,payment_reference').eq('id',receiptId).single()
    expect(originalError).toBeNull()
    await page.goto(`/admin/bookings/${f.bookingId}`)
    const row=page.getByTestId('payment-history-row').filter({hasText:original!.payment_reference})
    await row.getByRole('button',{name:'Reverse',exact:true}).click()
    const d=page.getByRole('dialog'),reversalPath=`/api/admin/bookings/${f.bookingId}/payments/${receiptId}/reverse`,isReversalRequest=(r:import('@playwright/test').Request)=>new URL(r.url()).pathname===reversalPath&&r.method()==='POST',isReversalResponse=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===reversalPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('15')
    await d.getByLabel('Reason').fill('entry correction')
    const beforeReversals=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
    const beforeAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
    expect(beforeReversals.data).toHaveLength(0)
    expect(beforeAudit.data).toHaveLength(1)
    let routed=true,blockedByInterceptor=false
    await page.route(`**${reversalPath}`,route=>{blockedByInterceptor=true;return route.abort('failed')})
    try{
      const failedRequest=page.waitForEvent('requestfailed',{predicate:isReversalRequest})
      await d.getByRole('button',{name:'Confirm reversal'}).click()
      const failed=await failedRequest
      expect(blockedByInterceptor).toBe(true)
      expect(failed.failure()?.errorText).toContain('net::ERR_FAILED')
      await expect(page.locator('p[role="alert"]')).toContainText('Failed to fetch')
      await expect(d).toBeVisible()
      await expect(d.getByRole('button',{name:'Confirm reversal'})).toBeEnabled()
      const failedReversals=await c.from('booking_payment_records').select('id').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
      const failedAudit=await c.from('booking_payment_activities').select('id,booking_payment_records!inner(booking_id)').eq('booking_payment_records.booking_id',f.bookingId)
      expect(failedReversals.data).toHaveLength(0)
      expect(failedAudit.data).toHaveLength(1)
      await page.unroute(`**${reversalPath}`)
      routed=false
      const retried=page.waitForResponse(isReversalResponse)
      await d.getByRole('button',{name:'Confirm reversal'}).click()
      expect((await retried).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{if(routed)await page.unroute(`**${reversalPath}`)}
    const{data:reversals,error:reversalError}=await c.from('booking_payment_records').select('id,original_payment_id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
    expect(reversalError).toBeNull()
    expect(reversals).toEqual([expect.objectContaining({original_payment_id:receiptId,transaction_type:'reversal',amount:15})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',reversals![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'reversed'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:60,total_refunded:0,total_reversed:15,net_received:45,outstanding_balance:55,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G record payment prevents duplicate submission while the mutation is pending',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await page.getByRole('button',{name:'Record payment',exact:true}).click()
    const d=page.getByRole('dialog'),save=d.getByRole('button',{name:/^(Record payment|Saving…)$/}),paymentPath=`/api/admin/bookings/${f.bookingId}/payments`,isPayment=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===paymentPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('25')
    await d.getByLabel('Payment method').selectOption('upi')
    let continueOriginal!:()=>Promise<void>,start!:()=>void,markContinued!:()=>void,mutationCount=0;const routed=true
    const started=new Promise<void>(resolve=>{start=resolve}),continuedRoute=new Promise<void>(resolve=>{markContinued=resolve})
    await page.route(`**${paymentPath}`,route=>{
      const request=route.request()
      if(new URL(request.url()).pathname!==paymentPath||request.method()!=='POST')return route.continue()
      mutationCount+=1
      start()
      return new Promise<void>(resolve=>{continueOriginal=async()=>{await route.continue();markContinued();resolve()}})
    })
    try{
      const succeeded=page.waitForResponse(isPayment)
      await save.focus()
      await save.evaluate(button=>(button as HTMLButtonElement).click())
      await started
      expect(mutationCount).toBe(1)
      await expect(d).toBeVisible()
      await expect(save).toBeDisabled()
      await save.evaluate(button=>(button as HTMLButtonElement).click())
      expect(mutationCount).toBe(1)
      await continueOriginal()
      await continuedRoute
      expect((await succeeded).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{
      if(continueOriginal)await continueOriginal().catch(()=>undefined)
      if(routed)await page.unroute(`**${paymentPath}`)
    }
    const c=await db(),{data:receipts,error:receiptError}=await c.from('booking_payment_records').select('id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','receipt')
    expect(receiptError).toBeNull()
    expect(receipts).toEqual([expect.objectContaining({transaction_type:'receipt',amount:25})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',receipts![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'recorded'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:25,total_refunded:0,total_reversed:0,net_received:25,outstanding_balance:75,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G refund prevents duplicate submission while the mutation is pending',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    const receipt=await post(page,f,'/payments',{currency:'INR',method:'cash',paymentDate:now(),idempotencyKey:key('refund-pending-receipt'),amount:60})
    expect(receipt.status()).toBe(201)
    const receiptId=(await receipt.json()).paymentId as string
    const c=await db(),{data:original,error:originalError}=await c.from('booking_payment_records').select('payment_reference').eq('id',receiptId).single()
    expect(originalError).toBeNull()
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await page.getByTestId('payment-history-row').filter({hasText:original!.payment_reference}).getByRole('button',{name:'Refund',exact:true}).click()
    const d=page.getByRole('dialog'),save=d.getByRole('button',{name:/^(Confirm refund|Saving…)$/}),refundPath=`/api/admin/bookings/${f.bookingId}/payments/${receiptId}/refund`,isRefund=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===refundPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('15')
    await d.getByLabel('Reason').fill('customer request')
    let continueOriginal!:()=>Promise<void>,start!:()=>void,markContinued!:()=>void,mutationCount=0;const routed=true
    const started=new Promise<void>(resolve=>{start=resolve}),continuedRoute=new Promise<void>(resolve=>{markContinued=resolve})
    await page.route(`**${refundPath}`,route=>{
      const request=route.request()
      if(new URL(request.url()).pathname!==refundPath||request.method()!=='POST')return route.continue()
      mutationCount+=1
      start()
      return new Promise<void>(resolve=>{continueOriginal=async()=>{await route.continue();markContinued();resolve()}})
    })
    try{
      const succeeded=page.waitForResponse(isRefund)
      await save.focus()
      await save.evaluate(button=>(button as HTMLButtonElement).click())
      await started
      expect(mutationCount).toBe(1)
      await expect(d).toBeVisible()
      await expect(save).toBeDisabled()
      await save.evaluate(button=>(button as HTMLButtonElement).click())
      expect(mutationCount).toBe(1)
      await continueOriginal()
      await continuedRoute
      expect((await succeeded).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{
      if(continueOriginal)await continueOriginal().catch(()=>undefined)
      if(routed)await page.unroute(`**${refundPath}`)
    }
    const{data:refunds,error:refundError}=await c.from('booking_payment_records').select('id,original_payment_id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','refund')
    expect(refundError).toBeNull()
    expect(refunds).toEqual([expect.objectContaining({original_payment_id:receiptId,transaction_type:'refund',amount:15})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',refunds![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'refunded'})])
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:60,total_refunded:15,total_reversed:0,net_received:45,outstanding_balance:55,payment_status:'partially_paid'})
  }finally{await clean(f)}
})

test('Scenario G reversal prevents duplicate submission while the mutation is pending',async({page})=>{
  test.setTimeout(90000)
  const f=await fixture()
  try{
    await login(page)
    const receipt=await post(page,f,'/payments',{currency:'INR',method:'cash',paymentDate:now(),idempotencyKey:key('reversal-pending-receipt'),amount:60})
    expect(receipt.status()).toBe(201)
    const receiptId=(await receipt.json()).paymentId as string
    const c=await db(),{data:original,error:originalError}=await c.from('booking_payment_records').select('id,payment_reference,transaction_type,amount').eq('id',receiptId).single()
    expect(originalError).toBeNull()
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await page.getByTestId('payment-history-row').filter({hasText:original!.payment_reference}).getByRole('button',{name:'Reverse',exact:true}).click()
    const d=page.getByRole('dialog'),save=d.getByRole('button',{name:/^(Confirm reversal|Saving…)$/}),reversalPath=`/api/admin/bookings/${f.bookingId}/payments/${receiptId}/reverse`,isReversal=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname===reversalPath&&r.request().method()==='POST'
    await d.getByLabel('Amount').fill('15')
    await d.getByLabel('Reason').fill('entry correction')
    let continueOriginal!:()=>Promise<void>,start!:()=>void,markContinued!:()=>void,mutationCount=0;const routed=true
    const started=new Promise<void>(resolve=>{start=resolve}),continuedRoute=new Promise<void>(resolve=>{markContinued=resolve})
    await page.route(`**${reversalPath}`,route=>{
      const request=route.request()
      if(new URL(request.url()).pathname!==reversalPath||request.method()!=='POST')return route.continue()
      mutationCount+=1
      start()
      return new Promise<void>(resolve=>{continueOriginal=async()=>{await route.continue();markContinued();resolve()}})
    })
    try{
      const succeeded=page.waitForResponse(isReversal)
      await save.focus()
      await save.evaluate(button=>(button as HTMLButtonElement).click())
      await started
      expect(mutationCount).toBe(1)
      await expect(d).toBeVisible()
      await expect(save).toBeDisabled()
      await save.evaluate(button=>(button as HTMLButtonElement).click())
      expect(mutationCount).toBe(1)
      await continueOriginal()
      await continuedRoute
      expect((await succeeded).status()).toBe(201)
      await expect(d).toBeHidden()
    }finally{
      if(continueOriginal)await continueOriginal().catch(()=>undefined)
      if(routed)await page.unroute(`**${reversalPath}`)
    }
    const{data:reversals,error:reversalError}=await c.from('booking_payment_records').select('id,original_payment_id,transaction_type,amount').eq('booking_id',f.bookingId).eq('transaction_type','reversal')
    expect(reversalError).toBeNull()
    expect(reversals).toEqual([expect.objectContaining({original_payment_id:receiptId,transaction_type:'reversal',amount:15})])
    const{data:audit,error:auditError}=await c.from('booking_payment_activities').select('event_type').eq('payment_id',reversals![0].id)
    expect(auditError).toBeNull()
    expect(audit).toEqual([expect.objectContaining({event_type:'reversed'})])
    const{data:receiptAfter,error:receiptAfterError}=await c.from('booking_payment_records').select('id,payment_reference,transaction_type,amount').eq('id',receiptId).single()
    expect(receiptAfterError).toBeNull()
    expect(receiptAfter).toEqual(original)
    const summary=await c.rpc('booking_payment_summary',{p_booking_id:f.bookingId})
    expect(summary.error).toBeNull()
    expect(summary.data?.[0]).toMatchObject({booking_total:100,gross_received:60,total_refunded:0,total_reversed:15,net_received:45,outstanding_balance:55,payment_status:'partially_paid'})
  }finally{await clean(f)}
})
