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
        baseTheme: undefined,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#111827',
          colorInputBackground: '#1f2937',
          colorInputText: '#f3f4f6',
          colorText: '#f3f4f6',
          colorTextSecondary: '#9ca3af',
          colorDanger: '#ef4444',
          colorSuccess: '#10b981',
          borderRadius: '0.75rem',
        },
        elements: {
          card: 'bg-gray-900/90 backdrop-blur-xl border border-gray-800 shadow-2xl',
          headerTitle: 'text-white font-bold',
          headerSubtitle: 'text-gray-400',
          formFieldLabel: 'text-gray-300 font-medium',
          formFieldInput: 'bg-gray-800/60 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500/50',
          formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-blue-900/50',
          footerActionLink: 'text-blue-400 hover:text-blue-300',
          dividerLine: 'bg-gray-700',
          dividerText: 'text-gray-500',
          socialButtonsBlockButton: 'bg-gray-800/60 border-gray-700 text-gray-200 hover:bg-gray-700/60',
          socialButtonsBlockButtonText: 'text-gray-200',
          formFieldInputShowPasswordButton: 'text-gray-400 hover:text-gray-200',
          identityPreviewText: 'text-gray-300',
          identityPreviewEditButton: 'text-blue-400 hover:text-blue-300',
          footer: 'hidden',
        }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
