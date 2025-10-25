"use client";

import Link from "next/link";
import { Heart, Menu, X, User, LogOut, Settings, HelpCircle, UserCircle, UserCheck } from "lucide-react";
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
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 transition-colors">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section: Logo + Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group transition-all">
              <div className="relative">
                <Heart className="h-8 w-8 text-blue-700 group-hover:scale-110 transition-transform" fill="url(#header-gradient)" />
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="header-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a8a" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">
                MyThirumanam.in
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/how-it-works"
                className={`text-sm font-medium transition-colors relative group ${
                  isActive('/how-it-works')
                    ? 'text-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                }`}
                aria-current={isActive('/how-it-works') ? 'page' : undefined}
              >
                How It Works
                <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-700 to-emerald-700 transition-transform ${
                  isActive('/how-it-works') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </Link>
              <Link
                href="/about"
                className={`text-sm font-medium transition-colors relative group ${
                  isActive('/about')
                    ? 'text-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                }`}
                aria-current={isActive('/about') ? 'page' : undefined}
              >
                About
                <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-700 to-emerald-700 transition-transform ${
                  isActive('/about') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </Link>
              <Link
                href="/pricing"
                className={`text-sm font-medium transition-colors relative group ${
                  isActive('/pricing')
                    ? 'text-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                }`}
                aria-current={isActive('/pricing') ? 'page' : undefined}
              >
                Pricing
                <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-700 to-emerald-700 transition-transform ${
                  isActive('/pricing') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </Link>
              <Link
                href="/contact"
                className={`text-sm font-medium transition-colors relative group ${
                  isActive('/contact')
                    ? 'text-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                }`}
                aria-current={isActive('/contact') ? 'page' : undefined}
              >
                Contact
                <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-700 to-emerald-700 transition-transform ${
                  isActive('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </Link>
            </div>
          </div>

          {/* Right Section: Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!mounted ? (
              // Render placeholder during SSR to prevent hydration mismatch
              <div className="w-[200px]" />
            ) : user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 group">
                    Dashboard
                    <User className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 border-2 border-blue-200 dark:border-blue-800 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900 text-blue-700 dark:text-blue-300 font-semibold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">My Account</p>
                        <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer group" asChild>
                        <Link href="/profile">
                          <UserCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          <span>View Profile</span>
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer group" asChild>
                        <Link href="/settings">
                          <Settings className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                          <span>Settings</span>
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer group" asChild>
                        <Link href="/help">
                          <HelpCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          <span>Help & Support</span>
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer group focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 group">
                    Sign In
                    <User className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 shadow-md hover:shadow-lg transition-all group">
                    Get Started
                    <UserCheck className="ml-2 h-4 w-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
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
                  <Link href="/dashboard" onClick={toggleMenu}>
                    <Button variant="outline" className="w-full hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 group">
                      <User className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
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
