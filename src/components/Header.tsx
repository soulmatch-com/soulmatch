"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Menu, X, User, LogOut, Settings, HelpCircle, UserCircle, UserCheck, Search, Home, MessageSquare, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, clearUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isActive = (path: string) => pathname === path;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Prevent hydration mismatch by only rendering auth-dependent UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearUser();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <nav className="container mx-auto px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Section: Logo */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <Image
              src="/mythirumanam-logo.png"
              alt="MyThirumanam"
              width={260}
              height={77}
              priority
              className="h-12 w-auto"
            />
          </Link>

          {/* Center Section: Navigation (only shown when user is logged in) */}
          {!mounted ? (
            <div className="hidden md:flex items-center gap-6 flex-1 justify-center" />
          ) : user ? (
            <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'text-blue-700 bg-blue-50 dark:bg-blue-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
              <Link
                href="/search"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'text-blue-700 bg-blue-50 dark:bg-blue-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Matches
              </Link>
              <Link
                href="/interests"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/interests')
                    ? 'text-blue-700 bg-blue-50 dark:bg-blue-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Heart className="h-4 w-4" />
                Interests
              </Link>
              <Link
                href="/messages"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/messages')
                    ? 'text-blue-700 bg-blue-50 dark:bg-blue-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </Link>
              <Link
                href="/search"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'text-blue-700 bg-blue-50 dark:bg-blue-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Search className="h-4 w-4" />
                Search
              </Link>
            </div>
          ) : null}

          {/* Right Section: Actions */}
          <div className="hidden md:flex items-center gap-3">
            {!mounted ? (
              <div className="w-[200px]" />
            ) : user ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />

                {/* Switch Account Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      Switch account
                      <UserCircle className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">Current Account</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Avatar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900 text-blue-700 dark:text-blue-300 font-semibold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl">
                    <DropdownMenuLabel className="p-0">
                      <div className="flex flex-col space-y-1 px-3 py-3 rounded-lg bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-100 dark:border-blue-900/50">
                        <p className="text-sm font-semibold">My Account</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>

                    <div className="my-2 space-y-1">
                      <DropdownMenuItem asChild>
                        <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer" asChild>
                          <Link href="/profile">
                            <UserCircle className="mr-2 h-4 w-4" />
                            View Profile
                          </Link>
                        </Button>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer" asChild>
                          <Link href="/update-password">
                            <Settings className="mr-2 h-4 w-4" />
                            Update Password
                          </Link>
                        </Button>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer" asChild>
                          <Link href="/help">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Help & Support
                          </Link>
                        </Button>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
              }
            }}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Backdrop */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
            onClick={toggleMenu}
            aria-hidden="true"
          />
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-in slide-in-from-top duration-200 relative z-[60]">
            <Link
              href="/how-it-works"
              className="block text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors py-2"
              onClick={toggleMenu}
              aria-current={isActive('/how-it-works') ? 'page' : undefined}
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="block text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors py-2"
              onClick={toggleMenu}
              aria-current={isActive('/about') ? 'page' : undefined}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="block text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors py-2"
              onClick={toggleMenu}
              aria-current={isActive('/pricing') ? 'page' : undefined}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="block text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors py-2"
              onClick={toggleMenu}
              aria-current={isActive('/contact') ? 'page' : undefined}
            >
              Contact
            </Link>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              {!mounted ? (
                // Render placeholder during SSR
                <div className="h-[88px]" />
              ) : user ? (
                <>
                  <Link href="/search" onClick={toggleMenu}>
                    <Button
                      variant={isActive('/search') ? 'default' : 'outline'}
                      className={isActive('/search')
                        ? 'w-full bg-gradient-to-r from-blue-700 to-emerald-700 text-white hover:from-blue-800 hover:to-emerald-800'
                        : 'w-full hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600'}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </Link>
                  <Link href="/interests" onClick={toggleMenu}>
                    <Button
                      variant={isActive('/interests') ? 'default' : 'outline'}
                      className={isActive('/interests')
                        ? 'w-full bg-gradient-to-r from-blue-700 to-emerald-700 text-white hover:from-blue-800 hover:to-emerald-800'
                        : 'w-full hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600'}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Interests
                    </Button>
                  </Link>
                  <Link href="/dashboard" onClick={toggleMenu}>
                    <Button
                      variant={isActive('/dashboard') ? 'default' : 'outline'}
                      className={isActive('/dashboard')
                        ? 'w-full bg-gradient-to-r from-blue-700 to-emerald-700 text-white hover:from-blue-800 hover:to-emerald-800'
                        : 'w-full hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600'}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 group"
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={toggleMenu}>
                    <Button variant="outline" className="w-full hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 group">
                      <User className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={toggleMenu}>
                    <Button className="w-full bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 group">
                      <UserCheck className="h-4 w-4 mr-2 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
