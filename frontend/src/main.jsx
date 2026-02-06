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
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#111827',
          colorText: '#111827',
          colorTextSecondary: '#6b7280',
          borderRadius: '0.5rem',
        },
        elements: {
          rootBox: 'bg-transparent',
          card: 'bg-white border border-gray-200 shadow-lg rounded-lg',
          cardBox: 'shadow-none',
          headerTitle: 'text-gray-900 font-bold',
          headerSubtitle: 'text-gray-600',
          formFieldLabel: 'text-gray-700 font-medium',
          formFieldInput: 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg',
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md rounded-lg',
          footerActionLink: 'text-blue-600 hover:text-blue-700 font-medium',
          footerActionText: 'text-gray-600',
          socialButtonsBlockButton: 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg',
          socialButtonsBlockButtonText: '!text-gray-700 font-medium',
          socialButtonsBlockButtonArrow: 'hidden',
          dividerLine: 'bg-gray-200',
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
