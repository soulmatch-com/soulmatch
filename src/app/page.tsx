"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Sparkles, Lock, Users, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium shadow-sm">
                <Heart className="h-4 w-4" fill="currentColor" />
                Trusted by 10,000+ users
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
                Find Your <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent inline-block animate-pulse">SoulMatch</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Connect with compatible partners who share your values, interests, and life goals.
                Start your journey to finding your perfect match today.
              </p>

              {!user && (
                <div className="flex gap-4 justify-center md:justify-start flex-wrap pt-4">
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all group">
                      Find Your Match in 5 Minutes
                      <Heart className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" fill="currentColor" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="text-base px-8 py-6 border-2 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}

              {user && (
                <div className="flex gap-4 justify-center md:justify-start flex-wrap pt-4">
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link href="/search">
                    <Button size="lg" variant="outline" className="text-base px-8 py-6 border-2 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400">
                      Find Matches
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-6 justify-center md:justify-start text-sm text-slate-600 dark:text-slate-400 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>Free forever</span>
                </div>
              </div>

              {!user && (
                <p className="text-xs text-center md:text-left text-slate-500 dark:text-slate-400 pt-2">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">1,234 users</span> signed up today
                </p>
              )}
            </div>

            {/* Right Visual */}
            <div className="relative hidden md:block">
              <div className="relative w-full aspect-square">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-800/30 dark:to-pink-800/30 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-gradient-to-br from-purple-300 to-pink-300 dark:from-purple-600/30 dark:to-pink-600/30 rounded-full opacity-30 animate-pulse"></div>

                {/* Central Heart Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-full p-12 shadow-2xl">
                  <Heart className="h-32 w-32" fill="url(#hero-gradient)" />
                  <svg width="0" height="0">
                    <defs>
                      <linearGradient id="hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9333ea" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Floating Feature Cards */}
                <div className="absolute top-8 right-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-float border border-purple-100 dark:border-purple-800">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="absolute bottom-8 left-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-float-delayed border border-pink-100 dark:border-pink-800">
                  <Shield className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="absolute top-1/3 -left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-float border border-purple-100 dark:border-purple-800">
                  <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Why Choose <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">SoulMatch</span>?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Join thousands of happy couples who found their perfect match through our platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Verified Profiles</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">All profiles are verified for authenticity and safety. Connect with real people.</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Smart Matching</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Advanced algorithm to find your perfect match based on compatibility.</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Privacy First</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Your data is secure and under your control. We never share your information.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
