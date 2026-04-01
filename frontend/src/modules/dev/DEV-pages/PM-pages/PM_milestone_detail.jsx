import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PM_navbar from '../../DEV-components/PM_navbar'
import PM_milestone_form from '../../DEV-components/PM_milestone_form'
import { Target, Calendar, User, CheckSquare, Paperclip, Upload, X, MessageSquare, Eye, Download, Loader2, ArrowLeft, Edit } from 'lucide-react'
import { milestoneService, projectService } from '../../DEV-services'
import { uploadToCloudinary, validateFile } from '../../../../services/cloudinaryService'
import { useToast } from '../../../../contexts/ToastContext'

const PM_milestone_detail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const projectId = searchParams.get('projectId')
  const [milestone, setMilestone] = useState(null)
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newAttachment, setNewAttachment] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCommentLoading, setIsCommentLoading] = useState(false)
  const [isMilestoneFormOpen, setIsMilestoneFormOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      if (!id) return
      
      setIsLoading(true)
      try {
        // Load milestone data
        const milestoneData = await milestoneService.getMilestoneById(id)
        setMilestone(milestoneData)
        
        // Load project data if projectId is available
        if (projectId) {
          const res = await projectService.getProjectById(projectId)
          const projectObj = res?.data ?? res
          setProject(projectObj && typeof projectObj === 'object' ? projectObj : null)
        }
        
        // Load tasks for this milestone (if milestone has tasks)
        if (milestoneData.tasks && milestoneData.tasks.length > 0) {
          setTasks(milestoneData.tasks)
        } else {
          setTasks([])
        }
        
      } catch (error) {
        console.error('Error loading milestone data:', error)
        toast.error('Failed to load milestone data')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, projectId, toast])

  useEffect(() => {
    if (!milestone?.dueDate) return
    const calc = () => {
      const now = new Date(); const due = new Date(milestone.dueDate)
      const diff = due.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000*60*60*24));
        const hours = Math.floor((diff % (1000*60*60*24))/(1000*60*60));
        setTimeLeft(days>0?`${days}d ${hours}h`:`${hours}h`)
      } else { setTimeLeft(`${Math.floor(Math.abs(diff)/(1000*60*60*24))}d overdue`) }
    }
    calc(); const i = setInterval(calc,60000); return ()=>clearInterval(i)
  }, [milestone?.dueDate])

  if (isLoading || !milestone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <PM_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2 text-gray-600">Loading milestone...</span></div>
          </div>
        </main>
      </div>
    )
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
  const getPriorityColor = (p) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getFileIcon = (type) => '📎'

  const handleEditMilestone = () => {
    setIsMilestoneFormOpen(true)
  }

  const handleMilestoneFormSubmit = async (formData) => {
    // The form handles the update internally when milestoneData is provided
    // This callback is just for refreshing the page and showing success
    try {
      toast.success('Milestone updated successfully!')
      setIsMilestoneFormOpen(false)
      // Reload milestone data to show updated information
      const milestoneData = await milestoneService.getMilestoneById(id)
      setMilestone(milestoneData)
    } catch (error) {
      console.error('Error after milestone update:', error)
      // Still reload even if toast fails
      const milestoneData = await milestoneService.getMilestoneById(id)
      setMilestone(milestoneData)
    }
  }

  const handleMilestoneFormClose = () => {
    setIsMilestoneFormOpen(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    setIsCommentLoading(true)
    try {
      // For now, we'll just add the comment to local state
      // In a real implementation, you'd call an API to add the comment
      const comment = {
        _id: Date.now().toString(),
        text: newComment.trim(),
        author: 'Current User', // This should come from auth context
        createdAt: new Date().toISOString()
      }
      
      setMilestone(prev => ({
        ...prev,
        comments: [...(prev.comments || []), comment]
      }))
      
      setNewComment('')
      toast.success('Comment added successfully!')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleUploadChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    
    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      toast.error(`Invalid file: ${validation.errors.join(', ')}`)
      return
    }
    
    setNewAttachment(file)
    setIsUploading(true)
    
    try {
      // Upload to Cloudinary for preview
      const cloudinaryResult = await uploadToCloudinary(file, 'milestones/attachments')
      
      if (cloudinaryResult.success) {
        // Upload to backend
        await milestoneService.uploadMilestoneAttachment(id, file)
        
        // Update milestone state with new attachment
        const newAttachmentData = {
          filename: file.name,
          originalName: file.name,
          url: cloudinaryResult.data.secure_url,
          publicId: cloudinaryResult.data.public_id,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString()
        }
        
        setMilestone(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAttachmentData]
        }))
        
        toast.success('Attachment uploaded successfully!')
      } else {
        toast.error('Failed to upload attachment')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload attachment')
    } finally {
      setIsUploading(false)
      setNewAttachment(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <PM_navbar />
      <main className="pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
          <div className="mb-6"><button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /><span className="text-sm font-medium">Back</span></button></div>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${getStatusColor(milestone.status)}`}>
                    <Target className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex-1">{milestone.title}</h1>
                  <button 
                    onClick={handleEditMilestone}
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200 flex-shrink-0"
                    title="Edit Milestone"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center space-x-2 mb-4"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(milestone.status)}`}>{milestone.status}</span><span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(milestone.priority)}`}>{milestone.priority}</span></div>
              </div>
              <div className="text-right"><div className="text-lg font-semibold text-blue-600">{timeLeft}</div><div className="text-sm text-gray-500 mt-1">Due: {new Date(milestone.dueDate).toLocaleDateString()}</div></div>
            </div>
            <div className="mb-6"><h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3><p className="text-gray-600 leading-relaxed">{milestone.description}</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Assigned to</p>
                  <p className="text-base font-medium text-gray-900">
                    {milestone.assignedTo?.map(u => 
                      u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown Member'
                    ).join(', ') || 'No one assigned'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3"><div className="p-2 bg-blue-100 rounded-lg"><Calendar className="h-4 w-4 text-blue-600" /></div><div><p className="text-sm font-semibold text-gray-600">Created</p><p className="text-base font-medium text-gray-900">{new Date(milestone.createdAt).toLocaleDateString()}</p></div></div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4"><div className="flex items-center space-x-3"><div className="p-2 bg-primary/10 rounded-lg"><CheckSquare className="h-5 w-5 text-primary" /></div><div><h3 className="text-lg font-semibold text-gray-900">Tasks</h3><p className="text-sm text-gray-600">Tasks for this milestone</p></div></div><div className="text-sm text-gray-500">{tasks.length} task{tasks.length!==1?'s':''}</div></div>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckSquare className="h-6 w-6 text-gray-400" /></div><h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3><p className="text-gray-600">Tasks will appear here when created</p></div>
              ) : (
                tasks.map(task => (
                  <div key={task._id} onClick={() => navigate(`/pm-task/${task._id}?projectId=${projectId}`)} className="group bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer border border-gray-200 hover:border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 group-hover:text-primary transition-colors">{task.title}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'completed' ? 'Completed' :
                             task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'low' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.priority === 'urgent' ? 'Urgent' :
                             task.priority === 'high' ? 'High' :
                             task.priority === 'low' ? 'Low' : 'Normal'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3"><div className="p-2 bg-primary/10 rounded-lg"><Paperclip className="h-5 w-5 text-primary" /></div><h3 className="text-lg font-semibold text-gray-900">Attachments</h3></div>
              <label className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Upload</span>
                <input type="file" onChange={handleUploadChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx,.mp4,.fig" />
              </label>
            </div>
            {isUploading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-blue-600">Uploading file...</span>
                </div>
              </div>
            )}
            
            {newAttachment && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileIcon(newAttachment.type || 'file')}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{newAttachment.name}</p>
                      <p className="text-xs text-gray-500">{(newAttachment.size/1024/1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setNewAttachment(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Display existing attachments */}
            {milestone?.attachments && milestone.attachments.length > 0 ? (
              <div className="space-y-3">
                {milestone.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getFileIcon(attachment.mimeType || 'file')}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.filename || attachment.originalName}</p>
                        <p className="text-xs text-gray-500">
                          {attachment.size ? `${(attachment.size/1024/1024).toFixed(2)} MB` : 'Unknown size'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View file"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <a 
                        href={attachment.url} 
                        download={attachment.filename || attachment.originalName}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Paperclip className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No attachments yet</h3>
                <p className="text-gray-600">Upload files to share with your team</p>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
                {milestone?.comments && milestone.comments.length > 0 && (
                  <span className="text-sm text-gray-500">({milestone.comments.length})</span>
                )}
              </div>
            </div>
            
            {/* Display existing comments */}
            {milestone?.comments && milestone.comments.length > 0 ? (
              <div className="space-y-4 mb-6">
                {milestone.comments.map((comment, index) => (
                  <div key={comment._id || index} className="border-l-4 border-primary/20 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 mb-1">{comment.text}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>By {comment.author}</span>
                          <span>•</span>
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 mb-6">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No comments yet</p>
              </div>
            )}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-4">
                <textarea 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Add a comment to this milestone..." 
                  rows={3} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" 
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim() || isCommentLoading} 
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isCommentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      'Add Comment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Milestone Form Dialog */}
      <PM_milestone_form 
        isOpen={isMilestoneFormOpen}
        onClose={handleMilestoneFormClose}
        onSubmit={handleMilestoneFormSubmit}
        projectId={projectId || milestone?.project?._id || milestone?.project}
        milestoneData={milestone}
      />
    </div>
  )
}

export default PM_milestone_detail
