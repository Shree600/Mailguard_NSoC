/**
 * LOGIN PAGE
 * User authentication using Clerk
 */

import { SignIn } from '@clerk/clerk-react'
import Logo from '../components/Logo'

function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Mailguard account</p>
        </div>

        {/* Clerk SignIn Component */}
        <div className="flex justify-center w-full">
          <SignIn 
            routing="path"
            path="/login"
            signUpUrl="/register"
            afterSignInUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  )
}

export default Login
