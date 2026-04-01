import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FiBell, 
  FiCheck, 
  FiX, 
  FiClock, 
  FiAlertCircle,
  FiInfo,
  FiCheckSquare,
  FiTrendingUp,
  FiCreditCard,
  FiMessageSquare,
  FiSend,
  FiLoader
} from 'react-icons/fi'
import Client_navbar from '../../DEV-components/Client_navbar'
import clientNotificationService from '../../DEV-services/clientNotificationService'

const Client_notification = () => {
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

    return eventDate.toLocaleDateString('en-IN', {
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

    if (notification.type === 'activity') {
      if (notification.scope === 'milestone') {
        return {
          icon: FiCheckSquare,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100'
        }
      }

      return {
        icon: FiTrendingUp,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100'
      }
    }

    if (notification.type === 'payment') {
      return {
        icon: FiCreditCard,
        iconColor: 'text-green-600',
        iconBg: 'bg-green-100'
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

      return {
        id: notification.id,
        type: notification.type,
        title:
          notification.title ||
          (notification.type === 'activity' ? 'Project update' : 'Request update'),
        message: notification.message,
        time: formatRelativeTime(timestamp),
        isRead: notification.read ?? false,
        icon: style.icon,
        iconColor: style.iconColor,
        iconBg: style.iconBg
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

      const response = await clientNotificationService.getNotifications({ limit: 50 })
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
        } else {
          setError(errorMessage)
        }
      }
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }, [decorateNotification])

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
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    )
  }

  const deleteNotification = (id) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    )
  }

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <Client_navbar />
        <main className="max-w-md mx-auto min-h-screen pt-16 pb-20">
          <div className="flex flex-col items-center justify-center h-64 text-gray-600 space-y-3">
            <FiLoader className="h-7 w-7 animate-spin text-teal-600" />
            <p>Fetching notifications...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <Client_navbar />
        <main className="max-w-md mx-auto min-h-screen pt-16 pb-20 px-4">
          <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-8 text-center space-y-4">
            <FiAlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Unable to load notifications</h2>
              <p className="text-gray-600 mt-1">{error}</p>
            </div>
            <button
              onClick={loadNotifications}
              className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Client_navbar />
      
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
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </motion.div>

        {/* Notifications List */}
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
                      : 'border-teal-200 bg-teal-50'
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

      </main>
    </div>
  )
}

export default Client_notification
