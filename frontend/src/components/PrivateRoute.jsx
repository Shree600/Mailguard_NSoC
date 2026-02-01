/**
 * PRIVATE ROUTE COMPONENT
 * Protects routes that require authentication
 * Redirects to login if not authenticated
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    console.log('🔒 Access denied - redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Render protected content
  return children
}

export default PrivateRoute
