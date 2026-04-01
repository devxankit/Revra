import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Bell, X, AlertTriangle, CheckCircle, Info, Server } from 'lucide-react'
import { cn } from '../../../lib/utils'

const NotificationPanel = ({ 
  notifications = [], 
  onDismiss,
  className,
  ...props 
}) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning':
        return AlertTriangle
      case 'success':
        return CheckCircle
      case 'error':
        return Server
      case 'info':
      default:
        return Info
    }
  }

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          border: 'border-orange-200'
        }
      case 'success':
        return {
          bg: 'bg-green-100',
          iconColor: 'text-green-600',
          border: 'border-green-200'
        }
      case 'error':
        return {
          bg: 'bg-red-100',
          iconColor: 'text-red-600',
          border: 'border-red-200'
        }
      case 'info':
      default:
        return {
          bg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          border: 'border-blue-200'
        }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("h-full", className)}
      {...props}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg font-semibold text-gray-900">
              Recent Activity
            </CardTitle>
          </div>
          <div className="text-sm text-gray-500">
            {notifications.length} notifications
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence>
            {notifications.slice(0, 4).map((notification, index) => {
              const Icon = getNotificationIcon(notification.type)
              const styles = getNotificationStyles(notification.type)
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border",
                    styles.border
                  )}
                >
                  <div className={cn("p-2 rounded-full", styles.bg)}>
                    <Icon className={cn("h-4 w-4", styles.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.time}
                    </p>
                  </div>
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {notifications.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default NotificationPanel
