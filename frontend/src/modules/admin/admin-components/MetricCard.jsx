import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../../../components/ui/card'
import { AnimatedCircularProgressBar } from '../../../components/ui/animated-circular-progress-bar'
import { cn } from '../../../lib/utils'

const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'blue',
  showProgress = false,
  progressValue = 0,
  format = 'number',
  className,
  ...props 
}) => {
  const colorVariants = {
    blue: {
      bg: 'bg-blue-50/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      changeColor: 'text-green-600',
      accent: 'bg-blue-500'
    },
    green: {
      bg: 'bg-green-50/50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      changeColor: 'text-green-600',
      accent: 'bg-green-500'
    },
    purple: {
      bg: 'bg-purple-50/50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      changeColor: 'text-green-600',
      accent: 'bg-purple-500'
    },
    orange: {
      bg: 'bg-orange-50/50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      changeColor: 'text-green-600',
      accent: 'bg-orange-500'
    },
    red: {
      bg: 'bg-red-50/50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      changeColor: 'text-red-600',
      accent: 'bg-red-500'
    }
  }

  const colors = colorVariants[color] || colorVariants.blue

  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
      }).format(val)
    }
    if (format === 'percentage') {
      return `${val}%`
    }
    return new Intl.NumberFormat('en-IN').format(val)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1, scale: 1.005 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("h-full", className)}
      {...props}
    >
      <Card className={cn(
        "h-full p-2.5 transition-all duration-300 relative overflow-hidden",
        "hover:shadow-lg hover:shadow-gray-300/40 hover:-translate-y-1",
        "border-2 border-gray-300 shadow-md shadow-gray-200/30",
        "bg-white/80 backdrop-blur-sm",
        colors.bg
      )}>
        {/* Subtle accent dot */}
        <div className={cn("absolute top-2 right-2 w-1 h-1 rounded-full", colors.accent)}></div>
        
        <CardContent className="p-0 h-full flex flex-col">
          {/* Header with icon */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex-1">
              <h3 className="text-xs font-medium text-gray-500 mb-0.5 tracking-wide uppercase">
                {title}
              </h3>
            </div>
            {Icon && (
              <div className={cn(
                "p-1.5 rounded-md shadow-sm transition-all duration-300",
                colors.iconBg,
                "hover:scale-105"
              )}>
                <Icon className={cn("h-3.5 w-3.5", colors.iconColor)} />
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center">
            {showProgress ? (
              <div className="flex items-center space-x-2">
                <AnimatedCircularProgressBar
                  value={progressValue}
                  gaugePrimaryColor={colors.iconColor.replace('text-', '#')}
                  gaugeSecondaryColor="#e5e7eb"
                  className="w-10 h-10"
                />
                <div className="flex-1">
                  <p className="text-lg font-bold text-gray-900 mb-0.5">
                    {formatValue(value)}
                  </p>
                  {change && (
                    <p className={cn("text-xs font-medium", colors.changeColor)}>
                      {change}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold text-gray-900 mb-0.5 leading-tight">
                  {formatValue(value)}
                </p>
                {change && (
                  <p className={cn("text-xs font-medium", colors.changeColor)}>
                    {change}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default MetricCard
