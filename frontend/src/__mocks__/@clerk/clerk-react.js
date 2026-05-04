import { vi } from 'vitest'

export const useUser = vi.fn(() => ({ user: null }))
export const useClerk = vi.fn(() => ({ signOut: vi.fn() }))
