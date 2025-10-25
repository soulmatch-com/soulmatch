import { Heart } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-emerald-700 rounded-full blur-xl opacity-20"></div>
              <div className="relative bg-white dark:bg-slate-800 p-4 rounded-full shadow-xl ring-4 ring-blue-100 dark:ring-blue-900">
                <Heart className="h-12 w-12 text-transparent bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text" fill="url(#gradient)" />
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a8a" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent mb-2">
            MyThirumanam.in
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Trusted Matrimonial Service</p>
        </div>
        {children}

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            🔒 100% Verified Profiles • 2,000+ Successful Alliances
          </p>
        </div>
      </div>
    </div>
  )
}
