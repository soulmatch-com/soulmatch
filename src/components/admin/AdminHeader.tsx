"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Users, Settings, BarChart3, LogOut, Menu, X, Clock, UserCheck, Heart, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAdminStore, ADMIN_CONFIG } from "@/modules/admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { admin, clearAdmin } = useAdminStore();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    clearAdmin();
    toast.success("Logged out successfully");
    // Use window.location for hard navigation to ensure clean state
    setTimeout(() => {
      window.location.href = ADMIN_CONFIG.ROUTES.LOGIN;
    }, 100);
  };

  if (pathname === ADMIN_CONFIG.ROUTES.LOGIN || !admin) {
    return null;
  }

  const navClass = (href: string) => cn(
    "text-slate-300 hover:text-white transition-colors",
    (pathname === href || pathname.startsWith(`${href}/`)) && "text-white"
  );

  const mobileNavClass = (href: string) => cn(
    "block text-slate-300 hover:text-white transition-colors py-2",
    (pathname === href || pathname.startsWith(`${href}/`)) && "text-white"
  );

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-700">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={ADMIN_CONFIG.ROUTES.DASHBOARD} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="h-6 w-6 text-white" />
            <span className="text-xl font-bold">MyThirumanam Admin</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href={ADMIN_CONFIG.ROUTES.DASHBOARD} className={navClass(ADMIN_CONFIG.ROUTES.DASHBOARD)}>
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Dashboard
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.USERS} className={navClass(ADMIN_CONFIG.ROUTES.USERS)}>
              <Users className="h-5 w-5 inline mr-2" />
              Users
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.PROFILES} className={navClass(ADMIN_CONFIG.ROUTES.PROFILES)}>
              Profiles
            </Link>
            <Link href="/admin/active-profiles" className={navClass("/admin/active-profiles")}>
              <UserCheck className="h-5 w-5 inline mr-2" />
              Active Profiles
            </Link>
            <Link href="/admin/verification-queue" className={navClass("/admin/verification-queue")}>
              <Clock className="h-5 w-5 inline mr-2" />
              Verification Queue
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.CELEBRATION_ENQUIRIES} className={navClass(ADMIN_CONFIG.ROUTES.CELEBRATION_ENQUIRIES)}>
              <ClipboardList className="h-5 w-5 inline mr-2" />
              Celebration Enquiries List
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.SUCCESS_STORIES} className={navClass(ADMIN_CONFIG.ROUTES.SUCCESS_STORIES)}>
              <Heart className="h-5 w-5 inline mr-2" />
              Success Stories
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.SETTINGS} className={navClass(ADMIN_CONFIG.ROUTES.SETTINGS)}>
              <Settings className="h-5 w-5 inline mr-2" />
              Settings
            </Link>
          </div>

          {/* Desktop User Info & Logout */}
          <div className="hidden md:flex items-center gap-3">
            {admin && (
              <>
                <div className="text-sm">
                  <p className="text-slate-300">{admin.email}</p>
                  <p className="text-xs text-slate-400 capitalize">{admin.role.replace('_', ' ')}</p>
                </div>
                <Button
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-700 space-y-4">
            <Link
              href="/admin/dashboard"
              className={mobileNavClass("/admin/dashboard")}
              onClick={toggleMenu}
            >
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className={mobileNavClass("/admin/users")}
              onClick={toggleMenu}
            >
              <Users className="h-5 w-5 inline mr-2" />
              Users
            </Link>
            <Link
              href="/admin/profiles"
              className={mobileNavClass("/admin/profiles")}
              onClick={toggleMenu}
            >
              Profiles
            </Link>
            <Link
              href="/admin/active-profiles"
              className={mobileNavClass("/admin/active-profiles")}
              onClick={toggleMenu}
            >
              <UserCheck className="h-5 w-5 inline mr-2" />
              Active Profiles
            </Link>
            <Link
              href="/admin/verification-queue"
              className={mobileNavClass("/admin/verification-queue")}
              onClick={toggleMenu}
            >
              <Clock className="h-5 w-5 inline mr-2" />
              Verification Queue
            </Link>
            <Link
              href="/admin/celebration-enquiries"
              className={mobileNavClass("/admin/celebration-enquiries")}
              onClick={toggleMenu}
            >
              <ClipboardList className="h-5 w-5 inline mr-2" />
              Celebration Enquiries List
            </Link>
            <Link
              href="/admin/success-stories"
              className={mobileNavClass("/admin/success-stories")}
              onClick={toggleMenu}
            >
              <Heart className="h-5 w-5 inline mr-2" />
              Success Stories
            </Link>
            <Link
              href="/admin/settings"
              className={mobileNavClass("/admin/settings")}
              onClick={toggleMenu}
            >
              <Settings className="h-5 w-5 inline mr-2" />
              Settings
            </Link>
            {admin && (
              <div className="pt-4 border-t border-slate-700">
                <div className="text-sm mb-3">
                  <p className="text-slate-300">{admin.email}</p>
                  <p className="text-xs text-slate-400 capitalize">{admin.role.replace('_', ' ')}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
