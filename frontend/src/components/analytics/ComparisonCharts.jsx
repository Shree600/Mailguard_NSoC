/**
 * Comparison Charts Component
 * Displays week-over-week and month-over-month comparisons
 */

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';

const ComparisonCharts = ({ comparisons, onComparisonTypeChange, selectedType = 'wow' }) => {
  const [activeMetric, setActiveMetric] = useState('overview');

  if (!comparisons) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const comparisonTypes = [
    { value: 'wow', label: 'Week over Week' },
    { value: 'mom', label: 'Month over Month' }
  ];

  const metrics = [
    {
      id: 'phishingCount',
      name: 'Phishing Emails',
      icon: AlertTriangle,
      color: 'red',
      format: (value) => value.toString()
    },
    {
      id: 'totalEmails',
      name: 'Total Emails',
      icon: Mail,
      color: 'blue',
      format: (value) => value.toString()
    },
    {
      id: 'detectionRate',
      name: 'Detection Rate',
      icon: Target,
      color: 'green',
      format: (value) => `${value}%`
    },
    {
      id: 'avgConfidence',
      name: 'Avg Confidence',
      icon: Brain,
      color: 'purple',
      format: (value) => `${Math.round(value * 100)}%`
    },
    {
      id: 'falsePositives',
      name: 'False Positives',
      icon: XCircle,
      color: 'orange',
      format: (value) => value.toString()
    }
  ];

  const ComparisonMetric = ({ metric, data }) => {
    const { current, previous, change, percentage } = data;
    const isPositive = change > 0;
    const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' ? isPositive : !isPositive;
    const Icon = metric.icon;

    return (
      <div className="bg-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 bg-${metric.color}-500/20 rounded-lg`}>
              <Icon className={`w-4 h-4 text-${metric.color}-400`} />
            </div>
            <span className="text-sm font-medium text-slate-300">{metric.name}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isGood ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {percentage}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-slate-100">
              {metric.format(current)}
            </span>
            <span className="text-sm text-slate-400">
              {metric.format(previous)}
            </span>
          </div>
          
          {/* Visual indicator */}
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                isGood ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ 
                width: `${Math.min(Math.abs(change / Math.max(previous, 1)) * 100, 100)}%` 
              }}
            />
          </div>
        </div>

        {/* Change details */}
        <div className="mt-3 pt-3 border-t border-slate-600">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{comparisons.currentPeriod}</span>
            <span>{comparisons.previousPeriod}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Performance Comparisons</h3>
            <p className="text-sm text-slate-400">Period-over-period analysis</p>
          </div>
        </div>

        {/* Comparison Type Selector */}
        <div className="flex gap-2">
          {comparisonTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onComparisonTypeChange && onComparisonTypeChange(type.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedType === type.value
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Period Info */}
      <div className="mb-6 p-4 bg-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-blue-400">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">
            Comparing {comparisons.currentPeriod} vs {comparisons.previousPeriod}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <ComparisonMetric
            key={metric.id}
            metric={metric}
            data={comparisons[metric.id]}
          />
        ))}
      </div>

      {/* Summary Insights */}
      <div className="mt-6 p-4 bg-slate-700 rounded-lg">
        <h4 className="font-medium text-slate-100 mb-3">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-2">Positive Changes</h5>
            <ul className="text-sm text-slate-400 space-y-1">
              {metrics
                .filter(metric => {
                  const data = comparisons[metric.id];
                  const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' 
                    ? data.change > 0 
                    : data.change < 0;
                  return data.change !== 0 && isGood;
                })
                .map(metric => (
                  <li key={metric.id}>
                    · {metric.name}: {comparisons[metric.id].percentage}
                  </li>
                ))}
              {metrics.filter(metric => {
                const data = comparisons[metric.id];
                const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' 
                  ? data.change > 0 
                  : data.change < 0;
                return data.change !== 0 && isGood;
              }).length === 0 && (
                <li className="text-slate-500">No significant positive changes</li>
              )}
            </ul>
          </div>

          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-2">Areas of Concern</h5>
            <ul className="text-sm text-slate-400 space-y-1">
              {metrics
                .filter(metric => {
                  const data = comparisons[metric.id];
                  const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' 
                    ? data.change > 0 
                    : data.change < 0;
                  return data.change !== 0 && !isGood;
                })
                .map(metric => (
                  <li key={metric.id}>
                    · {metric.name}: {comparisons[metric.id].percentage}
                  </li>
                ))}
              {metrics.filter(metric => {
                const data = comparisons[metric.id];
                const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' 
                  ? data.change > 0 
                  : data.change < 0;
                return data.change !== 0 && !isGood;
              }).length === 0 && (
                <li className="text-green-400">All metrics trending positively!</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-500/20 rounded-lg">
          <div className="text-2xl font-bold text-green-400">
            {metrics.filter(metric => {
              const data = comparisons[metric.id];
              const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' 
                ? data.change > 0 
                : data.change < 0;
              return data.change !== 0 && isGood;
            }).length}
          </div>
          <div className="text-sm text-green-400 font-medium">Improving Metrics</div>
        </div>
        <div className="text-center p-4 bg-red-500/20 rounded-lg">
          <div className="text-2xl font-bold text-red-400">
            {metrics.filter(metric => {
              const data = comparisons[metric.id];
              const isGood = metric.id === 'detectionRate' || metric.id === 'avgConfidence' 
                ? data.change > 0 
                : data.change < 0;
              return data.change !== 0 && !isGood;
            }).length}
          </div>
          <div className="text-sm text-red-400 font-medium">Declining Metrics</div>
        </div>
        <div className="text-center p-4 bg-blue-500/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">
            {metrics.filter(metric => comparisons[metric.id].change === 0).length}
          </div>
          <div className="text-sm text-blue-400 font-medium">Unchanged Metrics</div>
        </div>
      </div>
    </div>
  );
};

// Import required icons
import { AlertTriangle, Mail, Target, Brain, XCircle } from 'lucide-react';

export default ComparisonCharts;
