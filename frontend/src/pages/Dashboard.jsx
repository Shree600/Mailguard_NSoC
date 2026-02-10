/**
 * DASHBOARD PAGE
 * Main dashboard view after login
 * 
 * Performance Optimizations:
 * - Lazy loading of heavy components (EmailTable, EmailStatsChart)
 * - Suspense boundaries for progressive rendering
 * - Optimized re-renders with useMemo and useCallback
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getEmailStats, getEmails, deleteEmail, bulkDeleteEmails, cleanPhishingEmails, submitFeedback, initiateGmailAuth, fetchGmailEmails, classifyEmails, migrateEmails, getMigrationStatus } from '../services/api'

// Lazy load heavy components for better initial load performance
const EmailTable = lazy(() => import('../components/EmailTable'))
const EmailStatsChart = lazy(() => import('../components/EmailStatsChart'))

// Eager load lightweight components
import StatsCard from '../components/StatsCard'
import { Mail, ShieldAlert, CheckCircle2, HardDrive } from 'lucide-react'

// Component loading fallback
function ComponentLoader() {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-700 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          <div className="h-4 bg-slate-700 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  )
}

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
    query: '',
    fetchAll: false
  })
  const [showFetchOptions, setShowFetchOptions] = useState(false)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'destructive' // or 'default'
  })

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
      toast.success('Gmail connected successfully! You can now fetch emails.')
      setGmailConnected(true)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    } else if (gmailStatus === 'error') {
      const errorMessage = urlParams.get('message') || 'Failed to connect Gmail'
      toast.error(errorMessage)
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
      toast.error('Failed to load emails. Please try refreshing the page.')
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
      setGmailConnected(false)
      // Don't show toast for this - it's checked on load and shouldn't be intrusive
    }
  }

  const checkMigrationStatus = async () => {
    try {
      const response = await getMigrationStatus()
      setMigrationNeeded(response.needsMigration || false)
      
      if (response.needsMigration) {
        console.log('⚠️ Migration needed:', response.emailCounts.otherUsers, 'emails')
      }
      setMigrationNeeded(false)
      // Don't show toast for this - it's checked on load and shouldn't be intrusive
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
      toast.success(`Successfully migrated ${response.updated} emails to your account!`)
      
      // Refresh everything
      setMigrationNeeded(false)
      await fetchStats()
      await fetchEmails()
    } catch (err) {
      console.error('❌ Migration failed:', err)
      toast.error('Failed to migrate emails. Please try again.')
    } finally {
      setMigrating(false)
    }
  }

  const handleDelete = async (emailId) => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Delete Email',
      description: 'Are you sure you want to delete this email? This action cannot be undone.',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteEmail(emailId)
          console.log('✅ Email deleted:', emailId)
          toast.success('Email deleted successfully')
          
          // Refresh emails and stats
          fetchEmails()
          fetchStats()
        } catch (err) {
          console.error('❌ Failed to delete email:', err)
          toast.error('Failed to delete email. Please try again.')
        }
      }
    })
  }

  const handleFeedback = async (emailId, type) => {
    try {
      // Find the email
      const email = emails.find(e => e._id === emailId)
      console.log('📧 Email for feedback:', email)
      
      if (!email) {
        toast.error('Email not found')
        return
      }

      // Check if email is classified
      console.log('🔍 Email prediction:', email.prediction, 'Type:', typeof email.prediction)
      
      if (!email.prediction || email.prediction === 'pending') {
        toast.warning('This email hasn\'t been classified yet. Please run "Fetch & Scan" first.')
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
      toast.success('Thank you for your feedback! This helps improve our AI.')
      
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
        toast.error(err.response?.data?.error || 'Invalid feedback data')
      } else {
        toast.error(err.response?.data?.error || err.message || 'Failed to submit feedback')
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
      toast.error('Please select emails to delete')
      return
    }
    
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Delete Multiple Emails',
      description: `Are you sure you want to delete ${selectedEmails.length} email(s)? This action cannot be undone.`,
      variant: 'destructive',
      onConfirm: async () => {
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
          toast.success(`Successfully deleted ${result.results.successful} out of ${result.results.total} emails`)
          
          // Refresh emails and stats
          fetchEmails()
          fetchStats()
        } catch (err) {
          console.error('❌ Failed to bulk delete emails:', err)
          toast.error('Failed to delete emails. Please try again.')
        }
      }
    })
  }
  
  // Handle clean all phishing emails
  const handleCleanPhishing = async () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Delete All Phishing Emails',
      description: 'Are you sure you want to delete ALL phishing emails? This will permanently remove all detected phishing emails from your inbox.',
      variant: 'destructive',
      onConfirm: async () => {
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
            toast.success(`Successfully cleaned ${result.results.deleted} phishing email(s)! Storage saved: ${result.results.storageSaved.mb} MB`)
            
            const shouldFetchMore = window.confirm(
              `Would you like to fetch more emails from Gmail to replace the deleted ones?`
            )
            
            if (shouldFetchMore) {
              // Auto-fetch more emails (skip confirmation since user already confirmed)
              await handleFetchEmails(true)
              return // handleFetchEmails already refreshes
            }
          } else {
            toast.info('No phishing emails found to clean.')
          }
          
          // Refresh emails and stats
          fetchEmails()
          fetchStats()
        } catch (err) {
          console.error('❌ Failed to clean phishing emails:', err)
          toast.error('Failed to clean phishing emails. Please try again.')
        }
      }
    })
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
      toast.error('Failed to connect Gmail. Please try again.')
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
      
      const message = `Fetched ${fetchResponse.data.fetched} emails (${fetchResponse.data.saved} new)! Classified: ${classifyResponse.stats.processed} emails - Phishing: ${classifyResponse.stats.phishing} | Safe: ${classifyResponse.stats.safe}`
      
      if (!skipConfirm) {
        toast.success(message, { duration: 5000 })
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
        toast.error('Gmail not connected. Please connect your Gmail account first.')
      } else {
        toast.error('Failed to fetch emails. Please try again.')
      }
    } finally {
      setFetchingEmails(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Migration Warning Banner */}
      {migrationNeeded && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">\n          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">⚠️ Email Migration Required</h3>
                <p className="text-sm text-yellow-700">
                  Your existing emails need to be migrated to your new Clerk account. Click "Fix Now" to update ownership.
                </p>
              </div>
            </div>
            <button
              onClick={handleMigrateEmails}
              disabled={migrating}
              className={`px-6 py-3 rounded-lg font-semibold transition duration-200 flex items-center space-x-2 ${
                migrating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
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
        
        {/* Gmail Connection Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 sm:p-6 transition-all duration-300 hover:border-slate-600 hover:shadow-lg hover:shadow-blue-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-100">Gmail Integration</h3>
                  {gmailConnected && (
                    <span className="px-2 sm:px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-semibold">
                      ✓ Connected
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  {gmailConnected ? 'Fetch and scan your emails for phishing threats' : 'Connect your Gmail to scan and protect your inbox'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
              {!gmailConnected ? (
                <button
                  onClick={handleConnectGmail}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 min-h-[44px] text-sm sm:text-base shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
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
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 min-h-[44px] text-sm sm:text-base border border-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Fetch Options</span>
                  </button>
                  <button
                    onClick={handleFetchEmails}
                    disabled={fetchingEmails}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 min-h-[44px] text-sm sm:text-base ${
                      fetchingEmails
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30'
                    }`}
                  >
                    {fetchingEmails ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Fetching...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">Fetch & Scan</span>
                        <span className="sm:hidden">Fetch</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Gmail Fetch Options Dialog */}
          {showFetchOptions && gmailConnected && (
            <div className="mt-4 p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
              <h4 className="text-lg font-semibold text-slate-100 mb-4">Gmail Fetch Options</h4>
              
              <div className="mb-4 flex items-center space-x-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="fetchAll"
                  checked={gmailFetchOptions.fetchAll || false}
                  onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, fetchAll: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="fetchAll" className="text-sm font-medium text-slate-100 cursor-pointer">
                  Fetch All Emails (No Limit) - ⚠️ This may take a while
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Number of Emails {gmailFetchOptions.fetchAll ? '(Ignored when Fetch All is checked)' : '(1-100)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={gmailFetchOptions.maxResults}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, maxResults: parseInt(e.target.value) || 50 })}
                    disabled={gmailFetchOptions.fetchAll}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Gmail Search Query (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., is:unread, has:attachment"
                    value={gmailFetchOptions.query}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, query: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={gmailFetchOptions.dateFrom}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, dateFrom: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={gmailFetchOptions.dateTo}
                    onChange={(e) => setGmailFetchOptions({ ...gmailFetchOptions, dateTo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleFetchEmails}
                  disabled={fetchingEmails}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    fetchingEmails
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  Fetch with Options
                </button>
                <button
                  onClick={() => setShowFetchOptions(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-all duration-200 border border-slate-600"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-3 text-xs text-slate-500">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Emails"
            value={stats.total}
            icon={Mail}
            loading={statsLoading}
            iconColor="text-blue-400"
            iconBgColor="bg-blue-500/10"
          />

          <StatsCard
            title="Phishing Detected"
            value={stats.phishing}
            icon={ShieldAlert}
            loading={statsLoading}
            iconColor="text-rose-400"
            iconBgColor="bg-rose-500/10"
          />

          <StatsCard
            title="Safe Emails"
            value={stats.safe}
            icon={CheckCircle2}
            loading={statsLoading}
            iconColor="text-emerald-400"
            iconBgColor="bg-emerald-500/10"
          />

          <StatsCard
            title="Storage Saved"
            value={`${storageSaved.mbSaved.toFixed(2)} MB`}
            icon={HardDrive}
            loading={statsLoading}
            iconColor="text-purple-400"
            iconBgColor="bg-purple-500/10"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl backdrop-blur-sm">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {/* Analytics Chart - Lazy loaded */}
        <Suspense fallback={<ComponentLoader />}>
          <EmailStatsChart stats={stats} loading={statsLoading} />
        </Suspense>

        {/* Filters and Search Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 transition-all duration-300 hover:border-slate-600">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters & Search
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search subject, sender, or body..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }}
                onKeyPress={(e) => e.key === 'Enter' && fetchEmails()}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Classification Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
              <select
                value={filters.prediction}
                onChange={(e) => {
                  setFilters({ ...filters, prediction: e.target.value, page: 1 })
                  fetchEmails({ prediction: e.target.value, page: 1 })
                }}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">All Emails</option>
                <option value="phishing">🚨 Phishing</option>
                <option value="safe">✅ Safe</option>
                <option value="pending">⏳ Pending</option>
              </select>
            </div>

            {/* Items Per Page */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Per Page</label>
              <select
                value={filters.limit}
                onChange={(e) => {
                  setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })
                  fetchEmails({ limit: parseInt(e.target.value), page: 1 })
                }}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              <label className="block text-sm font-medium text-slate-400 mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => fetchEmails()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
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
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-all duration-200 border border-slate-600"
            >
              Reset
            </button>
          </div>

          {/* Pagination Info */}
          {pagination.total > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-400">
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
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    pagination.hasPrev
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  ← Previous
                </button>
                <div className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <button
                  onClick={() => {
                    const newPage = pagination.page + 1
                    setFilters({ ...filters, page: newPage })
                    fetchEmails({ page: newPage })
                  }}
                  disabled={!pagination.hasNext}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    pagination.hasNext
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {/* Bulk Delete Button */}
          <button
            onClick={handleBulkDelete}
            disabled={selectedEmails.length === 0}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 min-h-[44px] text-sm sm:text-base ${
              selectedEmails.length > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Delete Selected ({selectedEmails.length})</span>
            <span className="sm:hidden">Delete ({selectedEmails.length})</span>
          </button>

          {/* Clean All Phishing Button */}
          <button
            onClick={handleCleanPhishing}
            className="px-4 sm:px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 min-h-[44px] text-sm sm:text-base shadow-lg shadow-rose-600/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="hidden sm:inline">🧹 Clean All Phishing</span>
            <span className="sm:hidden">🧹 Clean</span>
          </button>
        </div>

        {/* Email List - Lazy loaded */}
        <Suspense fallback={<ComponentLoader />}>
          <EmailTable
            emails={emails}
            loading={emailsLoading}
            onDelete={handleDelete}
            onFeedback={handleFeedback}
            selectedEmails={selectedEmails}
            onSelectEmail={handleSelectEmail}
            onSelectAll={handleSelectAll}
          />
        </Suspense>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            🤖 Powered by AI • Phase 6 - Gmail Actions & Automation Complete
          </p>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setConfirmDialog(prev => ({ ...prev, open: false }))
                  if (confirmDialog.onConfirm) {
                    await confirmDialog.onConfirm()
                  }
                }}
                className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
}

export default Dashboard
