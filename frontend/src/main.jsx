/**
 * Main Entry Point
 * This file initializes the React application with Clerk authentication
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
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
          colorPrimary: '#6366f1',
          colorBackground: '#0f172a',
          colorInputBackground: '#1e293b',
          colorInputText: '#f1f5f9',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          borderRadius: '0.75rem',
        },
        elements: {
          rootBox: 'flex items-center justify-center min-h-screen bg-slate-950',
          card: 'bg-slate-900 border border-slate-800 shadow-xl',
          headerTitle: 'text-white text-2xl font-semibold',
          headerSubtitle: 'text-slate-400',
          formFieldLabel: 'text-slate-300 font-medium',
          formFieldInput: 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg hover:shadow-xl transition-all',
          footerActionLink: 'text-indigo-400 hover:text-indigo-300',
          socialButtonsBlockButton: 'bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors',
          socialButtonsBlockButtonText: 'text-white font-medium',
          dividerLine: 'bg-slate-700',
          dividerText: 'text-slate-500',
        }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
