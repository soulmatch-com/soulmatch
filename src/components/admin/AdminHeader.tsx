"use client";

import Link from "next/link";
import { Shield, Users, Settings, BarChart3, LogOut, Menu, X, Clock, UserCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore, ADMIN_CONFIG } from "@/modules/admin";
import { toast } from "sonner";

export default function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { admin, clearAdmin } = useAdminStore();
  const router = useRouter();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    clearAdmin();
    toast.success("Logged out successfully");
    router.push(ADMIN_CONFIG.ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-700">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={ADMIN_CONFIG.ROUTES.DASHBOARD} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="h-6 w-6 text-white" />
            <span className="text-xl font-bold">SoulMatch Admin</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href={ADMIN_CONFIG.ROUTES.DASHBOARD} className="text-slate-300 hover:text-white transition-colors">
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Dashboard
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.USERS} className="text-slate-300 hover:text-white transition-colors">
              <Users className="h-5 w-5 inline mr-2" />
              Users
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.PROFILES} className="text-slate-300 hover:text-white transition-colors">
              Profiles
            </Link>
            <Link href="/admin/active-profiles" className="text-slate-300 hover:text-white transition-colors">
              <UserCheck className="h-5 w-5 inline mr-2" />
              Active Profiles
            </Link>
            <Link href="/admin/verification-queue" className="text-slate-300 hover:text-white transition-colors">
              <Clock className="h-5 w-5 inline mr-2" />
              Verification Queue
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.SUCCESS_STORIES} className="text-slate-300 hover:text-white transition-colors">
              <Heart className="h-5 w-5 inline mr-2" />
              Success Stories
            </Link>
            <Link href={ADMIN_CONFIG.ROUTES.SETTINGS} className="text-slate-300 hover:text-white transition-colors">
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
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={toggleMenu}
            >
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={toggleMenu}
            >
              <Users className="h-5 w-5 inline mr-2" />
              Users
            </Link>
            <Link
              href="/admin/profiles"
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={toggleMenu}
            >
              Profiles
            </Link>
            <Link
              href="/admin/active-profiles"
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={toggleMenu}
            >
              <UserCheck className="h-5 w-5 inline mr-2" />
              Active Profiles
            </Link>
            <Link
              href="/admin/verification-queue"
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={toggleMenu}
            >
              <Clock className="h-5 w-5 inline mr-2" />
              Verification Queue
            </Link>
            <Link
              href="/admin/success-stories"
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={toggleMenu}
            >
              <Heart className="h-5 w-5 inline mr-2" />
              Success Stories
            </Link>
            <Link
              href="/admin/settings"
              className="block text-slate-300 hover:text-white transition-colors py-2"
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
