"use client";

import Link from "next/link";
import { Heart, Menu, X, User, LogOut, Settings, HelpCircle, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const { user, clearUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isActive = (path: string) => pathname === path;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group transition-all">
            <div className="relative">
              <Heart className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" fill="url(#header-gradient)" />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="header-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              SoulMatch
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/how-it-works"
              className={`text-sm font-medium transition-colors relative group ${
                isActive('/how-it-works')
                  ? 'text-purple-600'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              How It Works
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-transform ${
                isActive('/how-it-works') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </Link>
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors relative group ${
                isActive('/about')
                  ? 'text-purple-600'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              About
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-transform ${
                isActive('/about') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors relative group ${
                isActive('/pricing')
                  ? 'text-purple-600'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              Pricing
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-transform ${
                isActive('/pricing') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors relative group ${
                isActive('/contact')
                  ? 'text-purple-600'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              Contact
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-transform ${
                isActive('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </Link>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400">
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 border-2 border-purple-200 dark:border-purple-800 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-700 dark:text-purple-300 font-semibold">
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
                      <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer" asChild>
                        <Link href="/profile">
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>View Profile</span>
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer" asChild>
                        <Link href="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start font-normal cursor-pointer" asChild>
                        <Link href="/help">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          <span>Help & Support</span>
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start font-normal text-red-600 dark:text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </Button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            aria-label="Toggle menu"
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
          <div className="md:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-in slide-in-from-top duration-200 relative z-50">
            <Link
              href="/how-it-works"
              className="block text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2"
              onClick={toggleMenu}
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="block text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2"
              onClick={toggleMenu}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="block text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2"
              onClick={toggleMenu}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="block text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2"
              onClick={toggleMenu}
            >
              Contact
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={toggleMenu}>
                    <Button variant="outline" className="w-full hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600"
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={toggleMenu}>
                    <Button variant="outline" className="w-full hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={toggleMenu}>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
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
