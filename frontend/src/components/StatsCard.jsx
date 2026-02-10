/**
 * StatsCard Component
 * Reusable card for displaying statistics with icon, value, and label
 */

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
      <Card className={cn("overflow-hidden bg-slate-800 border-slate-700", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-12 rounded-xl bg-slate-700" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-24 bg-slate-700" />
              <Skeleton className="h-4 w-32 bg-slate-700" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "overflow-hidden bg-slate-800 border-slate-700 transition-all duration-300",
      "hover:bg-slate-800/80 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/10",
      "group cursor-default",
      className
    )}>
      <CardContent className="p-6">
        {/* Icon */}
        <div className={cn(
          "inline-flex p-3 rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110",
          iconBgColor
        )}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>

        {/* Value */}
        <div className="space-y-1">
          <h3 className="text-3xl font-bold text-slate-100 tracking-tight">
            {value}
          </h3>
          <p className="text-sm text-slate-400 font-medium">
            {title}
          </p>
        </div>

        {/* Trend (optional) */}
        {trend && trendValue && (
          <div className={cn(
            "mt-4 flex items-center gap-1 text-sm font-medium",
            trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
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
