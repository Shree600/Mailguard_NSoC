/**
 * DASHBOARD PAGE
 * Main dashboard view after login
 */

import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getEmailStats, getEmails, deleteEmail, bulkDeleteEmails, cleanPhishingEmails, submitFeedback, initiateGmailAuth, fetchGmailEmails, classifyEmails, migrateEmails, getMigrationStatus } from '../services/api'
import EmailTable from '../components/EmailTable'
import EmailStatsChart from '../components/EmailStatsChart'
import Logo from '../components/Logo'

function Dashboard() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'
  
  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    phishing: 0,
    safe: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Storage stats state
  const [storageSaved, setStorageSaved] = useState({
    emailsDeleted: 0,
    mbSaved: 0
  })

  // Emails state
  const [emails, setEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(true)
  
  // Multi-select state
  const [selectedEmails, setSelectedEmails] = useState([])
  
  // Gmail connection state
  const [fetchingEmails, setFetchingEmails] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)

  // Migration state
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [migrating, setMigrating] = useState(false)

  // Filter and pagination state
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    prediction: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'receivedAt',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Gmail fetch options state
  const [gmailFetchOptions, setGmailFetchOptions] = useState({
    maxResults: 50,
    dateFrom: '',
    dateTo: '',
    query: ''
  })
  const [showFetchOptions, setShowFetchOptions] = useState(false)

  // Fetch stats and emails on component mount
  useEffect(() => {
    fetchStats()
    fetchEmails()
    checkGmailConnection()
    checkMigrationStatus()
    
    // Check for Gmail connection status in URL
    const urlParams = new URLSearchParams(window.location.search)
    const gmailStatus = urlParams.get('gmail')
    
    if (gmailStatus === 'connected') {
      alert('✅ Gmail connected successfully! You can now fetch emails.')
      setGmailConnected(true)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    } else if (gmailStatus === 'error') {
      const errorMessage = urlParams.get('message') || 'Failed to connect Gmail'
      alert(`❌ ${errorMessage}`)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
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

  const fetchEmails = async (customFilters = {}) => {
    try {
      setEmailsLoading(true)
      const params = { ...filters, ...customFilters }
      const response = await getEmails(params)
      
      // Handle different response formats
      const emailList = response.emails || response.data || response || []
      setEmails(emailList)
      
      // Update pagination info if provided
      if (response.pagination) {
        setPagination(response.pagination)
      }
      
      console.log('✅ Emails loaded:', emailList.length, 'emails')
    } catch (err) {
      console.error('❌ Failed to load emails:', err)
      setEmails([])
    } finally {
      setEmailsLoading(false)
    }
  }
  
  const checkGmailConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/gmail/status', {
        headers: {
          'Authorization': `Bearer ${await window.Clerk.session?.getToken()}`
        }
      })
      const data = await response.json()
      setGmailConnected(data.data?.gmailConnected || false)
    } catch (err) {
      console.error('❌ Failed to check Gmail status:', err)
    }
  }

  const checkMigrationStatus = async () => {
    try {
      const response = await getMigrationStatus()
      setMigrationNeeded(response.needsMigration || false)
      
      if (response.needsMigration) {
        console.log('⚠️ Migration needed:', response.emailCounts.otherUsers, 'emails')
      }
    } catch (err) {
      console.error('❌ Failed to check migration status:', err)
    }
  }

  const handleMigrateEmails = async () => {
    if (!window.confirm('This will update all existing emails to belong to your account. Continue?')) {
      return
    }

    try {
      setMigrating(true)
      const response = await migrateEmails()
      
      console.log('✅ Migration complete:', response)
      alert(`✅ Successfully migrated ${response.updated} emails to your account!`)
      
      // Refresh everything
      setMigrationNeeded(false)
      await fetchStats()
      await fetchEmails()
    } catch (err) {
      console.error('❌ Migration failed:', err)
      alert('Failed to migrate emails. Please try again.')
    } finally {
      setMigrating(false)
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
      console.log('📧 Email for feedback:', email)
      
      if (!email) {
        alert('Email not found')
        return
      }

      // Check if email is classified
      console.log('🔍 Email prediction:', email.prediction, 'Type:', typeof email.prediction)
      
      if (!email.prediction || email.prediction === 'pending') {
        alert('This email hasn\'t been classified yet. Please run "Fetch & Scan" first.')
        return
      }

      // Normalize prediction - ML returns "safe" but backend expects "legitimate"
      const normalizedPrediction = email.prediction.toLowerCase() === 'safe' ? 'legitimate' : email.prediction.toLowerCase()
      
      console.log('🔄 Normalized prediction:', normalizedPrediction, 'from:', email.prediction)

      // Determine correct label based on feedback type
      let correctLabel
      if (type === 'correct') {
        // Current prediction is correct, keep it
        correctLabel = normalizedPrediction
      } else {
        // Wrong prediction, flip it
        correctLabel = normalizedPrediction === 'phishing' ? 'legitimate' : 'phishing'
      }
      
      console.log('✅ Final correctLabel:', correctLabel)

      const feedbackData = {
        emailId,
        correctLabel: correctLabel  // Already normalized and lowercase, don't call toLowerCase again
      }
      
      console.log('📝 Sending feedback:', feedbackData)

      await submitFeedback(feedbackData)

      console.log('✅ Feedback submitted successfully')
      alert('Thank you for your feedback! This helps improve our AI.')
      
      // Optionally refresh emails
      fetchEmails()
    } catch (err) {
      console.error('❌ Failed to submit feedback:', err)
      console.error('❌ Error details:', err.response?.data)
      
      // Handle specific error types
      if (err.response?.status === 403) {
        const shouldMigrate = window.confirm('⚠️ MIGRATION NEEDED!\n\nThis email belongs to your old account. Click OK to automatically migrate ALL emails to your current account.\n\nThis will fix the feedback errors for all emails.')
        if (shouldMigrate) {
          handleMigrateEmails()
        }
      } else if (err.response?.status === 400) {
        alert(`❌ Invalid feedback data: ${err.response?.data?.error || 'Unknown error'}`)
      } else {
        alert(`Failed to submit feedback: ${err.response?.data?.error || err.message}`)
      }
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
      
      // Update storage saved stats
      setStorageSaved(prev => ({
        emailsDeleted: prev.emailsDeleted + result.results.successful,
        mbSaved: prev.mbSaved + (result.results.successful * 0.05) // Estimate 50KB per email
      }))
      
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
      
      // Update storage saved stats
      if (result.results.deleted > 0) {
        setStorageSaved(prev => ({
          emailsDeleted: prev.emailsDeleted + result.results.deleted,
          mbSaved: prev.mbSaved + parseFloat(result.results.storageSaved.mb)
        }))
      }
      
      // Clear selection
      setSelectedEmails([])
      
      // Show success message
      if (result.results.deleted > 0) {
        const shouldFetchMore = window.confirm(
          `Successfully cleaned ${result.results.deleted} phishing email(s)!\nStorage saved: ${result.results.storageSaved.mb} MB\n\n` +
          `Would you like to fetch more emails from Gmail to replace the deleted ones?`
        )
        
        if (shouldFetchMore) {
          // Auto-fetch more emails (skip confirmation since user already confirmed)
          await handleFetchEmails(true)
          return // handleFetchEmails already refreshes
        }
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

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await signOut()
    }
  }
  
  // Handle Gmail connection
  const handleConnectGmail = async () => {
    try {
      const response = await initiateGmailAuth()
      
      if (response.data && response.data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = response.data.authUrl
      }
    } catch (err) {
      console.error('❌ Failed to initiate Gmail auth:', err)
      alert('Failed to connect Gmail. Please try again.')
    }
  }
  
  // Handle fetching emails from Gmail
  const handleFetchEmails = async (skipConfirm = false) => {
    if (!skipConfirm && !showFetchOptions && !window.confirm('Fetch latest emails from Gmail and scan for phishing?')) {
      return
    }
    
    try {
      setFetchingEmails(true)
      
      // Step 1: Fetch emails from Gmail with user options
      const fetchResponse = await fetchGmailEmails(gmailFetchOptions)
      console.log('✅ Emails fetched:', fetchResponse)
      
      // Step 2: Classify the emails
      console.log('🤖 Classifying emails...')
      const classifyResponse = await classifyEmails()
      console.log('✅ Emails classified:', classifyResponse)
      
      const message = `✅ Fetched ${fetchResponse.data.fetched} emails (${fetchResponse.data.saved} new)!\n` +
        `📊 Classified: ${classifyResponse.stats.processed} emails\n` +
        `🚨 Phishing: ${classifyResponse.stats.phishing} | ✅ Safe: ${classifyResponse.stats.safe}`
      
      if (!skipConfirm) {
        alert(message)
      }
      
      // Refresh emails and stats
      fetchEmails()
      fetchStats()
      setShowFetchOptions(false) // Close options dialog
      
      // Auto-refetch if we got all new emails (means there might be more)
      if (fetchResponse.data.shouldRefetch && fetchResponse.data.saved === fetchResponse.data.fetched) {
        const fetchMore = window.confirm('All fetched emails were new! Would you like to fetch more?')
        if (fetchMore) {
          await handleFetchEmails(true) // Skip confirmation for auto-refetch
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch emails:', err)
      
      // Check if Gmail not connected
      if (err.response?.status === 400) {
        alert('Gmail not connected. Please connect your Gmail account first.')
      } else {
        alert('Failed to fetch emails. Please try again.')
      }
    } finally {
      setFetchingEmails(false)
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
        {/* Migration Warning Banner */}
        {migrationNeeded && (
          <div className="mb-6 bg-yellow-900/40 backdrop-blur-sm rounded-xl border border-yellow-500/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-600/30 rounded-lg border border-yellow-400/40">
                  <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-200 mb-1">⚠️ Email Migration Required</h3>
                  <p className="text-sm text-yellow-100/80">
                    Your existing emails need to be migrated to your new Clerk account. Click "Fix Now" to update ownership.
                  </p>
                </div>
              </div>
              <button
                onClick={handleMigrateEmails}
                disabled={migrating}
                className={`px-6 py-3 rounded-lg font-semibold transition duration-200 flex items-center space-x-2 ${
                  migrating
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg'
                }`}
              >
                {migrating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Migrating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Fix Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-gray-400">
            Here's your email security overview
          </p>
        </div>
        
        {/* Gmail Connection Section */}
        <div className="mb-8 bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/30 rounded-lg border border-blue-400/40">
                <svg className="w-8 h-8 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold text-white">Gmail Integration</h3>
                  {gmailConnected && (
                    <span className="px-3 py-1 bg-green-600/20 border border-green-500/50 rounded-full text-xs text-green-300 font-semibold">
                      ✓ Connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300">
                  {gmailConnected ? 'Fetch and scan your emails for phishing threats' : 'Connect your Gmail to scan and protect your inbox'}
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              {!gmailConnected ? (
                <button
                  onClick={handleConnectGmail}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition duration-200 shadow-lg shadow-blue-900/50 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Connect Gmail</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowFetchOptions(!showFetchOptions)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200 flex items-center space-x-2 shadow-lg shadow-blue-900/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Fetch Options</span>
                  </button>
                  <button
                    onClick={handleFetchEmails}
                    disabled={fetchingEmails}
                    className={`px-6 py-3 rounded-lg font-semibold transition duration-200 flex items-center space-x-2 ${
                      fetchingEmails
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/50'
                    }`}
                  >
                    {fetchingEmails ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Fetch & Scan</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Gmail Fetch Options Dialog */}
          {showFetchOptions && gmailConnected && (
            <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">Gmail Fetch Options</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Number of Emails (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={gmailFetchOptions.maxResults}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, maxResults: parseInt(e.target.value) || 50 })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Gmail Search Query (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., is:unread, has:attachment"
                    value={gmailFetchOptions.query}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, query: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={gmailFetchOptions.dateFrom}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, dateFrom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={gmailFetchOptions.dateTo}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, dateTo: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleFetchEmails}
                  disabled={fetchingEmails}
                  className={`px-6 py-2 rounded-lg font-semibold transition duration-200 ${
                    fetchingEmails
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Fetch with Options
                </button>
                <button
                  onClick={() => setShowFetchOptions(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                <p>💡 <strong>Tips:</strong></p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>Search query examples: "from:example@gmail.com", "subject:invoice", "is:unread"</li>
                  <li>Leave dates empty to fetch recent emails</li>
                  <li>Maximum 100 emails per fetch</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
          
          {/* Storage Saved Card */}
          <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6 hover:border-purple-500/50 transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-600/30 rounded-lg border border-purple-400/40">
                <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-purple-300 mb-1">{storageSaved.mbSaved.toFixed(2)} MB</h3>
            <p className="text-gray-300 text-sm">Storage Saved</p>
            <p className="text-xs text-purple-400 mt-2">
              🗑️ {storageSaved.emailsDeleted} emails cleaned
            </p>
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

        {/* Filters and Search Section */}
        <div className="mb-6 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters & Search
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search subject, sender, or body..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }}
                onKeyPress={(e) => e.key === 'Enter' && fetchEmails()}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Classification Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
              <select
                value={filters.prediction}
                onChange={(e) => {
                  setFilters({ ...filters, prediction: e.target.value, page: 1 })
                  fetchEmails({ prediction: e.target.value, page: 1 })
                }}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Emails</option>
                <option value="phishing">🚨 Phishing</option>
                <option value="safe">✅ Safe</option>
                <option value="pending">⏳ Pending</option>
              </select>
            </div>

            {/* Items Per Page */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Per Page</label>
              <select
                value={filters.limit}
                onChange={(e) => {
                  setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })
                  fetchEmails({ limit: parseInt(e.target.value), page: 1 })
                }}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => fetchEmails()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 50,
                  prediction: '',
                  search: '',
                  dateFrom: '',
                  dateTo: '',
                  sortBy: 'receivedAt',
                  sortOrder: 'desc'
                })
                fetchEmails({
                  page: 1,
                  limit: 50,
                  prediction: '',
                  search: '',
                  dateFrom: '',
                  dateTo: ''
                })
              }}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
            >
              Reset
            </button>
          </div>

          {/* Pagination Info */}
          {pagination.total > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} emails
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newPage = pagination.page - 1
                    setFilters({ ...filters, page: newPage })
                    fetchEmails({ page: newPage })
                  }}
                  disabled={!pagination.hasPrev}
                  className={`px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    pagination.hasPrev
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  ← Previous
                </button>
                <div className="px-4 py-2 bg-gray-800 rounded-lg text-white">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <button
                  onClick={() => {
                    const newPage = pagination.page + 1
                    setFilters({ ...filters, page: newPage })
                    fetchEmails({ page: newPage })
                  }}
                  disabled={!pagination.hasNext}
                  className={`px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    pagination.hasNext
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

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
            🤖 Powered by AI • Phase 6 - Gmail Actions & Automation Complete
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
