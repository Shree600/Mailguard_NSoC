/**
 * DashboardLayout Component
 * Simplified layout without sidebar to prevent overlap
 */

import { UserButton, useUser } from '@clerk/clerk-react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '../Logo'

export default function DashboardLayout({ children }) {
  const { user } = useUser()
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-700 bg-slate-800">
        <div className="h-full flex items-center justify-between px-4 sm:px-6 max-w-[1920px] mx-auto">
          {/* Left side - Branding */}
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" showText={false} />
            <span className="font-bold text-xl text-slate-100">Mailguard</span>
          </div>

          {/* Right side - User actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* User Button */}
            <UserButton afterSignOutUrl="/login" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-6 max-w-[1920px] mx-auto">
        {children}
      </main>
    </div>
  )
}
