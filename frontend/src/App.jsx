/**
 * Main App Component
 * This sets up routing and authentication using Clerk for the Mailguard Frontend
 * 
 * Performance Optimizations:
 * - Route-level code splitting with React.lazy
 * - Suspense boundaries for loading states
 * - Lazy loading of heavy Dashboard component
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { lazy, Suspense } from 'react'

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Home route redirects to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public auth routes - wrapped in Suspense */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected dashboard route with layout - wrapped in Suspense */}
          <Route
            path="/dashboard"
            element={
              <>
                <SignedIn>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
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
      </Suspense>
    </Router>
  )
}

export default App
