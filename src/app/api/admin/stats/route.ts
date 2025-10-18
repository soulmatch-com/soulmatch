// Admin API - Get dashboard statistics
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // Use admin client to bypass RLS for admin dashboard stats
    const supabase = createAdminClient()

    // Check if is_verified column exists by trying to query it
    const { error: columnCheckError } = await supabase
      .from('profiles')
      .select('is_verified')
      .limit(1)

    const hasIsVerifiedColumn = !columnCheckError

    console.log('is_verified column exists:', hasIsVerifiedColumn)
    if (columnCheckError) {
      console.log('Column check error:', columnCheckError)
    }

    // Get total users count
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (totalUsersError) {
      console.error('Total users error:', totalUsersError)
    }

    // Get active profiles
    let activeProfilesQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('profile_status', 'active')

    if (hasIsVerifiedColumn) {
      activeProfilesQuery = activeProfilesQuery.eq('is_verified', true)
    }

    const { count: activeProfiles, error: activeError } = await activeProfilesQuery

    if (activeError) {
      console.error('Active profiles error:', activeError)
    }

    // Get pending verification profiles
    let pendingQuery
    if (hasIsVerifiedColumn) {
      // If column exists, use the proper logic
      pendingQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('profile_status.eq.pending,and(profile_status.eq.active,is_verified.eq.false)')
    } else {
      // If column doesn't exist, just count pending status
      pendingQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('profile_status', 'pending')
    }

    const { count: pendingVerification, error: pendingError } = await pendingQuery

    if (pendingError) {
      console.error('Pending verification error:', pendingError)
    }

    // Get incomplete profiles
    const { count: incompleteProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('profile_status', 'incomplete')

    // Get suspended profiles
    const { count: suspendedProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('profile_status', 'suspended')

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentRegistrations } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get latest users
    const { data: latestUsers, error: latestUsersError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, created_at, profile_status')
      .order('created_at', { ascending: false })
      .limit(5)

    if (latestUsersError) {
      console.error('Latest users error:', latestUsersError)
    }

    // Get profiles pending verification (for display in dashboard)
    let pendingProfilesQuery
    if (hasIsVerifiedColumn) {
      pendingProfilesQuery = supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, profile_status, is_verified, created_at')
        .or('profile_status.eq.pending,and(profile_status.eq.active,is_verified.eq.false)')
    } else {
      pendingProfilesQuery = supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, profile_status, created_at')
        .eq('profile_status', 'pending')
    }

    const { data: pendingProfiles, error: pendingProfilesError } = await pendingProfilesQuery
      .order('created_at', { ascending: false })
      .limit(5)

    if (pendingProfilesError) {
      console.error('Pending profiles error:', pendingProfilesError)
    }

    console.log('Stats:', {
      totalUsers,
      activeProfiles,
      pendingVerification,
      incompleteProfiles,
      suspendedProfiles,
      recentRegistrations,
      latestUsersCount: latestUsers?.length,
      pendingProfilesCount: pendingProfiles?.length,
    })

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeProfiles: activeProfiles || 0,
        pendingVerification: pendingVerification || 0,
        incompleteProfiles: incompleteProfiles || 0,
        suspendedProfiles: suspendedProfiles || 0,
        recentRegistrations: recentRegistrations || 0,
      },
      latestUsers: latestUsers || [],
      pendingProfiles: pendingProfiles?.map(p => ({
        ...p,
        is_verified: hasIsVerifiedColumn ? (p as any).is_verified : false
      })) || [],
      hasIsVerifiedColumn,
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
