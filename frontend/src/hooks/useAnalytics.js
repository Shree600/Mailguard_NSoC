/**
 * Analytics Hook
 * Custom hook for fetching and managing analytics data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../services/api';

// Debounce function to prevent multiple rapid calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Hook for fetching analytics data
 * @returns {Object} Analytics data and functions
 */
export const useAnalytics = () => {
  const { userId, getToken } = useAuth();
  const [data, setData] = useState({
    trends: null,
    threatIntel: null,
    comparisons: null,
    summary: null,
    loading: true,
    error: null
  });

  /**
   * Fetch trend analysis
   * @param {string} timeRange - Time range (7d, 30d, 90d, 1y)
   */
  const fetchTrends = useCallback(async (timeRange = '30d') => {
    try {
      const token = await getToken();
      const response = await api.get(`/analytics/trends/${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(prev => ({
        ...prev,
        trends: response.data.data,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching trends:', error);
      setData(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to fetch trends'
      }));
    }
  }, [getToken]);

  /**
   * Fetch threat intelligence
   */
  const fetchThreatIntelligence = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await api.get('/analytics/threat-intel', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(prev => ({
        ...prev,
        threatIntel: response.data.data,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching threat intelligence:', error);
      setData(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to fetch threat intelligence'
      }));
    }
  }, [getToken]);

  /**
   * Fetch comparison analytics
   * @param {string} type - Comparison type (wow, mom)
   */
  const fetchComparisons = useCallback(async (type = 'wow') => {
    try {
      const token = await getToken();
      const response = await api.get(`/analytics/comparisons?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(prev => ({
        ...prev,
        comparisons: response.data.data,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching comparisons:', error);
      setData(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to fetch comparisons'
      }));
    }
  }, [getToken]);

  const fetchSummary = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await api.get('/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(prev => ({
        ...prev,
        summary: response.data.data,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching summary:', error);
      setData(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to fetch summary'
      }));
    }
  }, [getToken]);

  // Simple debounced fetch without closure issues
  const fetchAllAnalyticsDebounced = useCallback(async (options = {}) => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { timeRange = '30d', comparisonType = 'wow' } = options;

      await Promise.all([
        fetchTrends(timeRange),
        fetchThreatIntelligence(),
        fetchComparisons(comparisonType),
        fetchSummary()
      ]);

      setData(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch analytics data'
      }));
    }
  }, [fetchTrends, fetchThreatIntelligence, fetchComparisons, fetchSummary]);

  // Clear analytics cache
  const clearCache = useCallback(async () => {
    try {
      const token = await getToken();
      await api.delete('/analytics/cache', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refetch data after clearing cache
      await fetchAllAnalyticsDebounced();
    } catch (error) {
      console.error('Error clearing cache:', error);
      setData(prev => ({
        ...prev,
        error: 'Failed to clear cache'
      }));
    }
  }, [getToken, fetchAllAnalyticsDebounced]);

  /**
   * Refresh specific analytics data
   * @param {string} type - Type of data to refresh
   */
  const refresh = useCallback(async (type) => {
    switch (type) {
      case 'trends':
        await fetchTrends();
        break;
      case 'threatIntel':
        await fetchThreatIntelligence();
        break;
      case 'comparisons':
        await fetchComparisons();
        break;
      case 'summary':
        await fetchSummary();
        break;
      default:
        await fetchAllAnalyticsDebounced();
    }
  }, [fetchTrends, fetchThreatIntelligence, fetchComparisons, fetchSummary, fetchAllAnalyticsDebounced]);

  // Auto-fetch data when component mounts
  useEffect(() => {
    if (userId) {
      fetchAllAnalyticsDebounced();
    }
  }, [userId]);

  return {
    data,
    fetchTrends,
    fetchThreatIntelligence,
    fetchComparisons,
    fetchSummary,
    fetchAllAnalytics: fetchAllAnalyticsDebounced,
    clearCache,
    refresh,
    loading: data.loading,
    error: data.error
  };
};
