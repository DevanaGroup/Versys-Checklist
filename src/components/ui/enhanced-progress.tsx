import * as React from "react"
import { cn } from "@/lib/utils"

interface EnhancedProgressProps {
  value: number
  max?: number
  className?: string
  variant?: 'default' | 'gradient' | 'glow' | 'animated'
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'
  animated?: boolean
}

const EnhancedProgress = React.forwardRef<
  HTMLDivElement,
  EnhancedProgressProps
>(({ 
  value = 0, 
  max = 100, 
  className,
  variant = 'default',
  showValue = false,
  size = 'md',
  color = 'primary',
  animated = true,
  ...props 
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  const colorClasses = {
    primary: 'from-versys-primary to-versys-secondary',
    secondary: 'from-versys-secondary to-versys-accent',
    accent: 'from-versys-accent to-yellow-400',
    success: 'from-green-500 to-green-600',
    warning: 'from-yellow-500 to-orange-500',
    danger: 'from-red-500 to-red-600'
  }

  const variantClasses = {
    default: `bg-gradient-to-r ${colorClasses[color]}`,
    gradient: `bg-gradient-to-r ${colorClasses[color]} shadow-lg`,
    glow: `bg-gradient-to-r ${colorClasses[color]} shadow-lg shadow-${color === 'primary' ? 'versys-primary' : color === 'secondary' ? 'versys-secondary' : 'versys-accent'}/25`,
    animated: `bg-gradient-to-r ${colorClasses[color]} animate-pulse`
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full bg-gray-200 rounded-full overflow-hidden",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full" />
      
      {/* Progress bar */}
      <div
        className={cn(
          "relative h-full rounded-full transition-all duration-700 ease-out",
          variantClasses[variant],
          animated && "animate-pulse"
        )}
        style={{ width: `${percentage}%` }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-shimmer" />
        
        {/* Glow effect for certain variants */}
        {(variant === 'glow' || variant === 'animated') && (
          <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full blur-sm" />
        )}
      </div>

      {/* Value indicator */}
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white/90 drop-shadow-sm">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
})
EnhancedProgress.displayName = "EnhancedProgress"

export { EnhancedProgress } 