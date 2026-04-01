import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import TeamLead_task_form from '../../DEV-components/TeamLead_task_form'
import { employeeService, socketService } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'
import { CheckSquare, Search, Filter, Calendar, User, MoreVertical, Loader2, Clock, AlertTriangle, Plus } from 'lucide-react'

const Employee_tasks = () => {
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState('all')
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()

  // Team Lead states
  const [isTeamLead, setIsTeamLead] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamProjects, setTeamProjects] = useState([])
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)

  useEffect(() => {
    loadTasks()
    loadTeamLeadStatus()
    setupWebSocket()

    // Check for filter parameter in URL
    const urlFilter = searchParams.get('filter')
    if (urlFilter) {
      setFilter(urlFilter)
    }

    return () => {
      socketService.disconnect()
    }
  }, [searchParams])

  const loadTeamLeadStatus = async () => {
    try {
      const teamData = await employeeService.getMyTeam()
      const team = teamData?.data || teamData
      if (team?.isTeamLead) {
        setIsTeamLead(true)
        setTeamMembers(team.teamMembers || [])
        setTeamProjects(team.projects || [])
      }
    } catch (error) {
      // User is not a team lead, silently continue
      console.log('User is not a team lead')
    }
  }

  const setupWebSocket = () => {
    const token = localStorage.getItem('employeeToken')
    if (token) {
      socketService.connect(token)

      // Listen for real-time updates
      socketService.on('task_updated', () => {
        loadTasks()
      })

      socketService.on('task_assigned', () => {
        loadTasks()
      })
    }
  }

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use employeeService.getEmployeeTasks which automatically uses the logged-in employee's ID
      const response = await employeeService.getEmployeeTasks({
        limit: 100,
        sortBy: 'dueDate',
        sortOrder: 'asc'
      })

      // Handle both array response and { data: array } from API
      const tasksList = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : [])
      setTasks(tasksList)
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err.message || 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }

  // Normalize backend status (e.g. 'in-progress') for comparison with filter keys
  const normalizeStatus = (s) => (s || '').toLowerCase().replace(/\s+/g, '-')
  // Display label for status (backend uses 'in-progress', we show 'In Progress')
  const statusDisplayLabel = (s) => {
    const n = normalizeStatus(s)
    if (n === 'in-progress') return 'In Progress'
    if (n === 'completed') return 'Completed'
    if (n === 'pending') return 'Pending'
    if (n === 'testing') return 'Testing'
    if (n === 'cancelled') return 'Cancelled'
    return (s || 'Pending').toString()
  }

  const getStatusColor = (status) => {
    const s = normalizeStatus(status)
    if (s === 'completed') return 'bg-green-100 text-green-800 border-green-200'
    if (s === 'in-progress') return 'bg-blue-100 text-blue-800 border-blue-200'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (s === 'testing') return 'bg-purple-100 text-purple-800 border-purple-200'
    if (s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityColor = (priority) => {
    const p = (priority || '').toString().toLowerCase()
    if (p === 'urgent' || p === 'high') return 'bg-red-100 text-red-800'
    if (p === 'medium' || p === 'normal') return 'bg-yellow-100 text-yellow-800'
    if (p === 'low') return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(task => {
    if (filter === 'urgent') {
      return task.isUrgent || (task.priority || '').toString().toLowerCase() === 'urgent'
    }
    const normalizedFilter = normalizeStatus(filter)
    return normalizeStatus(task.status) === normalizedFilter
  })

  const getTimeRemaining = (dueDate) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = due.getTime() - now.getTime()
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-600' }
    if (diffHours <= 1) return { text: '1h left', color: 'text-red-600' }
    if (diffHours <= 4) return { text: `${diffHours}h left`, color: 'text-orange-600' }
    if (diffHours <= 24) return { text: `${diffHours}h left`, color: 'text-yellow-600' }
    return { text: `${diffDays}d left`, color: 'text-green-600' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <Employee_navbar />

      <main className="pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          {/* Mobile Layout - Header */}
          <div className="md:hidden mb-6">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">My Tasks</h2>
                  <p className="text-sm text-gray-600">Track and manage your assigned tasks</p>
                </div>
                <div className="ml-4 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-lg shadow-sm">
                  <span className="text-sm font-medium">{tasks.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <Search className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Search</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filter</span>
                </button>
                {isTeamLead && (
                  <button
                    onClick={() => setIsTaskFormOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-semibold">Add Task</span>
                  </button>
                )}
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <h3 className="text-sm font-semibold text-gray-900">Task Overview</h3>
                    <p className="text-xs text-gray-600">Total: {tasks.length} tasks assigned</p>
                  </div>
                  <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-lg shadow-sm">
                    <span className="text-sm font-medium">{tasks.filter(t => normalizeStatus(t.status) === 'in-progress').length} Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Filter Tabs */}
          <div className="md:hidden mb-6">
            <div className="flex space-x-1 bg-white border border-gray-200 rounded-xl shadow-sm p-1">
              {[
                { key: 'all', label: 'All', count: tasks.length },
                { key: 'pending', label: 'Pending', count: tasks.filter(t => normalizeStatus(t.status) === 'pending').length },
                { key: 'in-progress', label: 'Active', count: tasks.filter(t => normalizeStatus(t.status) === 'in-progress').length },
                { key: 'completed', label: 'Done', count: tasks.filter(t => normalizeStatus(t.status) === 'completed').length },
                { key: 'urgent', label: 'Urgent', count: tasks.filter(t => t.isUrgent || (t.priority || '').toString().toLowerCase() === 'urgent').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${filter === key
                    ? key === 'urgent'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex flex-col items-center space-y-0.5">
                    <span className="text-sm font-bold">{count}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Filter Tabs */}
          <div className="hidden md:block mb-8">
            <div className="flex space-x-1 bg-white border border-gray-200 rounded-xl shadow-sm p-1 max-w-fit">
              {[
                { key: 'all', label: 'All', count: tasks.length },
                { key: 'pending', label: 'Pending', count: tasks.filter(t => normalizeStatus(t.status) === 'pending').length },
                { key: 'in-progress', label: 'Active', count: tasks.filter(t => normalizeStatus(t.status) === 'in-progress').length },
                { key: 'completed', label: 'Done', count: tasks.filter(t => normalizeStatus(t.status) === 'completed').length },
                { key: 'urgent', label: 'Urgent', count: tasks.filter(t => t.isUrgent || (t.priority || '').toString().toLowerCase() === 'urgent').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filter === key
                    ? key === 'urgent'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-gray-600">Loading tasks...</span>
              </div>
            </div>
          )}

          {/* Responsive Task Cards */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {filteredTasks.map((task) => {
                const timeInfo = getTimeRemaining(task.dueDate)
                return (
                  <div
                    key={task._id}
                    onClick={() => navigate(`/employee-task/${task._id}`)}
                    className="group relative bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Header */}
                    <div className="relative flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${getStatusColor(task.status)} flex-shrink-0`}>
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </h3>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation() }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-all duration-200 flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {task.description}
                    </p>

                    {/* Tags Row */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(task.status)}`}>
                        {statusDisplayLabel(task.status)}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {(task.priority || '').toString() || 'Normal'}
                      </span>
                    </div>

                    {/* Project & Milestone */}
                    <div className="mb-3 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <span className="text-primary font-semibold">{task.project?.name || 'No Project'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <span className="text-primary font-semibold">{task.milestone?.title || 'No Milestone'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1.5 text-gray-500">
                          <User className="h-3.5 w-3.5" />
                          <span className="text-xs">{task.assignedTo?.[0]?.name || task.assignedTo?.[0]?.fullName || 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold ${timeInfo.color}`}>
                          {timeInfo.text}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filter or check back later for new assignments</p>
            </div>
          )}
        </div>
      </main>

      {/* Dedicated Team Lead task form – uses employee token only (no PM APIs) */}
      {isTeamLead && (
        <TeamLead_task_form
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={async (taskData) => {
            try {
              const created = await employeeService.createTaskAsTeamLead(taskData)
              const taskId = created?.data?._id || created?.data?.id || created?._id

              if (taskId && taskData.attachments?.length > 0) {
                for (const att of taskData.attachments) {
                  if (att?.file) await employeeService.uploadTaskAttachmentToTask(taskId, att.file)
                }
              }

              setIsTaskFormOpen(false)
              toast.success('Task created successfully!')
              loadTasks()
            } catch (error) {
              console.error('Error creating task:', error)
              toast.error(error.message || 'Failed to create task')
              throw error
            }
          }}
          teamMembers={teamMembers}
          availableProjects={teamProjects}
        />
      )}
    </div>
  )
}

export default Employee_tasks