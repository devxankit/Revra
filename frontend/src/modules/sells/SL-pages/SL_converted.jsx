import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FiPhone, 
  FiFilter,
  FiUser,
  FiSearch,
  FiCheckCircle,
  FiMessageCircle,
  FiMail,
  FiTag,
  FiLoader,
  FiExternalLink,
  FiMoreVertical
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import { salesLeadService, salesClientService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'
import SalesProjectConversionDialog from '../SL-components/SalesProjectConversionDialog'

const SL_converted = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const prevLocationRef = useRef()
  
  // State for filters and UI
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // State for real data
  const [leadsData, setLeadsData] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [selectedClientForProject, setSelectedClientForProject] = useState(null)

  // Fetch categories and leads on component mount
  useEffect(() => {
    fetchCategories()
    fetchLeads()
  }, [selectedFilter, selectedCategory, searchTerm])

  // Refresh when navigating back to this page (e.g., after transferring a client)
  useEffect(() => {
    // Check if we're coming from a different route
    if (prevLocationRef.current && prevLocationRef.current.pathname !== location.pathname) {
      // We navigated to this page, refresh the data
      fetchLeads()
    }
    prevLocationRef.current = location
  }, [location.pathname])

  // Refresh when component becomes visible (handles navigation back from other pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLeads()
      }
    }
    
    const handleFocus = () => {
      fetchLeads()
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedFilter, selectedCategory, searchTerm]) // Refresh with current filters when page becomes visible

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const cats = await salesLeadService.getLeadCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Fetch leads from API
  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const params = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        timeFrame: selectedFilter !== 'all' ? selectedFilter : undefined,
        page: 1,
        limit: 50
      }
      const response = await salesLeadService.getLeadsByStatus('converted', params)
      const rawLeads = Array.isArray(response?.data) ? response.data : []
      // Filter out any leads without valid client info (safety check for transferred clients)
      const validLeads = rawLeads.filter(lead => 
        lead?.convertedClientId || lead?.convertedClient?.id
      )

      // Enrich leads with all projects per client (so cards can show multiple projects)
      const clientIds = Array.from(
        new Set(
          validLeads
            .map(lead => 
              lead?.convertedClientId ||
              lead?.convertedClient?.id ||
              lead?.project?.client
            )
            .filter(Boolean)
        )
      )

      const projectsByClientId = {}
      const clientInfoByClientId = {}
      try {
        const profiles = await Promise.all(
          clientIds.map(id =>
            salesClientService.getClientProfile(id).catch(() => null)
          )
        )
        profiles.forEach((res, idx) => {
          const cid = clientIds[idx]
          if (res?.success) {
            if (Array.isArray(res.data?.allProjects)) {
              projectsByClientId[cid] = res.data.allProjects
            }
            if (res.data?.client) {
              clientInfoByClientId[cid] = {
                name: res.data.client.name,
                companyName: res.data.client.company || res.data.client.companyName
              }
            }
          }
        })
      } catch (e) {
        console.error('Error fetching client projects for converted list:', e)
      }

      const enrichedLeads = validLeads.map(lead => {
        const clientId =
          lead?.convertedClientId ||
          lead?.convertedClient?.id ||
          lead?.project?.client
        const allProjects = clientId && projectsByClientId[clientId]
          ? projectsByClientId[clientId]
          : (lead.project ? [lead.project] : [])
        const clientInfo = clientId ? clientInfoByClientId[clientId] : null
        return {
          ...lead,
          __allProjects: allProjects,
          __clientInfo: clientInfo
        }
      })

      setLeadsData(enrichedLeads)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to fetch leads')
      setLeadsData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Get category info helper
  const getCategoryInfo = (categoryIdOrObject) => {
    // Handle null/undefined
    if (!categoryIdOrObject) {
      // For clients without any lead/category, show a friendly message instead of "Unknown"
      return { name: 'No category', color: '#999999', icon: '📋' }
    }
    
    // If category is already populated (object with properties like name, color, icon), return it directly
    if (typeof categoryIdOrObject === 'object' && categoryIdOrObject.name) {
      return {
        name: categoryIdOrObject.name,
        color: categoryIdOrObject.color || '#999999',
        icon: categoryIdOrObject.icon || '📋'
      }
    }
    
    // If category is an ID (string or ObjectId), find it in categories array
    const categoryId = typeof categoryIdOrObject === 'object' ? categoryIdOrObject._id : categoryIdOrObject
    if (categoryId) {
      const category = categories.find(cat => cat._id === categoryId || cat._id?.toString() === categoryId?.toString())
      if (category) {
        return category
      }
    }
    
    // Return default if not found
    return { name: 'No category', color: '#999999', icon: '📋' }
  }

  const filters = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All' }
  ]

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (phone) => {
    const message = encodeURIComponent("Hello! I'm following up on our project. How can I help you today?")
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank')
  }

  const getClientIdForItem = (client) => {
    return (
      client?.convertedClientId ||
      client?.convertedClient?.id ||
      client?.project?.client
    )
  }

  const handleProfile = (client, projectId) => {
    const clientId = getClientIdForItem(client)

    if (!clientId) {
      toast.error('Client profile is not available. This client may have been transferred.')
      return
    }

    // Double-check that we have a valid client before navigating
    if (!client?.convertedClient && !client?.convertedClientId) {
      toast.error('Client information is not available. This client may have been transferred to another sales employee.')
      return
    }

    const query = projectId ? `?projectId=${projectId}` : ''
    navigate(`/client-profile/${clientId}${query}`)
  }

  const handleAddProjectForClient = (client) => {
    const clientId = getClientIdForItem(client)

    if (!clientId) {
      toast.error('Client is not available for creating a new project. This client may have been transferred.')
      return
    }

    const displayName = client.leadProfile?.name || client.name || 'Unknown'
    const displayBusiness = client.leadProfile?.businessName || client.company || 'No company'
    const phone =
      client.phone ||
      client.convertedClient?.phoneNumber ||
      ''

    const rawCategory =
      client.project?.category ||
      client.leadProfile?.category ||
      client.category

    const initialCategoryId =
      typeof rawCategory === 'object'
        ? (rawCategory?._id || rawCategory?.id || null)
        : rawCategory || null

    setSelectedClientForProject({
      clientId,
      name: displayName,
      businessName: displayBusiness,
      phone,
      initialCategoryId
    })
    setIsProjectDialogOpen(true)
  }


  // Grouped Mobile Client Card Component (one card per client with multiple projects)
  const MobileClientCard = ({ clientGroup, onAddProject }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { baseLead, projects } = clientGroup
    // For admin-linked clients (no lead), baseLead.category is missing; use project category as fallback
    const categorySource = baseLead.category || baseLead.project?.category || projects[0]?.project?.category
    const categoryInfo = getCategoryInfo(categorySource)

    const displayName = clientGroup.name
    const displayBusiness = clientGroup.businessName
    const avatar = displayName.charAt(0).toUpperCase()
    const isTransferred = baseLead?.convertedClient?.isTransferred || false
    const transferInfo = baseLead?.convertedClient?.transferInfo
    const totalClientValue = projects.reduce((sum, p) => {
      const fin = p.project.financialDetails
      const budget = p.project.budget
      const est = baseLead.leadProfile?.estimatedCost
      return sum + (fin?.totalCost || budget || est || 0)
    }, 0)

    return (
      <div 
        className="relative p-3 space-y-3 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200"
      >
        {/* Header Section */}
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">{avatar}</span>
            </div>
          </div>

            {/* Client Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
              {isTransferred && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  Transferred
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">
              {displayBusiness}
            </p>
            {/* Category */}
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="text-xs text-black">
                {categoryInfo.name}
              </span>
              {isTransferred && transferInfo && (
                <span className="text-xs text-gray-500">
                  • Transferred by {transferInfo.transferredBy}
                </span>
              )}
              </div>
            </div>

            {/* Revenue & Menu */}
            <div className="flex flex-col items-end flex-shrink-0 relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMenuOpen(prev => !prev)
              }}
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="More actions"
            >
              <FiMoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuOpen(false)
                    if (onAddProject) {
                      onAddProject(baseLead)
                    }
                  }}
                >
                  Add New Project
                </button>
              </div>
            )}
            <p className="mt-1 text-sm font-bold text-green-600">
              ₹{totalClientValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Projects List */}
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          {projects.map(({ project }, index) => {
            const cost = project.financialDetails?.totalCost || project.budget || 0
            const label = project.name || `Project ${index + 1}`
            const date = project.updatedAt || project.createdAt
            return (
              <button
                key={project._id || index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleProfile(baseLead, project._id)
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 border border-gray-100"
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">
                    {label}
                  </span>
                  {date && (
                    <span className="text-[10px] text-gray-500">
                      Updated {new Date(date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-green-700">
                  ₹{cost.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Actions Section */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
          <span className="text-xs text-gray-500">{clientGroup.phone || 'No phone'}</span>
          
          <div className="flex items-center space-x-1">
            {/* Call Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCall(clientGroup.phone)
              }}
              className="p-2 bg-white text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-all duration-200"
              title="Call"
            >
              <FiPhone className="w-4 h-4" />
            </button>

            {/* WhatsApp Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleWhatsApp(clientGroup.phone)
              }}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200"
              title="WhatsApp"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c0 5.449-4.434 9.883-9.881 9.883"/>
              </svg>
            </button>

            {/* Profile Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleProfile(baseLead)
              }}
              className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200"
              title="Profile"
            >
              <FiUser className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Desktop Client Card Component (same as mobile for consistency)
  const DesktopClientCard = ({ clientGroup }) => {
    return <MobileClientCard clientGroup={clientGroup} onAddProject={handleAddProjectForClient} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        
         {/* Responsive Layout */}
         <div>
           {/* Header Section */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
             className="mb-6"
           >
             <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-md border border-green-200/30">
               <div className="flex items-center justify-between">
                 {/* Left Section - Icon and Text */}
                 <div className="flex items-center space-x-3 flex-1">
                   {/* Icon */}
                   <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                     <FiCheckCircle className="text-white text-lg" />
                   </div>
                   
                   {/* Text Content */}
                   <div className="flex-1">
                     <h1 className="text-xl font-bold text-green-900 leading-tight">
                       Converted<br />Clients
                     </h1>
                     <p className="text-green-700 text-xs font-medium mt-0.5">
                       Successfully converted clients and projects
                     </p>
                   </div>
                 </div>
                 
                 {/* Right Section - Total Count Card */}
                 <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                   <div className="text-center">
                     <p className="text-xs text-green-600 font-medium mb-0.5">Total</p>
                     <p className="text-2xl font-bold text-green-900 leading-none">{leadsData.length}</p>
                     <p className="text-xs text-green-600 font-medium mt-0.5">Clients</p>
                   </div>
                 </div>
               </div>
             </div>
           </motion.div>

          {/* Simple Filter Section */}
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
                placeholder="Search..."
                className="w-full pl-8 pr-12 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${
                  showFilters 
                    ? 'bg-teal-500 text-white shadow-md' 
                    : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-teal-200'
                }`}
              >
                <FiFilter className="text-base" />
              </button>
            </div>
          </motion.div>

          {/* Filters - Conditional Display */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 mb-4"
            >
              {/* Time Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Time Period</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selectedFilter === filter.id
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Category</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedCategory === 'all'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => setSelectedCategory(category._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${
                        selectedCategory === category._id
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === category._id ? category.color : undefined
                      }}
                    >
                      <span>{category.icon}</span>
                      <span className="text-black">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
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
              {(() => {
                const uniqueClientIds = new Set(
                  (leadsData || []).map(lead => getClientIdForItem(lead)).filter(Boolean)
                )
                const count = uniqueClientIds.size
                return `Showing ${count} converted client${count === 1 ? '' : 's'}`
              })()}
            </p>
          </motion.div>

          {/* Mobile Clients List */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            <AnimatePresence>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : leadsData.length === 0 ? (
                // Empty state
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <FiCheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Converted Leads</h3>
                  <p className="text-gray-500">No leads have been converted to clients yet.</p>
                </motion.div>
              ) : (() => {
                // Group leads by client for multi-project cards
                const groupsMap = new Map()
                for (const lead of leadsData) {
                  const clientId = getClientIdForItem(lead)
                  if (!clientId) continue
                  if (!groupsMap.has(clientId)) {
                    const clientInfo = lead.__clientInfo
                    const displayName = lead.leadProfile?.name || lead.name || clientInfo?.name || lead.convertedClient?.name || 'Unknown'
                    const displayBusiness = lead.leadProfile?.businessName || lead.company || lead.convertedClient?.companyName || clientInfo?.companyName || 'No company'
                    const phone =
                      lead.phone ||
                      lead.convertedClient?.phoneNumber ||
                      ''
                    groupsMap.set(clientId, {
                      clientId,
                      baseLead: lead,
                      name: displayName,
                      businessName: displayBusiness,
                      phone,
                      projects: []
                    })
                  }
                  const group = groupsMap.get(clientId)
                  const projectsForLead = Array.isArray(lead.__allProjects) && lead.__allProjects.length
                    ? lead.__allProjects
                    : (lead.project ? [lead.project] : [])
                  projectsForLead.forEach(project => {
                    if (
                      project &&
                      !group.projects.some(
                        p => String(p.project._id || '') === String(project._id || '')
                      )
                    ) {
                      group.projects.push({ project, lead })
                    }
                  })
                }
                const groupedClients = Array.from(groupsMap.values())

                return groupedClients.map((group, index) => (
                  <motion.div
                    key={group.clientId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                  >
                    <MobileClientCard clientGroup={group} onAddProject={handleAddProjectForClient} />
                  </motion.div>
                ))
              })()}
            </AnimatePresence>

            {/* Empty State */}
            {leadsData.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No converted clients found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No converted clients match your current filters.'}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <SalesProjectConversionDialog
        isOpen={isProjectDialogOpen && !!selectedClientForProject}
        mode="fromClient"
        onClose={() => {
          setIsProjectDialogOpen(false)
          setSelectedClientForProject(null)
        }}
        clientId={selectedClientForProject?.clientId}
        clientName={selectedClientForProject?.name}
        clientPhone={selectedClientForProject?.phone}
        businessName={selectedClientForProject?.businessName}
        initialCategoryId={selectedClientForProject?.initialCategoryId}
        onSuccess={(result) => {
          setIsProjectDialogOpen(false)
          setSelectedClientForProject(null)

          // Append a new synthetic converted entry for this additional project
          try {
            const payload = result?.data || result || {}
            const project = payload.project
            const client = payload.client

            if (project && client) {
              const synthetic = {
                _id: project._id || `${client._id}-${Date.now()}`,
                convertedClientId: client._id,
                convertedClient: {
                  id: client._id,
                  isTransferred: false
                },
                project,
                leadProfile: {
                  name: client.name || client.fullName || 'Unknown',
                  businessName: client.companyName || client.company || 'No company'
                },
                category: project.category,
                phone: client.phoneNumber || client.phone || '',
                updatedAt: project.updatedAt || project.createdAt || new Date().toISOString()
              }

              setLeadsData(prev => [...prev, synthetic])
            } else {
              // Fallback: refresh from server if shape is unexpected
              fetchLeads()
            }
          } catch (e) {
            console.error('Error appending new project entry to converted list:', e)
            fetchLeads()
          }
        }}
      />
    </div>
  )
}

export default SL_converted
