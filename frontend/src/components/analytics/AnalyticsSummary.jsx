/**
 * Analytics Summary Component
 * Displays a high-level overview of key analytics metrics
 */

import React from 'react';
import { Shield, TrendingUp, AlertTriangle, Activity, RefreshCw } from 'lucide-react';

const AnalyticsSummary = ({ summary, onRefresh, loading = false }) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { summary: metrics } = summary;

  const summaryCards = [
    {
      title: 'Total Threats',
      value: metrics.totalThreats || 0,
      subtitle: 'Identified phishing attempts',
      icon: AlertTriangle,
      color: 'red',
      trend: metrics.weeklyTrend,
      trendLabel: 'Weekly Change'
    },
    {
      title: 'Risk Level',
      value: metrics.riskLevel || 'Unknown',
      subtitle: 'Current security posture',
      icon: Shield,
      color: metrics.riskLevel === 'High' ? 'red' : metrics.riskLevel === 'Medium' ? 'orange' : 'green',
      trend: null,
      trendLabel: null
    },
    {
      title: 'Weekly Trend',
      value: metrics.weeklyTrend || '0%',
      subtitle: 'Change from last week',
      icon: TrendingUp,
      color: metrics.weeklyTrend && !metrics.weeklyTrend.includes('-') ? 'red' : 'green',
      trend: null,
      trendLabel: null
    },
    {
      title: 'Detection Accuracy',
      value: `${metrics.detectionAccuracy || 0}%`,
      subtitle: 'Model performance',
      icon: Activity,
      color: 'blue',
      trend: null,
      trendLabel: null
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      red: 'text-red-400 bg-red-500/20 border-red-500/30',
      orange: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
      green: 'text-green-400 bg-green-500/20 border-green-500/30',
      blue: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClasses = (color) => {
    const colors = {
      red: 'text-red-400',
      orange: 'text-orange-400',
      green: 'text-green-400',
      blue: 'text-blue-400'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Analytics Overview</h2>
          <p className="text-sm text-slate-400">Key security metrics at a glance</p>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            loading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-slate-700 border border-slate-600 text-slate-100 hover:bg-slate-600'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = getColorClasses(card.color);
          const iconColorClasses = getIconColorClasses(card.color);

          return (
            <div
              key={index}
              className={`bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses.split(' ')[1]}`}>
                  <Icon className={`w-6 h-6 ${iconColorClasses}`} />
                </div>
                
                {card.trend && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    card.trend && !card.trend.includes('-') 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {card.trend && !card.trend.includes('-') ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3 rotate-180" />
                    )}
                    {card.trend}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-100 mb-1">
                  {card.value}
                </h3>
                <p className="text-sm font-medium text-slate-300 mb-1">
                  {card.title}
                </p>
                <p className="text-xs text-slate-500">
                  {card.subtitle}
                </p>
              </div>

              {/* Additional trend info */}
              {card.trendLabel && card.trend && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{card.trendLabel}</span>
                    <span className={`text-xs font-medium ${
                      card.trend && !card.trend.includes('-') 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      {card.trend}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Insights */}
      <div className="bg-linear-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border border-blue-500/20">
        <h4 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Quick Insights
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h5 className="font-medium text-slate-100 mb-2">Threat Activity</h5>
            <p className="text-sm text-slate-300">
              {metrics.totalThreats > 10 
                ? 'High threat activity detected. Consider reviewing security settings.'
                : metrics.totalThreats > 5
                ? 'Moderate threat activity. Continue monitoring.'
                : 'Low threat activity. Security posture looks good.'
              }
            </p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <h5 className="font-medium text-slate-100 mb-2">Risk Assessment</h5>
            <p className="text-sm text-slate-300">
              {metrics.riskLevel === 'High'
                ? 'Elevated risk level. Additional security measures recommended.'
                : metrics.riskLevel === 'Medium'
                ? 'Moderate risk level. Maintain current security practices.'
                : 'Low risk level. Current security measures are effective.'
              }
            </p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <h5 className="font-medium text-slate-100 mb-2">Performance</h5>
            <p className="text-sm text-slate-300">
              {metrics.detectionAccuracy > 90
                ? 'Excellent detection accuracy. Model performing well.'
                : metrics.detectionAccuracy > 80
                ? 'Good detection accuracy. Room for improvement.'
                : 'Detection accuracy needs attention. Consider retraining.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-400">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

// Import required icon
import { Brain } from 'lucide-react';

export default AnalyticsSummary;
