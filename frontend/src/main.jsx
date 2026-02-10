/**
 * Main Entry Point
 * This file initializes the React application with Clerk authentication
 * Dark mode is forced globally for professional SaaS aesthetic
 */

import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Toaster } from '@/components/ui/sonner'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

// Get Clerk publishable key from environment
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to .env')
}

// Validate Clerk key format (should start with pk_test_ or pk_live_)
if (!PUBLISHABLE_KEY.startsWith('pk_test_') && !PUBLISHABLE_KEY.startsWith('pk_live_')) {
  throw new Error('Invalid Clerk Publishable Key format. Must start with pk_test_ or pk_live_')
}

// Dark mode wrapper component
function DarkModeApp() {
  useEffect(() => {
    // Force dark mode on mount and ensure it persists
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <ErrorBoundary>
      <App />
      <Toaster position="top-right" richColors closeButton />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: undefined, // Use our custom dark theme
        variables: {
          colorPrimary: '#3b82f6', // blue-500
          colorBackground: '#1e293b', // slate-800
          colorInputBackground: '#0f172a', // slate-900
          colorInputText: '#f1f5f9', // slate-100
          colorText: '#f1f5f9', // slate-100
          colorTextSecondary: '#94a3b8', // slate-400
          borderRadius: '0.75rem',
        },
        elements: {
          rootBox: 'bg-transparent',
          card: 'bg-slate-800 border border-slate-700/50 shadow-xl rounded-xl',
          cardBox: 'shadow-none',
          headerTitle: 'text-slate-100 font-bold text-2xl',
          headerSubtitle: 'text-slate-400',
          formFieldLabel: 'text-slate-300 font-medium',
          formFieldInput: 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg',
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md rounded-lg',
          footerActionLink: 'text-blue-500 hover:text-blue-400 font-medium',
          footerActionText: 'text-slate-400',
          socialButtonsBlockButton: 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 rounded-lg',
          socialButtonsBlockButtonText: '!text-slate-100 font-medium',
          socialButtonsBlockButtonArrow: 'hidden',
          dividerLine: 'bg-slate-700',
          dividerText: 'text-slate-500',
        },
        layout: {
          logoPlacement: 'inside',
          shimmer: false,
        }
      }}
    >
      <DarkModeApp />
    </ClerkProvider>
  </StrictMode>,
)
