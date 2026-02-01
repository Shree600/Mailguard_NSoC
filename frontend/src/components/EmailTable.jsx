/**
 * EMAIL TABLE COMPONENT
 * Displays list of emails with predictions
 */

import { useState } from 'react'

function EmailTable({ emails, onDelete, onFeedback, loading }) {
  // Show loading state
  if (loading) {
    return (
      <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 bg-gray-800 rounded w-1/4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/3"></div>
              <div className="h-4 bg-gray-800 rounded w-1/6"></div>
              <div className="h-4 bg-gray-800 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show empty state
  if (!emails || emails.length === 0) {
    return (
      <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-12">
        <div className="text-center">
          <div className="inline-block p-4 bg-gray-800 rounded-full mb-4">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No emails yet</h3>
          <p className="text-gray-400 mb-6">
            Connect your email account to start detecting phishing emails
          </p>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-lg transition duration-200 shadow-lg shadow-blue-900/50">
            Connect Email Account
          </button>
        </div>
      </div>
    )
  }

  // Render email table
  return (
    <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Email List</h2>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/30 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Prediction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {emails.map((email) => (
              <EmailRow
                key={email._id}
                email={email}
                onDelete={onDelete}
                onFeedback={onFeedback}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Individual Email Row Component
function EmailRow({ email, onDelete, onFeedback }) {
  const [showActions, setShowActions] = useState(false)

  // Get prediction label and color
  const getPredictionBadge = () => {
    const prediction = email.prediction?.toLowerCase() || 'unknown'
    
    if (prediction === 'phishing') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Phishing
        </span>
      )
    } else if (prediction === 'safe' || prediction === 'legitimate') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Safe
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      )
    }
  }

  // Format confidence percentage
  const getConfidence = () => {
    const confidence = email.confidence || 0
    return `${(confidence * 100).toFixed(1)}%`
  }

  // Truncate long text
  const truncate = (text, length = 50) => {
    if (!text) return 'N/A'
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  return (
    <tr className="hover:bg-gray-800/30 transition duration-150">
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-white">
          {truncate(email.subject)}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-400">
          {truncate(email.sender || email.from, 30)}
        </div>
      </td>
      <td className="px-6 py-4">
        {getPredictionBadge()}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-300">
          {getConfidence()}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          {/* Feedback Buttons */}
          <button
            onClick={() => onFeedback(email._id, 'correct')}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition duration-200"
            title="Mark as Correct"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => onFeedback(email._id, 'wrong')}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition duration-200"
            title="Mark as Wrong"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>
          
          {/* Delete Button */}
          {email.prediction?.toLowerCase() === 'phishing' && (
            <button
              onClick={() => onDelete(email._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
              title="Delete Email"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default EmailTable
