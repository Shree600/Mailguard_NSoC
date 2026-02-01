/**
 * AUTH CONTEXT
 * Manages authentication state across the application
 * Provides login, logout, and user information
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Create Auth Context
const AuthContext = createContext(null)

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (storedToken) {
        setToken(storedToken)
        console.log('✅ Token loaded from localStorage')
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
          console.log('✅ User loaded from localStorage')
        } catch (error) {
          console.error('❌ Failed to parse stored user:', error)
          localStorage.removeItem('user')
        }
      }

      setLoading(false)
    }

    initAuth()
  }, [])

  /**
   * Login function
   * Stores token and user data, redirects to dashboard
   */
  const login = (token, userData) => {
    console.log('🔐 Logging in user:', userData.email)
    
    // Store token
    setToken(token)
    localStorage.setItem('token', token)
    
    // Store user data
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    
    console.log('✅ Auth state updated')
    
    // Redirect to dashboard
    navigate('/dashboard')
  }

  /**
   * Logout function
   * Clears all auth data and redirects to login
   */
  const logout = () => {
    console.log('🚪 Logging out user')
    
    // Clear state
    setToken(null)
    setUser(null)
    
    // Clear localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    console.log('✅ Auth state cleared')
    
    // Redirect to login
    navigate('/login')
  }

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = () => {
    return !!token
  }

  /**
   * Get current user
   */
  const getUser = () => {
    return user
  }

  /**
   * Update user data
   */
  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    console.log('✅ User data updated')
  }

  // Auth context value
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    getUser,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
