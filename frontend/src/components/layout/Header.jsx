/**
 * Header Component
 * Top navigation bar with user info and actions
 */

import { UserButton, useUser } from '@clerk/clerk-react'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Header({ onMenuClick }) {
  const { user } = useUser()
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'

  return (
    <header className="h-16 border-b border-slate-700 bg-slate-800 sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-4 sm:px-6">
        {/* Left side - Mobile menu + Search */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-md">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search - hidden on small mobile */}
          <div className="relative flex-1 hidden xs:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search emails..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-100">{displayName}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
            <UserButton afterSignOutUrl="/login" />
          </div>
        </div>
      </div>
    </header>
  )
}
