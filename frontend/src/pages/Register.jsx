/**
 * REGISTER PAGE
 * New user registration using Clerk
 */

import { SignUp } from '@clerk/clerk-react'
import Logo from '../components/Logo'

function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join Mailguard for AI protection</p>
        </div>

        {/* Clerk SignUp Component */}
        <div className="flex justify-center w-full">
          <SignUp 
            routing="path"
            path="/register"
            signInUrl="/login"
            afterSignUpUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  )
}

export default Register
