/**
 * DASHBOARD PAGE
 * Main dashboard view after login
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getEmailStats, getEmails, deleteEmail, bulkDeleteEmails, cleanPhishingEmails, submitFeedback } from '../services/api'
import EmailTable from '../components/EmailTable'
import EmailStatsChart from '../components/EmailStatsChart'
import Logo from '../components/Logo'

function Dashboard() {
  const { user, logout } = useAuth()
  const displayName = user?.name || user?.email || 'User'
  
  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    phishing: 0,
    safe: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')

  // Emails state
  const [emails, setEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(true)
  
  // Multi-select state
  const [selectedEmails, setSelectedEmails] = useState([])

  // Fetch stats and emails on component mount
  useEffect(() => {
    fetchStats()
    fetchEmails()
  }, [])

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      setError('')
      const response = await getEmailStats()
      
      // Update stats from API response
      setStats({
        total: response.total || 0,
        phishing: response.phishing || 0,
        safe: response.safe || response.legitimate || 0
      })
      
      console.log('✅ Stats loaded:', response)
    } catch (err) {
      console.error('❌ Failed to load stats:', err)
      setError('Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchEmails = async () => {
    try {
      setEmailsLoading(true)
      const response = await getEmails()
      
      // Handle different response formats
      const emailList = response.emails || response.data || response || []
      setEmails(emailList)
      
      console.log('✅ Emails loaded:', emailList.length, 'emails')
    } catch (err) {
      console.error('❌ Failed to load emails:', err)
      setEmails([])
    } finally {
      setEmailsLoading(false)
    }
  }

  const handleDelete = async (emailId) => {
    if (!window.confirm('Are you sure you want to delete this email?')) {
      return
    }

    try {
      await deleteEmail(emailId)
      console.log('✅ Email deleted:', emailId)
      
      // Refresh emails and stats
      fetchEmails()
      fetchStats()
    } catch (err) {
      console.error('❌ Failed to delete email:', err)
      alert('Failed to delete email. Please try again.')
    }
  }

  const handleFeedback = async (emailId, type) => {
    try {
      // Find the email
      const email = emails.find(e => e._id === emailId)
      if (!email) return

      // Determine correct label based on feedback type
      let correctLabel
      if (type === 'correct') {
        // Current prediction is correct, keep it
        correctLabel = email.prediction
      } else {
        // Wrong prediction, flip it
        correctLabel = email.prediction?.toLowerCase() === 'phishing' ? 'legitimate' : 'phishing'
      }

      await submitFeedback({
        emailId,
        correctLabel: correctLabel.toLowerCase()
      })

      console.log('✅ Feedback submitted:', { emailId, correctLabel })
      alert('Thank you for your feedback! This helps improve our AI.')
      
      // Optionally refresh emails
      fetchEmails()
    } catch (err) {
      console.error('❌ Failed to submit feedback:', err)
      alert('Failed to submit feedback. Please try again.')
    }
  }
  
  // Handle selecting/deselecting a single email
  const handleSelectEmail = (emailId) => {
    setSelectedEmails(prev => {
      if (prev.includes(emailId)) {
        // Deselect
        return prev.filter(id => id !== emailId)
      } else {
        // Select
        return [...prev, emailId]
      }
    })
  }
  
  // Handle select all / deselect all
  const handleSelectAll = (checked) => {
    if (checked) {
      // Select all email IDs
      const allEmailIds = emails.map(email => email._id)
      setSelectedEmails(allEmailIds)
    } else {
      // Deselect all
      setSelectedEmails([])
    }
  }
  
  // Handle bulk delete selected emails
  const handleBulkDelete = async () => {
    if (selectedEmails.length === 0) {
      alert('Please select emails to delete')
      return
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedEmails.length} email(s)?`)) {
      return
    }
    
    try {
      const result = await bulkDeleteEmails(selectedEmails)
      console.log('✅ Bulk delete result:', result)
      
      // Clear selection
      setSelectedEmails([])
      
      // Show success message
      alert(`Successfully deleted ${result.results.successful} out of ${result.results.total} emails`)
      
      // Refresh emails and stats
      fetchEmails()
      fetchStats()
    } catch (err) {
      console.error('❌ Failed to bulk delete emails:', err)
      alert('Failed to delete emails. Please try again.')
    }
  }
  
  // Handle clean all phishing emails
  const handleCleanPhishing = async () => {
    if (!window.confirm('Are you sure you want to delete ALL phishing emails?')) {
      return
    }
    
    try {
      const result = await cleanPhishingEmails()
      console.log('✅ Clean phishing result:', result)
      
      // Clear selection
      setSelectedEmails([])
      
      // Show success message
      if (result.results.deleted > 0) {
        alert(`Successfully cleaned ${result.results.deleted} phishing email(s)!\nStorage saved: ${result.results.storageSaved.mb} MB`)
      } else {
        alert('No phishing emails found to clean.')
      }
      
      // Refresh emails and stats
      fetchEmails()
      fetchStats()
    } catch (err) {
      console.error('❌ Failed to clean phishing emails:', err)
      alert('Failed to clean phishing emails. Please try again.')
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Logo size="md" showText={true} />

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 font-medium">👤 {displayName}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/50 rounded-lg transition font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-gray-400">
            Here's your email security overview
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Emails Card */}
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-500/30">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-800 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-24"></div>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.total}</h3>
                <p className="text-gray-400 text-sm">Total Emails</p>
              </>
            )}
          </div>

          {/* Phishing Detected Card */}
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-600/20 rounded-lg border border-red-500/30">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-800 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-24"></div>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-red-400 mb-1">{stats.phishing}</h3>
                <p className="text-gray-400 text-sm">Phishing Detected</p>
              </>
            )}
          </div>

          {/* Safe Emails Card */}
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-600/20 rounded-lg border border-green-500/30">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-800 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-24"></div>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-green-400 mb-1">{stats.safe}</h3>
                <p className="text-gray-400 text-sm">Safe Emails</p>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg backdrop-blur-sm">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Analytics Chart */}
        <EmailStatsChart stats={stats} loading={statsLoading} />

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Bulk Delete Button */}
          <button
            onClick={handleBulkDelete}
            disabled={selectedEmails.length === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-200 flex items-center space-x-2 ${
              selectedEmails.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete Selected ({selectedEmails.length})</span>
          </button>

          {/* Clean All Phishing Button */}
          <button
            onClick={handleCleanPhishing}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-semibold transition duration-200 flex items-center space-x-2 shadow-lg shadow-orange-900/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>🧹 Clean All Phishing</span>
          </button>
        </div>

        {/* Email List */}
        <EmailTable
          emails={emails}
          loading={emailsLoading}
          onDelete={handleDelete}
          onFeedback={handleFeedback}
          selectedEmails={selectedEmails}
          onSelectEmail={handleSelectEmail}
          onSelectAll={handleSelectAll}
        />

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            🤖 Powered by AI • Phase 5 - Frontend Dashboard
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
