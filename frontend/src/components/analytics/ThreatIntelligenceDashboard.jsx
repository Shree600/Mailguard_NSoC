/**
 * Threat Intelligence Dashboard Component
 * Displays comprehensive threat intelligence data
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Shield, AlertTriangle, Target, Brain, Globe, Lock } from 'lucide-react';

const ThreatIntelligenceDashboard = ({ threatIntel }) => {
  if (!threatIntel) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-700 rounded"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const { topSenderDomains, commonKeywords, attackPatterns, riskScore } = threatIntel;

  // Colors for charts
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="font-medium text-slate-100">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-slate-300">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get risk color
  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-400 bg-red-500/20';
    if (score >= 60) return 'text-orange-400 bg-orange-500/20';
    return 'text-green-400 bg-green-500/20';
  };

  // Get risk icon
  const getRiskIcon = (score) => {
    if (score >= 80) return AlertTriangle;
    if (score >= 60) return Shield;
    return Lock;
  };

  const RiskIcon = getRiskIcon(riskScore?.score || 0);
  const riskColorClass = getRiskColor(riskScore?.score || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Brain className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Threat Intelligence</h3>
          <p className="text-sm text-slate-400">Advanced threat analysis and insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Threat Sources */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-red-400" />
            <h4 className="font-semibold text-slate-100">Top Threat Sources</h4>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="256">
              <BarChart data={topSenderDomains} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="domain" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<BarTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Domain List */}
          <div className="mt-4 space-y-2">
            {topSenderDomains.slice(0, 5).map((domain, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    domain.risk === 'high' ? 'bg-red-500' :
                    domain.risk === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm font-medium text-slate-100 truncate">
                    {domain.domain}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">{domain.count}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-600 text-slate-300">
                    {Math.round(domain.avgConfidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attack Patterns */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-slate-100">Attack Techniques</h4>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="256">
              <PieChart>
                <Pie
                  data={attackPatterns}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ technique, percentage }) => `${technique}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {attackPatterns.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pattern List */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {attackPatterns.map((pattern, index) => (
              <div key={index} className="text-center p-3 bg-slate-700 rounded-lg">
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <p className="text-sm font-medium text-slate-100">{pattern.technique}</p>
                <p className="text-lg font-bold text-slate-300">{pattern.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common Phishing Keywords */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h4 className="font-semibold text-slate-100">Common Attack Keywords</h4>
          </div>
          
          <div className="space-y-3">
            {commonKeywords.slice(0, 8).map((keyword, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-100 bg-slate-600 px-2 py-1 rounded">
                    {keyword.word}
                  </span>
                  <span className="text-xs text-slate-500">{keyword.count} uses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-600 rounded-full h-2">
                    <div 
                      className="bg-linear-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${keyword.frequency}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {keyword.frequency}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Score */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-400" />
            <h4 className="font-semibold text-slate-100">Your Risk Assessment</h4>
          </div>

          <div className="text-center">
            {/* Risk Score Circle */}
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
              <div className={`w-32 h-32 rounded-full ${riskColorClass} flex items-center justify-center border-4 border-slate-700 shadow-lg`}>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-100">{riskScore?.score || 0}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Risk Score</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2">
                <div className={`p-2 rounded-full ${riskColorClass}`}>
                  <RiskIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Risk Details */}
            <div className="space-y-3">
              <div>
                <p className={`text-lg font-semibold ${riskColorClass.split(' ')[0]}`}>
                  {riskScore?.level || 'Unknown'} Risk
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {riskScore?.description || 'Calculating risk assessment...'}
                </p>
              </div>

              {/* Risk Factors */}
              <div className="text-left p-4 bg-slate-700 rounded-lg">
                <h5 className="font-medium text-slate-100 mb-2">Risk Factors:</h5>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>· {topSenderDomains.length} suspicious domains detected</li>
                  <li>· {commonKeywords.length} attack keywords identified</li>
                  <li>· Recent threat activity: {riskScore?.score >= 60 ? 'High' : 'Normal'}</li>
                  <li>· Overall security posture: {riskScore?.level}</li>
                </ul>
              </div>

              {/* Recommendations */}
              <div className="text-left p-4 bg-blue-500/20 rounded-lg">
                <h5 className="font-medium text-blue-400 mb-2">Recommendations:</h5>
                <ul className="text-sm text-blue-300 space-y-1">
                  {riskScore?.score >= 80 && (
                    <>
                      <li>· Enable additional security filters</li>
                      <li>· Review sender whitelist</li>
                      <li>· Consider stricter phishing detection</li>
                    </>
                  )}
                  {riskScore?.score >= 60 && riskScore?.score < 80 && (
                    <>
                      <li>· Monitor suspicious activity</li>
                      <li>· Review security settings</li>
                      <li>· Stay alert for new threats</li>
                    </>
                  )}
                  {riskScore?.score < 60 && (
                    <>
                      <li>· Maintain current security posture</li>
                      <li>· Regular security reviews</li>
                      <li>· Continue monitoring</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(threatIntel.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default ThreatIntelligenceDashboard;
