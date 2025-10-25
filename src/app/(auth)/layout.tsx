import { Heart } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-white dark:bg-slate-800 p-4 rounded-full shadow-xl ring-4 ring-purple-100 dark:ring-purple-900">
                <Heart className="h-12 w-12 text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text" fill="url(#gradient)" />
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            SoulMatch
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Find your perfect match</p>
        </div>
        {children}

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            🔒 Secure & encrypted • 10,000+ happy couples
          </p>
        </div>
      </div>
    </div>
  )
}
