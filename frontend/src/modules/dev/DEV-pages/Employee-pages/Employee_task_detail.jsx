import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import { employeeService, getStoredEmployeeData } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'
import { ArrowLeft, CheckSquare, Calendar, User, Clock, FileText, Download, Eye, Users, Paperclip, AlertCircle, CheckCircle, Loader2, AlertTriangle, Save, Plus, Edit, Trash2 } from 'lucide-react'
import PM_task_form from '../../DEV-components/PM_task_form'
import ConfirmationModal from '../../DEV-components/ConfirmationModal'

const Employee_task_detail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const projectId = searchParams.get('projectId')
  const [task, setTask] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [error, setError] = useState(null)

  // Team Lead states
  const [isTeamLead, setIsTeamLead] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [isEditTaskFormOpen, setIsEditTaskFormOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Helper functions to convert between backend and frontend status formats
  const backendToDisplayStatus = (backendStatus) => {
    const statusMap = {
      'pending': 'Pending',
      'in-progress': 'In Progress',
      'testing': 'Testing',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }
    return statusMap[backendStatus] || backendStatus
  }

  const displayToBackendStatus = (displayStatus) => {
    const statusMap = {
      'Pending': 'pending',
      'In Progress': 'in-progress',
      'Testing': 'testing',
      'Completed': 'completed',
      'Cancelled': 'cancelled'
    }
    return statusMap[displayStatus] || displayStatus.toLowerCase()
  }

  useEffect(() => {
    const loadTask = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const taskData = await employeeService.getEmployeeTaskById(id)
        setTask(taskData)
        setCurrentStatus(backendToDisplayStatus(taskData.status))

        // Initial check from storage
        const employeeData = getStoredEmployeeData()
        if (employeeData && employeeData.isTeamLead) {
          setIsTeamLead(true)
        }

        // Real-time check from server
        try {
          const teamData = await employeeService.getMyTeam()
          const teamBody = teamData?.data || teamData
          if (teamBody?.isTeamLead) {
            setIsTeamLead(true)
            setTeamMembers(teamBody.teamMembers || [])
          }
        } catch (teamError) {
          console.log('User is not a team lead or error fetching teamData:', teamError)
        }
      } catch (err) {
        console.error('Error loading task:', err)
        setError(err.message || 'Failed to load task details')
        toast.error('Failed to load task details')
      } finally {
        setIsLoading(false)
      }
    }
    loadTask()
  }, [id, toast])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.dropdown-container')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  const getStatusColor = (status) => {
    // Handle both backend format (pending, in-progress) and display format (Pending, In Progress)
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress':
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'testing': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (p) => {
    // Handle both backend format (urgent, high) and display format (Urgent, High)
    const normalizedPriority = p?.toLowerCase() || ''
    switch (normalizedPriority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal':
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatStatus = (s) => {
    if (!s) return 'Unknown'
    // If already in display format, return as is
    if (s === 'In Progress' || s === 'Pending' || s === 'Completed' || s === 'Cancelled' || s === 'Testing') {
      return s
    }
    // Convert backend format to display format
    return backendToDisplayStatus(s)
  }

  const formatPriority = (p) => {
    if (!p) return 'Normal'
    const priorityMap = {
      'urgent': 'Urgent',
      'high': 'High',
      'normal': 'Normal',
      'medium': 'Medium',
      'low': 'Low'
    }
    return priorityMap[p.toLowerCase()] || p.charAt(0).toUpperCase() + p.slice(1)
  }
  const formatFileSize = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`

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

  const statusOptions = [
    { value: 'Pending', label: 'Pending', backendValue: 'pending' },
    { value: 'In Progress', label: 'In Progress', backendValue: 'in-progress' },
    { value: 'Testing', label: 'Testing', backendValue: 'testing' },
    { value: 'Completed', label: 'Completed', backendValue: 'completed' },
    { value: 'Cancelled', label: 'Cancelled', backendValue: 'cancelled' }
  ]

  const handleStatusUpdate = async () => {
    if (!task) return

    const currentDisplayStatus = backendToDisplayStatus(task.status)
    if (currentStatus === currentDisplayStatus) {
      toast.info('Status is already up to date')
      return
    }

    setIsUpdating(true)
    try {
      const backendStatus = displayToBackendStatus(currentStatus)
      // actualHours and comments are optional, pass undefined
      const response = await employeeService.updateEmployeeTaskStatus(id, backendStatus, undefined, undefined)

      // Update task with response data
      setTask(response)
      setCurrentStatus(backendToDisplayStatus(response.status))

      toast.success(`Task status updated to ${currentStatus}`)

      // If completed, show points notification if available
      if (backendStatus === 'completed' && response.pointsAwarded) {
        toast.success(`You earned ${response.pointsAwarded} point(s)!`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(error.message || 'Failed to update task status')
      // Reset to original status on error
      setCurrentStatus(backendToDisplayStatus(task.status))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTask = async () => {
    setIsUpdating(true)
    try {
      await employeeService.deleteTaskAsTeamLead(id)
      toast.success('Task deleted successfully')
      navigate(projectId ? `/employee-project/${projectId}` : -1)
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    } finally {
      setIsUpdating(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleUpdateTask = async (taskData) => {
    try {
      const response = await employeeService.updateTaskAsTeamLead(id, taskData)
      const updatedTask = response?.data || response
      setTask(updatedTask)
      toast.success('Task updated successfully')
      setIsEditTaskFormOpen(false)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Employee_navbar />
        <div className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-lg text-gray-600">Loading task details...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const backUrl = projectId ? `/employee-project/${projectId}` : '/employee-tasks'
  const backLabel = projectId ? 'Back to Project' : 'Back to Tasks'

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Employee_navbar />
        <div className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate(backUrl)}
              className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />{backLabel}
            </button>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Error Loading Task</h3>
                  <p className="text-sm text-red-700 mt-1">{error || 'Task not found'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const timeInfo = getTimeRemaining(task.dueDate)

  // Dev team lead: can update status and edit/delete only their own tasks (where they are in assignedTo). Team member tasks: no status dropdown or edit/delete.
  const currentUserId = (getStoredEmployeeData()?.id || getStoredEmployeeData()?._id || '').toString()
  const isAssignedToMe = task.assignedTo && task.assignedTo.some(
    a => (a && (a._id?.toString() === currentUserId || (a.toString && a.toString() === currentUserId)))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Employee_navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(backUrl)}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {backLabel}
          </button>

          {/* Urgent Task Warning */}
          {task.isUrgent && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500 text-white p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Urgent Task</h4>
                  <p className="text-xs text-red-700">This task requires immediate attention and priority handling</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex-shrink-0 shadow-sm">
                <CheckSquare className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words leading-tight">{task.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                    {formatStatus(task.status)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                    {formatPriority(task.priority)}
                  </span>
                  {(task.isUrgent || task.priority === 'urgent') && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                      URGENT
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Team lead can edit or delete any task (own or team members') on task details page */}
                {isTeamLead && (
                  <>
                    <button
                      onClick={() => setIsEditTaskFormOpen(true)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20 bg-white shadow-sm"
                      title="Edit Task"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 bg-white shadow-sm"
                      title="Delete Task"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Description</span>
              </h3>
              <p className="text-gray-700 leading-relaxed">{task.description || 'No description provided'}</p>
            </div>

            {/* Status Update Section – only when task is assigned to current user (team lead cannot update team members' task status) */}
            {isAssignedToMe && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span>Update Status</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Current Status</label>
                    <div className="relative dropdown-container">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full h-12 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-left flex items-center justify-between cursor-pointer hover:border-gray-300"
                      >
                        <span className="text-gray-900">{currentStatus || 'Select status'}</span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {statusOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setCurrentStatus(option.value)
                                setIsDropdownOpen(false)
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 flex items-center justify-between ${currentStatus === option.value ? 'bg-primary/5 text-primary' : 'text-gray-900'
                                }`}
                            >
                              <span>{option.label}</span>
                              {currentStatus === option.value && (
                                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdating || currentStatus === backendToDisplayStatus(task.status)}
                    className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Status
                      </>
                    )}
                  </button>
                  {currentStatus === backendToDisplayStatus(task.status) && (
                    <p className="text-xs text-gray-500 text-center">Status is already up to date</p>
                  )}
                </div>
              </div>
            )}

            {task.attachments && task.attachments.length > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Paperclip className="h-5 w-5 text-primary" />
                  <span>Attachments ({task.attachments.length})</span>
                </h3>
                <div className="space-y-3">
                  {task.attachments.map((att, idx) => {
                    const attachmentUrl = att.secure_url || att.url || '#'
                    const attachmentName = att.originalName || att.original_filename || att.name || `Attachment ${idx + 1}`
                    const attachmentSize = att.bytes || att.size || 0
                    const uploadDate = att.uploadedAt || att.createdAt || new Date()

                    return (
                      <div key={att._id || att.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📎</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachmentName}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(attachmentSize)} • Uploaded {new Date(uploadDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <a
                            href={attachmentUrl}
                            download={attachmentName}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Due date</label>
                  <p className="text-base font-medium text-gray-900 flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</span>
                  </p>
                  <p className={`text-sm font-medium mt-1 ${timeInfo.color}`}>
                    {timeInfo.text}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created on</label>
                  <p className="text-base font-medium text-gray-900 flex items-center space-x-2 mt-1">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</span>
                  </p>
                </div>
                {task.startDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Started on</label>
                    <p className="text-base font-medium text-gray-900 flex items-center space-x-2 mt-1">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{new Date(task.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </p>
                  </div>
                )}
                {task.completedDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Completed on</label>
                    <p className="text-base font-medium text-gray-900 flex items-center space-x-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{new Date(task.completedDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-sm ${getPriorityColor(task.priority)}`}>
                      {formatPriority(task.priority)}
                    </span>
                  </p>
                </div>
                {task.createdBy && (task.createdBy.name || task.createdBy.email) && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created by</label>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {task.createdBy.name || task.createdBy.email || '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Assigned to</span>
              </h3>
              {task.assignedTo && task.assignedTo.length > 0 ? (
                <div className="space-y-3">
                  {task.assignedTo.map((m, idx) => (
                    <div key={m._id || m.id || idx} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.name || m.fullName || 'Unknown'}</p>
                        {(m.position || m.department) && (
                          <p className="text-xs text-gray-500">{[m.position, m.department].filter(Boolean).join(' · ')}</p>
                        )}
                        {m.email && <p className="text-xs text-gray-500">{m.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No one assigned</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project &amp; Milestone</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Project</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{task.project?.name || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Milestone</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{task.milestone?.title || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {isTeamLead && (
        <PM_task_form
          isOpen={isEditTaskFormOpen}
          onClose={() => setIsEditTaskFormOpen(false)}
          onSubmit={handleUpdateTask}
          projectId={task.project?._id || task.project}
          milestoneId={task.milestone?._id || task.milestone}
          initialData={task}
          isTeamLead={true}
          teamMembers={teamMembers}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        description="A deleted task cannot be revert."
        confirmText="Delete Task"
        cancelText="Cancel"
        isLoading={isUpdating}
      />
    </div>
  )
}

export default Employee_task_detail
