import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Upload, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Combobox } from '../../../components/ui/combobox'
import { DatePicker } from '../../../components/ui/date-picker'
import { teamService, projectService, milestoneService, taskService, tokenUtils, employeeService } from '../DEV-services'
import { useToast } from '../../../contexts/ToastContext'

// Normalize to string ID (handles object refs like project._id or raw id)
const toId = (v) => {
  if (v == null || v === '') return ''
  if (typeof v === 'string' && v.length === 24) return v
  if (typeof v === 'object' && v._id != null) return String(v._id)
  return String(v)
}

const PM_task_form = ({ isOpen, onClose, onSubmit, milestoneId, projectId, isTeamLead = false, teamMembers: teamLeadMembers = [], availableProjects = [], initialData = null }) => {
  const { toast } = useToast()
  const isSubmittingRef = useRef(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    status: 'pending',
    priority: 'normal',
    milestone: toId(milestoneId) || '',
    project: toId(projectId) || '',
    attachments: []
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false)
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [milestones, setMilestones] = useState([])

  // Load data when form opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        const currentProjectId = toId(initialData.project)
        const currentMilestoneId = toId(initialData.milestone)
        setFormData({
          title: initialData.title || '',
          description: initialData.description || '',
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
          assignedTo: (initialData.assignedTo && initialData.assignedTo.length > 0)
            ? toId(initialData.assignedTo[0])
            : '',
          status: initialData.status || 'pending',
          priority: initialData.priority || 'normal',
          milestone: currentMilestoneId,
          project: currentProjectId,
          attachments: [] // Attachments are handled via specialized APIs, keeping empty for edit
        })

        if (currentProjectId) {
          loadSingleProject(currentProjectId)
          loadMilestones(currentProjectId)
        }

        if (currentProjectId && currentMilestoneId) {
          loadTeamMembers(currentProjectId, currentMilestoneId)
        }
      } else if (projectId) {
        // Create Mode - with Project (ensure string ids)
        const pid = toId(projectId)
        const mid = toId(milestoneId)
        loadSingleProject(pid)
        setFormData(prev => ({ ...prev, project: pid, milestone: mid }))
        loadMilestones(pid)

        if (mid) {
          loadTeamMembers(pid, mid)
        }
      } else {
        // Create Mode - generic
        loadProjects()
      }
    }
  }, [isOpen, projectId, milestoneId, initialData])

  useEffect(() => {
    const pid = toId(formData.project)
    if (pid) {
      loadMilestones(pid)
      setFormData(prev => ({ ...prev, milestone: '', assignedTo: '' }))
    }
  }, [formData.project])

  useEffect(() => {
    if (formData.milestone) {
      loadTeamMembers(formData.project, formData.milestone)
      setFormData(prev => ({ ...prev, assignedTo: '' }))
    } else {
      // Clear team members when milestone is cleared
      setTeamMembers([])
      setFormData(prev => ({ ...prev, assignedTo: '' }))
    }
  }, [formData.milestone])

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true)

      // Team Lead Logic
      if (isTeamLead) {
        if (availableProjects && availableProjects.length > 0) {
          setProjects(availableProjects)
        } else {
          // Fallback if availableProjects not provided
          try {
            // In backend, getMyTeam returns projects with _id
            const response = await employeeService.getMyTeam()
            const teamProjects = response?.data?.projects || response?.projects || []
            setProjects(teamProjects)
          } catch (err) {
            console.error('Error loading team projects', err)
            setProjects([])
          }
        }
        setIsLoadingProjects(false)
        return
      }

      // Check if PM is authenticated (same method as PM_tasks page)
      if (!tokenUtils.isAuthenticated()) {
        setProjects([])
        return
      }

      // Get all projects for this PM (automatically filtered by backend)
      const response = await projectService.getAllProjects({
        limit: 100,
        status: 'all' // Get all projects regardless of status
      })

      const projectsData = response?.data || []
      setProjects(Array.isArray(projectsData) ? projectsData : [])
    } catch (error) {
      console.error('❌ Error loading projects:', error)
      setProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadSingleProject = async (pid) => {
    const id = toId(pid)
    if (!id) return
    try {
      setIsLoadingProjects(true)

      if (isTeamLead) {
        const response = await employeeService.getEmployeeProjectById(id)
        const projectData = response?.data || response
        setProjects(projectData ? [projectData] : [])
      } else {
        const response = await projectService.getProjectById(id)
        const projectData = response?.data || response
        setProjects(projectData ? [projectData] : [])
      }
    } catch (error) {
      console.error('Error loading single project:', error)
      setProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadMilestones = async (pid) => {
    const id = toId(pid)
    if (!id) { setMilestones([]); return }
    try {
      setIsLoadingMilestones(true)

      if (isTeamLead) {
        const response = await employeeService.getEmployeeProjectMilestones(id)
        const milestonesData = response?.data || response || []
        setMilestones(Array.isArray(milestonesData) ? milestonesData : [])
      } else {
        const response = await milestoneService.getMilestonesByProject(id)
        const milestonesData = response?.data || response || []
        setMilestones(Array.isArray(milestonesData) ? milestonesData : [])
      }
    } catch (error) {
      console.error('Error loading milestones:', error)
      setMilestones([])
    } finally {
      setIsLoadingMilestones(false)
    }
  }

  const loadTeamMembers = async (pid, mid = null) => {
    const projectIdStr = toId(pid)
    if (!projectIdStr) { setTeamMembers([]); return }

    // Team Lead mode: use only the provided team members (from getMyTeam). Do NOT call PM APIs (teamService uses pmToken → 401).
    if (isTeamLead && teamLeadMembers && teamLeadMembers.length > 0) {
      const normalized = teamLeadMembers.map(m => ({
        _id: m._id || m.id,
        name: m.name || 'Unknown',
        position: m.position || '',
        department: m.department || ''
      }))
      setTeamMembers(normalized)
      return
    }

    // Original PM logic
    try {
      setIsLoadingTeamMembers(true)
      const response = await teamService.getEmployeesForTask(projectIdStr, toId(mid))

      // Handle both response.data and response directly
      const teamData = response?.data || response || []
      setTeamMembers(Array.isArray(teamData) ? teamData : [])
    } catch (error) {
      console.error('Error loading team members:', error)
      setTeamMembers([])
    } finally {
      setIsLoadingTeamMembers(false)
    }
  }

  const handleInputChange = (field, value) => {
    const normalized = (field === 'project' || field === 'milestone' || field === 'assignedTo') ? toId(value) : value
    setFormData(prev => ({ ...prev, [field]: normalized }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    if (field === 'project' && normalized) {
      loadMilestones(normalized)
      // Clear milestone and team when project changes
      setFormData(prev => ({ ...prev, milestone: '', assignedTo: '' }))
      setTeamMembers([])
    }
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024)
    setFormData(prev => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        ...validFiles.map(f => ({ file: f, name: f.name, size: f.size, type: f.type }))
      ]
    }))
  }

  const removeAttachment = (index) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Task title is required'
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required'
    if (!formData.project) newErrors.project = 'Project is required'
    if (!formData.milestone) newErrors.milestone = 'Milestone is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        assignedTo: (initialData.assignedTo && initialData.assignedTo.length > 0) ? toId(initialData.assignedTo[0]) : '',
        status: initialData.status || 'pending',
        priority: initialData.priority || 'normal',
        milestone: toId(initialData.milestone) || '',
        project: toId(initialData.project) || '',
        attachments: []
      })
    } else {
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        assignedTo: '',
        status: 'pending',
        priority: 'normal',
        milestone: toId(milestoneId) || '',
        project: toId(projectId) || '',
        attachments: []
      })
    }
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent double submission using ref
    if (isSubmittingRef.current) {
      return;
    }

    if (!validateForm()) return

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      // Prepare task data
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        assignedTo: formData.assignedTo ? [formData.assignedTo] : [],
        status: formData.status,
        priority: formData.priority,
        milestone: formData.milestone,
        project: formData.project
      }

      // Call parent callback with task data (let parent handle API call)
      onSubmit && onSubmit(taskData)

      // Close form
      handleClose()

    } catch (error) {
      console.error('Error preparing task data:', error)

      // Show specific error message
      const errorMessage = error.message || 'Failed to prepare task data. Please try again.'
      toast.error(errorMessage)

    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    isSubmittingRef.current = false
    resetForm()
    onClose && onClose()
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const projectOptions = (projects || []).map(p => ({ value: toId(p._id) || p._id, label: p.name }))
  const milestoneOptions = (milestones || []).map(m => ({ value: toId(m._id) || m._id, label: m.title }))
  const teamMemberOptions = (teamMembers || []).map(m => ({ value: toId(m._id) || m._id, label: m.position ? `${m.name} - ${m.position}` : m.name }))

  // Get selected project and milestone names for display
  const selectedProject = (projects || []).find(p => p._id === formData.project)
  const selectedMilestone = (milestones || []).find(m => m._id === formData.milestone)


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0" onClose={handleClose}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">
              {initialData ? 'Edit Task' : (isTeamLead ? 'Create Team Task' : 'Create New Task')}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              {initialData ? 'Update the task details below.' : (isTeamLead ? 'Assign a task to your team members. Fields marked with * are required.' : 'Fill in the task details below. Fields marked with * are required.')}
            </DialogDescription>
            {selectedProject && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg">
                <div className="text-sm text-primary-foreground/90">
                  <span className="font-medium">Project:</span> {selectedProject.name}
                </div>
                {selectedMilestone && (
                  <div className="text-sm text-primary-foreground/90 mt-1">
                    <span className="font-medium">Milestone:</span> {selectedMilestone.title}
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Title */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">Task Title <span className="text-red-500 ml-1">*</span></label>
            <Input
              type="text"
              placeholder="Enter task title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`h-12 rounded-xl border-2 transition-all duration-200 ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary focus:ring-primary/20'}`}
            />
            <AnimatePresence>
              {errors.title && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />{errors.title}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <Textarea
              placeholder="Enter task description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
            />
          </motion.div>

          {/* Project and Milestone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">Project <span className="text-red-500 ml-1">*</span></label>
              {isLoadingProjects ? (
                <div className="flex items-center space-x-3 text-gray-500 bg-gray-50 p-4 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading projects...</span></div>
              ) : (
                <>
                  <Combobox options={projectOptions} value={toId(formData.project) || formData.project} onChange={(v) => handleInputChange('project', v)} placeholder="Select project" disabled={!!projectId} />
                  {projectOptions.length === 0 && (<p className="text-sm text-gray-500">No projects available</p>)}
                </>
              )}
              <AnimatePresence>
                {errors.project && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />{errors.project}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">Milestone <span className="text-red-500 ml-1">*</span></label>
              {isLoadingMilestones ? (
                <div className="flex items-center space-x-3 text-gray-500 bg-gray-50 p-4 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading milestones...</span></div>
              ) : (
                <>
                  <Combobox options={milestoneOptions} value={toId(formData.milestone) || formData.milestone} onChange={(v) => handleInputChange('milestone', v)} placeholder="Select milestone" disabled={!formData.project} />
                  {milestoneOptions.length === 0 && formData.project && (<p className="text-sm text-gray-500">No milestones available for this project</p>)}
                </>
              )}
              <AnimatePresence>
                {errors.milestone && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />{errors.milestone}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Status</label>
              <Combobox options={statusOptions} value={formData.status} onChange={(v) => handleInputChange('status', v)} placeholder="Select status" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Priority</label>
              <Combobox options={priorityOptions} value={formData.priority} onChange={(v) => handleInputChange('priority', v)} placeholder="Select priority" />
            </motion.div>
          </div>

          {/* Due Date */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">Due Date <span className="text-red-500 ml-1">*</span></label>
            <DatePicker value={formData.dueDate} onChange={(d) => handleInputChange('dueDate', d)} placeholder="Select due date" />
            <AnimatePresence>
              {errors.dueDate && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />{errors.dueDate}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Assigned To */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Assign To</label>
            {isLoadingTeamMembers ? (
              <div className="flex items-center space-x-3 text-gray-500 bg-gray-50 p-4 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading team member...</span></div>
            ) : (
              <>
                <Combobox options={teamMemberOptions} value={toId(formData.assignedTo) || formData.assignedTo} onChange={(v) => handleInputChange('assignedTo', v)} placeholder="Select team member" />
                {!formData.milestone && teamMembers.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    Please select a milestone first to see available team members
                  </p>
                )}
                {teamMemberOptions.length === 0 && formData.project && formData.milestone && (<p className="text-sm text-gray-500">No team member available for this milestone</p>)}
              </>
            )}
          </motion.div>

          {/* Attachments */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Attachments</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="attachments"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="attachments" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Click to upload files</p>
                <p className="text-xs text-gray-500">Images, videos, PDFs, documents</p>
              </label>
            </div>

            {formData.attachments.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center space-x-2"><CheckCircle className="h-4 w-4 text-green-500" /><span>Selected Files ({formData.attachments.length})</span></h4>
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <motion.div key={attachment.id || index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📎</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(attachment.id || index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting} className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white hover:shadow-lg transition-all duration-200 disabled:opacity-50">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{initialData ? 'Updating Task...' : 'Creating Task...'}</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />{initialData ? 'Update Task' : 'Create Task'}</>
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PM_task_form
