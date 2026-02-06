/**
 * StatsCard Component
 * Reusable card for displaying statistics with icon, value, and label
 */

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  loading = false,
  className,
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-50"
}) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-6">
        {/* Icon */}
        <div className={cn("inline-flex p-3 rounded-lg mb-4", iconBgColor)}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>

        {/* Value */}
        <div className="space-y-1">
          <h3 className="text-3xl font-bold text-gray-900">
            {value}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            {title}
          </p>
        </div>

        {/* Trend (optional) */}
        {trend && trendValue && (
          <div className={cn(
            "mt-4 flex items-center gap-1 text-sm font-medium",
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            {trend === 'up' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
