/**
 * Main Entry Point
 * This file initializes the React application with Clerk authentication
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App.jsx'

// Get Clerk publishable key from environment
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to .env')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#111827',
          colorInputBackground: '#1f2937',
          colorInputText: '#f3f4f6',
          colorText: '#f3f4f6',
          colorTextSecondary: '#9ca3af',
          borderRadius: '0rem',
        },
        elements: {
          rootBox: 'bg-black',
          card: 'bg-gray-900/80 backdrop-blur-xl border border-gray-800 shadow-2xl rounded-none',
          cardBox: 'shadow-none',
          headerTitle: 'text-white font-bold',
          headerSubtitle: 'text-gray-400',
          formFieldLabel: 'text-gray-300 font-medium',
          formFieldInput: 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20',
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg',
          footerActionLink: 'text-blue-400 hover:text-blue-300 font-medium',
          footerActionText: 'text-gray-400',
          socialButtonsBlockButton: 'bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white',
          socialButtonsBlockButtonText: '!text-white font-medium',
          socialButtonsBlockButtonArrow: 'hidden',
          dividerLine: 'bg-gray-700',
          dividerText: 'text-gray-500',
        },
        layout: {
          logoPlacement: 'inside',
          shimmer: false,
        }
      }}
    >
      <App />
      <Toaster position="top-right" richColors closeButton />
    </ClerkProvider>
  </StrictMode>,
)
