import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
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
  FiRefreshCw,
  FiZoomIn,
  FiX
} from 'react-icons/fi'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import { employeeNoticeService } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'
import Loading from '../../../../components/ui/loading'

const Employee_notice_board = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [noticesData, setNoticesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)
  
  // Refs for debouncing
  const searchTimeoutRef = useRef(null)
  const isInitialMountRef = useRef(true)

  // Fetch notices from API
  const fetchNotices = useCallback(async (showLoading = true, customFilter = null, customSearch = null) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const filter = customFilter !== null ? customFilter : selectedFilter
      const search = customSearch !== null ? customSearch : searchTerm

      const params = {}
      
      // Apply type filter
      if (filter !== 'all') {
        params.type = filter
      }

      // Apply search
      if (search) {
        params.search = search
      }

      const response = await employeeNoticeService.getNotices(params)
      
      if (response.success && response.data) {
        // Data is already formatted by backend
        setNoticesData(response.data)
      } else {
        setNoticesData([])
      }
    } catch (error) {
      console.error('Error fetching notices:', error)
      toast.error(error.message || 'Failed to fetch notices')
      setNoticesData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedFilter, searchTerm, toast])

  // Initial load
  useEffect(() => {
    fetchNotices(true)
    isInitialMountRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch when filter changes (skip initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) return
    fetchNotices(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter])

  // Debounced search - refetch when search term changes (skip initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) return

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Don't refetch if search is cleared
    if (searchTerm === '') {
      fetchNotices(false, null, '')
      return
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchNotices(false, null, searchTerm)
    }, 500) // 500ms debounce

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Handle notice view increment
  const handleNoticeView = async (noticeId) => {
    try {
      await employeeNoticeService.incrementNoticeViews(noticeId)
      // Optimistically update views in local state
      setNoticesData(prev => 
        prev.map(n => 
          n.id === noticeId || n._id === noticeId
            ? { ...n, views: (n.views || 0) + 1 }
            : n
        )
      )
    } catch (error) {
      console.error('Error incrementing notice views:', error)
      // Don't show error to user for view increment failures
    }
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


  const filters = [
    { id: 'all', label: 'All Notices', icon: FiFileText },
    { id: 'text', label: 'Text', icon: FiFileText },
    { id: 'image', label: 'Images', icon: FiImage },
    { id: 'video', label: 'Videos', icon: FiVideo }
  ]

  // Notices are already filtered by API, but we can do client-side filtering if needed
  const filteredNotices = noticesData

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

  // Text Notice Card Component
  const TextNoticeCard = ({ notice }) => {
    const TypeIcon = getTypeIcon(notice.type)
    const noticeId = notice.id || notice._id
    
    return (
      <div
        onClick={() => handleNoticeView(noticeId)}
        className={`bg-gradient-to-br ${getTypeColor(notice.type)} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <TypeIcon className="text-white text-sm" />
            </div>
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Text Notice</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{notice.title}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{notice.content}</p>

        <div className="flex items-center justify-between text-xs text-gray-500">
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
            <span>{notice.views || 0}</span>
          </div>
        </div>
      </div>
    )
  }

  // Image Notice Card Component
  const ImageNoticeCard = ({ notice }) => {
    const TypeIcon = getTypeIcon(notice.type)
    const noticeId = notice.id || notice._id
    const imageUrl = notice.imageUrl || notice.imageData?.secure_url || ''
    
    return (
      <div
        className={`bg-gradient-to-br ${getTypeColor(notice.type)} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow duration-200`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <TypeIcon className="text-white text-sm" />
            </div>
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Image Notice</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{notice.title}</h3>
        
        {imageUrl && (
          <div 
            className="mb-3 cursor-pointer group relative" 
            onClick={(e) => {
              e.stopPropagation()
              setSelectedImageUrl(imageUrl)
              setShowImageModal(true)
              handleNoticeView(noticeId)
            }}
          >
            <img 
              src={imageUrl} 
              alt={notice.title}
              className="w-full h-32 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity duration-200 flex items-center justify-center pointer-events-none">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FiZoomIn className="text-white text-2xl drop-shadow-lg" />
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{notice.content}</p>

        <div className="flex items-center justify-between text-xs text-gray-500">
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
            <span>{notice.views || 0}</span>
          </div>
        </div>
      </div>
    )
  }

  // Video Notice Card Component
  const VideoNoticeCard = ({ notice }) => {
    const TypeIcon = getTypeIcon(notice.type)
    const noticeId = notice.id || notice._id
    const videoUrl = notice.videoUrl || notice.videoData?.secure_url || ''
    
    return (
      <div
        onClick={() => handleNoticeView(noticeId)}
        className={`bg-gradient-to-br ${getTypeColor(notice.type)} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
              <TypeIcon className="text-white text-sm" />
            </div>
            <span className="text-xs font-medium text-pink-700 uppercase tracking-wide">Video Notice</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{notice.title}</h3>
        
        {videoUrl ? (
          <div className="mb-3">
            <video 
              src={videoUrl} 
              controls
              className="w-full h-32 object-cover rounded-lg shadow-sm"
              preload="none"
              crossOrigin="anonymous"
              onError={(e) => {
                console.warn('Video loading error:', e)
                e.target.style.display = 'none'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="relative mb-3">
            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="flex items-center space-x-2 text-gray-500">
                <FiPlay className="text-2xl" />
                <span className="text-sm font-medium">Video not available</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{notice.content}</p>

        <div className="flex items-center justify-between text-xs text-gray-500">
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
            <span>{notice.views || 0}</span>
          </div>
        </div>
      </div>
    )
  }

  // Notice Card Renderer
  const NoticeCard = ({ notice }) => {
    switch (notice.type) {
      case 'text':
        return <TextNoticeCard notice={notice} />
      case 'image':
        return <ImageNoticeCard notice={notice} />
      case 'video':
        return <VideoNoticeCard notice={notice} />
      default:
        return <TextNoticeCard notice={notice} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Employee_navbar />
        <main className="max-w-7xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <Loading size="large" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Employee_navbar />
      
      <main className="max-w-7xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 shadow-md border border-teal-200/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                    <FiFileText className="text-white text-lg" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-teal-900 leading-tight">
                      Notice Board
                    </h1>
                    <p className="text-teal-700 text-xs font-medium mt-0.5">
                      Latest updates and announcements
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                  <div className="text-center">
                    <p className="text-xs text-teal-600 font-medium mb-0.5">Total</p>
                    <p className="text-2xl font-bold text-teal-900 leading-none">{noticesData.length}</p>
                    <p className="text-xs text-teal-600 font-medium mt-0.5">Notices</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Search and Filter Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-4"
          >
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notices..."
                className="w-full pl-8 pr-24 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {refreshing && (
                  <FiRefreshCw className="text-teal-600 animate-spin" />
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    showFilters 
                      ? 'bg-teal-500 text-white shadow-md' 
                      : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-teal-200'
                  }`}
                >
                  <FiFilter className="text-base" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap gap-2 mb-4"
            >
              {filters.map((filter) => {
                const FilterIcon = filter.icon
                return (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                      selectedFilter === filter.id
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FilterIcon className="text-sm" />
                    <span>{filter.label}</span>
                  </button>
                )
              })}
            </motion.div>
          )}

          {/* Results Count */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-4"
          >
            <p className="text-gray-600 text-sm">
              Showing {filteredNotices.length} of {noticesData.length} notices
            </p>
          </motion.div>

          {/* Mobile Notices Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-4"
          >
            {filteredNotices.map((notice) => {
              const noticeId = notice.id || notice._id
              return (
                <div key={noticeId}>
                  <NoticeCard notice={notice} />
                </div>
              )
            })}

            {/* Empty State */}
            {filteredNotices.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No notices found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No notices match your current filters.'}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Main Content - 8 columns */}
            <div className="col-span-8 space-y-6">
              
              {/* Desktop Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-between"
              >
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
                  <p className="text-gray-600 mt-2">Latest updates and announcements from admin</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-xl">
                    <span className="text-sm font-semibold">Total: {noticesData.length}</span>
                  </div>
                  <div className="bg-white text-gray-600 px-6 py-3 rounded-xl border border-gray-200">
                    <span className="text-sm font-semibold">Showing: {filteredNotices.length}</span>
                  </div>
                </div>
              </motion.div>

              {/* Desktop Search & Filters */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1 relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600 text-xl" />
                    <input
                      type="text"
                      placeholder="Search notices by title, content, or author..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-24 py-4 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-lg"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      {refreshing && (
                        <FiRefreshCw className="text-teal-600 animate-spin" />
                      )}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          showFilters 
                            ? 'bg-teal-500 text-white shadow-md' 
                            : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-teal-200'
                        }`}
                      >
                        <FiFilter className="text-lg" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Filters */}
                {showFilters && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-wrap gap-2"
                  >
                    {filters.map((filter) => {
                      const FilterIcon = filter.icon
                      return (
                        <button
                          key={filter.id}
                          onClick={() => setSelectedFilter(filter.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                            selectedFilter === filter.id
                              ? 'bg-teal-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <FilterIcon className="text-sm" />
                          <span>{filter.label}</span>
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </motion.div>

              {/* Desktop Notices Grid */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filteredNotices.map((notice) => {
                  const noticeId = notice.id || notice._id
                  return (
                    <div key={noticeId}>
                      <NoticeCard notice={notice} />
                    </div>
                  )
                })}
              </motion.div>

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
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">No notices found</h3>
                    <p className="text-gray-600 text-lg">
                      {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No notices match your current filters.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar - 4 columns */}
            <div className="col-span-4 space-y-6">
            
              {/* Stats Overview */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 shadow-xl border border-teal-200/50"
              >
                <h3 className="text-lg font-bold text-teal-900 mb-4">Notice Statistics</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-teal-700 text-sm font-medium">Total Notices</span>
                    <span className="text-teal-900 text-xl font-bold">{noticesData.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-700 text-sm font-medium">Text Notices</span>
                    <span className="text-teal-900 text-xl font-bold">{noticesData.filter(n => n.type === 'text').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-700 text-sm font-medium">Image Notices</span>
                    <span className="text-teal-900 text-xl font-bold">{noticesData.filter(n => n.type === 'image').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-700 text-sm font-medium">Video Notices</span>
                    <span className="text-teal-900 text-xl font-bold">{noticesData.filter(n => n.type === 'video').length}</span>
                  </div>
                </div>
              </motion.div>

              {/* Recent Notices */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Notices</h3>
                
                <div className="space-y-3">
                  {noticesData.slice(0, 3).map((notice) => {
                    const TypeIcon = getTypeIcon(notice.type)
                    const noticeId = notice.id || notice._id
                    return (
                      <div key={noticeId} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                          <TypeIcon className="text-teal-600 text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{notice.title}</p>
                          <p className="text-xs text-gray-600">{notice.date}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 1.0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <button className="w-full bg-teal-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-teal-600 transition-colors duration-200 flex items-center justify-center space-x-2">
                    <FiDownload className="text-lg" />
                    <span>Download All</span>
                  </button>
                  
                  <button className="w-full bg-white text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                    <FiEye className="text-lg" />
                    <span>Mark All Read</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

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

export default Employee_notice_board

