/**
 * Sidebar Component
 * Professional navigation sidebar with logo and menu items
 */

import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Mail, 
  ShieldAlert, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Logo from '../Logo'

const menuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Emails',
    icon: Mail,
    path: '/dashboard',
  },
  {
    label: 'Phishing Detected',
    icon: ShieldAlert,
    path: '/dashboard?filter=phishing',
  },
  {
    label: 'Settings',
    icon: Settings,
    path: '/dashboard',
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay - only show when menu is open */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-white border-r border-gray-200 transition-all duration-300",
          "lg:translate-x-0", // Always visible on large screens
          isOpen ? "translate-x-0" : "-translate-x-full", // Toggle on mobile
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <span className="font-bold text-xl text-gray-900">Mailguard</span>
            </div>
          )}
          {collapsed && (
            <div className="flex items-center justify-center w-full">
              <Logo className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Navigation menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-4 right-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors hidden lg:block"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-700" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          )}
        </button>
      </aside>
    </>
  )
}
