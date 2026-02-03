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
          // Brand colors with vibrant gradients
          colorPrimary: '#6366f1', // Indigo
          colorBackground: '#0f172a', // Slate-950
          colorInputBackground: '#1e293b', // Slate-800
          colorInputText: '#f1f5f9', // Slate-100
          colorText: '#f1f5f9', // Slate-100
          colorTextSecondary: '#94a3b8', // Slate-400
          colorDanger: '#ef4444', // Red-500
          colorSuccess: '#22c55e', // Green-500
          colorWarning: '#f59e0b', // Amber-500
          // Borders and radius
          borderRadius: '1rem',
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: '0.95rem',
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
          }
        },
        elements: {
          // Main card styling - glassmorphism effect
          rootBox: 'flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
          card: 'bg-slate-900/80 backdrop-blur-2xl border-2 border-slate-800/50 shadow-[0_0_50px_rgba(99,102,241,0.15)] rounded-2xl',
          
          // Header styling
          headerTitle: 'text-white text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent',
          headerSubtitle: 'text-slate-400 text-base mt-2',
          
          // Logo and branding
          logoBox: 'h-16 mb-4',
          logoImage: 'h-full w-auto',
          
          // Form fields
          formFieldLabel: 'text-slate-300 font-semibold text-sm mb-2',
          formFieldInput: `
            bg-slate-800/60 
            border-2 border-slate-700/50 
            text-white 
            placeholder:text-slate-500
            focus:border-indigo-500 
            focus:ring-4 
            focus:ring-indigo-500/20
            hover:border-slate-600
            transition-all duration-200
            rounded-xl
            px-4 py-3
          `,
          formFieldInputShowPasswordButton: 'text-slate-400 hover:text-white transition-colors',
          
          // Primary button - gradient with animation
          formButtonPrimary: `
            bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 
            hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 
            text-white 
            font-bold 
            shadow-xl 
            shadow-indigo-900/50
            hover:shadow-2xl 
            hover:shadow-indigo-800/60
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-200
            rounded-xl
            py-3
            text-base
          `,
          
          // Footer links
          footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-semibold transition-colors',
          footerActionText: 'text-slate-400',
          
          // Divider between social and form
          dividerLine: 'bg-gradient-to-r from-transparent via-slate-700 to-transparent',
          dividerText: 'text-slate-500 bg-slate-900 px-4 font-medium',
          
          // Social login buttons
          socialButtonsBlockButton: `
            bg-slate-800/60 
            border-2 border-slate-700/50 
            text-slate-200 
            hover:bg-slate-700/60 
            hover:border-slate-600
            hover:scale-[1.02]
            transition-all duration-200
            rounded-xl
            py-3
            font-semibold
          `,
          socialButtonsBlockButtonText: 'text-slate-200 font-semibold',
          socialButtonsIconButton: 'text-slate-300 hover:text-white',
          
          // Alert messages
          alert: 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl',
          alertText: 'text-red-400 font-medium',
          
          // Identity preview (user info display)
          identityPreview: 'bg-slate-800/40 border border-slate-700/50 rounded-xl',
          identityPreviewText: 'text-slate-300',
          identityPreviewEditButton: 'text-indigo-400 hover:text-indigo-300 font-semibold transition-colors',
          
          // Form field row
          formFieldRow: 'gap-4',
          
          // Form field action
          formFieldAction: 'text-indigo-400 hover:text-indigo-300 font-medium transition-colors',
          
          // OTP input
          otpCodeFieldInput: `
            bg-slate-800/60 
            border-2 border-slate-700/50 
            text-white text-center text-2xl font-bold
            focus:border-indigo-500 
            focus:ring-4 
            focus:ring-indigo-500/20
            rounded-xl
            w-12 h-14
          `,
          
          // Alternative methods
          alternativeMethodsBlockButton: `
            bg-slate-800/40 
            border border-slate-700/50 
            text-slate-300 
            hover:bg-slate-700/40 
            hover:text-white
            rounded-xl
            transition-all duration-200
          `,
          
          // Badges
          badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg',
          
          // Footer
          footer: 'text-slate-500 text-sm mt-8',
          
          // Form container
          form: 'space-y-6',
          
          // Main content
          main: 'p-8',
        },
        layout: {
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'blockButton',
          shimmer: true,
        }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
