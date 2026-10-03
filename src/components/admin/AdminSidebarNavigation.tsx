import { BarChart3, BookOpen, ConciergeBell, ContactRound, Heart, ReceiptText, Settings, UserCheck, Users, Clock, type LucideIcon } from 'lucide-react'
import { ADMIN_CONFIG } from '@/modules/admin'

export const adminNavigation: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  [ADMIN_CONFIG.ROUTES.DASHBOARD, 'Dashboard', BarChart3], [ADMIN_CONFIG.ROUTES.USERS, 'Users', Users], [ADMIN_CONFIG.ROUTES.PROFILES, 'Profiles', Users], ['/admin/active-profiles', 'Active Profiles', UserCheck], ['/admin/verification-queue', 'Verification Queue', Clock], [ADMIN_CONFIG.ROUTES.SUCCESS_STORIES, 'Success Stories', Heart], [ADMIN_CONFIG.ROUTES.LEADS, 'Leads', ContactRound], [ADMIN_CONFIG.ROUTES.QUOTATIONS, 'Quotations', ReceiptText], [ADMIN_CONFIG.ROUTES.CELEBRATION_SERVICES, 'Celebration Services', ConciergeBell], [ADMIN_CONFIG.ROUTES.BLOGS, 'Blog Management', BookOpen], [ADMIN_CONFIG.ROUTES.SETTINGS, 'Settings', Settings],
]
