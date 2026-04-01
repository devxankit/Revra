import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PM_navbar from '../../DEV-components/PM_navbar'
import PM_task_form from '../../DEV-components/PM_task_form'
import { taskService, socketService, tokenUtils } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'
import { CheckSquare, Plus, Search, Filter, Calendar, User, MoreVertical, Loader2, AlertTriangle } from 'lucide-react'

const PM_tasks = () => {
  const { toast } = useToast()
  const [filter, setFilter] = useState('all')
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadTasks()
    setupWebSocket()

    return () => {
      // Only cleanup event listeners, not the connection itself
      socketService.off('task_created')
      socketService.off('task_updated')
      socketService.off('task_deleted')
      socketService.off('task_status_updated')
    }
  }, [])

  const setupWebSocket = () => {
    const token = localStorage.getItem('pmToken')
    if (token && tokenUtils.isAuthenticated()) {
      try {
        socketService.connect(token)

        // Listen for real-time updates
        socketService.on('task_created', () => {
          loadTasks()
        })

        socketService.on('task_updated', () => {
          loadTasks()
        })

        socketService.on('task_deleted', () => {
          loadTasks()
        })
      } catch (error) {
        console.warn('WebSocket connection failed:', error)
      }
    } else {
      console.warn('No valid PM token found, skipping WebSocket connection')
    }
  }

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if PM is authenticated
      if (!tokenUtils.isAuthenticated()) {
        throw new Error('PM not authenticated')
      }

      // Get all tasks for this PM using the new endpoint
      const tasksResponse = await taskService.getAllTasks({
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      const allTasks = tasksResponse.data || []

      setTasks(allTasks)
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err.message || 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }


  const handleTaskSubmit = async (taskData) => {
    try {
      // Create task
      const createdTask = await taskService.createTask(taskData)

      // Upload attachments if any
      if (taskData.attachments && taskData.attachments.length > 0) {
        toast.info(`Uploading ${taskData.attachments.length} attachment(s)...`)

        for (const attachment of taskData.attachments) {
          try {
            // Check if attachment has a file property, otherwise use the attachment directly
            const file = attachment.file || attachment

            // Upload to backend
            await taskService.uploadTaskAttachment(createdTask._id, file)

            toast.success(`Attachment ${attachment.name} uploaded successfully`)
          } catch (error) {
            console.error('Attachment upload error:', error)
            toast.error(`Failed to upload ${attachment.name}`)
          }
        }
      }

      toast.success('Task created successfully!')
      loadTasks() // Reload tasks to show the new one
      setIsTaskFormOpen(false)
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error(err.message || 'Failed to create task')
      setError(err.message || 'Failed to create task')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-primary/10 text-primary border-primary/20'
      case 'testing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTasks = tasks.filter(task => {
    const taskStatus = (task.status || '').toLowerCase()
    let matchesFilter = false;

    if (filter === 'all') {
      matchesFilter = true;
    } else if (filter === 'in progress') {
      matchesFilter = taskStatus === 'in-progress';
    } else {
      matchesFilter = taskStatus === filter.toLowerCase();
    }

    const matchesSearch = !searchTerm ||
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <PM_navbar />

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
          {/* Mobile Layout - Creative Tile with Button */}
          <div className="md:hidden mb-6">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Manage your tasks</h2>
                  <p className="text-sm text-gray-600">Add new tasks and track progress</p>
                </div>
                <button
                  onClick={() => setIsTaskFormOpen(true)}
                  className="ml-4 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Add Task</span>
                </button>
              </div>
            </div>

            {/* Urgent Tasks Card */}
            <div className="mt-4 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => navigate('/pm-urgent-tasks')}>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <h2 className="text-lg font-semibold text-red-900">Assign Urgent Tasks</h2>
                  <p className="text-sm text-red-700">Create and assign critical tasks to team members</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Header with Create Button */}
          <div className="hidden md:block mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <h3 className="text-sm font-semibold text-gray-900">Stay productive today</h3>
                    <p className="text-xs text-gray-600">Add new tasks and track progress</p>
                  </div>
                  <button
                    onClick={() => setIsTaskFormOpen(true)}
                    className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">New Task</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Urgent Tasks Card - Desktop */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => navigate('/pm-urgent-tasks')}>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Assign Urgent Tasks</h3>
                  <p className="text-sm text-red-700">Create and assign critical tasks to team members</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Filter Tabs */}
          <div className="md:hidden mb-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'all', label: 'All', count: tasks.length },
                { key: 'pending', label: 'Pending', count: tasks.filter(t => (t.status || '').toLowerCase() === 'pending').length },
                { key: 'in progress', label: 'Active', count: tasks.filter(t => (t.status || '').toLowerCase() === 'in-progress').length },
                { key: 'completed', label: 'Done', count: tasks.filter(t => (t.status || '').toLowerCase() === 'completed').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`p-4 rounded-2xl shadow-sm border transition-all ${filter === key
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 active:scale-95'
                    }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Filter Tabs */}
          <div className="hidden md:block mb-8">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All', count: tasks.length },
                { key: 'pending', label: 'Pending', count: tasks.filter(t => (t.status || '').toLowerCase() === 'pending').length },
                { key: 'in progress', label: 'Active', count: tasks.filter(t => (t.status || '').toLowerCase() === 'in-progress').length },
                { key: 'completed', label: 'Done', count: tasks.filter(t => (t.status || '').toLowerCase() === 'completed').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === key
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar - Unified placement below metric cards */}
          <div className="mb-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search tasks by title, description or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => navigate(`/pm-task/${task._id}`)}
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
                      {task.status}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
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
                      <div className={`text-xs font-semibold ${(() => {
                        const now = new Date()
                        const due = new Date(task.dueDate)
                        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        if (diffDays < 0) return 'text-red-600'
                        if (diffDays <= 1) return 'text-orange-600'
                        if (diffDays <= 3) return 'text-yellow-600'
                        return 'text-green-600'
                      })()}`}>
                        {(() => {
                          const now = new Date()
                          const due = new Date(task.dueDate)
                          const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          if (diffDays < 0) return `${Math.abs(diffDays)}d`
                          if (diffDays === 0) return 'Today'
                          if (diffDays === 1) return '1d'
                          return `${diffDays}d`
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filter or create a new task</p>
              <button
                onClick={() => setIsTaskFormOpen(true)}
                className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2 rounded-full text-sm font-medium"
              >
                Create Task
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Task Form */}
      <PM_task_form
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSubmit={handleTaskSubmit}
        projectId={null} // No pre-selected project - PM needs to choose
        milestoneId={null} // No pre-selected milestone
      />
    </div>
  )
}

export default PM_tasks
