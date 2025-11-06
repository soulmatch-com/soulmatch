"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Users, CheckCircle, Award, UserCheck, Star, Globe, Heart, BadgeCheck, UserCog, Phone, Clock, Sparkles, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect } from "react";

interface SuccessStory {
  id: string;
  couple_names: string;
  location: string;
  story_text: string;
  couple_photo_url: string | null;
  is_featured: boolean;
}

export default function Home() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch success stories
  useEffect(() => {
    async function fetchSuccessStories() {
      try {
        const response = await fetch('/api/success-stories?limit=6&featured_only=true');
        if (response.ok) {
          const data = await response.json();
          setSuccessStories(data.stories);
        }
      } catch (error) {
        console.error('Failed to fetch success stories:', error);
      } finally {
        setStoriesLoading(false);
      }
    }
    fetchSuccessStories();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-emerald-100 dark:from-blue-900/50 dark:to-emerald-900/50 text-blue-900 dark:text-blue-200 rounded-full text-sm font-semibold shadow-sm border border-blue-200 dark:border-blue-800">
                <BadgeCheck className="h-4 w-4" />
                India's Most Trusted Matrimonial Service
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
                Discover Compatible <span className="bg-gradient-to-r from-blue-800 to-emerald-700 bg-clip-text text-transparent inline-block">Families</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Connect with verified profiles from families who share your cultural values, traditions, and commitment to lifelong partnerships.
              </p>

              {!mounted ? (
                // Placeholder during SSR to prevent hydration mismatch
                <div className="h-[72px]" />
              ) : !user ? (
                <div className="flex gap-4 justify-center md:justify-start flex-wrap pt-4">
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all group">
                      Begin Your Journey
                      <UserCheck className="ml-2 h-5 w-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="text-base px-8 py-6 border-2 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 group">
                      Member Login
                      <Heart className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex gap-4 justify-center md:justify-start flex-wrap pt-4">
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all group">
                      My Dashboard
                      <UserCog className="ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                    </Button>
                  </Link>
                  <Link href="/search">
                    <Button size="lg" variant="outline" className="text-base px-8 py-6 border-2 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 group">
                      Search Profiles
                      <Globe className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 md:gap-6 justify-center md:justify-start text-sm text-slate-700 dark:text-slate-300 pt-4">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">100% Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  <span className="font-medium">Privacy Protected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">Family Focused</span>
                </div>
              </div>

              {mounted && !user && (
                <div className="flex items-center gap-4 pt-4 justify-center md:justify-start">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-blue-700 dark:text-blue-400">2,000+</span> successful alliances this year
                  </p>
                </div>
              )}
            </div>

            {/* Right Visual */}
            <div className="relative hidden md:block">
              <div className="relative w-full aspect-square">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-full opacity-30 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-gradient-to-br from-blue-200 to-emerald-200 dark:from-blue-800/20 dark:to-emerald-800/20 rounded-full opacity-20"></div>

                {/* Central Family/Rings Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-full p-12 shadow-2xl ring-4 ring-blue-100 dark:ring-blue-900/50">
                  <Users className="h-32 w-32 text-blue-700 dark:text-blue-400" />
                  <svg width="0" height="0">
                    <defs>
                      <linearGradient id="hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e3a8a" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Floating Feature Cards */}
                <div className="absolute top-8 right-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-subtle-float border border-emerald-200 dark:border-emerald-800">
                  <BadgeCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="absolute bottom-8 left-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-subtle-float border border-blue-200 dark:border-blue-800" style={{ animationDelay: '1s' }}>
                  <Shield className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                </div>
                <div className="absolute top-1/3 -left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-subtle-float border border-emerald-200 dark:border-emerald-800" style={{ animationDelay: '0.5s' }}>
                  <Heart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
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
              Why Families Trust <span className="bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">MyThirumanam.in</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              A professional matrimonial service connecting families through verified profiles and cultural compatibility
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-blue-100 dark:border-blue-900">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-xl flex items-center justify-center mb-4">
                <BadgeCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Verified Profiles Only</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Every profile undergoes thorough ID, photo, and family background verification ensuring authenticity and trust.</p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-blue-100 dark:border-blue-900">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-700 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Family-Centric Approach</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Connect with families sharing your cultural values, religious beliefs, and commitment to traditional alliances.</p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-blue-100 dark:border-blue-900">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Privacy & Security</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Your personal information and contact details are protected with enterprise-grade security and shared only with your consent.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-gradient-to-r from-blue-800 to-emerald-800 dark:from-blue-950 dark:to-emerald-950 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">50L+</div>
                <div className="text-blue-100 text-sm md:text-base">Verified Profiles</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">2000+</div>
                <div className="text-blue-100 text-sm md:text-base">Successful Alliances</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">100+</div>
                <div className="text-blue-100 text-sm md:text-base">Communities Served</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">24/7</div>
                <div className="text-blue-100 text-sm md:text-base">Family Support</div>
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
              Family Success Stories
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Families who found compatible alliances and celebrated successful marriages through SoulMatch
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {storiesLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-blue-900 animate-pulse">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div key={star} className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    ))}
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : successStories.length > 0 ? (
              // Render dynamic success stories
              successStories.map((story) => (
                <div key={story.id} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mb-4 italic leading-relaxed">"{story.story_text}"</p>
                  <div className="flex items-center gap-3">
                    {story.couple_photo_url ? (
                      <img
                        src={story.couple_photo_url}
                        alt={story.couple_names}
                        className="w-10 h-10 rounded-full object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
                        {story.couple_names.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{story.couple_names}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {story.location}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback when no stories available
              <div className="col-span-3 text-center py-12">
                <Heart className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No success stories available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                How Families Connect on MyThirumanam.in
              </h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                A trusted, family-first approach to finding compatible life partners
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">1</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Create Verified Profile</h3>
                <p className="text-slate-600 dark:text-slate-300">Register with complete family details, background verification, and cultural preferences for authentic connections</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">2</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Discover Compatible Families</h3>
                <p className="text-slate-600 dark:text-slate-300">Browse verified profiles filtered by community, values, and preferences with family involvement encouraged</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">3</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Build Lasting Alliances</h3>
                <p className="text-slate-600 dark:text-slate-300">Connect families, arrange meetings with parental guidance, and celebrate marriages built on trust</p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  Begin Your Family's Journey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
