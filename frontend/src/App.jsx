/**
 * Main App Component
 * This sets up routing and authentication using Clerk for the Mailguard Frontend
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Router>
      {/* Header with auth buttons */}
      <header className="flex justify-end items-center p-4 gap-4 h-16 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-gray-300 hover:text-white font-medium text-sm transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm h-10 px-5 transition-colors shadow-lg">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/login" />
        </SignedIn>
      </header>

      <Routes>
        {/* Home route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected dashboard route */}
        <Route
          path="/dashboard"
          element={
            <>
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <Navigate to="/login" replace />
              </SignedOut>
            </>
          }
        />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
