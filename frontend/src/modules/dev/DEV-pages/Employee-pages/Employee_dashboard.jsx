import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import { employeeService, socketService, employeeRequestService, getStoredEmployeeData, employeeWalletService } from '../../DEV-services'
import {
  FiCheckSquare as CheckSquare,
  FiClock as Clock,
  FiAlertTriangle as AlertTriangle,
  FiTrendingUp as TrendingUp,
  FiCalendar as Calendar,
  FiUser as User,
  FiFolder as FolderKanban,
  FiFileText,
  FiLoader,
  FiStar as Star,
  FiAward as Award
} from 'react-icons/fi'

const Employee_dashboard = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tasks, setTasks] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    tasks: {
      total: 0,
      completed: 0,
      'in-progress': 0,
      pending: 0,
      urgent: 0,
      overdue: 0,
      dueSoon: 0
    },
    projects: {
      total: 0,
      active: 0,
      completed: 0
    },
    points: {
      current: 0,
      rank: 0,
      totalEmployees: 0,
      tasksCompleted: 0,
      tasksOnTime: 0,
      tasksOverdue: 0
    },
    recentPointsHistory: []
  })
  const [taskStatusFilter, setTaskStatusFilter] = useState('all')
  const [requestsCount, setRequestsCount] = useState(0)

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    setupWebSocket()

    return () => {
      socketService.disconnect()
    }
  }, [])

  const setupWebSocket = () => {
    const token = localStorage.getItem('employeeToken')
    if (token) {
      socketService.connect(token)

      // Listen for real-time updates
      socketService.on('task_status_updated', () => {
        loadDashboardData()
      })

      socketService.on('employee_points_updated', (data) => {
        loadDashboardData()
        // Show points notification
        console.log(`Points updated: ${data.pointsAwarded > 0 ? '+' : ''}${data.pointsAwarded} points`)
      })

      socketService.on('leaderboard_updated', () => {
        loadDashboardData()
      })
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load dashboard statistics, tasks, and requests count
      const [dashboardResponse, tasksResponse, requestsResponse, rewardResponse] = await Promise.all([
        employeeService.getEmployeeDashboardStats({ timeFilter: 'all' }),
        employeeService.getEmployeeTasks({ limit: 100 }), // Fetch more tasks to allow frontend filtering too
        employeeRequestService.getRequests({ direction: 'outgoing', limit: 1 }).catch(() => ({ pagination: { total: 0 } }))
      ])

      // Handle stats
      const stats = dashboardResponse?.data || dashboardResponse
      if (stats && stats.tasks) {
        setDashboardStats(stats)
      } else {
        // Fallback to default structure
        setDashboardStats({
          tasks: { total: 0, completed: 0, 'in-progress': 0, pending: 0, urgent: 0, overdue: 0, dueSoon: 0 },
          projects: { total: 0, active: 0, completed: 0 },
          points: { current: 0, rank: 0, totalEmployees: 0, tasksCompleted: 0, tasksOnTime: 0, tasksOverdue: 0 },
          recentPointsHistory: []
        })
      }

      // Handle tasks response - could be { data: [...] } or just [...]
      const tasksData = tasksResponse?.data || tasksResponse || []
      setTasks(Array.isArray(tasksData) ? tasksData : [])

      // Handle requests count - get total from pagination
      const requestsTotal = requestsResponse?.pagination?.total || 0
      setRequestsCount(requestsTotal)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-primary/10 text-primary border-primary/20'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high': return 'bg-red-100 text-red-800'
      case 'normal': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTasks = useMemo(() => {
    if (!tasks || !tasks.length) return []
    switch (taskStatusFilter) {
      case 'due-soon':
        return tasks.filter(task => {
          if (!task.dueDate) return false
          const due = new Date(task.dueDate)
          if (Number.isNaN(due.getTime())) return false
          const diffDays = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24))
          return diffDays <= 3 && diffDays >= 0 && task.status !== 'completed'
        })
      case 'overdue':
        return tasks.filter(task => {
          if (!task.dueDate) return false
          const due = new Date(task.dueDate)
          return !Number.isNaN(due.getTime()) && due < new Date() && task.status !== 'completed'
        })
      case 'done':
        return tasks.filter(task => task.status === 'completed')
      case 'high-priority':
        return tasks.filter(task => (task.priority === 'high' || task.priority === 'urgent' || task.priority === 'High' || task.priority === 'Urgent') && task.status !== 'completed')
      default:
        return tasks
    }
  }, [tasks, taskStatusFilter])

  // Calculate overall progress (defensive: avoid NaN when total is 0 or missing)
  const totalTasks = Number(dashboardStats.tasks.total) || 0
  const completedTasks = Number(dashboardStats.tasks.completed) || 0
  const overallProgress = totalTasks > 0
    ? Math.min(100, Math.max(0, Math.round((completedTasks / totalTasks) * 100)))
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <Employee_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FiLoader className="animate-spin text-4xl text-primary mx-auto mb-4" />
                <p className="text-gray-600">Loading dashboard...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <Employee_navbar />
      <main className="pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome, {getStoredEmployeeData()?.name || 'Employee'}!</h1>
            <p className="text-sm text-gray-600 mt-1">Appzeto loves you!</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <CheckSquare className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.tasks.total}</p>
              <p className="text-xs text-gray-600">Tasks</p>
            </div>
            <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-xl">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-xs text-gray-500">Done</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.tasks.completed}</p>
              <p className="text-xs text-gray-600">Tasks</p>
            </div>
            <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-100 rounded-xl">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-xs text-gray-500">Due Soon</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.tasks.dueSoon}</p>
              <p className="text-xs text-gray-600">Tasks</p>
            </div>
            <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-xs text-gray-500">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.tasks.overdue}</p>
              <p className="text-xs text-gray-600">Tasks</p>
            </div>
          </div>

          {/* Urgent Tasks Card */}
          <div className="mb-6 md:mb-8">
            <div
              onClick={() => navigate('/employee-tasks?filter=urgent')}
              className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 shadow-sm border border-red-200 cursor-pointer hover:shadow-md hover:border-red-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 mb-1">Urgent Tasks</h3>
                    <p className="text-xs text-red-700">Critical tasks need immediate attention</p>
                  </div>
                </div>
                <div className="bg-red-300 text-red-800 px-4 py-2 rounded-xl shadow-sm animate-pulse">
                  <p className="text-2xl font-bold">{dashboardStats.tasks.urgent}</p>
                </div>
              </div>
            </div>
          </div>

          {/* My Requests Card */}
          <div className="mb-6 md:mb-8">
            <div
              onClick={() => navigate('/employee-requests')}
              className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 shadow-sm border border-teal-200 cursor-pointer hover:shadow-md hover:border-teal-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-100 rounded-xl">
                    <FiFileText className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-teal-900 mb-1">My Requests</h3>
                    <p className="text-xs text-teal-700">Send requests to PM and clients</p>
                  </div>
                </div>
                <div className="bg-teal-300 text-teal-800 px-4 py-2 rounded-xl shadow-sm">
                  <p className="text-2xl font-bold">{requestsCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Task Progress Overview</h3>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                <span className="text-sm font-bold text-primary">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-gradient-to-r from-primary to-primary-dark h-4 rounded-full transition-all duration-700" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

          </div>

          <div className="md:hidden mb-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'all', label: 'All Tasks', count: dashboardStats.tasks.total },
                { key: 'done', label: 'Done', count: dashboardStats.tasks.completed },
                { key: 'due-soon', label: 'Due Soon', count: dashboardStats.tasks.dueSoon },
                { key: 'overdue', label: 'Overdue', count: dashboardStats.tasks.overdue }
              ].map(({ key, label, count }) => (
                <button key={key} onClick={() => setTaskStatusFilter(key)} className={`p-4 rounded-2xl shadow-sm border transition-all ${taskStatusFilter === key ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 active:scale-95'}`}>
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block mb-8">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All Tasks', count: dashboardStats.tasks.total },
                { key: 'done', label: 'Done', count: dashboardStats.tasks.completed },
                { key: 'due-soon', label: 'Due Soon', count: dashboardStats.tasks.dueSoon },
                { key: 'overdue', label: 'Overdue', count: dashboardStats.tasks.overdue }
              ].map(({ key, label, count }) => (
                <button key={key} onClick={() => setTaskStatusFilter(key)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${taskStatusFilter === key ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
              <span className="text-sm text-gray-500">{filteredTasks.length} tasks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredTasks.map((task) => (
                <div key={task._id} onClick={() => navigate(`/employee-task/${task._id}`)} className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.98]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-300">
                        <CheckSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors duration-300">{task.title}</h3>
                        </div>
                        <div className="flex items-center space-x-1.5 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>{task.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">{task.description}</p>
                  <div className="mb-3 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <FolderKanban className="h-3 w-3" />
                        <span className="text-primary font-semibold">{task.project?.name || 'Unknown Project'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <span className="text-primary font-semibold">{task.milestone?.title || 'Unknown Milestone'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 text-gray-500">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{task.assignedTo?.[0]?.name || task.assignedTo?.[0]?.fullName || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filter to see more tasks</p>
              </div>
            )}
          </div>
        </div >
      </main >
    </div >
  )
}

export default Employee_dashboard

