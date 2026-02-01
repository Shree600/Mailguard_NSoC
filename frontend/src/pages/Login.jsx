/**
 * LOGIN PAGE
 * User authentication - email and password
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { login as loginAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call login API
      const response = await loginAPI({ email, password })
      
      // Use AuthContext login to store token and user
      if (response.token) {
        login(response.token, response.user || { email })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-purple-900/20 to-pink-900/20 animate-pulse"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your Mailguard account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg backdrop-blur-sm">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 text-blue-500 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 focus:ring-2" />
              <span className="ml-2 text-gray-400 group-hover:text-gray-300">Remember me</span>
            </label>
            <a href="#" className="text-blue-400 hover:text-blue-300 font-medium transition">
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition">
            Create Account
          </Link>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🛡️ Protected by AI-powered phishing detection
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
