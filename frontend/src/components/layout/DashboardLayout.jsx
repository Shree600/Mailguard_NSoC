/**
 * DashboardLayout Component
 * Simplified layout without sidebar to prevent overlap
 */

import { UserButton, useUser } from '@clerk/clerk-react'
import { Bell, BarChart3, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'
import Logo from '../Logo'

export default function DashboardLayout({ children }) {
  const { user } = useUser()
  const location = useLocation()
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-700 bg-slate-800">
        <div className="h-full flex items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
          {/* Left side - Branding & Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" showText={false} />
              <span className="font-bold text-xl text-slate-100">Mailguard</span>
            </div>

            {/* Navigation Links */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/analytics"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/analytics')
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Link>
            </nav>
          </div>

          {/* Right side - User actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* User Button */}
            <UserButton 
              afterSignOutUrl="/login"
              appearance={{
                baseTheme: undefined,
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonAvatarBox: "w-8 h-8",
                  userButtonTrigger: "focus:shadow-none",
                  userButtonPopoverCard: {
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: "#ffffff"
                  },
                  userButtonPopoverActionButton: {
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#334155"
                    }
                  },
                  userButtonPopoverActionButtonText: {
                    color: "#ffffff !important"
                  },
                  userButtonPopoverActionButtonIcon: {
                    color: "#ffffff"
                  },
                  userButtonPopoverFooter: "hidden"
                },
                variables: {
                  colorPrimary: "#3b82f6",
                  colorText: "#ffffff",
                  colorTextSecondary: "#cbd5e1",
                  colorBackground: "#1e293b",
                  colorInputBackground: "#1e293b",
                  colorInputText: "#ffffff"
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
