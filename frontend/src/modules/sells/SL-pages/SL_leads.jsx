// Single-file mobile Lead Dashboard component — Tailwind v4 + react-icons
import React, { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { 
  FiPlus,
  FiPhone,
  FiPhoneOff,
  FiCalendar,
  FiFileText,
  FiVideo,
  FiSmartphone,
  FiGlobe,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiX,
  FiTag,
  FiChevronDown,
  FiUsers
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import { salesLeadService } from '../SL-services'
import SL_navbar from '../SL-components/SL_navbar'

const LeadDashboard = () => {
  const { toast } = useToast()
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    phoneNumber: '',
    categoryId: ''
  })
  const [categories, setCategories] = useState([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const dropdownRef = useRef(null)
  
  // Dashboard statistics state
  const [dashboardStats, setDashboardStats] = useState({
    statusCounts: {
      new: 0,
      connected: 0,
      not_picked: 0,
      followup: 0, // Changed from today_followup to followup to match backend
      quotation_sent: 0,
      demo_sent: 0,
      app_client: 0,
      web: 0,
      converted: 0,
      lost: 0,
      hot: 0,
      demo_requested: 0
    },
    totalLeads: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [channelPartnerLeadsCount, setChannelPartnerLeadsCount] = useState(0)
  const [isLoadingCPLeadsCount, setIsLoadingCPLeadsCount] = useState(false)

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch channel partner leads count
  const fetchChannelPartnerLeadsCount = async () => {
    setIsLoadingCPLeadsCount(true)
    try {
      const response = await salesLeadService.getChannelPartnerLeads({ limit: 1 })
      setChannelPartnerLeadsCount(response?.total || 0)
    } catch (error) {
      console.error('Error fetching channel partner leads count:', error)
      setChannelPartnerLeadsCount(0)
    } finally {
      setIsLoadingCPLeadsCount(false)
    }
  }

  // Fetch categories and dashboard stats on component mount
  useEffect(() => {
    const token = localStorage.getItem('salesToken') || localStorage.getItem('token')
    if (token) {
      fetchCategories()
      fetchDashboardStats()
      fetchChannelPartnerLeadsCount()
    }
  }, [])

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    setIsLoadingStats(true)
    try {
      // Check authentication token
      const token = localStorage.getItem('salesToken') || localStorage.getItem('token')
      
      // Use the getDashboardStatistics service to get all status counts at once
      const stats = await salesLeadService.getDashboardStatistics()
      
      // Update dashboard stats with actual data from backend
      setDashboardStats({
        statusCounts: stats.statusCounts || {
          new: 0,
          connected: 0,
          not_picked: 0,
          followup: 0, // Changed from today_followup to followup to match backend
          quotation_sent: 0,
          demo_sent: 0,
          app_client: 0,
          web: 0,
          converted: 0,
          lost: 0,
          hot: 0,
          demo_requested: 0
        },
        totalLeads: stats.totalLeads || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      
      // Handle different types of errors
      if (error.message === 'Failed to fetch' || error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Please make sure the backend server is running.')
      } else {
        toast.error('Failed to load dashboard statistics. Check console for details.')
      }
      
      // Set default stats on error
      setDashboardStats({
        statusCounts: {
          new: 0,
          connected: 0,
          not_picked: 0,
          followup: 0,
          quotation_sent: 0,
          demo_sent: 0,
          app_client: 0,
          web: 0,
          converted: 0,
          lost: 0,
          hot: 0,
          demo_requested: 0
        },
        totalLeads: 0
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Function to refresh stats (can be called from other components)
  const refreshDashboardStats = () => {
    fetchDashboardStats()
  }

  // Expose refresh function globally for other components to use
  useEffect(() => {
    window.refreshDashboardStats = refreshDashboardStats
    return () => {
      delete window.refreshDashboardStats
    }
  }, [])

  const fetchCategories = async () => {
    setIsLoadingCategories(true)
    try {
      // Use salesLeadService which handles environment variables properly
      const categoriesData = await salesLeadService.getLeadCategories()
      
      if (categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0) {
        setCategories(categoriesData)
      } else {
        console.error('API Error: No categories returned')
        // Set empty array if no categories are available
        setCategories([])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      
      // Handle different types of errors
      if (error.message === 'Network Error' || error.message === 'Failed to fetch' || error.code === 'ERR_NETWORK') {
        console.error('Server not available - cannot fetch categories')
        toast.error('Cannot connect to server. Please check your connection.')
      } else {
        console.error('API Error:', error)
        toast.error('Failed to load categories. Please try again.')
      }
      
      // Set empty array on error - no fallback categories
      setCategories([])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  // Helper function to get category info by ID
  const getCategoryInfo = (categoryId) => {
    const category = categories.find(cat => cat._id === categoryId)
    return category || { name: 'Unknown Category', color: '#6B7280' }
  }

  // Transform categories for combobox
  const categoryOptions = categories.map(category => ({
    value: category._id,
    label: category.name,
    color: category.color || '#6B7280'
  }))
  
  // Refs for scroll-triggered animations
  const tilesRef = useRef(null)
  const lostBarRef = useRef(null)
  
  // Check if elements are in view
  const tilesInView = useInView(tilesRef, { once: true, margin: "-100px" })
  const lostBarInView = useInView(lostBarRef, { once: true, margin: "-100px" })

  // Modal functions
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => {
    setIsModalOpen(false)
    setShowCategoryDropdown(false)
    setFormData({ 
      phoneNumber: '', 
      categoryId: ''
    })
  }
  
  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // For phone number, only allow digits and limit to 10 characters
    if (name === 'phoneNumber') {
      // Remove all non-digit characters and limit to 10 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setFormData({
        ...formData,
        [name]: numericValue
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleCategoryChange = (categoryId) => {
    setFormData({
      ...formData,
      categoryId: categoryId
    })
    setShowCategoryDropdown(false)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.phoneNumber || !formData.categoryId) {
      toast.error('Please fill in phone number and category')
      return
    }

    // Client-side phone validation
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error('Please enter a valid 10-digit phone number')
      return
    }

    const token = localStorage.getItem('salesToken') || localStorage.getItem('token')
    if (!token) {
      toast.error('Please log in to create a lead')
      return
    }

    setIsSubmitting(true)
    try {
      // Use salesLeadService which handles environment variables properly
      const response = await salesLeadService.createLead({
        phone: formData.phoneNumber,
        category: formData.categoryId
      })

      if (response.success) {
        toast.success('Lead created successfully!')
        closeModal()
        // Refresh the dashboard data to show updated counts
        refreshDashboardStats()
      } else {
        toast.error(response.message || 'Failed to create lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      // Handle error messages
      const errorMessage = error.message || 'An error occurred while creating the lead'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Dynamic tile data based on dashboard statistics (App Client and Web pages removed)
  const tileData = [
    { title: "Connected", count: dashboardStats.statusCounts.connected, icon: FiPhone, bgClass: "bg-emerald-50", textClass: "text-emerald-800", iconBgClass: "bg-emerald-100", iconClass: "text-emerald-600", borderClass: "border-emerald-200/30", status: "connected" },
    { title: "Not Picked", count: dashboardStats.statusCounts.not_picked, icon: FiPhoneOff, bgClass: "bg-rose-50", textClass: "text-rose-800", iconBgClass: "bg-rose-100", iconClass: "text-rose-600", borderClass: "border-rose-200/30", status: "not_picked" },
    { title: "Follow Up", count: dashboardStats.statusCounts.followup, icon: FiCalendar, bgClass: "bg-amber-50", textClass: "text-amber-800", iconBgClass: "bg-amber-100", iconClass: "text-amber-600", borderClass: "border-amber-200/30", status: "followup" },
    { title: "Quotation Sent", count: dashboardStats.statusCounts.quotation_sent, icon: FiFileText, bgClass: "bg-blue-50", textClass: "text-blue-800", iconBgClass: "bg-blue-100", iconClass: "text-blue-600", borderClass: "border-blue-200/30", status: "quotation_sent" },
    { title: "Demo Sent", count: dashboardStats.statusCounts.demo_sent || 0, icon: FiVideo, bgClass: "bg-teal-50", textClass: "text-teal-800", iconBgClass: "bg-teal-100", iconClass: "text-teal-600", borderClass: "border-teal-200/30", status: "demo_sent" },
    { title: "Converted", count: dashboardStats.statusCounts.converted, icon: FiCheckCircle, bgClass: "bg-green-50", textClass: "text-green-800", iconBgClass: "bg-green-100", iconClass: "text-green-600", borderClass: "border-green-200/30", status: "converted" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <SL_navbar />
      <main className="max-w-7xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-20 lg:pb-4">
        {/* Mobile-first layout */}
        <div className="space-y-6 lg:hidden">
          {/* Add New Lead Button */}
          <div className="w-full px-2 mb-2">
            <button 
              onClick={openModal}
              className="w-full bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 text-white font-bold py-4 px-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center space-x-2 border border-teal-400/20"
              style={{
                boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.3), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
              aria-label="Add new lead"
              role="button"
              tabIndex={0}
            >
              <FiPlus className="text-xl" />
              <span className="text-lg">Add New Lead</span>
            </button>
          </div>

          {/* New Leads Card */}
          <Link to="/new-leads">
            <div 
              className="bg-teal-100 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-teal-300/40 cursor-pointer mx-2 mt-4"
              style={{
                boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-teal-900 mb-1">New Leads</h2>
                  <p className="text-sm text-teal-700">Leads requiring initial contact</p>
                </div>
                <div 
                  className="bg-teal-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-teal-400/30"
                  style={{
                    boxShadow: '0 4px 12px -2px rgba(20, 184, 166, 0.3), 0 2px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span className="text-lg font-bold">{isLoadingStats ? '...' : dashboardStats.statusCounts.new}</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Channel Partner Leads Card */}
          <Link to="/channel-partner-leads">
            <div 
              className="bg-purple-100 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-300/40 cursor-pointer mx-2 mt-4"
              style={{
                boxShadow: '0 8px 25px -5px rgba(147, 51, 234, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-purple-900 mb-1">Channel Partner Lead</h2>
                  <p className="text-sm text-purple-700">Leads shared by channel partners</p>
                </div>
                <div 
                  className="bg-purple-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-purple-400/30"
                  style={{
                    boxShadow: '0 4px 12px -2px rgba(147, 51, 234, 0.3), 0 2px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span className="text-lg font-bold">{isLoadingCPLeadsCount ? '...' : channelPartnerLeadsCount}</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Status Tiles Grid */}
          <div 
            ref={tilesRef}
            className="grid grid-cols-2 gap-4 px-2"
          >
            {tileData.map((tile, index) => {
              const IconComponent = tile.icon
              
              return (
                <Link
                  key={tile.title}
                  to={
                    tile.title === "Connected" ? "/connected" :
                    tile.title === "Not Picked" ? "/not-picked" :
                    tile.title === "Follow Up" ? "/followup" :
                    tile.title === "Quotation Sent" ? "/quotation-sent" :
                    tile.title === "Demo Sent" ? "/demo-sent" :
                    tile.title === "Converted" ? "/converted" : "#"
                  }
                  className={`${tile.bgClass} rounded-xl p-4 ${tile.textClass} transition-all duration-300 cursor-pointer border ${tile.borderClass} block`}
                  style={{
                    boxShadow: `0 10px 30px -8px rgba(0, 0, 0, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)`
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${tile.title} leads: ${tile.count}`}
                >
                  <div className="flex flex-col h-full">
                    {/* Enhanced Icon Section */}
                    <div className="flex justify-center mb-3">
                      <div className={`w-12 h-12 ${tile.iconBgClass} rounded-xl flex items-center justify-center border border-opacity-30 ${tile.borderClass}`}
                        style={{
                          boxShadow: `0 6px 20px -4px rgba(0, 0, 0, 0.15), 0 3px 10px -2px rgba(0, 0, 0, 0.08), 0 1px 5px -1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                        }}
                      >
                        <IconComponent className={`text-xl ${tile.iconClass}`} />
                      </div>
                    </div>
                    
                    {/* Enhanced Content Section */}
                    <div className="flex-1 flex flex-col justify-between text-center">
                      <div>
                        <h3 className={`font-bold text-sm mb-1.5 leading-tight ${tile.textClass}`}>{tile.title}</h3>
                        <div className="flex items-center justify-center space-x-2 mb-2.5">
                          <div className={`w-2 h-2 ${tile.iconClass.replace('text-', 'bg-')} rounded-full animate-pulse shadow-sm`}></div>
                          <p className={`text-xs font-semibold ${tile.textClass}/80`}>{tile.count} Leads</p>
                        </div>
                      </div>
                      
                      {/* Enhanced Trend Section */}
                      <div className={`flex items-center justify-center space-x-1.5 mt-auto ${tile.iconBgClass} rounded-lg px-2.5 py-1.5`}>
                        <span className={`text-xs font-semibold ${tile.textClass}/70`}>View Details</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Lost Leads Bottom Bar */}
          <div 
            ref={lostBarRef}
            className="w-full px-2"
          >
            <Link to="/lost">
              <button 
                className="w-full bg-rose-100 text-rose-800 font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center space-x-2 border border-rose-300/40"
                style={{
                  boxShadow: '0 8px 25px -5px rgba(244, 63, 94, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
                aria-label="Lost leads"
                role="button"
                tabIndex={0}
              >
                <FiAlertCircle className="text-xl text-rose-700" />
                <span className="text-lg">Lost {isLoadingStats ? '...' : dashboardStats.statusCounts.lost}</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:block">
              {/* Add New Lead Button */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mb-6"
              >
                <button 
                  onClick={openModal}
                  className="w-full bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 text-white font-bold py-4 px-8 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-3 border border-teal-400/20"
                  style={{
                    boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.3), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                  aria-label="Add new lead"
                  role="button"
                  tabIndex={0}
                >
                  <FiPlus className="text-2xl drop-shadow-lg" />
                  <span className="text-xl drop-shadow-lg">Add New Lead</span>
                </button>
              </motion.div>

              {/* New Leads Card */}
              <Link to="/new-leads">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                  className="bg-teal-100 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 mb-6 border border-teal-300/40 cursor-pointer"
                  style={{
                    boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-teal-900 mb-2">New Leads</h2>
                      <p className="text-base text-teal-700">Leads requiring initial contact</p>
                    </div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-teal-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg border border-teal-400/30"
                      style={{
                        boxShadow: '0 4px 12px -2px rgba(20, 184, 166, 0.3), 0 2px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span className="text-2xl font-bold">{isLoadingStats ? '...' : dashboardStats.statusCounts.new}</span>
                    </motion.div>
                  </div>
                </motion.div>
              </Link>

              {/* Channel Partner Leads Card */}
              <Link to="/channel-partner-leads">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                  className="bg-purple-100 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 mb-6 border border-purple-300/40 cursor-pointer"
                  style={{
                    boxShadow: '0 8px 25px -5px rgba(147, 51, 234, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-purple-900 mb-2">Channel Partner Lead</h2>
                      <p className="text-base text-purple-700">Leads shared by channel partners</p>
                    </div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-purple-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg border border-purple-400/30"
                      style={{
                        boxShadow: '0 4px 12px -2px rgba(147, 51, 234, 0.3), 0 2px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span className="text-2xl font-bold">{isLoadingCPLeadsCount ? '...' : channelPartnerLeadsCount}</span>
                    </motion.div>
                  </div>
                </motion.div>
              </Link>

              {/* Status Tiles Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="grid grid-cols-4 gap-5"
              >
                {tileData.map((tile, index) => {
                  const IconComponent = tile.icon
                  
                  return (
                    <Link
                      key={tile.title}
                      to={
                        tile.title === "Connected" ? "/connected" :
                        tile.title === "Not Picked" ? "/not-picked" :
                        tile.title === "Follow Up" ? "/followup" :
                        tile.title === "Quotation Sent" ? "/quotation-sent" :
                        tile.title === "Demo Sent" ? "/demo-sent" :
                        tile.title === "Converted" ? "/converted" : "#"
                      }
                      className={`${tile.bgClass} rounded-xl p-6 ${tile.textClass} transition-all duration-300 cursor-pointer border ${tile.borderClass} block`}
                      style={{
                        boxShadow: `0 10px 30px -8px rgba(0, 0, 0, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)`
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${tile.title} leads: ${tile.count}`}
                    >
                      <div className="flex flex-col h-full">
                        {/* Enhanced Icon Section */}
                        <div className="flex justify-center mb-4">
                          <div className={`w-14 h-14 ${tile.iconBgClass} rounded-xl flex items-center justify-center border ${tile.borderClass}`}
                            style={{
                              boxShadow: `0 6px 20px -4px rgba(0, 0, 0, 0.15), 0 3px 10px -2px rgba(0, 0, 0, 0.08), 0 1px 5px -1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                            }}
                          >
                            <IconComponent className={`text-2xl ${tile.iconClass}`} />
                          </div>
                        </div>
                        
                        {/* Enhanced Content Section */}
                        <div className="flex-1 flex flex-col justify-between text-center">
                          <div>
                            <h3 className={`font-bold text-base mb-3 leading-tight ${tile.textClass}`}>{tile.title}</h3>
                            <div className="flex items-center justify-center space-x-2 mb-2.5">
                              <div className={`w-2 h-2 ${tile.iconClass.replace('text-', 'bg-')} rounded-full animate-pulse shadow-sm`}></div>
                              <p className={`text-xs font-semibold ${tile.textClass}/80`}>{tile.count} Leads</p>
                            </div>
                          </div>
                          
                          {/* Enhanced Trend Section */}
                          <div className={`flex items-center justify-center space-x-1.5 mt-auto ${tile.iconBgClass} rounded-lg px-2.5 py-1.5`}>
                            <span className={`text-xs font-semibold ${tile.textClass}/70`}>View Details</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </motion.div>

              {/* Lost Leads Bottom Bar */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
                className="mt-6"
              >
                <Link to="/lost">
                  <button 
                    className="w-full bg-rose-100 text-rose-800 font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-3 border border-rose-300/40"
                    style={{
                      boxShadow: '0 8px 25px -5px rgba(244, 63, 94, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}
                    aria-label="Lost leads"
                    role="button"
                    tabIndex={0}
                  >
                    <FiAlertCircle className="text-2xl text-rose-700" />
                    <span className="text-xl">Lost {isLoadingStats ? '...' : dashboardStats.statusCounts.lost}</span>
                  </button>
                </Link>
              </motion.div>
          </div>
      </main>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white rounded-none shadow-2xl"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 p-6 text-white relative">
                <button
                  onClick={closeModal}
                  className="absolute top-6 left-6 p-2 hover:bg-teal-600/50 rounded-full transition-colors duration-200"
                  aria-label="Close modal"
                >
                  <FiArrowLeft className="text-xl" />
                </button>
                <h2 className="text-xl font-bold text-center">Add Lead</h2>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Phone Number Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiPhone className="text-xl" />
                    </div>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>


                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="w-full pl-4 pr-10 py-4 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 flex items-center justify-between"
                    >
                      <span className={formData.categoryId ? 'text-gray-900' : 'text-gray-500'}>
                        {formData.categoryId 
                          ? getCategoryInfo(formData.categoryId).name
                          : 'Select a category'
                        }
                      </span>
                      <div className="flex items-center space-x-2">
                        {formData.categoryId && (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryInfo(formData.categoryId).color || '#6B7280' }}
                          />
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Category Dropdown */}
                    {showCategoryDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {isLoadingCategories ? (
                          <div className="px-4 py-3 text-center text-gray-500">Loading categories...</div>
                        ) : categories.length > 0 ? (
                          categories.map((category) => (
                            <button
                              key={category._id}
                              type="button"
                              onClick={() => handleCategoryChange(category._id)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                            >
                              <span className="text-gray-900">{category.name}</span>
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color || '#6B7280' }}
                              />
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-500">No categories available</div>
                        )}
                      </div>
                    )}
                  </div>
                  {isLoadingCategories && (
                    <p className="text-sm text-gray-500">Loading categories...</p>
                  )}
                </div>


                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-bold py-4 rounded-lg shadow-xl transition-all duration-300 border border-teal-400/20 ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 hover:shadow-2xl transform hover:scale-105 active:scale-95'
                  }`}
                  style={{
                    boxShadow: isSubmitting ? 'none' : '0 8px 25px -5px rgba(20, 184, 166, 0.3), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {isSubmitting ? 'Creating Lead...' : 'Add Lead'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LeadDashboard
