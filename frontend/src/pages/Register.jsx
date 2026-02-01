/**
 * REGISTER PAGE
 * New user registration
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register as registerAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

function Register() {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      return
    }

    setLoading(true)

    try {
      // Call register API
      const response = await registerAPI({
        name: formData.name,
        email: formData.email,
        password: formData.password
      })
      
      // Use AuthContext login to store token and user
      if (response.token) {
        login(response.token, response.user || { email: formData.email, name: formData.name })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-tl from-purple-900/20 via-pink-900/20 to-blue-900/20 animate-pulse"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join Mailguard for AI protection</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg backdrop-blur-sm">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder-gray-500"
              placeholder="John Doe"
            />
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder-gray-500"
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder-gray-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              required
              className="w-4 h-4 mt-1 text-purple-500 bg-gray-800 border-gray-700 rounded focus:ring-purple-500 focus:ring-2"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-400">
              I agree to the{' '}
              <a href="#" className="text-purple-400 hover:text-purple-300 font-medium">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-purple-400 hover:text-purple-300 font-medium">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register
