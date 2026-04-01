import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import PM_task_form from '../../DEV-components/PM_task_form'
import TeamLead_task_form from '../../DEV-components/TeamLead_task_form'
import { employeeService, getStoredEmployeeData } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'
import {
  FiFolder as FolderKanban,
  FiCalendar as Calendar,
  FiUser as User,
  FiClock as Clock,
  FiTarget as Target,
  FiUsers as Users,
  FiArrowLeft as ArrowLeft,
  FiCheckSquare as CheckSquare,
  FiTrendingUp as TrendingUp,
  FiFileText as FileText,
  FiBarChart2 as BarChart3,
  FiPlus as Plus,
  FiEdit as Edit,
  FiTrash2 as Trash2,
  FiKey as Key
} from 'react-icons/fi'
import { Loader2 } from 'lucide-react'

const Employee_project_detail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [project, setProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [isTeamLead, setIsTeamLead] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isEditTaskFormOpen, setIsEditTaskFormOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [tasks, setTasks] = useState([])
  const [credentials, setCredentials] = useState([])
  const [credentialsLoading, setCredentialsLoading] = useState(false)

  const loadCredentials = async () => {
    if (!id) return
    try {
      setCredentialsLoading(true)
      const response = await employeeService.getProjectCredentials(id)
      const list = response?.data ?? response ?? []
      setCredentials(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Error loading project credentials:', err)
      setCredentials([])
    } finally {
      setCredentialsLoading(false)
    }
  }

  const loadProjectData = async () => {
    if (!id) return

    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
    if (!isValidObjectId) {
      setError('Invalid project ID. Please navigate to this page from the projects list.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const projectData = await employeeService.getEmployeeProjectById(id)
      const project = projectData?.data || projectData

      if (!project) {
        throw new Error('Project data not found in response')
      }

      const transformedProject = {
        ...project,
        customer: project.client ? {
          company: project.client.company || project.client.companyName || 'N/A'
        } : null,
        assignedTeam: (project.assignedTeam || []).map(member => ({
          ...member,
          fullName: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown'
        })),
        // Project Progress = % of milestones with status 'completed' (or API progress if no milestones)
        progress: (() => {
          if (project.milestones && project.milestones.length > 0) {
            const totalMilestones = project.milestones.length
            const completedMilestones = project.milestones.filter(m => (m.status || '').toLowerCase() === 'completed').length
            return totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
          }
          return project.progress != null ? Number(project.progress) : 0
        })(),
        myTasks: project.milestones ? project.milestones.reduce((sum, m) => sum + (m.employeeTasks || 0), 0) : 0,
        myCompletedTasks: project.milestones ? project.milestones.reduce((sum, m) => sum + (m.employeeCompletedTasks || 0), 0) : 0
      }

      // Milestone progress = % of tasks completed in that milestone (from backend or computed), clamped 0-100
      const transformedMilestones = (project.milestones || []).map(milestone => {
        const totalTasks = milestone.totalTasks ?? (milestone.tasks || []).length
        const completedTasks = milestone.completedTasks ?? (milestone.tasks || []).filter(t => (t.status || '').toLowerCase() === 'completed').length
        const rawProgress = milestone.progress != null
          ? Number(milestone.progress)
          : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0)
        const progress = Math.min(100, Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0))
        return {
          ...milestone,
          progress,
          myTasks: milestone.employeeTasks ?? 0,
          myCompletedTasks: milestone.employeeCompletedTasks ?? 0
        }
      })

      setProject(transformedProject)
      setMilestones(transformedMilestones)

      // Derive tasks from project milestones (employee API already includes them; PM task API uses wrong auth for employees)
      const tasksFromMilestones = (project.milestones || []).flatMap(m => m.tasks || []).filter(Boolean)
      const tasksById = new Map()
      tasksFromMilestones.forEach(t => { if (t._id) tasksById.set(t._id, t) })
      setTasks(Array.from(tasksById.values()))

      try {
        const teamData = await employeeService.getMyTeam()
        const team = teamData?.data || teamData
        if (team?.isTeamLead || teamData?.success) {
          setIsTeamLead(true)
          setTeamMembers(team.teamMembers || [])
        }
      } catch (teamError) {
        console.log('User is not a team lead or team data unavailable')
      }

      loadCredentials()
    } catch (error) {
      console.error('Error loading project details:', error)
      setError(error.message || 'Failed to load project details. Please try again.')
      setProject(null)
      setMilestones([])
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjectData()
  }, [id])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'active': return 'bg-primary/10 text-primary border-primary/20'
      case 'planning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'on-hold': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'normal': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
      await employeeService.deleteTaskAsTeamLead(taskId)
      toast.success('Task deleted successfully')
      await loadProjectData()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    }
  }

  const handleUpdateTask = async (taskData) => {
    try {
      await employeeService.updateTaskAsTeamLead(selectedTask._id, taskData)
      toast.success('Task updated successfully')
      setIsEditTaskFormOpen(false)
      await loadProjectData()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <Employee_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64 text-gray-600">Loading project details...</div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <Employee_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-red-100">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Project</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => navigate('/employee/projects')}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Back to Projects
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <Employee_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
            <div className="text-center py-12">
              <p className="text-gray-600">Project not found</p>
              <button
                onClick={() => navigate('/employee/projects')}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Back to Projects
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'milestones', label: 'Milestones', icon: Target },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'team', label: 'Team', icon: Users }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/20 rounded-2xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
                <p className="text-sm text-gray-600">Overall completion status</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{project.progress || 0}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-500" style={{ width: `${project.progress || 0}%` }} />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary/20 rounded-xl">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Project Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Start Date</p>
                <p className="text-sm font-bold text-gray-900">{new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/50 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Due Date</p>
                <p className="text-sm font-bold text-gray-900">{new Date(project.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
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
    </div>
  )

  const renderMilestones = () => (
    <div className="space-y-4">
      {milestones.length > 0 ? milestones.map((ms) => (
        <div key={ms._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => navigate(`/employee/milestone-details/${ms._id}?projectId=${id}`)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">{ms.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium border ${getStatusColor(ms.status)}`}>{ms.status}</span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="text-gray-900 font-medium">{ms.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
              <div className="bg-gradient-to-r from-primary to-primary-dark h-2 md:h-3 rounded-full transition-all duration-300" style={{ width: `${ms.progress || 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Due: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'No due date'}</span>
            <span>My Tasks: {ms.myCompletedTasks || 0}/{ms.myTasks || 0}</span>
          </div>
        </div>
      )) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h3>
          <p className="text-gray-600">Milestones will appear here when they are created</p>
        </div>
      )}
    </div>
  )

  const renderTeam = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {project.assignedTeam?.map(member => (
        <div key={member._id} className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-200">
              <span className="text-base font-bold text-primary">{(member.fullName || member.name || '?').toString().trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors duration-200">{member.fullName || member.name || 'Team Member'}</h3>
              <p className="text-sm text-gray-600">Team Member</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderTasks = () => {
    const currentUserId = (getStoredEmployeeData()?.id || getStoredEmployeeData()?._id || '').toString()

    return (
      <div className="space-y-3">
        {tasks.length > 0 ? tasks.map((task) => {
          const createdByRaw = task.createdBy && (task.createdBy._id || task.createdBy.id || task.createdBy)
          const createdById = createdByRaw && createdByRaw.toString ? createdByRaw.toString() : ''
          const canManageTask = isTeamLead && currentUserId && createdById && createdById === currentUserId

          return (
          <div key={task._id} onClick={() => navigate(`/employee-task/${task._id}?projectId=${id}`)} className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 truncate">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-primary'}`}>
                  {task.status === 'completed' && (<CheckSquare className="h-3 w-3 text-white" />)}
                </div>
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>{task.status}</span>
                {canManageTask && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
          )
        }) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600">Tasks for this project will appear here</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <Employee_navbar />
      <main className="pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${getStatusColor(project.status)}`}>
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl md:text-3xl font-bold text-gray-900">{project.name}</h1>
                </div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>{project.status}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>{project.priority}</span>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {isTeamLead && (
                  <button
                    onClick={() => setIsTaskFormOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-semibold">Add Task</span>
                  </button>
                )}
                {project.dueDate && (
                  <div className="text-xs md:text-sm text-gray-500">Due: {new Date(project.dueDate).toLocaleDateString()}</div>
                )}
              </div>
            </div>
            {project.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{project.description}</p>
              </div>
            )}
          </div>

          <div className="md:hidden mb-6">
            <div className="grid grid-cols-4 gap-2">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`p-2.5 rounded-xl shadow-sm border transition-all min-w-0 ${activeTab === tab.key ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 active:scale-95'}`}>
                    <div className="flex flex-col items-center space-y-1">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-medium truncate w-full text-center">{tab.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hidden md:block mb-8">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'milestones' && renderMilestones()}
            {activeTab === 'tasks' && renderTasks()}
            {activeTab === 'team' && renderTeam()}
          </div>
        </div>
      </main>

      {/* Task form for team leads – uses employee token only */}
      {isTeamLead && (
        <TeamLead_task_form
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={async (taskData) => {
            try {
              const created = await employeeService.createTaskAsTeamLead(taskData)
              const taskId = created?.data?._id || created?.data?.id

              if (taskId && taskData.attachments?.length > 0) {
                toast.info(`Uploading ${taskData.attachments.length} attachment(s)...`)
                for (const att of taskData.attachments) {
                  try {
                    const file = att?.file || att
                    if (file) {
                      await employeeService.uploadTaskAttachmentToTask(taskId, file)
                      toast.success(att.name ? `Uploaded ${att.name}` : 'Attachment uploaded')
                    }
                  } catch (err) {
                    console.error('Attachment upload error:', err)
                    toast.error(att.name ? `Failed to upload ${att.name}` : 'Failed to upload attachment')
                  }
                }
              }

              setIsTaskFormOpen(false)
              toast.success('Task created successfully!')
              await loadProjectData()
            } catch (error) {
              console.error('Error creating task:', error)
              toast.error(error.message || 'Failed to create task')
              throw error
            }
          }}
          teamMembers={teamMembers}
          availableProjects={project ? [project] : []}
          projectId={project?._id}
          milestoneId={null}
        />
      )}
      {isTeamLead && (
        <PM_task_form
          isOpen={isEditTaskFormOpen}
          onClose={() => setIsEditTaskFormOpen(false)}
          onSubmit={handleUpdateTask}
          projectId={selectedTask?.project?._id || selectedTask?.project || id}
          milestoneId={selectedTask?.milestone?._id || selectedTask?.milestone}
          initialData={selectedTask}
          isTeamLead={true}
          teamMembers={teamMembers}
        />
      )}
    </div>
  )
}

export default Employee_project_detail
