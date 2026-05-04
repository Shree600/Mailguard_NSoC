import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mock references ──────────────────────────────────────────────────
const {
  mockGetEmailStats,
  mockGetEmails,
  mockGetMigrationStatus,
  mockMigrateEmails,
  mockGetFeedback,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockGetEmailStats: vi.fn(),
  mockGetEmails: vi.fn(),
  mockGetMigrationStatus: vi.fn(),
  mockMigrateEmails: vi.fn(),
  mockGetFeedback: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

// ─── Mocks ────────────────────────────────────────────────────────────────────

// @clerk/clerk-react is aliased to src/__mocks__/@clerk/clerk-react.js in vitest.config.js
// Import the aliased mock to control return values
import { useUser, useClerk } from '@clerk/clerk-react'

vi.mock('../services/api', () => ({
  getEmailStats: mockGetEmailStats,
  getEmails: mockGetEmails,
  getMigrationStatus: mockGetMigrationStatus,
  migrateEmails: mockMigrateEmails,
  getFeedback: mockGetFeedback,
  initiateGmailAuth: vi.fn(),
  fetchGmailEmails: vi.fn(),
  classifyEmails: vi.fn(),
  deleteEmail: vi.fn(),
  bulkDeleteEmails: vi.fn(),
  cleanPhishingEmails: vi.fn(),
  clearAllEmails: vi.fn(),
  submitFeedback: vi.fn(),
  triggerRetrain: vi.fn(),
  getRetrainStatus: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

import Dashboard from './Dashboard'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupDefaultMocks() {
  useUser.mockReturnValue({ user: { fullName: 'Test User' } })
  useClerk.mockReturnValue({ signOut: vi.fn() })
  mockGetEmailStats.mockResolvedValue({ total: 0, phishing: 0, safe: 0 })
  mockGetEmails.mockResolvedValue({ emails: [], pagination: {} })
  mockGetFeedback.mockResolvedValue({ count: 0 })
  mockGetMigrationStatus.mockResolvedValue({ needsMigration: false, emailCounts: { otherUsers: 0 } })

  global.fetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ data: { gmailConnected: false } }) })
  )
  window.Clerk = { session: { getToken: vi.fn().mockResolvedValue('token') } }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard — migration-needed banner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  // ── Regression: banner must appear and stay visible ──────────────────────
  it('shows migration banner when API returns needsMigration: true and does not reset it', async () => {
    mockGetMigrationStatus.mockResolvedValue({
      needsMigration: true,
      emailCounts: { otherUsers: 5 },
    })

    render(<Dashboard />)

    // Wait for migrationLoading to become false (API call completes)
    await waitFor(() => expect(mockGetMigrationStatus).toHaveBeenCalled())

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Email Migration Required/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/You have 5 existing email\(s\) that need/i)).toBeInTheDocument()

    // Regression guard: wait an extra tick and confirm banner is still present
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getByText(/⚠️ Email Migration Required/i)).toBeInTheDocument()
  })

  // ── Banner absent when no migration needed ────────────────────────────────
  it('does not show migration banner when needsMigration is false', async () => {
    mockGetMigrationStatus.mockResolvedValue({
      needsMigration: false,
      emailCounts: { otherUsers: 0 },
    })

    render(<Dashboard />)

    await waitFor(() => expect(mockGetMigrationStatus).toHaveBeenCalled())

    expect(screen.queryByText(/⚠️ Email Migration Required/i)).not.toBeInTheDocument()
  })

  // ── Strict boolean: undefined needsMigration must NOT show banner ─────────
  it('does not show banner when API returns needsMigration: undefined', async () => {
    mockGetMigrationStatus.mockResolvedValue({ emailCounts: {} })

    render(<Dashboard />)

    await waitFor(() => expect(mockGetMigrationStatus).toHaveBeenCalled())

    expect(screen.queryByText(/⚠️ Email Migration Required/i)).not.toBeInTheDocument()
  })

  // ── Banner disappears after successful migration ───────────────────────────
  it('hides banner after migration completes successfully', async () => {
    mockGetMigrationStatus.mockResolvedValue({
      needsMigration: true,
      emailCounts: { otherUsers: 3 },
    })
    mockMigrateEmails.mockResolvedValue({ updated: 3 })

    render(<Dashboard />)

    await waitFor(() => expect(mockGetMigrationStatus).toHaveBeenCalled())

    await waitFor(() =>
      expect(screen.getByText(/⚠️ Email Migration Required/i)).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Fix Now/i }))

    await waitFor(() =>
      expect(screen.getByText('Migrate Emails')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => expect(mockMigrateEmails).toHaveBeenCalled())

    await waitFor(() =>
      expect(screen.queryByText(/⚠️ Email Migration Required/i)).not.toBeInTheDocument()
    )

    expect(mockToastSuccess).toHaveBeenCalledWith('Successfully migrated 3 emails to your account!')
  })

  // ── API failure: banner absent, error toast shown ─────────────────────────
  it('shows error toast and hides banner when getMigrationStatus rejects', async () => {
    mockGetMigrationStatus.mockRejectedValue(new Error('Network error'))

    render(<Dashboard />)

    await waitFor(() => expect(mockGetMigrationStatus).toHaveBeenCalled())

    expect(screen.queryByText(/⚠️ Email Migration Required/i)).not.toBeInTheDocument()
    expect(mockToastError).toHaveBeenCalledWith('Failed to check account migration status.')
  })
})
