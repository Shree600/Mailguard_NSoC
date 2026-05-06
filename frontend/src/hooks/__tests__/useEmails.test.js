import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmails } from '../useEmails';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('useEmails Hook', () => {
  it('should fetch emails on mount', async () => {
    const mockEmails = [{ id: '1', subject: 'Test' }];
    api.getEmails.mockResolvedValue({ emails: mockEmails });
    
    const { result } = renderHook(() => useEmails());
    
    await waitFor(() => {
      expect(result.current.emails).toEqual(mockEmails);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle error state', async () => {
    api.getEmails.mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useEmails());
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.emails).toEqual([]);
    });
  });
});
