/**
 * Trend Analysis Section Component
 * Displays phishing trends over time with interactive charts
 */

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Activity } from 'lucide-react';

const TrendAnalysisSection = ({ trends, onTimeRangeChange, selectedTimeRange = '30d' }) => {
  const [activeChart, setActiveChart] = useState('line');

  if (!trends) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  const isPositiveTrend = trends.weeklyChange && !trends.weeklyChange.includes('-');
  const trendIcon = isPositiveTrend ? TrendingUp : TrendingDown;
  const trendColor = isPositiveTrend ? 'text-red-600' : 'text-green-600';

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="font-medium text-slate-100">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Trend Analysis</h3>
            <p className="text-sm text-slate-400">Phishing patterns over time</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange && onTimeRangeChange(range.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedTimeRange === range.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Weekly Change</p>
              <p className={`text-2xl font-bold ${trendColor}`}>
                {trends.weeklyChange || '0%'}
              </p>
            </div>
            {trendIcon && <trendIcon className={`w-8 h-8 ${trendColor}`} />}
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Peak Attack Time</p>
              <p className="text-2xl font-bold text-slate-100">
                {trends.peakHour || 'N/A'}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Detection Rate</p>
              <p className="text-2xl font-bold text-green-400">
                {trends.avgDetectionRate || 0}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Total Threats</p>
              <p className="text-2xl font-bold text-red-400">
                {trends.totalThreats || 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveChart('line')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeChart === 'line'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Line Chart
        </button>
        <button
          onClick={() => setActiveChart('area')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeChart === 'area'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Area Chart
        </button>
      </div>

      {/* Main Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="320">
          {activeChart === 'line' ? (
            <LineChart data={trends.daily} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="phishingCount"
                stroke="#ef4444"
                strokeWidth={2}
                name="Phishing Emails"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgConfidence"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Avg Confidence"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <AreaChart data={trends.daily} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalEmails"
                stackId="1"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.3}
                name="Total Emails"
              />
              <Area
                type="monotone"
                dataKey="phishingCount"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Phishing Emails"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {isPositiveTrend && (
            <li>· Phishing attempts have increased by {trends.weeklyChange} this week</li>
          )}
          {trends.peakHour && trends.peakHour !== 'N/A' && (
            <li>· Peak attack time detected around {trends.peakHour}</li>
          )}
          <li>· Current detection rate: {trends.avgDetectionRate || 0}%</li>
          <li>· Total threats identified: {trends.totalThreats || 0}</li>
        </ul>
      </div>
    </div>
  );
};

export default TrendAnalysisSection;
