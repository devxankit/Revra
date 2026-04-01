import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Upload, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Combobox } from '../../../components/ui/combobox'
import { DatePicker } from '../../../components/ui/date-picker'
import { employeeService } from '../DEV-services'
import { useToast } from '../../../contexts/ToastContext'

// Normalize to string ID (handles object refs like project._id or raw id)
const toId = (v) => {
  if (v == null || v === '') return ''
  if (typeof v === 'string' && v.length === 24) return v
  if (typeof v === 'object' && v._id != null) return String(v._id)
  return String(v)
}

/**
 * Dedicated task form for Dev Team Leads in the Employee module.
 * Uses only employeeService (employee token); no PM APIs.
 * Team members come from getMyTeam (prop); projects/milestones from employee endpoints.
 * When projectId is passed (e.g. from project detail page), project is pre-filled and disabled (like PM).
 */
const TeamLead_task_form = ({
  isOpen,
  onClose,
  onSubmit,
  teamMembers: teamLeadMembers = [],
  availableProjects = [],
  projectId = null,
  milestoneId = null
}) => {
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
  const [projects, setProjects] = useState([])
  const [milestones, setMilestones] = useState([])

  const teamMembers = teamLeadMembers.map(m => ({
    _id: m._id || m.id,
    name: m.name || 'Unknown',
    position: m.position || '',
    department: m.department || ''
  }))

  // When form opens: if we're in a project context (projectId), pre-fill project and load milestones (like PM)
  useEffect(() => {
    if (!isOpen) return

    if (projectId) {
      const pid = toId(projectId)
      const mid = toId(milestoneId)
      setFormData(prev => ({ ...prev, project: pid, milestone: mid || '', assignedTo: '' }))
      if (availableProjects?.length > 0) {
        setProjects(availableProjects)
      } else {
        loadSingleProject(pid)
      }
      loadMilestones(pid)
    } else if (availableProjects?.length > 0) {
      setProjects(availableProjects)
    } else {
      loadProjects()
    }
  }, [isOpen, projectId, milestoneId, availableProjects?.length])

  // When project changes (user selected different project in generic mode), load milestones
  useEffect(() => {
    const pid = toId(formData.project)
    if (pid) {
      loadMilestones(pid)
      if (!projectId) setFormData(prev => ({ ...prev, milestone: '', assignedTo: '' }))
    } else {
      setMilestones([])
    }
  }, [formData.project])

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true)
      const response = await employeeService.getMyTeam()
      const teamProjects = response?.data?.projects || response?.projects || []
      setProjects(Array.isArray(teamProjects) ? teamProjects : [])
    } catch (err) {
      console.error('Error loading team projects', err)
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
      const data = await employeeService.getEmployeeProjectById(id)
      const projectData = data?.data ?? data
      setProjects(projectData ? [projectData] : [])
    } catch (err) {
      console.error('Error loading project', err)
      setProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadMilestones = async (pid) => {
    const id = toId(pid)
    if (!id) {
      setMilestones([])
      return
    }
    try {
      setIsLoadingMilestones(true)
      const data = await employeeService.getEmployeeProjectMilestones(id)
      const list = Array.isArray(data) ? data : (data?.data || data) || []
      setMilestones(list)
    } catch (err) {
      console.error('Error loading milestones', err)
      setMilestones([])
    } finally {
      setIsLoadingMilestones(false)
    }
  }

  const handleInputChange = (field, value) => {
    const normalized = (field === 'project' || field === 'milestone' || field === 'assignedTo') ? toId(value) : value
    setFormData(prev => ({ ...prev, [field]: normalized }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    if (field === 'project' && normalized) {
      loadMilestones(normalized)
      setFormData(prev => ({ ...prev, milestone: '', assignedTo: '' }))
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024)
    setFormData(prev => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        ...valid.map(f => ({ file: f, name: f.name, size: f.size, type: f.type }))
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
    if (!formData.title?.trim()) newErrors.title = 'Task title is required'
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required'
    if (!formData.project) newErrors.project = 'Project is required'
    if (!formData.milestone) newErrors.milestone = 'Milestone is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      assignedTo: '',
      status: 'pending',
      priority: 'normal',
      milestone: milestoneId || '',
      project: projectId || '',
      attachments: []
    })
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    if (!validateForm()) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        assignedTo: formData.assignedTo ? [formData.assignedTo] : [],
        status: formData.status,
        priority: formData.priority,
        milestone: formData.milestone,
        project: formData.project,
        attachments: formData.attachments || []
      }
      await onSubmit(taskData)
      handleClose()
    } catch (err) {
      toast.error(err.message || 'Failed to create task')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    isSubmittingRef.current = false
    resetForm()
    onClose?.()
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
  const teamMemberOptions = (teamMembers || []).map(m => ({
    value: toId(m._id) || m._id,
    label: m.position ? `${m.name} - ${m.position}` : m.name
  }))
  const selectedProject = (projects || []).find(p => toId(p._id) === toId(formData.project))
  const selectedMilestone = (milestones || []).find(m => toId(m._id) === toId(formData.milestone))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0" onClose={handleClose}>
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">Create Team Task</DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              Assign a task to your team members. Fields marked with * are required.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">Project <span className="text-red-500 ml-1">*</span></label>
              {isLoadingProjects ? (
                <div className="flex items-center space-x-3 text-gray-500 bg-gray-50 p-4 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading projects...</span></div>
              ) : (
                <>
                  <Combobox options={projectOptions} value={toId(formData.project) || formData.project} onChange={(v) => handleInputChange('project', v)} placeholder="Select project" disabled={!!projectId} />
                  {projectOptions.length === 0 && <p className="text-sm text-gray-500">No projects available</p>}
                </>
              )}
              {errors.project && (
                <p className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.project}</p>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">Milestone <span className="text-red-500 ml-1">*</span></label>
              {isLoadingMilestones ? (
                <div className="flex items-center space-x-3 text-gray-500 bg-gray-50 p-4 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading milestones...</span></div>
              ) : (
                <>
                  <Combobox options={milestoneOptions} value={toId(formData.milestone) || formData.milestone} onChange={(v) => handleInputChange('milestone', v)} placeholder="Select milestone" disabled={!formData.project} />
                  {milestoneOptions.length === 0 && formData.project && <p className="text-sm text-gray-500">No milestones for this project</p>}
                </>
              )}
              {errors.milestone && (
                <p className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.milestone}</p>
              )}
            </motion.div>
          </div>

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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">Due Date <span className="text-red-500 ml-1">*</span></label>
            <DatePicker value={formData.dueDate} onChange={(d) => handleInputChange('dueDate', d)} placeholder="Select due date" />
            {errors.dueDate && (
              <p className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.dueDate}</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Assign To</label>
            <Combobox options={teamMemberOptions} value={toId(formData.assignedTo) || formData.assignedTo} onChange={(v) => handleInputChange('assignedTo', v)} placeholder="Select team member" />
            {teamMemberOptions.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">No team members in your team yet.</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Attachments</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input type="file" id="tl-attachments" multiple accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" onChange={handleFileChange} className="hidden" />
              <label htmlFor="tl-attachments" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Click to upload files</p>
                <p className="text-xs text-gray-500">Images, videos, PDFs, documents</p>
              </label>
            </div>
            {formData.attachments?.length > 0 && (
              <div className="space-y-2 mt-3">
                {formData.attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{att.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting} className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white hover:shadow-lg transition-all duration-200 disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating Task...</> : <><Save className="h-4 w-4 mr-2" />Create Task</>}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TeamLead_task_form
