import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PM_navbar from '../../DEV-components/PM_navbar'
import PM_milestone_form from '../../DEV-components/PM_milestone_form'
import PM_task_form from '../../DEV-components/PM_task_form'
import PM_project_form from '../../DEV-components/PM_project_form'
import { projectService, milestoneService, taskService } from '../../DEV-services'
import socketService from '../../DEV-services/socketService'
import { useToast } from '../../../../contexts/ToastContext'
import { FolderKanban, Calendar, Users, CheckSquare, TrendingUp, Clock, Target, User, Plus, Loader2, FileText, Paperclip, Upload, Eye, Download, X, Edit, Trash2, Key } from 'lucide-react'

const displayProgress = (p) => Math.min(100, Math.max(0, Number(p) || 0))

const PM_project_detail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [timeLeft, setTimeLeft] = useState('')
  const [isMilestoneFormOpen, setIsMilestoneFormOpen] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [project, setProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [newAttachment, setNewAttachment] = useState(null)
  const [showRevisionDialog, setShowRevisionDialog] = useState(false)
  const [selectedRevision, setSelectedRevision] = useState(null)
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false)
  const [isEditTaskFormOpen, setIsEditTaskFormOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [credentialsLoading, setCredentialsLoading] = useState(false)

  useEffect(() => {
    if (id && id !== 'null' && id !== null) {
      loadProjectData()
      setupWebSocket()
    }

    return () => {
      // Only cleanup event listeners, not the connection itself
      socketService.off('project_updated')
      socketService.off('milestone_created')
      socketService.off('milestone_updated')
      socketService.off('task_created')
      socketService.off('task_updated')
    }
  }, [id])

  const setupWebSocket = () => {
    const token = localStorage.getItem('pmToken')
    if (token) {
      socketService.connect(token)

      // Listen for real-time updates
      socketService.on('project_updated', () => {
        if (id && id !== 'null' && id !== null) loadProjectData()
      })

      socketService.on('milestone_created', () => {
        if (id && id !== 'null' && id !== null) loadMilestones()
      })

      socketService.on('milestone_updated', () => {
        if (id && id !== 'null' && id !== null) loadMilestones()
      })

      socketService.on('milestone_deleted', () => {
        if (id && id !== 'null' && id !== null) loadMilestones()
      })

      socketService.on('task_created', () => {
        if (id && id !== 'null' && id !== null) loadTasks()
      })

      socketService.on('task_updated', () => {
        if (id && id !== 'null' && id !== null) loadTasks()
      })

      socketService.on('task_deleted', () => {
        if (id && id !== 'null' && id !== null) loadTasks()
      })

      socketService.on('project_revision_updated', () => {
        if (id && id !== 'null' && id !== null) loadProjectData()
      })
    }
  }

  const loadProjectData = async () => {
    if (!id || id === 'null' || id === null) {
      console.warn('No project ID provided')
      return
    }

    try {
      setIsLoading(true)
      const response = await projectService.getProjectById(id)

      // Transform the data to match component expectations
      const projectData = {
        _id: response.data?._id || response._id,
        name: response.data?.name || response.name,
        description: response.data?.description || response.description,
        status: response.data?.status || response.status,
        priority: response.data?.priority || response.priority,
        progress: response.data?.progress || response.progress || 0, // Will be recalculated after milestones load
        dueDate: response.data?.dueDate || response.dueDate,
        startDate: response.data?.startDate || response.startDate,
        assignedTeam: response.data?.assignedTeam || response.assignedTeam || [],
        customer: (response.data?.client || response.client) ? {
          name: (response.data?.client || response.client)?.name || (response.data?.client || response.client)?.companyName
        } : null,
        client: response.data?.client || response.client,
        category: response.data?.category || response.category,
        attachments: response.data?.attachments || response.attachments || []
      }

      setProject({ ...projectData })

      // Load related data - milestones first so we can calculate progress
      const milestonesResponse = await milestoneService.getMilestonesByProject(id)
      const loadedMilestones = milestonesResponse.data || milestonesResponse || []

      // Calculate progress: 100% if project completed, else from completed milestones / total
      let progress = projectData.progress ?? 0
      if (projectData.status === 'completed') {
        progress = 100
      } else if (loadedMilestones.length > 0) {
        const totalMilestones = loadedMilestones.length
        const completedMilestones = loadedMilestones.filter(m => m.status === 'completed').length
        progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : progress
      }
      setProject(prev => ({ ...prev, ...projectData, progress }))

      setMilestones(loadedMilestones)

      // Load tasks
      await loadTasks()

      // Load project credentials (admin-created, read-only)
      loadCredentials()
    } catch (error) {
      console.error('Error loading project:', error)

      // Show error message (baseApiService already provides user-friendly messages)
      const errorMessage = error.message || 'Failed to load project details'
      toast.error(errorMessage)

      // Navigate back if project not found or unauthorized
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        setTimeout(() => {
          navigate('/pm-projects')
        }, 2000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadMilestones = async () => {
    try {
      const response = await milestoneService.getMilestonesByProject(id)
      const loadedMilestones = response.data || response || []
      setMilestones(loadedMilestones)

      // Update project progress: 100% if completed, else from completed milestones / total
      if (project) {
        const completed = project.status === 'completed'
        const calculatedProgress = completed
          ? 100
          : loadedMilestones.length > 0
            ? Math.round((loadedMilestones.filter(m => m.status === 'completed').length / loadedMilestones.length) * 100)
            : (project.progress ?? 0)
        setProject(prev => ({
          ...prev,
          progress: displayProgress(calculatedProgress)
        }))
      }
    } catch (error) {
      console.error('Error loading milestones:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const response = await taskService.getTasksByProject(id)
      setTasks(response.data || response || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const loadCredentials = async () => {
    if (!id || id === 'null' || id === null) return
    try {
      setCredentialsLoading(true)
      const response = await projectService.getProjectCredentials(id)
      const list = response?.data ?? response ?? []
      setCredentials(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error loading project credentials:', error)
      setCredentials([])
    } finally {
      setCredentialsLoading(false)
    }
  }

  const handleEditTask = (e, task) => {
    e.stopPropagation()
    setSelectedTask(task)
    setIsEditTaskFormOpen(true)
  }

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      await taskService.deleteTask(taskId)
      toast.success('Task deleted successfully')
      loadProjectData()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    }
  }

  const handleUpdateTask = async (taskData) => {
    try {
      await taskService.updateTask(selectedTask._id, taskData)
      toast.success('Task updated successfully')
      setIsEditTaskFormOpen(false)
      loadProjectData()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task')
    }
  }


  useEffect(() => {
    if (!project?.dueDate) { setTimeLeft('No due date'); return }
    const calc = () => {
      const now = new Date(); const due = new Date(project.dueDate)
      const diff = due.getTime() - now.getTime()
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        setTimeLeft(days > 0 ? `${days}d ${hours}h` : `${hours}h`)
      } else {
        const overdueDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
        setTimeLeft(`${overdueDays}d overdue`)
      }
    }
    calc(); const i = setInterval(calc, 60000); return () => clearInterval(i)
  }, [project?.dueDate])

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'milestones', label: 'Milestones', icon: Target },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'team', label: 'Team', icon: Users }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'active':
      case 'in-progress': return 'bg-primary/10 text-primary border-primary/20'
      case 'planning':
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'on-hold': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (p) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCountdownColor = () => {
    if (!project?.dueDate) return 'text-gray-600'
    const now = new Date(); const due = new Date(project.dueDate)
    const diff = due.getTime() - now.getTime(); const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'text-red-600'; if (days <= 1) return 'text-orange-600'; if (days <= 3) return 'text-yellow-600'; return 'text-blue-600'
  }

  const handleUploadChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewAttachment(file)
      setIsUploading(true)

      try {
        await projectService.uploadProjectAttachment(id, file)
        toast.success('File uploaded successfully!')
        // Reload project data to get updated attachments
        loadProjectData()
      } catch (error) {
        console.error('Error uploading file:', error)
        toast.error('Failed to upload file')
      } finally {
        setIsUploading(false)
        setNewAttachment(null)
      }
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleEditProject = () => {
    setIsProjectFormOpen(true)
  }

  const handleProjectFormSubmit = async (formData) => {
    try {
      setIsLoading(true)
      await projectService.updateProject(id, formData)
      toast.success('Project updated successfully!')
      setIsProjectFormOpen(false)
      // Reload project data to show updated information
      await loadProjectData()
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error(error.message || 'Failed to update project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectFormClose = () => {
    setIsProjectFormOpen(false)
  }

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '≡ƒôä'
    if (type.includes('image')) return '≡ƒû╝∩╕Å'
    if (type.includes('video')) return '≡ƒÄÑ'
    if (type.includes('word') || type.includes('document')) return '≡ƒô¥'
    if (type.includes('figma') || type.includes('fig')) return '≡ƒÄ¿'
    return '≡ƒôÄ'
  }

  const getRevisionStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleRevisionClick = (revisionType, revisionData) => {
    setSelectedRevision({ type: revisionType, data: revisionData });
    setShowRevisionDialog(true);
  }

  const handleRevisionStatusChange = async (newStatus) => {
    if (!selectedRevision) return;


    try {
      await projectService.updateProjectRevisionStatus(
        id,
        selectedRevision.type,
        { status: newStatus }
      );
      toast.success('Revision status updated successfully!');
      loadProjectData(); // Reload project to get updated revision data
    } catch (error) {
      console.error('Error updating revision status:', error);
      toast.error('Failed to update revision status');
    } finally {
      setShowRevisionDialog(false);
      setSelectedRevision(null);
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/20 rounded-2xl"><TrendingUp className="h-6 w-6 text-primary" /></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
                <p className="text-sm text-gray-600">Overall completion status</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{displayProgress(project?.progress)}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-500" style={{ width: `${displayProgress(project?.progress)}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-green-100 rounded-xl"><CheckSquare className="h-5 w-5 text-green-600" /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
                <div className="text-xs text-gray-500">Total Tasks</div>
              </div>
            </div>
            <div className="text-xs text-gray-600">{tasks.filter(t => t.status === 'completed').length} completed</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-xl"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{project.assignedTeam?.length || 0}</div>
                <div className="text-xs text-gray-500">Team Members</div>
              </div>
            </div>
            <div className="text-xs text-gray-600">Active contributors</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-xl"><Calendar className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Timeline</div>
                  <div className="text-sm text-gray-600">Project deadline</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getCountdownColor()}`}>{timeLeft}</div>
                <div className="text-xs text-gray-500">{new Date(project.dueDate).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
              <Paperclip className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate">Attachments</h3>
            <span className="text-sm text-gray-500 shrink-0">({project.attachments?.length || 0})</span>
          </div>
          <label className="flex items-center space-x-1.5 bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors cursor-pointer shrink-0">
            <Upload className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Upload</span>
            <input type="file" onChange={handleUploadChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx,.mp4,.fig,.txt,.zip" />
          </label>
        </div>

        {isUploading && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              <span className="text-xs text-blue-600">Uploading...</span>
            </div>
          </div>
        )}

        {newAttachment && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="text-lg shrink-0">{getFileIcon(newAttachment.type || 'file')}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{newAttachment.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(newAttachment.size)}</p>
                </div>
              </div>
              <button onClick={() => setNewAttachment(null)} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {project.attachments && project.attachments.length > 0 ? (
          <div className="space-y-2">
            {project.attachments.map((att, index) => (
              <div key={att._id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="text-lg shrink-0">{getFileIcon(att.format || att.resource_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 truncate">{att.originalName || att.original_filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(att.size || att.bytes)} • {new Date(att.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <a
                    href={att.secure_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={att.secure_url}
                    download={att.originalName || att.original_filename}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : !newAttachment && (
          <div className="text-center py-6">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Paperclip className="h-4 w-4 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No attachments yet</h3>
            <p className="text-xs text-gray-600">Upload files to share with your team</p>
          </div>
        )}
      </div>

      {/* Project Information */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary/20 rounded-xl"><FileText className="h-5 w-5 text-primary" /></div>
          <h3 className="text-lg font-bold text-gray-900">Project Information</h3>
        </div>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">{project.customer?.name ? project.customer.name.split(' ').map(w => w[0]).join('').substring(0, 2) : 'C'}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary/80 uppercase tracking-wide mb-1">Client</p>
            <p className="text-lg font-bold text-gray-900">{project.customer?.name || 'No client assigned'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg"><Calendar className="h-4 w-4 text-green-600" /></div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Start Date</p>
                <p className="text-sm font-bold text-gray-900">{project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/50 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-4 w-4 text-orange-600" /></div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Due Date</p>
                <p className="text-sm font-bold text-gray-900">{project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Credentials */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Key className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Project Credentials</h3>
            <p className="text-sm text-gray-500">Shared by Admin.</p>
          </div>
        </div>
        {credentialsLoading ? (
          <div className="flex items-center justify-center py-8 rounded-xl bg-gray-50 border border-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-sm text-gray-500">No credentials for this project.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => {
              const text = cred.additionalInfo ? cred.additionalInfo.replace(/,(\s*)$/gm, '$1').trim() : ''
              return (
                <div key={cred._id} className="group flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    {text ? (
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-sans">{text}</pre>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No credential text provided.</p>
                    )}
                  </div>
                  {text && (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied'); }}
                      className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                    >
                      Copy
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Project Revisions Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-xl">
            <CheckSquare className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Project Revisions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Revision Card */}
          <div
            onClick={() => handleRevisionClick('firstRevision', project.revisions?.firstRevision)}
            className="group bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${project.revisions?.firstRevision?.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
                  }`}>
                  {project.revisions?.firstRevision?.status === 'completed' ? '✓' : '1'}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    First Revision
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">Initial review and feedback</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${project.revisions?.firstRevision?.status === 'completed'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                  {project.revisions?.firstRevision?.status || 'pending'}
                </span>
              </div>
            </div>

            {project.revisions?.firstRevision?.completedDate && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Completed: {new Date(project.revisions.firstRevision.completedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Second Revision Card */}
          <div
            onClick={() => handleRevisionClick('secondRevision', project.revisions?.secondRevision)}
            className="group bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${project.revisions?.secondRevision?.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
                  }`}>
                  {project.revisions?.secondRevision?.status === 'completed' ? '✓' : '2'}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    Second Revision
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">Final review and approval</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${project.revisions?.secondRevision?.status === 'completed'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                  {project.revisions?.secondRevision?.status || 'pending'}
                </span>
              </div>
            </div>

            {project.revisions?.secondRevision?.completedDate && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Completed: {new Date(project.revisions.secondRevision.completedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMilestones = () => (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h3>
          <p className="text-gray-600 mb-4">Create your first milestone to track progress</p>
          <button onClick={() => setIsMilestoneFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2 rounded-full text-sm font-medium">Add Milestone</button>
        </div>
      ) : (
        milestones.map((m) => (
          <div key={m._id} onClick={() => navigate(`/pm-milestone/${m._id}?projectId=${id}`)} className="group bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 flex-1">
                <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl"><Target className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors duration-300">{m.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(m.status)}`}>{m.status}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(m.priority)}`}>{m.priority}</span>
                    <span className="text-xs text-gray-500">Seq: {m.sequence || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{m.description || 'No description available'}</p>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Progress</span><span className="text-gray-900 font-medium">{displayProgress(m.progress)}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all duration-300" style={{ width: `${displayProgress(m.progress)}%` }}></div></div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-1"><Calendar className="h-4 w-4" /><span>Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No date'}</span></div>
              <div className="flex items-center space-x-1"><User className="h-4 w-4" /><span>{m.assignedTo?.length || 0} assigned</span></div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderTasks = () => (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-600 mb-4">Create your first task to get started</p>
          <button onClick={() => setIsTaskFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2 rounded-full text-sm font-medium">Add Task</button>
        </div>
      ) : (
        tasks.map((task) => (
          <div key={task._id} onClick={() => navigate(`/pm-task/${task._id}?projectId=${id}`)} className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 truncate">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-primary'}`}>{task.status === 'completed' && (<CheckSquare className="h-3 w-3 text-white" />)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-base font-semibold truncate ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 group-hover:text-primary'}`}>{task.title}</h3>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1.5"><User className="h-3.5 w-3.5" /><span>{task.assignedTo?.[0]?.name || task.assignedTo?.[0]?.fullName || 'Unassigned'}</span></div>
                    <div className="flex items-center space-x-1.5"><Calendar className="h-3.5 w-3.5" /><span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={(e) => handleEditTask(e, task)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                  title="Edit Task"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteTask(e, task._id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="Delete Task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderTeam = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!project?.assignedTeam || !Array.isArray(project.assignedTeam) || project.assignedTeam.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members assigned</h3>
            <p className="text-gray-600">Team members will appear here when assigned to the project</p>
          </div>
        ) : (
          project.assignedTeam.map((member) => {
            // Handle case where member might be just an ID string
            if (typeof member === 'string') {
              // If we only have an ID, we might need to fetch details or just show a placeholder
              // For now, let's try to find it in the milestones or tasks if possible, or just show ID
              return (
                <div key={member} className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-base font-bold text-gray-500">?</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900">
                        Unknown Member ({member.substring(0, 6)}...)
                      </h3>
                      <p className="text-sm text-gray-600">Details not loaded</p>
                    </div>
                  </div>
                </div>
              );
            }

            // Handle different possible name fields and ensure we have a name
            const memberName = member.fullName || member.name ||
              (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null) ||
              'Unknown Member';

            // Safely generate initials
            let initials = 'UM';
            if (memberName && memberName !== 'Unknown Member' && typeof memberName === 'string') {
              try {
                initials = memberName.split(' ').map(w => w[0]).join('').substring(0, 2);
              } catch (error) {
                console.warn('Error generating initials for member:', member, error);
                initials = 'UM';
              }
            }
            const jobTitle = member.jobTitle || member.position || member.role || 'Team Member';

            return (
              <div key={member._id || Math.random()} className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-base font-bold text-primary">{initials}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors duration-200">
                      {memberName}
                    </h3>
                    <p className="text-sm text-gray-600">{jobTitle}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'milestones': return renderMilestones()
      case 'tasks': return renderTasks()
      case 'team': return renderTeam()
      default: return renderOverview()
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <PM_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 text-lg font-medium mb-2">Invalid Project ID</div>
                <div className="text-gray-600">No project ID provided in the URL</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <PM_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2 text-gray-600">Loading project details...</span></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <PM_navbar />
      <main className="pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          {/* Mobile header card */}
          <div className="md:hidden mb-8">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl"><FolderKanban className="h-6 w-6 text-primary" /></div>
                    <h1 className="text-lg md:text-xl font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{project.name}</h1>
                    <button
                      onClick={handleEditProject}
                      className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200 flex-shrink-0"
                      title="Edit Project"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className={`text-sm font-semibold ${getCountdownColor()}`}>{timeLeft}</div>
                  <div className="text-xs text-gray-500 mt-1">Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No date'}</div>
                </div>
              </div>
              <div className="mb-6"><p className="text-sm text-gray-600 leading-relaxed">{project.description}</p></div>
              <div className="flex items-center space-x-2 mb-6 overflow-x-auto">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(project.status)}`}>{project.status}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityColor(project.priority)}`}>{project.priority}</span>
              </div>
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <button onClick={() => setIsMilestoneFormOpen(true)} className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"><Target className="h-5 w-5" /><span className="font-semibold text-sm">Add Milestone</span></button>
                  <button onClick={() => setIsTaskFormOpen(true)} className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"><Plus className="h-5 w-5" /><span className="font-semibold text-sm">Add Task</span></button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden md:block mb-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4 mb-4 flex-1">
                  <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl"><FolderKanban className="h-8 w-8 text-primary" /></div>
                  <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 line-clamp-2">{project.name}</h1>
                  <button
                    onClick={handleEditProject}
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200 flex-shrink-0"
                    title="Edit Project"
                  >
                    <Edit className="h-6 w-6" />
                  </button>
                </div>
                <div className="flex-shrink-0 text-right"><div className={`text-lg font-semibold ${getCountdownColor()}`}>{timeLeft}</div><div className="text-sm text-gray-500 mt-1">Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No date'}</div></div>
              </div>
              <div className="mb-6"><p className="text-lg text-gray-600 leading-relaxed">{project.description}</p></div>
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(project.status)}`}>{project.status}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPriorityColor(project.priority)}`}>{project.priority}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setIsMilestoneFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"><Target className="h-5 w-5" /><span className="font-semibold">Add Milestone</span></button>
                  <button onClick={() => setIsTaskFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"><Plus className="h-5 w-5" /><span className="font-semibold">Add Task</span></button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden mb-6">
            <div className="grid grid-cols-2 gap-3">
              {tabs.map(t => {
                const I = t.icon; return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} className={`p-4 rounded-2xl shadow-sm border transition-all ${activeTab === t.key ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 active:scale-95'}`}>
                    <div className="flex flex-col items-center space-y-2"><I className="h-6 w-6" /><span className="text-sm font-medium">{t.label}</span></div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:block mb-8">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              {tabs.map(t => {
                const I = t.icon; return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                    <I className="h-4 w-4" /><span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-[400px]">{activeTab === 'overview' ? renderOverview() : activeTab === 'milestones' ? renderMilestones() : activeTab === 'tasks' ? renderTasks() : renderTeam()}</div>
        </div>
      </main>

      <PM_milestone_form
        isOpen={isMilestoneFormOpen}
        onClose={() => setIsMilestoneFormOpen(false)}
        onSubmit={(milestone) => {
          setIsMilestoneFormOpen(false);
          // Reload milestones after creation
          loadMilestones();
          toast.success('Milestone created successfully!');
        }}
        projectId={project?._id}
      />
      <PM_task_form
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSubmit={async (taskData) => {
          try {
            // Create task
            const createdTask = await taskService.createTask(taskData)

            // Upload attachments if any
            if (taskData.attachments && taskData.attachments.length > 0) {
              toast.info(`Uploading ${taskData.attachments.length} attachment(s)...`)

              for (const attachment of taskData.attachments) {
                try {
                  const file = attachment.file || attachment
                  await taskService.uploadTaskAttachment(createdTask._id, file)
                  toast.success(`Attachment ${attachment.name} uploaded successfully`)
                } catch (error) {
                  console.error('Attachment upload error:', error)
                  toast.error(`Failed to upload ${attachment.name}`)
                }
              }
            }

            setIsTaskFormOpen(false);
            loadTasks();
            toast.success('Task created successfully!');
          } catch (error) {
            console.error('Error creating task:', error)
            toast.error(error.message || 'Failed to create task')
          }
        }}
        projectId={project?._id}
        milestoneId={null} // Let user select milestone
      />
      <PM_task_form
        isOpen={isEditTaskFormOpen}
        onClose={() => setIsEditTaskFormOpen(false)}
        onSubmit={handleUpdateTask}
        projectId={selectedTask?.project?._id || selectedTask?.project || id}
        milestoneId={selectedTask?.milestone?._id || selectedTask?.milestone}
        initialData={selectedTask}
      />

      {/* Revision Status Dialog */}
      {showRevisionDialog && selectedRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <CheckSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manage Revision</h3>
                  <p className="text-sm text-gray-600">{selectedRevision.type === 'firstRevision' ? 'First Revision' : 'Second Revision'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRevisionDialog(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                {selectedRevision.type === 'firstRevision'
                  ? 'Initial review and feedback for the project'
                  : 'Final review and approval for the project'
                }
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedRevision.data?.status === 'completed'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                    {selectedRevision.data?.status || 'pending'}
                  </span>
                </div>
                {selectedRevision.data?.completedDate && (
                  <div className="text-xs text-gray-500">
                    Completed: {new Date(selectedRevision.data.completedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Update Status:</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRevisionStatusChange('pending')}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedRevision.data?.status === 'pending'
                    ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                    : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 text-gray-700'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                </button>
                <button
                  onClick={() => handleRevisionStatusChange('completed')}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedRevision.data?.status === 'completed'
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-700'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowRevisionDialog(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Form Dialog */}
      <PM_project_form
        isOpen={isProjectFormOpen}
        onClose={handleProjectFormClose}
        onSubmit={handleProjectFormSubmit}
        projectData={project}
      />
    </div>
  )
}

export default PM_project_detail
