"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Sparkles, Lock, Users, CheckCircle, Award, UserCheck, Star, TrendingUp, Clock, Globe } from "lucide-react";
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
                <Award className="h-4 w-4" />
                India's Most Trusted Matrimony Platform
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
                Find Your <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent inline-block">Life Partner</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Discover meaningful connections with verified profiles from families who share your values, traditions, and vision for marriage.
              </p>

              {!user && (
                <div className="flex gap-4 justify-center md:justify-start flex-wrap pt-4">
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all group">
                      Register Free
                      <UserCheck className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="text-base px-8 py-6 border-2 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400">
                      Login
                    </Button>
                  </Link>
                </div>
              )}

              {user && (
                <div className="flex gap-4 justify-center md:justify-start flex-wrap pt-4">
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                      My Dashboard
                    </Button>
                  </Link>
                  <Link href="/search">
                    <Button size="lg" variant="outline" className="text-base px-8 py-6 border-2 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400">
                      Browse Profiles
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 md:gap-6 justify-center md:justify-start text-sm text-slate-600 dark:text-slate-400 pt-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>100% Verified Profiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>Free Registration</span>
                </div>
              </div>

              {!user && (
                <div className="flex items-center gap-4 pt-4 justify-center md:justify-start">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-xs font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">2,000+</span> marriages celebrated this year
                  </p>
                </div>
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
              Why Families Trust <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">SoulMatch</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              India's most trusted matrimony service helping thousands of families find the perfect match
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">100% Verified Profiles</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Every profile is manually verified with ID and photo verification for your safety and trust.</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Personalized Matches</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Advanced matching based on community, education, profession, family values and preferences.</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Complete Privacy</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Your contact details remain private. Share only when you're comfortable and ready.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-900 dark:to-pink-900 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">50L+</div>
                <div className="text-purple-100 text-sm md:text-base">Active Profiles</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">2000+</div>
                <div className="text-purple-100 text-sm md:text-base">Marriages This Year</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">100+</div>
                <div className="text-purple-100 text-sm md:text-base">Communities</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">24/7</div>
                <div className="text-purple-100 text-sm md:text-base">Support Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Stories Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Success Stories
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Real couples who found their perfect match through SoulMatch
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Priya & Rahul", location: "Mumbai", story: "We found each other through SoulMatch and got married last month. The platform made it easy to connect with families who share our values. Forever grateful!" },
              { name: "Anjali & Vikram", location: "Delhi", story: "After months of searching, we found our perfect match here. The detailed profiles and verification process gave us confidence. Highly recommended!" },
              { name: "Sneha & Arjun", location: "Bangalore", story: "SoulMatch helped us find not just partners, but soulmates. The matching algorithm really works! We're now happily married with our families' blessings." }
            ].map((story, index) => (
              <div key={index} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-4 italic">"{story.story}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                    {story.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{story.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{story.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Find Your Life Partner in 3 Simple Steps
              </h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                A simple and trusted process to help you find your perfect match
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">1</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Register for Free</h3>
                <p className="text-slate-600 dark:text-slate-300">Create your profile with details about yourself, family, and partner preferences</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">2</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Connect & Communicate</h3>
                <p className="text-slate-600 dark:text-slate-300">Browse verified profiles, send interest, and chat with potential matches</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Meet & Marry</h3>
                <p className="text-slate-600 dark:text-slate-300">Take the relationship forward with family involvement and tie the knot</p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  Start Your Journey Today
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
