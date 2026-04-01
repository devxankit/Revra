import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'

const QuickActionButton = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  variant = 'outline',
  color = 'blue',
  className,
  ...props 
}) => {
  const colorVariants = {
    blue: {
      iconColor: 'text-blue-600 group-hover:text-blue-700',
      borderColor: 'hover:border-blue-300'
    },
    green: {
      iconColor: 'text-green-600 group-hover:text-green-700',
      borderColor: 'hover:border-green-300'
    },
    purple: {
      iconColor: 'text-purple-600 group-hover:text-purple-700',
      borderColor: 'hover:border-purple-300'
    },
    orange: {
      iconColor: 'text-orange-600 group-hover:text-orange-700',
      borderColor: 'hover:border-orange-300'
    }
  }

  const colors = colorVariants[color] || colorVariants.blue

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full", className)}
      {...props}
    >
      <Button
        variant={variant}
        onClick={onClick}
        className={cn(
          "h-full p-4 text-left justify-start group transition-all duration-200",
          colors.borderColor,
          className
        )}
      >
        <div className="flex items-start space-x-3 w-full">
          {Icon && (
            <Icon className={cn("h-5 w-5 flex-shrink-0", colors.iconColor)} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 group-hover:text-gray-700">
              {title}
            </div>
            <div className="text-sm text-gray-600 group-hover:text-gray-500">
              {description}
            </div>
          </div>
        </div>
      </Button>
    </motion.div>
  )
}

export default QuickActionButton
