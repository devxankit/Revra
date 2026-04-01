import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Calendar as CalIcon, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Combobox } from '../../../components/ui/combobox'
import { MultiSelect } from '../../../components/ui/multi-select'
import { DatePicker } from '../../../components/ui/date-picker'
import { projectService, milestoneService } from '../DEV-services'
import { uploadToCloudinary, validateFile } from '../../../services/cloudinaryService'
import { useToast } from '../../../contexts/ToastContext'

const PM_milestone_form = ({ isOpen, onClose, onSubmit, projectId, milestoneData }) => {
  // Determine if this is edit mode
  const isEditMode = milestoneData && milestoneData._id;
  
  // Initialize with consistent values to prevent controlled input warnings
  const getInitialFormData = () => ({
    title: '', 
    description: '', 
    dueDate: '', 
    assignees: [], 
    status: 'pending', 
    project: projectId || '', 
    priority: 'normal', 
    sequence: 1,
    attachments: []
  })

  const [formData, setFormData] = useState(getInitialFormData())

  // Reset form when dialog opens/closes or load data for editing
  useEffect(() => {
    if (isOpen) {
      if (milestoneData && milestoneData._id) {
        // Pre-fill form with milestoneData for editing
        setFormData({
          title: milestoneData.title || '',
          description: milestoneData.description || '',
          dueDate: milestoneData.dueDate ? (typeof milestoneData.dueDate === 'string' ? milestoneData.dueDate.split('T')[0] : new Date(milestoneData.dueDate).toISOString().split('T')[0]) : '',
          assignees: Array.isArray(milestoneData.assignedTo) 
            ? milestoneData.assignedTo.map(member => member._id || member)
            : (Array.isArray(milestoneData.assignees) ? milestoneData.assignees.map(m => m._id || m) : []),
          status: milestoneData.status || 'pending',
          project: projectId || milestoneData.project?._id || milestoneData.project || '',
          priority: milestoneData.priority || 'normal',
          sequence: milestoneData.sequence || milestoneData.order || 1,
          attachments: milestoneData.attachments || []
        })
      } else {
        // Reset form for new milestone
        setFormData(getInitialFormData())
      }
      setErrors({})
    }
  }, [isOpen, projectId, milestoneData])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState([])
  const { toast } = useToast()

  useEffect(() => { if (isOpen) loadTeamMembers() }, [isOpen, projectId])

  const loadTeamMembers = async () => {
    if (!projectId) return
    
    setIsLoading(true)
    try {
      const response = await projectService.getProjectTeamMembers(projectId)
      setTeamMembers(response || [])
    } catch (error) {
      console.error('Error loading team members:', error)
      toast.error('Failed to load team members')
      setTeamMembers([])
    } finally {
      setIsLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'testing', label: 'Testing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      // Validate file
      const validation = validateFile(file)
      if (!validation.isValid) {
        toast.error(`Invalid file ${file.name}: ${validation.errors.join(', ')}`)
        continue
      }
      
      const fileId = Date.now() + Math.random()
      
      // Add to uploading files
      setUploadingFiles(prev => [...prev, fileId])
      
      try {
        // Upload to Cloudinary for preview
        const cloudinaryResult = await uploadToCloudinary(file, 'milestones/preview')
        
        if (cloudinaryResult.success) {
          const newAttachment = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
            cloudinaryUrl: cloudinaryResult.data.secure_url,
            publicId: cloudinaryResult.data.public_id
          }
          
          setFormData(prev => ({ 
            ...prev, 
            attachments: [...prev.attachments, newAttachment] 
          }))
          
          toast.success(`File ${file.name} uploaded successfully`)
        } else {
          toast.error(`Failed to upload ${file.name}`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`Failed to upload ${file.name}`)
      } finally {
        setUploadingFiles(prev => prev.filter(id => id !== fileId))
      }
    }
  }

  const removeAttachment = (id) => {
    setFormData(prev => ({ 
      ...prev, 
      attachments: prev.attachments.filter(att => 
        (att.id || att._id || att.public_id) !== id
      )
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes)/Math.log(k))
    return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Milestone title is required'
    if (!formData.sequence || formData.sequence < 1) newErrors.sequence = 'Sequence number must be at least 1'
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required'
    if (formData.assignees.length === 0) newErrors.assignees = 'At least one team member must be assigned'
    setErrors(newErrors); return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    
    try {
      const milestonePayload = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        assignedTo: formData.assignees,
        status: formData.status,
        priority: formData.priority,
        sequence: formData.sequence,
        project: projectId || formData.project
      }
      
      let milestone
      
      if (isEditMode && milestoneData?._id) {
        // Update existing milestone
        milestone = await milestoneService.updateMilestone(milestoneData._id, milestonePayload)
        toast.success('Milestone updated successfully!')
        
        // Upload new attachments to backend if any (only files that haven't been uploaded yet)
        if (formData.attachments.length > 0) {
          const newAttachments = formData.attachments.filter(att => att.file)
          if (newAttachments.length > 0) {
            toast.info(`Uploading ${newAttachments.length} attachment(s)...`)
            
            for (const attachment of newAttachments) {
              try {
                await milestoneService.uploadMilestoneAttachment(milestoneData._id, attachment.file)
                toast.success(`Attachment ${attachment.name} uploaded successfully`)
              } catch (error) {
                console.error('Attachment upload error:', error)
                toast.error(`Failed to upload ${attachment.name}`)
              }
            }
          }
        }
      } else {
        // Create new milestone
        milestone = await milestoneService.createMilestone(milestonePayload)
        toast.success('Milestone created successfully!')
        
        // Upload attachments to backend
        if (formData.attachments.length > 0) {
          toast.info(`Uploading ${formData.attachments.length} attachment(s)...`)
          
          for (const attachment of formData.attachments) {
            try {
              await milestoneService.uploadMilestoneAttachment(milestone._id, attachment.file)
              toast.success(`Attachment ${attachment.name} uploaded successfully`)
            } catch (error) {
              console.error('Attachment upload error:', error)
              toast.error(`Failed to upload ${attachment.name}`)
            }
          }
        }
      }
      
      onSubmit && onSubmit(milestone || formData)
      handleClose()
    } catch (error) {
      console.error(`Milestone ${isEditMode ? 'update' : 'creation'} error:`, error)
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} milestone`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(getInitialFormData())
    setErrors({}); onClose && onClose()
  }

  const teamMemberOptions = (teamMembers || []).map(m => ({ 
    value: m._id, 
    label: m.name || m.fullName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unknown Member'
  }))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0" onClose={handleClose}>
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">
              {isEditMode ? 'Edit Milestone' : 'Create New Milestone'}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              {isEditMode 
                ? 'Update the milestone details below. Fields marked with * are required.'
                : 'Fill in the milestone details below. Fields marked with * are required.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">Milestone Title <span className="text-red-500 ml-1">*</span></label>
            <Input type="text" placeholder="Enter milestone title" value={formData.title} onChange={(e)=>handleInputChange('title', e.target.value)} className={`h-12 rounded-xl border-2 transition-all duration-200 ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary focus:ring-primary/20'}`} />
            <AnimatePresence>{errors.title && (<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.title}</motion.p>)}</AnimatePresence>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">Sequence Number <span className="text-red-500 ml-1">*</span></label>
            <Input type="number" placeholder="Enter sequence number (1, 2, 3...)" value={formData.sequence} onChange={(e)=>handleInputChange('sequence', parseInt(e.target.value) || 1)} min="1" className={`h-12 rounded-xl border-2 transition-all duration-200 ${errors.sequence ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-primary focus:ring-primary/20'}`} />
            <AnimatePresence>{errors.sequence && (<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.sequence}</motion.p>)}</AnimatePresence>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <Textarea placeholder="Describe the milestone objectives and requirements (optional)" value={formData.description} onChange={(e)=>handleInputChange('description', e.target.value)} rows={3} className="rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">Due Date <span className="text-red-500 ml-1">*</span></label>
              <DatePicker value={formData.dueDate} onChange={(d)=>handleInputChange('dueDate', d)} placeholder="Select due date" />
              <AnimatePresence>{errors.dueDate && (<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.dueDate}</motion.p>)}</AnimatePresence>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">Assigned Team <span className="text-red-500 ml-1">*</span></label>
              <MultiSelect options={teamMemberOptions} value={formData.assignees} onChange={(v)=>handleInputChange('assignees', v)} placeholder="Select team members" />
              <AnimatePresence>{errors.assignees && (<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="text-sm text-red-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.assignees}</motion.p>)}</AnimatePresence>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Status</label>
              <Combobox options={statusOptions} value={formData.status} onChange={(v)=>handleInputChange('status', v)} placeholder="Select status" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Priority</label>
              <Combobox options={priorityOptions} value={formData.priority} onChange={(v)=>handleInputChange('priority', v)} placeholder="Select priority" />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Attachments</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary/50 transition-colors duration-200">
              <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Click to upload files</p>
                <p className="text-xs text-gray-500">Images, videos, PDFs, documents</p>
              </label>
            </div>
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                {formData.attachments.map((att, index) => (
                  <div key={att.id || att._id || att.public_id || `attachment-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-1 bg-primary/10 rounded">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{att.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                        {att.cloudinaryUrl && (
                          <a 
                            href={att.cloudinaryUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeAttachment(att.id || att._id || att.public_id)} 
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {uploadingFiles.length > 0 && (
              <div className="space-y-2">
                {uploadingFiles.map((fileId) => (
                  <div key={fileId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Uploading...</p>
                        <p className="text-xs text-blue-600">Please wait</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto h-12 rounded-xl border-2 hover:bg-gray-50 transition-all duration-200" disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto h-12 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                </div>
              ) : (
                isEditMode ? 'Update Milestone' : 'Create Milestone'
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PM_milestone_form
