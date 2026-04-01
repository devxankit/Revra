import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import { adminProjectService } from '../admin-services/adminProjectService'
import { adminUserService } from '../admin-services/adminUserService'
import adminClientTagService from '../admin-services/adminClientTagService'
import adminBannerService from '../admin-services/adminBannerService'
import { 
  FiSearch,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiCalendar,
  FiHome,
  FiFilter,
  FiPlus,
  FiTag,
  FiX,
  FiGift,
  FiImage,
  FiChevronUp,
  FiChevronDown
} from 'react-icons/fi'
import { 
  Filter,
  Calendar,
  BarChart3,
  TrendingUp,
  Database,
  CalendarDays,
  ChevronDown,
  Check
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import Loading from '../../../components/ui/loading'
import CloudinaryUpload from '../../../components/ui/cloudinary-upload'
import { useToast } from '../../../contexts/ToastContext'

const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const getStatusColor = (status) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200'
  }
  return statusColors[status] || statusColors.inactive
}

const Admin_client_management = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('clients') // 'clients', 'birthdays', or 'banners'
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Date range filter state
  const [dateFilterType, setDateFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [showTagAssignModal, setShowTagAssignModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [clientProjects, setClientProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [clientFormData, setClientFormData] = useState({
    name: '',
    email: '',
    contact: '',
    tag: ''
  })
  const [isSavingUser, setIsSavingUser] = useState(false)
  
  // Tag management state
  const [tags, setTags] = useState([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [selectedTagFilter, setSelectedTagFilter] = useState('all')
  const [showTagManagementModal, setShowTagManagementModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [editingTag, setEditingTag] = useState(null)

  // Statistics
  const [statistics, setStatistics] = useState({
    clients: {
      total: 0,
      active: 0,
      inactive: 0,
      newThisMonth: 0
    }
  })

  // Birthdays filter state
  const [birthdayFilter, setBirthdayFilter] = useState('week') // 'today', 'week', 'month'

  // Banners state
  const [banners, setBanners] = useState([])
  const [loadingBanners, setLoadingBanners] = useState(false)
  const [carouselIntervalSeconds, setCarouselIntervalSeconds] = useState(5)
  const [showDeleteBannerModal, setShowDeleteBannerModal] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState(null)

  // Load tags from backend on mount
  useEffect(() => {
    loadTags()
  }, [])

  // Load banners when switching to Banners tab
  useEffect(() => {
    if (activeSection === 'banners') {
      loadBanners()
    }
  }, [activeSection])

  const loadTags = async () => {
    setLoadingTags(true)
    try {
      const response = await adminClientTagService.getAllTags({ isActive: true })
      if (response.success) {
        setTags(response.data || [])
      }
    } catch (error) {
      console.error('Error loading tags:', error)
      toast.error('Failed to load tags')
    } finally {
      setLoadingTags(false)
    }
  }

  const loadBanners = async () => {
    setLoadingBanners(true)
    try {
      const [bannersRes, settingsRes] = await Promise.all([
        adminBannerService.getBanners(),
        adminBannerService.getSettings()
      ])
      if (bannersRes.success) {
        setBanners(bannersRes.data || [])
      }
      if (settingsRes.success && settingsRes.data) {
        setCarouselIntervalSeconds(settingsRes.data.carouselIntervalSeconds ?? 5)
      }
    } catch (error) {
      console.error('Error loading banners:', error)
      toast.error('Failed to load banners')
    } finally {
      setLoadingBanners(false)
    }
  }

  const handleBannerUpload = async (uploadData) => {
    const url = uploadData.secure_url || uploadData.url
    const publicId = uploadData.public_id || uploadData.publicId
    if (!url || !publicId) {
      toast.error('Invalid upload response')
      return
    }
    try {
      const order = banners.length
      const response = await adminBannerService.createBanner({ url, publicId, order, isActive: true })
      if (response.success) {
        toast.success('Banner uploaded successfully')
        await loadBanners()
      } else {
        toast.error(response.message || 'Failed to add banner')
      }
    } catch (error) {
      console.error('Error creating banner:', error)
      toast.error(error?.message || 'Failed to add banner')
    }
  }

  const handleBannerToggle = async (banner) => {
    try {
      const response = await adminBannerService.updateBanner(banner._id || banner.id, {
        isActive: !banner.isActive
      })
      if (response.success) {
        toast.success(banner.isActive ? 'Banner deactivated' : 'Banner activated')
        await loadBanners()
      } else {
        toast.error(response.message || 'Failed to update banner')
      }
    } catch (error) {
      console.error('Error updating banner:', error)
      toast.error(error?.message || 'Failed to update banner')
    }
  }

  const handleBannerReorder = async (banner, direction) => {
    const index = banners.findIndex(b => (b._id || b.id) === (banner._id || banner.id))
    if (index === -1) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= banners.length) return

    const reordered = [...banners]
    const [removed] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, removed)

    try {
      const updates = reordered.map((b, i) =>
        adminBannerService.updateBanner(b._id || b.id, { order: i })
      )
      await Promise.all(updates)
      setBanners(reordered.map((b, i) => ({ ...b, order: i })))
      toast.success('Order updated')
    } catch (error) {
      console.error('Error reordering:', error)
      toast.error(error?.message || 'Failed to reorder')
    }
  }

  const handleBannerDelete = (banner) => {
    setSelectedBanner(banner)
    setShowDeleteBannerModal(true)
  }

  const confirmBannerDelete = async () => {
    if (!selectedBanner) return
    try {
      const response = await adminBannerService.deleteBanner(selectedBanner._id || selectedBanner.id)
      if (response.success) {
        toast.success('Banner deleted')
        setShowDeleteBannerModal(false)
        setSelectedBanner(null)
        await loadBanners()
      } else {
        toast.error(response.message || 'Failed to delete banner')
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
      toast.error(error?.message || 'Failed to delete banner')
    }
  }

  const handleCarouselIntervalSave = async () => {
    const value = Math.min(30, Math.max(3, Number(carouselIntervalSeconds)))
    setCarouselIntervalSeconds(value)
    try {
      await adminBannerService.updateSettings({ carouselIntervalSeconds: value })
      toast.success('Carousel speed updated')
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error(error?.message || 'Failed to update settings')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!loading) {
      loadClients()
    }
  }, [selectedFilter, searchTerm, selectedTagFilter])

  // Reset pagination when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedFilter, searchTerm, selectedTagFilter, dateFilterType, startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadClients(),
        loadStatistics()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      // Fetch a large list of clients once, then handle search/filter/pagination on frontend
      const clientsResponse = await adminProjectService.getClients({
        status: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: searchTerm || undefined,
        limit: 1000
      })
      if (clientsResponse.success) {
        setClients(clientsResponse.data || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Failed to load clients')
    }
  }

  const loadStatistics = async () => {
    try {
      // Load statistics - you can implement this based on your API
      const statsResponse = await adminProjectService.getClients({ limit: 1000 })
      if (statsResponse.success) {
        const allClients = statsResponse.data || []
        const activeClients = allClients.filter(c => c.status === 'active')
        const inactiveClients = allClients.filter(c => c.status === 'inactive')
        const thisMonth = new Date()
        thisMonth.setDate(1)
        const newThisMonth = allClients.filter(c => {
          const joinDate = new Date(c.joinDate || c.createdAt)
          return joinDate >= thisMonth
        })
        
        setStatistics({
          clients: {
            total: allClients.length,
            active: activeClients.length,
            inactive: inactiveClients.length,
            newThisMonth: newThisMonth.length
          }
        })
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const getDateFilterLabel = () => {
    switch (dateFilterType) {
      case 'day': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'year': return 'This Year'
      case 'custom': return startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'Custom Range'
      default: return 'All Time'
    }
  }

  // Tag management functions
  const createTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required')
      return
    }
    
    try {
      const response = await adminClientTagService.createTag({
        name: newTagName.trim(),
        color: newTagColor
      })
      
      if (response.success) {
        toast.success('Tag created successfully')
        setNewTagName('')
        setNewTagColor('#3b82f6')
        await loadTags()
      } else {
        toast.error(response.message || 'Failed to create tag')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
      toast.error(error?.response?.data?.message || 'Failed to create tag')
    }
  }

  const updateTag = async () => {
    if (!editingTag || !newTagName.trim()) {
      toast.error('Tag name is required')
      return
    }
    
    try {
      const response = await adminClientTagService.updateTag(editingTag._id || editingTag.id, {
        name: newTagName.trim(),
        color: newTagColor
      })
      
      if (response.success) {
        toast.success('Tag updated successfully')
        setEditingTag(null)
        setNewTagName('')
        setNewTagColor('#3b82f6')
        await loadTags()
        await loadClients() // Reload clients to get updated tag info
      } else {
        toast.error(response.message || 'Failed to update tag')
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      toast.error(error?.response?.data?.message || 'Failed to update tag')
    }
  }

  const deleteTag = async (tagId) => {
    try {
      const response = await adminClientTagService.deleteTag(tagId)
      
      if (response.success) {
        toast.success('Tag deleted successfully')
        await loadTags()
      } else {
        toast.error(response.message || 'Failed to delete tag')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error(error?.response?.data?.message || 'Failed to delete tag')
    }
  }

  const getClientTag = (client) => {
    // Client tag is populated from backend
    if (client.tag) {
      // Handle both object (populated) and string/ID (not populated) cases
      if (typeof client.tag === 'object' && client.tag.name) {
        return client.tag
      }
      // If tag is just an ID, try to find it in tags array
      if (typeof client.tag === 'string' || client.tag._id) {
        const tagId = client.tag._id || client.tag
        const foundTag = tags.find(t => (t._id || t.id) === tagId)
        if (foundTag) return foundTag
      }
    }
    return null
  }

  const getFilteredData = () => {
    let filtered = [...clients]

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.contact?.toLowerCase().includes(searchLower) ||
        client.companyName?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(client => client.status === selectedFilter)
    }

    // Tag filter
    if (selectedTagFilter !== 'all') {
      filtered = filtered.filter(client => {
        const clientTag = getClientTag(client)
        if (!clientTag) return false
        const tagId = clientTag._id || clientTag.id
        return tagId === selectedTagFilter
      })
    }

    // Date filter
    if (dateFilterType !== 'all') {
      // Custom range: use explicit start/end dates
      if (dateFilterType === 'custom' && startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        filtered = filtered.filter(client => {
          const dateToCheck = client.createdAt || client.joinDate || client.dateCreated || client.lastActivity
          if (!dateToCheck) return false
          const clientDate = new Date(dateToCheck)
          return clientDate >= start && clientDate <= end
        })
      } else if (dateFilterType !== 'custom') {
        const now = new Date()
        const periodStart = new Date()

        switch (dateFilterType) {
          case 'day':
            periodStart.setHours(0, 0, 0, 0)
            break
          case 'week':
            periodStart.setDate(now.getDate() - now.getDay())
            periodStart.setHours(0, 0, 0, 0)
            break
          case 'month':
            periodStart.setDate(1)
            periodStart.setHours(0, 0, 0, 0)
            break
          case 'year':
            periodStart.setMonth(0, 1)
            periodStart.setHours(0, 0, 0, 0)
            break
          default:
            break
        }

        filtered = filtered.filter(client => {
          const dateToCheck = client.createdAt || client.joinDate || client.dateCreated || client.lastActivity
          if (!dateToCheck) return false
          const clientDate = new Date(dateToCheck)
          return clientDate >= periodStart
        })
      }
    }

    return filtered
  }

  const filteredData = getFilteredData()
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Get clients with birthdays based on filter (today, week, month)
  const getFilteredBirthdays = () => {
    if (!clients || clients.length === 0) return []
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)
    
    let startDate, endDate
    
    switch (birthdayFilter) {
      case 'today':
        startDate = new Date(today)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday
        startDate = new Date(today)
        startDate.setDate(today.getDate() - dayOfWeek) // Start from Sunday
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6) // End on Saturday
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      default:
        startDate = today
        endDate = today
    }
    
    const filteredBirthdays = clients
      .filter(client => {
        // Check multiple possible field names for dateOfBirth
        const dob = client.dateOfBirth || client.dateOfbirth || client.dob || client.birthday
        if (!dob) return false
        
        try {
          const birthDate = new Date(dob)
          if (isNaN(birthDate.getTime())) return false
          
          const thisYearBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate())
          thisYearBirthday.setHours(0, 0, 0, 0)
          
          // Check if birthday falls within the selected period
          return thisYearBirthday >= startDate && thisYearBirthday <= endDate
        } catch (e) {
          console.error('Error parsing dateOfBirth for client:', client.name, e)
          return false
        }
      })
      .map(client => {
        const dob = client.dateOfBirth || client.dateOfbirth || client.dob || client.birthday
        const birthDate = new Date(dob)
        const thisYearBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        thisYearBirthday.setHours(0, 0, 0, 0)
        const dayOfWeek = thisYearBirthday.getDay()
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        
        return {
          ...client,
          birthdayDate: thisYearBirthday,
          dayName: dayNames[dayOfWeek],
          dayOfMonth: birthDate.getDate(),
          month: birthDate.toLocaleDateString('en-US', { month: 'short' })
        }
      })
      .sort((a, b) => a.birthdayDate - b.birthdayDate) // Sort by date
    
    return filteredBirthdays
  }

  const weeklyBirthdays = getFilteredBirthdays()

  const handleEdit = (item) => {
    setSelectedItem(item)
    const clientTag = getClientTag(item)
    const tagId = clientTag ? (clientTag._id || clientTag.id) : ''
    setClientFormData({
      name: item.name || item.companyName || '',
      email: item.email || '',
      contact: item.contact || item.phone || item.phoneNumber || '',
      tag: tagId || ''
    })
    setShowEditModal(true)
  }

  const handleView = (item) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const handleDelete = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleAssignTag = (client) => {
    setSelectedItem(client)
    const clientTag = getClientTag(client)
    const tagId = clientTag ? (clientTag._id || clientTag.id) : ''
    setClientFormData({
      name: client.name || client.companyName || '',
      email: client.email || '',
      contact: client.contact || client.phone || client.phoneNumber || '',
      tag: tagId || ''
    })
    setShowTagAssignModal(true)
  }

  const handleSaveTagAssignment = async () => {
    if (!selectedItem || (!selectedItem._id && !selectedItem.id)) {
      toast.error('Client ID is missing. Cannot update.')
      return
    }
    
    setIsSavingUser(true)
    
    try {
      const itemId = selectedItem._id || selectedItem.id
      const updateData = {
        tag: clientFormData.tag || null
      }
      
      const response = await adminUserService.updateUser('client', itemId, updateData)
      
      if (response?.success) {
        toast.success('Tag assigned successfully!')
        setShowTagAssignModal(false)
        setSelectedItem(null)
        setClientFormData({ name: '', email: '', contact: '', tag: '' })
        
        // Reload clients to get updated tag data
        await loadClients()
        
        // Also reload statistics
        await loadStatistics()
      } else {
        toast.error(response?.message || 'Failed to assign tag')
      }
    } catch (error) {
      console.error('Error assigning tag:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Failed to assign tag')
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleProjectsClick = async (client) => {
    setSelectedItem(client)
    setShowProjectsModal(true)
    setLoadingProjects(true)
    setClientProjects([])
    
    try {
      const clientId = client._id || client.id || client.userId
      if (!clientId) {
        toast.error('Client ID not found')
        setLoadingProjects(false)
        return
      }

      let allProjects = []

      try {
        // Use direct API call to fetch ALL projects for this client (no hasPM filter, all statuses)
        const { apiRequest } = await import('../admin-services/baseApiService')
        const queryParams = new URLSearchParams()
        queryParams.append('client', clientId)
        queryParams.append('limit', '1000')

        const response = await apiRequest(`/admin/projects?${queryParams.toString()}`)

        if (response && response.success && response.data) {
          const projects = (response.data || []).filter(project => {
            const projectClientId = typeof project.client === 'object' 
              ? (project.client._id || project.client.id || project.client.userId)
              : (project.client || project.clientId)
            return String(projectClientId) === String(clientId)
          })
          allProjects = [...projects]
        }
      } catch (directError) {
        console.error('Error fetching client projects directly:', directError)
        // Fallback to existing service methods (with hasPM filter) if direct API fails
        try {
          const response = await adminProjectService.getActiveProjects({ 
            client: clientId,
            limit: 1000 
          })
          
          if (response.success && response.data) {
            const activeProjects = (response.data || []).filter(project => {
              const projectClientId = typeof project.client === 'object' 
                ? (project.client._id || project.client.id || project.client.userId)
                : (project.client || project.clientId)
              return String(projectClientId) === String(clientId)
            })
            allProjects = [...activeProjects]
          }

          try {
            const completedResponse = await adminProjectService.getCompletedProjects({ 
              limit: 1000 
            })
            if (completedResponse.success && completedResponse.data) {
              const completedProjects = (completedResponse.data || []).filter(project => {
                const projectClientId = typeof project.client === 'object' 
                  ? (project.client._id || project.client.id || project.client.userId)
                  : (project.client || project.clientId)
                return String(projectClientId) === String(clientId)
              })
              const existingIds = new Set(allProjects.map(p => String(p._id || p.id)))
              const uniqueCompleted = completedProjects.filter(p => !existingIds.has(String(p._id || p.id)))
              allProjects = [...allProjects, ...uniqueCompleted]
            }
          } catch (completedError) {
            console.error('Error fetching completed projects in fallback:', completedError)
          }
        } catch (serviceError) {
          console.error('Error fetching projects via adminProjectService:', serviceError)
        }
      }
      
      setClientProjects(allProjects)
    } catch (error) {
      console.error('Error loading client projects:', error)
      toast.error('Failed to load projects')
      setClientProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedItem) return
    
    try {
      const itemId = selectedItem._id || selectedItem.id
      const response = await adminUserService.deleteUser('client', itemId)
      
      if (response?.success) {
        toast.success('Client deleted successfully!')
        setShowDeleteModal(false)
        setSelectedItem(null)
        await loadClients()
        await loadStatistics()
      } else {
        toast.error(response?.message || 'Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete client')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (isSavingUser) return
    
    if (!selectedItem || (!selectedItem._id && !selectedItem.id)) {
      toast.error('Client ID is missing. Cannot update.')
      return
    }
    
    setIsSavingUser(true)
    
    try {
      const itemId = selectedItem._id || selectedItem.id
      const updateData = {
        name: clientFormData.name.trim(),
        email: clientFormData.email.trim(),
        phone: clientFormData.contact.trim()
      }
      
      // Add tag to update data if provided
      if (clientFormData.tag) {
        updateData.tag = clientFormData.tag
      } else {
        updateData.tag = null
      }
      
      const response = await adminUserService.updateUser('client', itemId, updateData)
      
      if (response?.success) {
        toast.success('Client updated successfully!')
        setShowEditModal(false)
        setSelectedItem(null)
        setClientFormData({ name: '', email: '', contact: '', tag: '' })
        await loadClients()
        await loadStatistics()
      } else {
        toast.error(response?.message || 'Failed to update client')
      }
    } catch (error) {
      console.error('Error updating client:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update client')
    } finally {
      setIsSavingUser(false)
    }
  }

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
      {/* Navbar */}
      <Admin_navbar />
      
      {/* Sidebar */}
      <Admin_sidebar />
      
      {/* Main Content */}
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">Manage your client relationships and information</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-teal-100 rounded-lg">
                  <FiHome className="h-3 w-3 text-teal-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Total Clients</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.clients.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-green-600 font-semibold">+{statistics.clients.newThisMonth}</span>
                  <span className="text-xs text-gray-500">new this month</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <FiHome className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Active Clients</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.clients.active}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <FiHome className="h-3 w-3 text-gray-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Inactive Clients</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.clients.inactive}</p>
              </div>
            </motion.div>
          </div>

          {/* Section Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveSection('clients')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'clients'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiHome className="h-4 w-4" />
                <span>Clients</span>
              </button>
              <button
                onClick={() => setActiveSection('birthdays')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'birthdays'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiGift className="h-4 w-4" />
                <span>Birthdays</span>
              </button>
              <button
                onClick={() => setActiveSection('banners')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'banners'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiImage className="h-4 w-4" />
                <span>Banners</span>
              </button>
            </nav>
          </div>

          {/* Content based on active section */}
          {activeSection === 'clients' && (
            <>
          {/* Clients Table */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                    Clients
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Manage your client relationships</p>
                </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Date Range Filter */}
                  <div className="relative filter-dropdown-container z-40">
                    <button
                      onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-full sm:w-auto bg-white"
                    >
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-700 text-xs sm:text-sm">{getDateFilterLabel()}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${showDateFilterDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showDateFilterDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/80 z-50 overflow-hidden"
                      >
                        <div className="px-3 pt-3 pb-2">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Date range
                          </p>
                          <div className="space-y-0.5">
                            {[
                              { type: 'all', label: 'All Time', Icon: Database },
                              { type: 'day', label: 'Today', Icon: Calendar },
                              { type: 'week', label: 'This Week', Icon: Calendar },
                              { type: 'month', label: 'This Month', Icon: BarChart3 },
                              { type: 'year', label: 'This Year', Icon: TrendingUp }
                            ].map(({ type, label, Icon }) => (
                              <button
                                key={type}
                                onClick={() => {
                                  setStartDate('')
                                  setEndDate('')
                                  setDateFilterType(type)
                                  setShowDateFilterDropdown(false)
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                  dateFilterType === type
                                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg ${dateFilterType === type ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                  <Icon className={`h-3.5 w-3.5 ${dateFilterType === type ? 'text-blue-600' : 'text-gray-500'}`} />
                                </div>
                                <span className="flex-1 text-left">{label}</span>
                                {dateFilterType === type && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50">
                          <button
                            onClick={() => {
                              setTempStartDate(startDate)
                              setTempEndDate(endDate)
                              setDateFilterType('custom')
                              setShowDateRangePicker(true)
                              setShowDateFilterDropdown(false)
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                              dateFilterType === 'custom'
                                ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg ${dateFilterType === 'custom' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                              <CalendarDays className={`h-3.5 w-3.5 ${dateFilterType === 'custom' ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>
                            <span className="flex-1 text-left">Custom range</span>
                            {dateFilterType === 'custom' && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-64 text-xs sm:text-sm"
                    />
                  </div>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={selectedTagFilter}
                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <option value="all">All Tags</option>
                    {tags.map(tag => (
                      <option key={tag._id || tag.id} value={tag._id || tag.id}>{tag.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowTagManagementModal(true)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-xs sm:text-sm w-full sm:w-auto bg-white"
                    title="Manage Tags"
                  >
                    <FiTag className="h-4 w-4" />
                    <span className="hidden sm:inline">Tags</span>
                  </button>
                  <div className="bg-teal-100 text-teal-800 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                    {filteredData.length} clients
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {paginatedData.length > 0 ? (
                <div className="p-2 lg:p-4">
                  <div className="overflow-x-auto -mx-2 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px]">Name</th>
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Contact</th>
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Status</th>
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Total Spent</th>
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px] hidden md:table-cell">Projects</th>
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden lg:table-cell">Joined</th>
                          <th className="text-left py-1.5 px-1 text-xs font-semibold text-gray-700 w-auto">Tag</th>
                          <th className="text-right py-1.5 px-1 text-xs font-semibold text-gray-700 w-auto">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((client, index) => {
                          const clientKey = client.id || client._id || client.userId || `client-${index}`
                          return (
                            <tr key={clientKey} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                    {client.name?.charAt(0)?.toUpperCase() || 'C'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">{client.name || client.companyName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="text-xs text-gray-600 truncate max-w-[120px]">{client.contact || client.phone || client.phoneNumber}</div>
                              </td>
                              <td className="py-2 px-2">
                                <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(client.status)}`}>
                                  {client.status}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <div className="text-xs font-semibold text-green-700">
                                  {formatCurrency(client.totalSpent || 0)}
                                </div>
                              </td>
                              <td className="py-2 px-2 hidden md:table-cell">
                                <button
                                  onClick={() => handleProjectsClick(client)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                                  title="Click to view projects"
                                >
                                  {client.projects || 0}
                                </button>
                              </td>
                              <td className="py-2 px-2 hidden lg:table-cell">
                                <div className="flex items-center space-x-1 text-xs text-gray-600">
                                  <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{formatDate(client.joinDate || client.createdAt)}</span>
                                </div>
                              </td>
                              <td className="py-2 px-1">
                                <div className="flex items-center justify-start">
                                  {(() => {
                                    const clientTag = getClientTag(client)
                                    if (clientTag) {
                                      return (
                                        <span 
                                          className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap"
                                          style={{
                                            backgroundColor: `${clientTag.color}20`,
                                            color: clientTag.color,
                                            borderColor: `${clientTag.color}40`
                                          }}
                                        >
                                          {clientTag.name}
                                        </span>
                                      )
                                    }
                                    return <span className="text-xs text-gray-400 whitespace-nowrap">No tag</span>
                                  })()}
                                </div>
                              </td>
                              <td className="py-2 px-1">
                                <div className="flex items-center justify-end space-x-0.5">
                                  <button
                                    onClick={() => handleAssignTag(client)}
                                    className="text-gray-400 hover:text-purple-600 p-1.5 rounded hover:bg-purple-50 transition-all"
                                    title="Assign Tag"
                                  >
                                    <FiTag className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleView(client)}
                                    className="text-gray-400 hover:text-primary p-1.5 rounded hover:bg-primary/10 transition-all"
                                    title="View"
                                  >
                                    <FiEye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(client)}
                                    className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                    title="Edit"
                                  >
                                    <FiEdit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(client)}
                                    className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-all"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} clients
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-2 sm:px-3 py-1 border rounded-md text-xs sm:text-sm font-medium ${
                            currentPage === page
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FiHome className="text-teal-500 text-3xl" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">No clients found</h3>
                    <p className="text-gray-600 text-lg">
                      There are no clients at the moment.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </>
          )}

          {activeSection === 'birthdays' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                      Client Birthdays
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">View and manage client birthdays</p>
                  </div>
                  
                  {/* Filter Buttons */}
                  <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button
                      onClick={() => setBirthdayFilter('today')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        birthdayFilter === 'today'
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setBirthdayFilter('week')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        birthdayFilter === 'week'
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => setBirthdayFilter('month')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        birthdayFilter === 'month'
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      This Month
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 lg:p-6">
                {weeklyBirthdays && weeklyBirthdays.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{weeklyBirthdays.length}</span> {weeklyBirthdays.length === 1 ? 'birthday' : 'birthdays'} {birthdayFilter === 'today' ? 'today' : birthdayFilter === 'week' ? 'this week' : 'this month'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {weeklyBirthdays.map((client, index) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const isToday = client.birthdayDate && client.birthdayDate.getTime() === today.getTime()
                        return (
                          <motion.div
                            key={client._id || client.id || `birthday-${index}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05 * index }}
                            className={`bg-gradient-to-br rounded-lg p-4 border-2 shadow-sm hover:shadow-md transition-all duration-200 ${
                              isToday 
                                ? 'border-pink-400 from-pink-50 to-purple-50' 
                                : 'border-pink-200 from-white to-pink-50'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md flex-shrink-0 ${
                                isToday 
                                  ? 'bg-gradient-to-br from-pink-500 to-purple-600' 
                                  : 'bg-gradient-to-br from-teal-500 to-cyan-600'
                              }`}>
                                {client.name?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                                    {client.name || client.companyName || 'Unknown'}
                                  </h3>
                                  {isToday && (
                                    <span className="px-2 py-0.5 bg-pink-500 text-white text-xs font-bold rounded-full animate-pulse flex-shrink-0">
                                      Today!
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                                  <FiCalendar className="h-3 w-3 text-pink-500 flex-shrink-0" />
                                  <span className="font-medium">
                                    {client.dayName}, {client.month} {client.dayOfMonth}
                                  </span>
                                </div>
                                {client.companyName && client.name !== client.companyName && (
                                  <p className="text-xs text-gray-500 truncate">{client.companyName}</p>
                                )}
                                {client.email && (
                                  <p className="text-xs text-gray-400 truncate mt-1">{client.email}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FiGift className="h-10 w-10 text-pink-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Birthdays Found</h3>
                    <p className="text-gray-600 text-sm">
                      No client birthdays {birthdayFilter === 'today' ? 'today' : birthdayFilter === 'week' ? 'this week' : 'this month'}. Add date of birth to client profiles to see birthdays here.
                    </p>
                  </div>
                )}
              </CardContent>
            </div>
          )}

          {activeSection === 'banners' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                      Client Dashboard Banners
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Upload and manage banners shown on the client dashboard carousel</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Slide every (sec):</label>
                      <input
                        type="number"
                        min={3}
                        max={30}
                        value={carouselIntervalSeconds}
                        onChange={(e) => setCarouselIntervalSeconds(Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <Button size="sm" onClick={handleCarouselIntervalSave}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 lg:p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Upload banner</h4>
                  <CloudinaryUpload
                    folder="appzeto/client-banners"
                    allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                    accept=".jpg,.jpeg,.png,.webp"
                    maxSize={5 * 1024 * 1024}
                    onUploadSuccess={handleBannerUpload}
                  />
                </div>

                {loadingBanners ? (
                  <div className="flex justify-center py-12">
                    <Loading />
                  </div>
                ) : banners.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Banner list</h4>
                    <div className="space-y-3">
                      {banners.map((banner, index) => (
                        <motion.div
                          key={banner._id || banner.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleBannerReorder(banner, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleBannerReorder(banner, 'down')}
                              disabled={index === banners.length - 1}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                          <img
                            src={banner.url}
                            alt={`Banner ${index + 1}`}
                            className="h-16 w-auto max-w-[200px] object-cover rounded"
                          />
                          <span className="text-sm text-gray-500">{index + 1}</span>
                          <button
                            onClick={() => handleBannerToggle(banner)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              banner.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBannerDelete(banner)}
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiImage className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-gray-600">No banners yet. Upload an image above to add one.</p>
                  </div>
                )}
              </CardContent>
            </div>
          )}
        </div>
      </div>

      {/* Delete Banner Modal */}
      <AnimatePresence>
        {showDeleteBannerModal && selectedBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteBannerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete banner</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this banner? This will remove it from Cloudinary.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteBannerModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmBannerDelete}>
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowEditModal(false)
              setSelectedItem(null)
              setClientFormData({ name: '', email: '', contact: '', tag: '' })
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-4"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Client</h3>
                <form onSubmit={handleSave}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                      <input
                        type="text"
                        value={clientFormData.name}
                        onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                        <input
                          type="text"
                          value={clientFormData.contact}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, contact: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          placeholder="Enter contact number"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={clientFormData.email}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                      <select
                        value={clientFormData.tag}
                        onChange={(e) => setClientFormData(prev => ({ ...prev, tag: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      >
                        <option value="">No Tag</option>
                        {tags.map(tag => (
                          <option key={tag.id} value={tag.name}>{tag.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false)
                        setSelectedItem(null)
                        setClientFormData({ name: '', email: '', contact: '', tag: '' })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSavingUser}>
                      {isSavingUser ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowViewModal(false)
              setSelectedItem(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Client Details</h3>
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      setSelectedItem(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiPlus className="h-5 w-5 rotate-45" />
                  </button>
                </div>
                
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 mb-6 border border-teal-200">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-md">
                      {selectedItem.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedItem.name || selectedItem.companyName}</h4>
                      <p className="text-gray-600">{selectedItem.email}</p>
                    </div>
                    <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(selectedItem.status)}`}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Contact Number</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900 break-words">{selectedItem.contact || selectedItem.phone || selectedItem.phoneNumber || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Email</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900 break-words">{selectedItem.email || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Total Spent</div>
                    <div className="text-sm sm:text-base font-semibold text-green-700">{formatCurrency(selectedItem.totalSpent || 0)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Projects</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900">{selectedItem.projects || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Joined Date</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900">{formatDate(selectedItem.joinDate || selectedItem.createdAt)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Last Activity</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900">{formatDate(selectedItem.lastActive || selectedItem.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowDeleteModal(false)
              setSelectedItem(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Client</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <span className="font-semibold">{selectedItem.name || selectedItem.companyName}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setSelectedItem(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects Modal */}
      <AnimatePresence>
        {showProjectsModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowProjectsModal(false)
              setSelectedItem(null)
              setClientProjects([])
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mx-4"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Projects</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Projects for {selectedItem.name || selectedItem.companyName}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProjectsModal(false)
                      setSelectedItem(null)
                      setClientProjects([])
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiPlus className="h-5 w-5 rotate-45" />
                  </button>
                </div>

                {loadingProjects ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="medium" />
                  </div>
                ) : clientProjects.length > 0 ? (
                  <div className="space-y-3">
                    {clientProjects.map((project, index) => {
                      const projectKey = project._id || project.id || `project-${index}`
                      const projectStatus = project.status || 'unknown'
                      const projectStartDate = project.startDate || project.createdAt || project.dateCreated
                      const projectCost = project.cost || project.budget || project.projectCost || project.totalCost || project.amount || 0
                      
                      const getProjectStatusColor = (status) => {
                        const statusColors = {
                          active: 'bg-blue-100 text-blue-800 border-blue-200',
                          completed: 'bg-green-100 text-green-800 border-green-200',
                          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          onHold: 'bg-orange-100 text-orange-800 border-orange-200',
                          cancelled: 'bg-red-100 text-red-800 border-red-200'
                        }
                        return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
                      }

                      return (
                        <div
                          key={projectKey}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 mb-2 truncate">
                                {project.name || project.projectName || 'Unnamed Project'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <FiCalendar className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm">
                                    Start: {formatDate(projectStartDate)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs sm:text-sm font-semibold text-green-700">
                                    Cost: {formatCurrency(projectCost)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getProjectStatusColor(projectStatus)}`}>
                                {projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiHome className="text-gray-400 text-2xl" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h4>
                    <p className="text-gray-600 text-sm">
                      This client doesn't have any projects yet.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Management Modal */}
      <AnimatePresence>
        {showTagManagementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowTagManagementModal(false)
              setEditingTag(null)
              setNewTagName('')
              setNewTagColor('#3b82f6')
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Manage Tags</h3>
                    <p className="text-sm text-gray-600 mt-1">Create and manage client tags</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTagManagementModal(false)
                      setEditingTag(null)
                      setNewTagName('')
                      setNewTagColor('#3b82f6')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiPlus className="h-5 w-5 rotate-45" />
                  </button>
                </div>

                {/* Create/Edit Tag Form */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">
                    {editingTag ? 'Edit Tag' : 'Create New Tag'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tag Name</label>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        placeholder="e.g., Premium Client, Regular Client"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tag Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          placeholder="#3b82f6"
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      {editingTag && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingTag(null)
                            setNewTagName('')
                            setNewTagColor('#3b82f6')
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={editingTag ? updateTag : createTag}
                        disabled={!newTagName.trim()}
                      >
                        {editingTag ? 'Update Tag' : 'Create Tag'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tags List */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Existing Tags</h4>
                  {tags.length > 0 ? (
                    <div className="space-y-2">
                      {tags.map(tag => (
                        <div
                          key={tag._id || tag.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-gray-300"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                            <span
                              className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color
                              }}
                            >
                              {tag.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingTag(tag)
                                setNewTagName(tag.name)
                                setNewTagColor(tag.color)
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
                              title="Edit Tag"
                            >
                              <FiEdit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteTag(tag._id || tag.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
                              title="Delete Tag"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FiTag className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">No tags created yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Assignment Modal */}
      <AnimatePresence>
        {showTagAssignModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowTagAssignModal(false)
              setSelectedItem(null)
              setClientFormData({ name: '', email: '', contact: '', tag: '' })
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Assign Tag</h3>
                  <button
                    onClick={() => {
                      setShowTagAssignModal(false)
                      setSelectedItem(null)
                      setClientFormData({ name: '', email: '', contact: '', tag: '' })
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiPlus className="h-5 w-5 rotate-45" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Client: <span className="font-semibold text-gray-900">{selectedItem.name || selectedItem.companyName}</span>
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Tag</label>
                  <select
                    value={clientFormData.tag}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, tag: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    disabled={loadingTags}
                  >
                    <option value="">No Tag</option>
                    {tags.map(tag => (
                      <option key={tag._id || tag.id} value={tag._id || tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTagAssignModal(false)
                      setSelectedItem(null)
                      setClientFormData({ name: '', email: '', contact: '', tag: '' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveTagAssignment}
                    disabled={isSavingUser}
                  >
                    {isSavingUser ? 'Saving...' : 'Assign Tag'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Admin_client_management
