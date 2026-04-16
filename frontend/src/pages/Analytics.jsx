/**
 * Analytics Page
 * Dedicated analytics dashboard with comprehensive insights
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { useAnalytics } from '../hooks/useAnalytics';
import { BarChart3, TrendingUp, Brain, Shield, RefreshCw, Download } from 'lucide-react';

// Lazy load analytics components for better performance
const TrendAnalysisSection = lazy(() => import('../components/analytics/TrendAnalysisSection'));
const ThreatIntelligenceDashboard = lazy(() => import('../components/analytics/ThreatIntelligenceDashboard'));
const ComparisonCharts = lazy(() => import('../components/analytics/ComparisonCharts'));
const AnalyticsSummary = lazy(() => import('../components/analytics/AnalyticsSummary'));

// Loading fallback
function AnalyticsLoader() {
  return (
    <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-700 rounded w-1/3"></div>
        <div className="h-64 bg-slate-700 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-700 rounded"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

function Analytics() {
  const { data, loading, error, fetchAllAnalytics, clearCache, refresh } = useAnalytics();
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedComparisonType, setSelectedComparisonType] = useState('wow');
  const [refreshing, setRefreshing] = useState(false);

  // Debug rendering
  console.log('Analytics component render - data:', data);
  console.log('Analytics component render - loading:', loading);
  console.log('Analytics component render - error:', error);

  
  // Handle time range change
  const handleTimeRangeChange = (timeRange) => {
    setSelectedTimeRange(timeRange);
    fetchAllAnalytics({ timeRange, comparisonType: selectedComparisonType });
  };

  // Handle comparison type change
  const handleComparisonTypeChange = (type) => {
    setSelectedComparisonType(type);
    fetchAllAnalytics({ timeRange: selectedTimeRange, comparisonType: type });
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      toast.success('Analytics refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle clear cache
  const handleClearCache = async () => {
    try {
      await clearCache();
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  // Handle export
  const handleExport = () => {
    // Create export data
    const exportData = {
      summary: data.summary,
      trends: data.trends,
      threatIntel: data.threatIntel,
      comparisons: data.comparisons,
      exportedAt: new Date().toISOString()
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mailguard-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully');
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="text-center">
              <div className="p-4 bg-red-500/20 rounded-full w-16 h-16 mx-auto mb-4">
                <Brain className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Analytics Error</h3>
              <p className="text-slate-400 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Advanced Analytics</h1>
              <p className="text-slate-400">Comprehensive security insights and threat intelligence</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={handleClearCache}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="w-4 h-4" />
              Clear Cache
            </button>
            
            <button
              onClick={handleExport}
              disabled={loading || !data.summary}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !data.summary && (
          <div className="space-y-6">
            <AnalyticsLoader />
            <AnalyticsLoader />
          </div>
        )}

        {/* Analytics Content */}
        {!loading && data.summary && (
          <Suspense fallback={<AnalyticsLoader />}>
            {/* Summary Section */}
            <AnalyticsSummary
              summary={data.summary}
              onRefresh={handleRefresh}
              loading={refreshing}
            />

            {/* Main Analytics Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Trend Analysis */}
              <div className="xl:col-span-2">
                <TrendAnalysisSection
                  trends={data.trends}
                  onTimeRangeChange={handleTimeRangeChange}
                  selectedTimeRange={selectedTimeRange}
                />
              </div>

              {/* Threat Intelligence */}
              <div className="xl:col-span-2">
                <ThreatIntelligenceDashboard threatIntel={data.threatIntel} />
              </div>

              {/* Comparison Charts */}
              <div className="xl:col-span-2">
                <ComparisonCharts
                  comparisons={data.comparisons}
                  onComparisonTypeChange={handleComparisonTypeChange}
                  selectedType={selectedComparisonType}
                />
              </div>
            </div>
          </Suspense>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 pt-8 border-t border-slate-700">
          <p>Advanced Analytics Dashboard - Mailguard Security Intelligence</p>
          <p className="text-xs mt-1">Data updates automatically every 15 minutes</p>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
