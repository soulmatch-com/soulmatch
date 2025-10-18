"use client";

import Link from "next/link";
import { Heart, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, clearUser } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Heart className="h-6 w-6 text-rose-600" fill="currentColor" />
            <span className="text-xl font-bold text-slate-900">SoulMatch</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-slate-600 hover:text-rose-600 transition-colors">
              How It Works
            </Link>
            <Link href="/about" className="text-slate-600 hover:text-rose-600 transition-colors">
              About
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-rose-600 transition-colors">
              Pricing
            </Link>
            <Link href="/contact" className="text-slate-600 hover:text-rose-600 transition-colors">
              Contact
            </Link>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-slate-600 hover:text-rose-600">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="text-slate-600 hover:text-rose-600"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-600 hover:text-rose-600">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-rose-600 hover:bg-rose-700">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-slate-600 hover:text-rose-600 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-200 space-y-4">
            <Link
              href="/how-it-works"
              className="block text-slate-600 hover:text-rose-600 transition-colors py-2"
              onClick={toggleMenu}
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="block text-slate-600 hover:text-rose-600 transition-colors py-2"
              onClick={toggleMenu}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="block text-slate-600 hover:text-rose-600 transition-colors py-2"
              onClick={toggleMenu}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="block text-slate-600 hover:text-rose-600 transition-colors py-2"
              onClick={toggleMenu}
            >
              Contact
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={toggleMenu}>
                    <Button variant="outline" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
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
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={toggleMenu}>
                    <Button className="w-full bg-rose-600 hover:bg-rose-700">
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
