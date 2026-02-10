/**
 * EMAIL STATS CHART
 * Pie chart showing phishing vs safe email distribution
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = {
  phishing: '#F43F5E', // rose-500
  safe: '#10B981',     // emerald-500
}

function EmailStatsChart({ stats, loading }) {
  // Prepare data for pie chart
  const data = [
    { name: 'Phishing', value: stats.phishing, color: COLORS.phishing },
    { name: 'Safe', value: stats.safe, color: COLORS.safe }
  ].filter(item => item.value > 0) // Only show categories with values

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Email Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-48 h-48 bg-slate-700 rounded-full mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (stats.total === 0 || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Email Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block p-4 bg-slate-700 rounded-full mb-3">
              <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-400">No data to display</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate percentages
  const phishingPercent = ((stats.phishing / stats.total) * 100).toFixed(1)
  const safePercent = ((stats.safe / stats.total) * 100).toFixed(1)

  // Custom label for pie slices
  const renderLabel = (entry) => {
    const percent = ((entry.value / stats.total) * 100).toFixed(0)
    return `${percent}%`
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-100">{data.name}</p>
          <p className="text-slate-400 text-sm">
            {data.value} emails ({((data.value / stats.total) * 100).toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Email Distribution</h3>
      
      {/* Chart */}
      <div className="w-full" style={{ height: '256px', minHeight: '256px' }}>
        <ResponsiveContainer width="100%" height={256}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => (
                <span className="text-slate-300 font-medium">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-sm font-medium text-slate-300">Phishing</span>
            </div>
            <p className="text-2xl font-bold text-rose-400">{stats.phishing}</p>
            <p className="text-xs text-slate-500">{phishingPercent}% of total</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-slate-300">Safe</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.safe}</p>
            <p className="text-xs text-slate-500">{safePercent}% of total</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailStatsChart
