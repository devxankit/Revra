import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  FiBell, 
  FiCheck, 
  FiX, 
  FiClock, 
  FiDollarSign, 
  FiUser,
  FiAlertCircle,
  FiInfo,
  FiAward,
  FiCheckSquare,
  FiTrendingUp,
  FiMessageSquare,
  FiSend,
  FiLoader
} from 'react-icons/fi'
import PM_navbar from '../../DEV-components/PM_navbar'
import { pmNotificationService } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'

const PM_notifications = () => {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isLoadingRef = useRef(false)
  const hasErrorShownRef = useRef(false)

  const formatRelativeTime = useCallback((dateString) => {
    if (!dateString) return 'Just now'
    const eventDate = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - eventDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} min ago`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

    return eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const buildNotificationStyle = useCallback((notification) => {
    if (notification.type === 'request') {
      const incoming = notification.direction === 'incoming'
      return {
        icon: incoming ? FiMessageSquare : FiSend,
        iconColor: incoming ? 'text-blue-600' : 'text-purple-600',
        iconBg: incoming ? 'bg-blue-100' : 'bg-purple-100'
      }
    }

    if (notification.type === 'task') {
      const isUrgent = notification.task?.priority === 'urgent' || notification.task?.priority === 'high'
      return {
        icon: isUrgent ? FiAlertCircle : FiCheckSquare,
        iconColor: isUrgent ? 'text-red-600' : 'text-blue-600',
        iconBg: isUrgent ? 'bg-red-100' : 'bg-blue-100'
      }
    }

    if (notification.type === 'activity') {
      if (notification.scope === 'milestone') {
        return {
          icon: FiTrendingUp,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100'
        }
      }
      if (notification.scope === 'task') {
        return {
          icon: FiCheckSquare,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100'
        }
      }
      return {
        icon: FiTrendingUp,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100'
      }
    }

    if (notification.type === 'project') {
      return {
        icon: FiTrendingUp,
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-100'
      }
    }

    return {
      icon: FiInfo,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100'
    }
  }, [])

  const decorateNotification = useCallback(
    (notification) => {
      const style = buildNotificationStyle(notification)
      const timestamp = notification.updatedAt || notification.createdAt

      // Build title based on notification type if not provided
      let title = notification.title
      if (!title) {
        if (notification.type === 'task') {
          title = 'New Task Created'
        } else if (notification.type === 'activity') {
          title = notification.scope === 'milestone' 
            ? 'Milestone Update' 
            : notification.scope === 'task'
            ? 'Task Update'
            : 'Project Update'
        } else if (notification.type === 'request') {
          title = notification.direction === 'incoming' 
            ? 'New Request' 
            : 'Request Update'
        } else if (notification.type === 'project') {
          title = 'Project Update'
        } else {
          title = 'Notification'
        }
      }

      return {
        id: notification.id || notification._id,
        type: notification.type,
        title,
        message: notification.message,
        time: formatRelativeTime(timestamp),
        isRead: notification.read ?? notification.isRead ?? false,
        icon: style.icon,
        iconColor: style.iconColor,
        iconBg: style.iconBg,
        metadata: notification
      }
    },
    [buildNotificationStyle, formatRelativeTime]
  )

  const loadNotifications = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      setError(null)
      hasErrorShownRef.current = false

      const response = await pmNotificationService.getNotifications({ limit: 50 })
      const items = Array.isArray(response) ? response : response?.data || []
      const decorated = items.map(decorateNotification)
      setNotifications(decorated)
    } catch (err) {
      // Only log and show error once
      if (!hasErrorShownRef.current) {
        hasErrorShownRef.current = true
        const errorMessage = err.message || 'Unable to load notifications right now.'
        
        // Handle 401 (Unauthorized) errors gracefully
        if (errorMessage.includes('token') || errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          setError('Session expired. Please log in again.')
          // Don't show toast for auth errors to avoid spam
        } else {
          setError(errorMessage)
          toast.error(errorMessage)
        }
      }
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }, [decorateNotification, toast])

  useEffect(() => {
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    )
    // TODO: Call API to mark as read when backend supports it
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    )
    // TODO: Call API to mark all as read when backend supports it
  }

  const deleteNotification = (id) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    )
    // TODO: Call API to delete when backend supports it
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <PM_navbar />
      
      <main className="max-w-md mx-auto min-h-screen pt-16 pb-20">

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-4 mt-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? 'Loading...' : unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && !loading && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-center">
              <FiAlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-sm text-red-600">{error}</p>
              <button 
                onClick={loadNotifications}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <FiLoader className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-4 flex items-center justify-center py-12"
          >
            <FiLoader className="w-8 h-8 animate-spin text-teal-600" />
          </motion.div>
        )}

        {/* Notifications List */}
        {!loading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-4 space-y-3"
        >
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <FiBell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No notifications</h3>
              <p className="text-gray-600">You're all caught up!</p>
            </motion.div>
          ) : (
            notifications.map((notification, index) => {
              const IconComponent = notification.icon
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + (index * 0.1) }}
                  className={`bg-white rounded-xl p-4 shadow-lg border transition-all ${
                    notification.isRead 
                      ? 'border-gray-100' 
                      : 'border-teal-200 bg-teal-50/30'
                  }`}
                  style={{
                    boxShadow: notification.isRead 
                      ? '0 4px 12px -3px rgba(20, 184, 166, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)'
                      : '0 4px 12px -3px rgba(20, 184, 166, 0.2), 0 2px 6px -2px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg ${notification.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${notification.iconColor}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className={`font-semibold text-sm ${
                            notification.isRead ? 'text-gray-700' : 'text-gray-800'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            notification.isRead ? 'text-gray-600' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <FiClock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{notification.time}</span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete notification"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
          </motion.div>
        )}

      </main>
    </div>
  )
}

export default PM_notifications
