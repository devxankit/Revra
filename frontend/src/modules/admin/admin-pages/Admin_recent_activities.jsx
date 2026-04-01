import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import { 
  Activity,
  Bell,
  CheckCircle,
  AlertTriangle,
  Users,
  Server,
  Code,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Loading from '../../../components/ui/loading'
import adminDashboardService from '../admin-services/adminDashboardService'

const Admin_recent_activities = () => {
  const [recentActivities, setRecentActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Helper function to get activity icon
  const getActivityIcon = (iconType, color) => {
    const iconClass = `h-4 w-4 ${
      color === 'green' ? 'text-emerald-600' :
      color === 'red' ? 'text-red-600' :
      color === 'blue' ? 'text-blue-600' :
      color === 'purple' ? 'text-purple-600' :
      'text-gray-600'
    }`
    
    switch (iconType) {
      case 'project':
        return <Code className={iconClass} />
      case 'user':
        return <Users className={iconClass} />
      case 'finance':
        return <DollarSign className={iconClass} />
      case 'success':
        return <CheckCircle className={iconClass} />
      case 'warning':
        return <AlertTriangle className={iconClass} />
      case 'trending':
        return <TrendingUp className={iconClass} />
      default:
        return <Activity className={iconClass} />
    }
  }

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now'
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Fetch all activities (no limit or high limit)
      const response = await adminDashboardService.getRecentActivities(100)
      if (response.success && response.data) {
        // Sort by time (newest first)
        const sortedActivities = response.data
          .sort((a, b) => new Date(b.time) - new Date(a.time))
        setRecentActivities(sortedActivities)
      } else {
        setRecentActivities([])
      }
    } catch (err) {
      console.error('Error fetching recent activities:', err)
      setError(err.message || 'Failed to load recent activities')
      setRecentActivities([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecentActivities()
    
    // Set up interval to refresh activities every 30 seconds
    const activityInterval = setInterval(() => {
      fetchRecentActivities()
    }, 30000)

    return () => clearInterval(activityInterval)
  }, [])

  // Reset to first page whenever activities list changes
  useEffect(() => {
    setCurrentPage(1)
  }, [recentActivities.length])

  const totalPages = useMemo(
    () => (recentActivities.length > 0 ? Math.ceil(recentActivities.length / itemsPerPage) : 1),
    [recentActivities.length]
  )

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, recentActivities.length)

  const paginatedActivities = useMemo(
    () => recentActivities.slice(startIndex, endIndex),
    [recentActivities, startIndex, endIndex]
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Admin_navbar />
        <Admin_sidebar />
        <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
          <Loading />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Admin_navbar />
      <Admin_sidebar />
      
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Recent Activities</h1>
              <p className="text-gray-600">View all recent updates and notifications</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100">
              <Bell className="h-6 w-6 text-rose-600" />
            </div>
          </motion.div>

          {/* Activities List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 lg:p-6 shadow-xl border border-gray-200/50"
          >
            {error ? (
              <div className="flex items-center justify-center py-12 text-red-600">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {paginatedActivities.map((activity, index) => {
                  const iconColor = activity.color || 'blue'
                  return (
                    <motion.div
                      key={activity.id || `activity-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors border border-gray-100"
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${
                        iconColor === 'green' ? 'bg-emerald-100' :
                        iconColor === 'red' ? 'bg-red-100' :
                        iconColor === 'blue' ? 'bg-blue-100' :
                        iconColor === 'purple' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        {getActivityIcon(activity.icon || 'activity', iconColor)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">{activity.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{activity.message}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(activity.time)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {totalPages > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-gray-500">
                      Showing{' '}
                      <span className="font-semibold">
                        {startIndex + 1}
                      </span>
                      {' '}
                      to{' '}
                      <span className="font-semibold">
                        {endIndex}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold">
                        {recentActivities.length}
                      </span>{' '}
                      activities
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-xs text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        <span>Previous</span>
                      </button>
                      <span className="text-xs text-gray-600">
                        Page <span className="font-semibold">{currentPage}</span> of{' '}
                        <span className="font-semibold">{totalPages}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-xs text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No recent activities available</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Admin_recent_activities
