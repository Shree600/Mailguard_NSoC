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
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'emails',
    label: 'Emails',
    icon: Mail,
    path: '/dashboard',
  },
  {
    id: 'phishing',
    label: 'Phishing Detected',
    icon: ShieldAlert,
    path: '/dashboard?filter=phishing',
  },
  {
    id: 'settings',
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
          "fixed left-0 top-0 z-40 h-screen bg-slate-800 border-r border-slate-700 transition-all duration-300",
          "lg:translate-x-0", // Always visible on large screens
          isOpen ? "translate-x-0" : "-translate-x-full", // Toggle on mobile
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <span className="font-bold text-xl text-slate-100">Mailguard</span>
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
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-slate-300 hover:bg-slate-700 hover:text-slate-100"
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
          className="absolute bottom-4 right-4 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors hidden lg:block"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          )}
        </button>
      </aside>
    </>
  )
}
