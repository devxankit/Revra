import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import {
  FiTarget as Target,
  FiCalendar as Calendar,
  FiUser as User,
  FiClock as Clock,
  FiFileText as FileText,
  FiMessageSquare as MessageSquare,
  FiPaperclip as Paperclip,
  FiArrowLeft as ArrowLeft,
  FiEye as Eye,
  FiDownload as Download,
  FiX as X,
  FiCheckSquare as CheckSquare,
  FiFolder as FolderKanban,
  FiBarChart2 as BarChart3,
  FiTrendingUp as TrendingUp,
  FiPlus as Plus,
  FiEdit as Edit,
  FiTrash2 as Trash2
} from 'react-icons/fi'
import PM_task_form from '../../DEV-components/PM_task_form'
import { employeeService, getStoredEmployeeData } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'

const Employee_milestone_details = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [milestone, setMilestone] = useState(null)
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newComment, setNewComment] = useState('')
  const { toast } = useToast()

  // Team Lead states
  const [isTeamLead, setIsTeamLead] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isEditTaskFormOpen, setIsEditTaskFormOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        // Fetch real milestone data
        const response = await employeeService.getEmployeeMilestoneById(id)
        const milestoneData = response?.data?.milestone || response?.milestone
        const projectData = response?.data?.project || response?.project

        if (milestoneData) {
          setMilestone(milestoneData)
          setProject(projectData)

          // Load tasks for this milestone
          try {
            const tasksResponse = await employeeService.getEmployeeMilestoneTasks(id)
            const tasksData = tasksResponse?.data || tasksResponse || []
            setTasks(Array.isArray(tasksData) ? tasksData : [])
          } catch (taskErr) {
            console.error('Error loading tasks:', taskErr)
            setTasks([])
          }
        } else {
          toast.error('Milestone not found')
          navigate('/employee/team-management') // Redirect to safe page
        }

        // Check Team Lead status
        try {
          const teamData = await employeeService.getMyTeam()
          const team = teamData?.data || teamData
          if (team?.isTeamLead) {
            setIsTeamLead(true)
            setTeamMembers(team.teamMembers || [])
          }
        } catch (teamError) {
          console.log('User is not a team lead')
        }
      } catch (err) {
        console.error('Error loading milestone:', err)
        toast.error('Failed to load milestone details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-primary/10 text-primary border-primary/20'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
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
      window.location.reload()
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
      window.location.reload()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Employee_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-6xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64 text-gray-600">Loading milestone...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!milestone) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Employee_navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="mb-6 sm:mb-8">
          <button onClick={() => navigate(`/employee-project/${project?._id}`)} className="mb-4 text-gray-600 hover:text-gray-900 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </button>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex-shrink-0">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">{milestone.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(milestone.status)}`}>{milestone.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Milestone Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-base text-gray-900 mt-1">{milestone.description || 'No description provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Due Date</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'No due date set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Assigned To</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{(() => { const a = Array.isArray(milestone.assignedTo) ? milestone.assignedTo[0] : milestone.assignedTo; return a?.name || a?.fullName || 'Unassigned'; })()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Project</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{project?.name || 'Unknown Project'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={() => { }} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                  <button onClick={() => { }} className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Recalculate</span>
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Milestone Progress</span>
                  <span className="font-medium text-gray-900">{Math.min(100, Math.max(0, Number(milestone.progress) || 0))}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, Number(milestone.progress) || 0))}%` }} />
                </div>
                <div className="text-xs text-gray-500">Based on completed tasks in this milestone</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tasks ({tasks.length})</h2>
                {isTeamLead && (
                  <button
                    onClick={() => setIsTaskFormOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-semibold">Add Task</span>
                  </button>
                )}
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map(task => {
                    const currentUserId = (getStoredEmployeeData()?.id || getStoredEmployeeData()?._id || '').toString()
                    const createdByRaw = task.createdBy && (task.createdBy._id || task.createdBy.id || task.createdBy)
                    const createdById = createdByRaw && createdByRaw.toString ? createdByRaw.toString() : ''
                    const canManageTask = isTeamLead && currentUserId && createdById && createdById === currentUserId

                    return (
                      <div
                        key={task._id}
                        onClick={() => navigate(`/employee-task/${task._id}?projectId=${project?._id}`)}
                        className="group border border-gray-200 rounded-lg p-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200 cursor-pointer bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 truncate mr-4">
                            <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors truncate">{task.title}</h3>
                            <p className="text-sm text-gray-600 truncate">{task.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>{task.status}</span>
                            {canManageTask && (
                              <>
                                <button
                                  onClick={(e) => handleEditTask(e, task)}
                                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                  title="Edit Task"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTask(e, task._id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600">Tasks for this milestone will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Paperclip className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No attachments yet</h3>
                <p className="text-gray-600">Files will appear here when uploaded</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
                  <span className="text-sm text-gray-500">(0)</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-6">
                <div className="space-y-4">
                  <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment to this milestone..." rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />
                  <div className="flex justify-end">
                    <button
                      disabled={!newComment.trim()}
                      onClick={async () => {
                        if (!newComment.trim()) return
                        try {
                          await employeeService.addEmployeeMilestoneComment(id, newComment.trim())
                          toast.success('Comment added')
                          setNewComment('')
                        } catch (error) {
                          console.error('Error adding comment:', error)
                          toast.error(error.message || 'Failed to add comment')
                        }
                      }}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Task Form for Team Leads */}
      {isTeamLead && (
        <PM_task_form
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={async (taskData) => {
            try {
              const created = await employeeService.createTaskAsTeamLead(taskData)
              const taskId = created?.data?._id || created?.data?.id
              if (taskId && taskData.attachments?.length > 0) {
                for (const att of taskData.attachments) {
                  if (att?.file) await employeeService.uploadTaskAttachmentToTask(taskId, att.file)
                }
              }
              setIsTaskFormOpen(false)
              toast.success('Task created successfully!')
              window.location.reload()
            } catch (error) {
              console.error('Error creating task:', error)
              toast.error(error.message || 'Failed to create task')
            }
          }}
          projectId={project?._id}
          milestoneId={milestone?._id}
          isTeamLead={true}
          teamMembers={teamMembers}
        />
      )}

      {isTeamLead && (
        <PM_task_form
          isOpen={isEditTaskFormOpen}
          onClose={() => setIsEditTaskFormOpen(false)}
          onSubmit={handleUpdateTask}
          projectId={selectedTask?.project?._id || selectedTask?.project || project?._id}
          milestoneId={selectedTask?.milestone?._id || selectedTask?.milestone || milestone?._id}
          initialData={selectedTask}
          isTeamLead={true}
          teamMembers={teamMembers}
        />
      )}
    </div>
  )
}

export default Employee_milestone_details
