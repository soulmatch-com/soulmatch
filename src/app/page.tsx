"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <Heart className="h-16 w-16 text-rose-600" fill="currentColor" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900">
            Find Your <span className="text-rose-600">SoulMatch</span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Connect with compatible partners who share your values, interests, and life goals.
            Start your journey to finding your perfect match today.
          </p>

          {!user && (
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/signup">
                <Button size="lg" className="bg-rose-600 hover:bg-rose-700">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          )}

          {user && (
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/dashboard">
                <Button size="lg" className="bg-rose-600 hover:bg-rose-700">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/search">
                <Button size="lg" variant="outline">
                  Find Matches
                </Button>
              </Link>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 mt-16 pt-16 border-t border-slate-200">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Verified Profiles</h3>
              <p className="text-slate-600">All profiles are verified for authenticity and safety</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Smart Matching</h3>
              <p className="text-slate-600">Advanced algorithm to find your perfect match</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Privacy First</h3>
              <p className="text-slate-600">Your data is secure and under your control</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
