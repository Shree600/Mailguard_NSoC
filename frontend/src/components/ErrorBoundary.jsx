import React from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * ErrorBoundary Component
 * Catches unhandled React errors and displays a fallback UI
 * Prevents entire app from crashing on component errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console for debugging
    console.error('❌ ErrorBoundary caught an error:', error)
    console.error('❌ Component stack:', errorInfo.componentStack)
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    // Reload the page to reset the app
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-500/50 rounded-xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Something went wrong</h1>
            </div>
            
            <p className="text-slate-300 mb-6 text-sm sm:text-base">
              An unexpected error occurred. This has been logged for investigation.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 overflow-auto max-h-64">
              <p className="text-rose-400 font-mono text-xs sm:text-sm mb-2 break-all">
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <pre className="text-slate-400 font-mono text-xs whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-600/20"
              >
                Reload Page
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-all border border-gray-300"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
