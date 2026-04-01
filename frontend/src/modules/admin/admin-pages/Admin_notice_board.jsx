import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import { 
  FiFileText, 
  FiImage, 
  FiVideo,
  FiCalendar,
  FiUser,
  FiClock,
  FiEye,
  FiDownload,
  FiPlay,
  FiFilter,
  FiSearch,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiUpload,
  FiX,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiUsers,
  FiTarget,
  FiTrendingUp,
  FiBell,
  FiSettings,
  FiZoomIn,
  FiRefreshCw
} from 'react-icons/fi'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Combobox } from '../../../components/ui/combobox'
import Loading from '../../../components/ui/loading'
import { adminNoticeService } from '../admin-services'
import { useToast } from '../../../contexts/ToastContext'

const Admin_notice_board = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('text')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [noticesData, setNoticesData] = useState([])
  const [statistics, setStatistics] = useState({
    total: 0,
    published: 0,
    draft: 0,
    pinned: 0
  })
  
  // Refs to prevent duplicate API calls
  const isFetchingRef = useRef(false)
  const searchTimeoutRef = useRef(null)
  const isInitialMountRef = useRef(true)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'text',
    priority: 'medium',
    targetAudience: 'all',
    status: 'published',
    imageUrl: '',
    videoUrl: '',
    imageFile: null,
    videoFile: null,
    attachments: [],
    isPinned: false
  })

  // Fetch statistics (memoized to prevent unnecessary calls)
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await adminNoticeService.getNoticeStatistics()
      if (response.success && response.data) {
        setStatistics({
          total: response.data.total || 0,
          published: response.data.published || 0,
          draft: response.data.draft || 0,
          pinned: response.data.pinned || 0
        })
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }, []) // No dependencies - statistics are global

  // Fetch notices from API (using refs to access latest values)
  const fetchNotices = useCallback(async (showLoading = true, customTab = null, customSearch = null) => {
    // Prevent duplicate calls
    if (isFetchingRef.current) {
      return
    }

    try {
      isFetchingRef.current = true
      if (showLoading) {
        setLoading(true)
      }
      
      const params = {}
      const tab = customTab !== null ? customTab : selectedTab
      const search = customSearch !== null ? customSearch : searchTerm
      
      // Apply filters based on selected tab
      if (tab === 'pinned') {
        params.isPinned = true
      } else if (tab === 'draft') {
        params.status = 'draft'
      } else {
        params.type = tab
      }

      if (search) {
        params.search = search
      }

      const response = await adminNoticeService.getAllNotices(params)
      
      if (response.success && response.data) {
        // Transform data to match component expectations
        const transformedData = response.data.map(notice => ({
          id: notice._id,
          ...notice,
          date: notice.formattedDate || notice.createdAt?.split('T')[0] || new Date(notice.createdAt).toISOString().split('T')[0],
          time: notice.formattedTime || new Date(notice.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          author: notice.authorName || (notice.author?.name || 'Admin'),
          imageUrl: notice.imageUrl || notice.imageData?.secure_url || '',
          videoUrl: notice.videoUrl || notice.videoData?.secure_url || ''
        }))
        
        setNoticesData(transformedData)
      } else {
        setNoticesData([])
      }
    } catch (error) {
      console.error('Error fetching notices:', error)
      toast.error(error.message || 'Failed to fetch notices')
      setNoticesData([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [selectedTab, searchTerm, toast])

  // Store latest values in refs for stable callbacks
  const selectedTabRef = useRef(selectedTab)
  const searchTermRef = useRef(searchTerm)
  
  useEffect(() => {
    selectedTabRef.current = selectedTab
  }, [selectedTab])
  
  useEffect(() => {
    searchTermRef.current = searchTerm
  }, [searchTerm])

  // Initial load - fetch both notices and statistics (only once on mount)
  useEffect(() => {
    fetchNotices(true)
    fetchStatistics()
    isInitialMountRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  // Refetch when tab changes (skip initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) return
    fetchNotices(true)
    fetchStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]) // Only when tab actually changes

  // Debounced search - refetch when search term changes (skip initial mount)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      return
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Don't refetch if search is cleared
    if (searchTerm === '') {
      // Refetch current tab when search is cleared
      fetchNotices(false, selectedTabRef.current, '')
      return
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchNotices(false, selectedTabRef.current, searchTermRef.current) // Use refs for latest values
    }, 500) // 500ms debounce

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]) // Only searchTerm

  const tabs = [
    { id: 'text', label: 'Text', icon: FiFileText },
    { id: 'image', label: 'Images', icon: FiImage },
    { id: 'video', label: 'Videos', icon: FiVideo },
    { id: 'pinned', label: 'Pinned', icon: FiTarget },
    { id: 'draft', label: 'Drafts', icon: FiEdit3 }
  ]

  const targetAudienceOptions = [
    { value: 'all', label: 'All Employees' },
    { value: 'sales', label: 'Sales Team' },
    { value: 'development', label: 'Development Team' },
    { value: 'project-managers', label: 'Project Managers' },
    { value: 'hr', label: 'HR Team' },
    { value: 'admin', label: 'Admin Only' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const typeOptions = [
    { value: 'text', label: 'Text Notice' },
    { value: 'image', label: 'Image Notice' },
    { value: 'video', label: 'Video Notice' }
  ]

  const statusOptions = [
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' }
  ]

  // Memoize filtered notices to prevent unnecessary re-renders
  const filteredNotices = useMemo(() => {
    return noticesData.filter(notice => {
      const matchesSearch = !searchTerm || 
                           notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           notice.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notice.author?.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchesTab = true
      if (selectedTab === 'pinned') {
        matchesTab = notice.isPinned === true
      } else if (selectedTab === 'draft') {
        matchesTab = notice.status === 'draft'
      } else if (selectedTab !== 'all') {
        matchesTab = notice.type === selectedTab
      }
      
      return matchesSearch && matchesTab
    })
  }, [noticesData, searchTerm, selectedTab])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'text': return FiFileText
      case 'image': return FiImage
      case 'video': return FiVideo
      default: return FiFileText
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'text': return 'from-blue-50 to-blue-100 border-blue-200'
      case 'image': return 'from-purple-50 to-purple-100 border-purple-200'
      case 'video': return 'from-pink-50 to-pink-100 border-pink-200'
      default: return 'from-gray-50 to-gray-100 border-gray-200'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTargetAudienceColor = (audience) => {
    switch (audience) {
      case 'all': return 'bg-blue-100 text-blue-800'
      case 'sales': return 'bg-green-100 text-green-800'
      case 'development': return 'bg-purple-100 text-purple-800'
      case 'project-managers': return 'bg-orange-100 text-orange-800'
      case 'hr': return 'bg-pink-100 text-pink-800'
      case 'admin': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateNotice = () => {
    setFormData({
      title: '',
      content: '',
      type: 'text',
      priority: 'medium',
      targetAudience: 'all',
      imageUrl: '',
      videoUrl: '',
      imageFile: null,
      videoFile: null,
      attachments: [],
      status: 'published',
      isPinned: false
    })
    setShowCreateModal(true)
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, etc.)')
        event.target.value = '' // Reset input
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        event.target.value = '' // Reset input
        return
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData({
        ...formData,
        imageFile: file,
        imageUrl: previewUrl
      })
      toast.success('Image selected successfully')
    } else {
      toast.error('No file selected')
    }
  }

  const handleVideoUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a valid video file (MP4, MOV, AVI, etc.)')
        event.target.value = '' // Reset input
        return
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Video size must be less than 50MB')
        event.target.value = '' // Reset input
        return
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData({
        ...formData,
        videoFile: file,
        videoUrl: previewUrl
      })
      toast.success('Video selected successfully')
    } else {
      toast.error('No file selected')
    }
  }

  const removeImage = () => {
    if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imageUrl)
    }
    setFormData({
      ...formData,
      imageFile: null,
      imageUrl: ''
    })
  }

  const removeVideo = () => {
    if (formData.videoUrl && formData.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.videoUrl)
    }
    setFormData({
      ...formData,
      videoFile: null,
      videoUrl: ''
    })
  }

  const handleEditNotice = (notice) => {
    setSelectedNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      priority: notice.priority,
      targetAudience: notice.targetAudience,
      imageUrl: notice.imageUrl || notice.imageData?.secure_url || '',
      videoUrl: notice.videoUrl || notice.videoData?.secure_url || '',
      imageFile: null, // Reset file input - user can upload new file if needed
      videoFile: null, // Reset file input - user can upload new file if needed
      attachments: notice.attachments || [],
      status: notice.status || 'published',
      isPinned: notice.isPinned || false
    })
    setShowEditModal(true)
  }

  const handleDeleteNotice = (notice) => {
    setSelectedNotice(notice)
    setShowDeleteModal(true)
  }

  const handleSaveNotice = async () => {
    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    
    if (!formData.content || !formData.content.trim()) {
      toast.error('Please enter notice content')
      return
    }

    // Validate file requirements based on type
    if (formData.type === 'image' && !formData.imageFile && !formData.imageUrl) {
      toast.error('Please upload an image for image notices')
      return
    }
    
    if (formData.type === 'video' && !formData.videoFile && !formData.videoUrl) {
      toast.error('Please upload a video for video notices')
      return
    }


    try {
      setLoading(true)
      const response = await adminNoticeService.createNotice(formData)
      
      if (response.success) {
        toast.success('Notice created successfully')
        setShowCreateModal(false)
        resetFormData()
        // Optimistically add to list only if it matches current filter
        const newNotice = response.data
        if (newNotice) {
          const transformedNotice = {
            id: newNotice._id,
            ...newNotice,
            date: newNotice.formattedDate || newNotice.createdAt?.split('T')[0] || new Date(newNotice.createdAt).toISOString().split('T')[0],
            time: newNotice.formattedTime || new Date(newNotice.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            author: newNotice.authorName || (newNotice.author?.name || 'Admin'),
            imageUrl: newNotice.imageUrl || newNotice.imageData?.secure_url || '',
            videoUrl: newNotice.videoUrl || newNotice.videoData?.secure_url || ''
          }
          
          // Check if notice matches current tab filter
          const matchesFilter = 
            (selectedTab === 'pinned' && transformedNotice.isPinned) ||
            (selectedTab === 'draft' && transformedNotice.status === 'draft') ||
            (selectedTab === transformedNotice.type) ||
            (selectedTab === 'all')
          
          // Add to the beginning of the list only if it matches current filter
          if (matchesFilter) {
            // Use functional update to ensure we're working with latest state
            setNoticesData(prev => {
              // Check if notice already exists to prevent duplicates
              if (prev.some(n => n.id === transformedNotice.id)) {
                return prev
              }
              return [transformedNotice, ...prev]
            })
          }
        }
        // Update statistics only (no need to refetch all notices)
        await fetchStatistics()
      } else {
        toast.error('Failed to create notice')
      }
    } catch (error) {
      console.error('Error creating notice:', error)
      toast.error(error.message || 'Failed to create notice')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateNotice = async () => {
    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    
    if (!formData.content || !formData.content.trim()) {
      toast.error('Please enter notice content')
      return
    }

    if (!selectedNotice || !selectedNotice.id) {
      toast.error('No notice selected for update')
      return
    }

    // Validate file requirements if type changed and no existing media
    const hasExistingImage = selectedNotice.imageUrl || selectedNotice.imageData?.secure_url
    const hasExistingVideo = selectedNotice.videoUrl || selectedNotice.videoData?.secure_url
    
    if (formData.type === 'image' && !formData.imageFile && !formData.imageUrl && !hasExistingImage) {
      toast.error('Please upload an image or keep existing image')
      return
    }
    
    if (formData.type === 'video' && !formData.videoFile && !formData.videoUrl && !hasExistingVideo) {
      toast.error('Please upload a video or keep existing video')
      return
    }


    try {
      setLoading(true)
      const response = await adminNoticeService.updateNotice(selectedNotice.id, formData)
      
      if (response.success) {
        toast.success('Notice updated successfully')
        setShowEditModal(false)
        
        // Optimistically update local state
        const updatedNotice = response.data
        if (updatedNotice) {
          const transformedNotice = {
            id: updatedNotice._id,
            ...updatedNotice,
            date: updatedNotice.formattedDate || updatedNotice.createdAt?.split('T')[0] || new Date(updatedNotice.createdAt).toISOString().split('T')[0],
            time: updatedNotice.formattedTime || new Date(updatedNotice.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            author: updatedNotice.authorName || (updatedNotice.author?.name || 'Admin'),
            imageUrl: updatedNotice.imageUrl || updatedNotice.imageData?.secure_url || '',
            videoUrl: updatedNotice.videoUrl || updatedNotice.videoData?.secure_url || ''
          }
          
          // Check if updated notice matches current tab filter
          const matchesFilter = 
            (selectedTab === 'pinned' && transformedNotice.isPinned) ||
            (selectedTab === 'draft' && transformedNotice.status === 'draft') ||
            (selectedTab === transformedNotice.type) ||
            (selectedTab === 'all')
          
          setNoticesData(prev => {
            const existsInList = prev.some(n => n.id === selectedNotice.id)
            if (matchesFilter) {
              // Update if exists, add if it matches filter but wasn't in list
              if (existsInList) {
                return prev.map(n => n.id === selectedNotice.id ? transformedNotice : n)
              } else {
                // Add to beginning if it now matches filter
                return [transformedNotice, ...prev]
              }
            } else {
              // Remove if it no longer matches filter
              return prev.filter(n => n.id !== selectedNotice.id)
            }
          })
        }
        
        setSelectedNotice(null)
        resetFormData()
        // Update statistics only
        await fetchStatistics()
      } else {
        toast.error('Failed to update notice')
      }
    } catch (error) {
      console.error('Error updating notice:', error)
      toast.error(error.message || 'Failed to update notice')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedNotice || !selectedNotice.id) {
      toast.error('No notice selected for deletion')
      return
    }

    try {
      setLoading(true)
      const response = await adminNoticeService.deleteNotice(selectedNotice.id)
      
      if (response.success) {
        toast.success('Notice deleted successfully')
        setShowDeleteModal(false)
        
        // Optimistically remove from list
        setNoticesData(prev => prev.filter(n => n.id !== selectedNotice.id))
        
        setSelectedNotice(null)
        // Update statistics only
        await fetchStatistics()
      } else {
        toast.error('Failed to delete notice')
      }
    } catch (error) {
      console.error('Error deleting notice:', error)
      toast.error(error.message || 'Failed to delete notice')
    } finally {
      setLoading(false)
    }
  }

  const togglePinNotice = async (notice) => {
    if (!notice || !notice.id) return

    try {
      const response = await adminNoticeService.togglePinNotice(notice.id)
      
      if (response.success) {
        toast.success(
          response.data.isPinned ? 'Notice pinned successfully' : 'Notice unpinned successfully'
        )
        // Optimistically update local state instead of full refetch (use functional update)
        setNoticesData(prevNotices => 
          prevNotices.map(n => 
            n.id === notice.id 
              ? { ...n, isPinned: response.data.isPinned }
              : n
          )
        )
        // Only update statistics (don't await to avoid blocking UI)
        fetchStatistics()
      } else {
        toast.error('Failed to toggle pin notice')
      }
    } catch (error) {
      console.error('Error toggling pin notice:', error)
      toast.error(error.message || 'Failed to toggle pin notice')
    }
  }

  const resetFormData = () => {
    // Clean up any blob URLs
    if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imageUrl)
    }
    if (formData.videoUrl && formData.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.videoUrl)
    }
    
    setFormData({
      title: '',
      content: '',
      type: 'text',
      priority: 'medium',
      targetAudience: 'all',
      imageUrl: '',
      videoUrl: '',
      imageFile: null,
      videoFile: null,
      attachments: [],
      status: 'published',
      isPinned: false
    })
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setSelectedNotice(null)
    resetFormData()
  }

  // Download image function
  const handleDownloadImage = async (imageUrl) => {
    try {
      // Fetch the image as a blob with CORS handling
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch image')
      }
      
      const blob = await response.blob()
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element
      const link = document.createElement('a')
      link.href = blobUrl
      link.style.display = 'none'
      
      // Extract filename from URL or use default
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1].split('?')[0] || 'notice-image.jpg'
      
      // Ensure proper file extension
      const finalFileName = fileName.includes('.') ? fileName : `${fileName}.jpg`
      link.download = finalFileName
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)
      
      toast.success('Image downloaded successfully')
    } catch (error) {
      console.error('Error downloading image:', error)
      // Fallback: try direct download link
      try {
        const link = document.createElement('a')
        link.href = imageUrl
        const urlParts = imageUrl.split('/')
        const fileName = urlParts[urlParts.length - 1].split('?')[0] || 'notice-image.jpg'
        link.download = fileName.includes('.') ? fileName : `${fileName}.jpg`
        link.target = '_blank'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
          document.body.removeChild(link)
        }, 100)
        toast.success('Image download initiated')
      } catch (fallbackError) {
        console.error('Fallback download failed:', fallbackError)
        toast.error('Failed to download image. Please try right-clicking the image and selecting "Save image as".')
      }
    }
  }

  // Notice Card Components - Memoized to prevent unnecessary re-renders
  const NoticeCard = memo(({ notice, index = 0 }) => {
    const TypeIcon = getTypeIcon(notice.type)
    
    return (
      <div
        className={`bg-gradient-to-br ${getTypeColor(notice.type)} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow duration-200 relative`}
      >
        {/* Pin Indicator */}
        {notice.isPinned && (
          <div className="absolute top-2 right-2">
            <FiTarget className="h-4 w-4 text-orange-500" />
          </div>
        )}

        {/* Admin Actions */}
        <div className="absolute top-2 left-2 flex space-x-1">
          <button
            onClick={() => togglePinNotice(notice)}
            className={`p-1 rounded-full transition-colors ${
              notice.isPinned 
                ? 'bg-orange-100 text-orange-600' 
                : 'bg-gray-100 text-gray-400 hover:text-orange-600'
            }`}
          >
            <FiTarget className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-start justify-between mb-3 mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <TypeIcon className="text-white text-sm" />
            </div>
            <div>
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                {notice.type} Notice
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notice.status)}`}>
                  {notice.status}
                </span>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTargetAudienceColor(notice.targetAudience)}`}>
                  {notice.targetAudience}
                </span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{notice.title}</h3>
        
        {notice.type === 'image' && notice.imageUrl && (
          <div className="mb-3 cursor-pointer group relative" onClick={() => {
            setSelectedImageUrl(notice.imageUrl)
            setShowImageModal(true)
          }}>
            <img 
              src={notice.imageUrl} 
              alt={notice.title}
              className="w-full h-32 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity duration-200 flex items-center justify-center pointer-events-none">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FiZoomIn className="text-white text-2xl drop-shadow-lg" />
              </div>
            </div>
          </div>
        )}

        {notice.type === 'video' && notice.videoUrl && (
          <div className="mb-3">
            <video 
              src={notice.videoUrl} 
              controls
              className="w-full h-32 object-cover rounded-lg shadow-sm"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{notice.content}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <FiUser className="text-xs" />
              <span>{notice.author}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiCalendar className="text-xs" />
              <span>{notice.date}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <FiEye className="text-xs" />
            <span>{notice.views}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notice.priority)}`}>
            {notice.priority} priority
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEditNotice(notice)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <FiEdit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteNotice(notice)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders while allowing animations
    // Only skip re-render if notice data is exactly the same AND index hasn't changed
    // (index changes might indicate list reordering which needs animation)
    if (prevProps.index !== nextProps.index) {
      return false // Allow re-render if index changed (for layout animations)
    }
    
    // Check if notice data actually changed
    return (
      prevProps.notice.id === nextProps.notice.id &&
      prevProps.notice.title === nextProps.notice.title &&
      prevProps.notice.content === nextProps.notice.content &&
      prevProps.notice.isPinned === nextProps.notice.isPinned &&
      prevProps.notice.status === nextProps.notice.status &&
      prevProps.notice.imageUrl === nextProps.notice.imageUrl &&
      prevProps.notice.videoUrl === nextProps.notice.videoUrl &&
      prevProps.notice.views === nextProps.notice.views
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_navbar />
        <Admin_sidebar />
        <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Loading size="large" className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_navbar />
      <Admin_sidebar />
      
      {/* Main Content */}
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Notice Board Management</h1>
                <p className="text-sm lg:text-base text-gray-600 mt-2">Create and manage notices for all employees</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:space-x-0">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-center sm:text-left">
                  <span className="text-xs sm:text-sm font-semibold">Total: {statistics.total}</span>
                </div>
                <div className="bg-white text-gray-600 px-4 sm:px-6 py-2 sm:py-3 rounded-xl border border-gray-200 text-center sm:text-left">
                  <span className="text-xs sm:text-sm font-semibold">Showing: {filteredNotices.length}</span>
                </div>
                <Button
                  onClick={handleCreateNotice}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex items-center justify-center space-x-2 text-sm"
                >
                  <FiPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Create Notice</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Search & Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 lg:mb-6">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-blue-600 text-lg sm:text-xl" />
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm sm:text-lg"
                />
              </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex flex-nowrap gap-1 px-2 lg:px-4 min-w-max lg:min-w-0">
                  {tabs.map((tab) => {
                    const TabIcon = tab.icon
                    const isActive = selectedTab === tab.id
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${
                          isActive
                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <TabIcon className="h-4 w-4" />
                        <span className="whitespace-nowrap">{tab.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8"
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Notices</p>
                    <p className="text-lg lg:text-2xl font-bold text-blue-900">{statistics.total}</p>
                  </div>
                  <FiFileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Published</p>
                    <p className="text-lg lg:text-2xl font-bold text-green-900">{statistics.published}</p>
                  </div>
                  <FiCheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">Pinned</p>
                    <p className="text-lg lg:text-2xl font-bold text-orange-900">{statistics.pinned}</p>
                  </div>
                  <FiTarget className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Drafts</p>
                    <p className="text-lg lg:text-2xl font-bold text-purple-900">{statistics.draft}</p>
                  </div>
                  <FiEdit3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredNotices.map((notice, index) => (
              <NoticeCard 
                key={notice.id} 
                notice={notice} 
                index={index}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredNotices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiFileText className="text-gray-400 text-3xl" />
                </div>
                <h3 className="text-lg lg:text-2xl font-semibold text-gray-900 mb-4">No notices found</h3>
                <p className="text-gray-600 text-lg mb-6">
                  {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No notices match your current filters.'}
                </p>
                <Button
                  onClick={handleCreateNotice}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 mx-auto"
                >
                  <FiPlus className="h-5 w-5" />
                  <span>Create First Notice</span>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Notice Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Create New Notice</h3>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveNotice(); }} className="space-y-3 lg:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notice Type</label>
                    <Combobox
                      options={typeOptions}
                      value={formData.type}
                      onChange={(value) => setFormData({...formData, type: value})}
                      placeholder="Select type"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <Combobox
                      options={priorityOptions}
                      value={formData.priority}
                      onChange={(value) => setFormData({...formData, priority: value})}
                      placeholder="Select priority"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                    <Combobox
                      options={targetAudienceOptions}
                      value={formData.targetAudience}
                      onChange={(value) => setFormData({...formData, targetAudience: value})}
                      placeholder="Select audience"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <Combobox
                      options={statusOptions}
                      value={formData.status}
                      onChange={(value) => setFormData({...formData, status: value})}
                      placeholder="Select status"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter notice title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter notice content"
                    required
                  />
                </div>

                {formData.type === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Upload</label>
                    
                    {!formData.imageUrl ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 lg:p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <FiUpload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload image</span>
                          <span className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                        <div className="mt-2 text-xs text-gray-500">
                          {formData.imageFile ? `File: ${formData.imageFile.name}` : 'Image uploaded'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Video Upload</label>
                    
                    {!formData.videoUrl ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 lg:p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                          id="video-upload"
                        />
                        <label
                          htmlFor="video-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <FiUpload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload video</span>
                          <span className="text-xs text-gray-500">MP4, MOV, AVI up to 50MB</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <video
                          src={formData.videoUrl}
                          controls
                          className="w-full h-48 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                        <div className="mt-2 text-xs text-gray-500">
                          {formData.videoFile ? `File: ${formData.videoFile.name}` : 'Video uploaded'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Pin this notice</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FiSave className="h-4 w-4" />
                    <span>Create Notice</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Notice Modal */}
      <AnimatePresence>
        {showEditModal && selectedNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Edit Notice</h3>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateNotice(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notice Type</label>
                    <Combobox
                      options={typeOptions}
                      value={formData.type}
                      onChange={(value) => setFormData({...formData, type: value})}
                      placeholder="Select type"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <Combobox
                      options={priorityOptions}
                      value={formData.priority}
                      onChange={(value) => setFormData({...formData, priority: value})}
                      placeholder="Select priority"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                    <Combobox
                      options={targetAudienceOptions}
                      value={formData.targetAudience}
                      onChange={(value) => setFormData({...formData, targetAudience: value})}
                      placeholder="Select audience"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <Combobox
                      options={statusOptions}
                      value={formData.status}
                      onChange={(value) => setFormData({...formData, status: value})}
                      placeholder="Select status"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter notice title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter notice content"
                    required
                  />
                </div>

                {formData.type === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Upload</label>
                    
                    {!formData.imageUrl ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 lg:p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <FiUpload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload image</span>
                          <span className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                        <div className="mt-2 text-xs text-gray-500">
                          {formData.imageFile ? `File: ${formData.imageFile.name}` : 'Image uploaded'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Video Upload</label>
                    
                    {!formData.videoUrl ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 lg:p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                          id="video-upload"
                        />
                        <label
                          htmlFor="video-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <FiUpload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload video</span>
                          <span className="text-xs text-gray-500">MP4, MOV, AVI up to 50MB</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <video
                          src={formData.videoUrl}
                          controls
                          className="w-full h-48 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                        <div className="mt-2 text-xs text-gray-500">
                          {formData.videoFile ? `File: ${formData.videoFile.name}` : 'Video uploaded'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Pin this notice</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FiSave className="h-4 w-4" />
                    <span>Update Notice</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-[95vw] lg:max-w-md m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Delete Notice</h3>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the notice "{selectedNotice.title}"? This action cannot be undone.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FiAlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-red-800 text-sm font-medium">This will permanently remove the notice from all employee views.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={closeModals}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <FiTrash2 className="h-4 w-4" />
                  <span>Delete Notice</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image View Modal */}
      <AnimatePresence>
        {showImageModal && selectedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowImageModal(false)
              setSelectedImageUrl(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-7xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowImageModal(false)
                  setSelectedImageUrl(null)
                }}
                className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 z-10 backdrop-blur-sm"
                aria-label="Close image view"
              >
                <FiX className="h-6 w-6" />
              </button>

              {/* Full Size Image */}
              <div className="max-w-full max-h-full w-full h-full flex items-center justify-center">
                <img
                  src={selectedImageUrl}
                  alt="Full size notice image"
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Download Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadImage(selectedImageUrl)
                }}
                className="absolute bottom-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm flex items-center space-x-2"
                aria-label="Download image"
              >
                <FiDownload className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Admin_notice_board
