import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import { adminProjectService } from '../admin-services/adminProjectService'
import { adminFinanceService } from '../admin-services/adminFinanceService'
import { adminUserService } from '../admin-services/adminUserService'
import { adminSalesService } from '../admin-services/adminSalesService'
import { 
  FiUsers, 
  FiFolder, 
  FiCheckSquare, 
  FiTarget,
  FiTrendingUp,
  FiBarChart,
  FiSearch,
  FiFilter,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiMoreVertical,
  FiCalendar,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiPauseCircle,
  FiUser,
  FiHome,
  FiSettings,
  FiRefreshCw,
  FiDownload,
  FiUpload,
  FiArrowUp,
  FiArrowDown,
  FiActivity,
  FiX,
  FiFileText
} from 'react-icons/fi'
import { 
  Filter,
  Calendar,
  BarChart3,
  TrendingUp,
  Database,
  CalendarDays,
  ChevronDown,
  Check,
  X as XIcon
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Combobox } from '../../../components/ui/combobox'
import { MultiSelect } from '../../../components/ui/multi-select'
import Loading from '../../../components/ui/loading'
import CloudinaryUpload from '../../../components/ui/cloudinary-upload'
import { useToast } from '../../../contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

const formatDateForInput = (date) => {
  if (!date) return ''
  const parsedDate = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(parsedDate?.getTime?.())) return ''
  return parsedDate.toISOString().split('T')[0]
}

const Admin_project_management = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending-projects')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Date range filter state
  const [dateFilterType, setDateFilterType] = useState('all') // 'day', 'week', 'month', 'year', 'custom', 'all'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState('all')
  // Project source filter state
  const [selectedSource, setSelectedSource] = useState('all') // 'all', 'sales', 'channel-partner', 'pm', 'admin'
  // GST filter state - filter projects by GST included or not
  const [selectedGSTFilter, setSelectedGSTFilter] = useState('all') // 'all', 'with_gst', 'without_gst'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'project', 'employee', 'client', 'pm'
  const [showPMAssignmentModal, setShowPMAssignmentModal] = useState(false)
  const [selectedPendingProject, setSelectedPendingProject] = useState(null)
  const [showPendingDetailsModal, setShowPendingDetailsModal] = useState(false)
  const [selectedPM, setSelectedPM] = useState('')
  const [showCostEditModal, setShowCostEditModal] = useState(false)
  const [showCostHistoryModal, setShowCostHistoryModal] = useState(false)
  const [showMilestoneTasksModal, setShowMilestoneTasksModal] = useState(false)
  const [milestoneTasksProject, setMilestoneTasksProject] = useState(null)
  const [milestoneTasksData, setMilestoneTasksData] = useState({ milestones: [], tasksByMilestone: {} })
  const [milestoneTasksLoading, setMilestoneTasksLoading] = useState(false)
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null)
  const [loadingMilestoneId, setLoadingMilestoneId] = useState(null)
  const [costEditData, setCostEditData] = useState({ newCost: '', reason: '' })
  const [costEditError, setCostEditError] = useState('')
  const [showInstallmentModal, setShowInstallmentModal] = useState(false)
  const [installmentFormData, setInstallmentFormData] = useState({
    amount: '',
    dueDate: '',
    notes: '',
    status: 'pending'
  })
  const [installmentToEdit, setInstallmentToEdit] = useState(null)
  const [installmentError, setInstallmentError] = useState('')
  const [isSavingInstallment, setIsSavingInstallment] = useState(false)
  const [showDeleteInstallmentModal, setShowDeleteInstallmentModal] = useState(false)
  const [installmentToDelete, setInstallmentToDelete] = useState(null)
  const [showManualInstallmentModal, setShowManualInstallmentModal] = useState(false)
  const [manualInstallmentFormData, setManualInstallmentFormData] = useState({
    account: '',
    amount: '',
    dueDate: '',
    paymentMethod: 'bank_transfer',
    referenceId: '',
    notes: ''
  })
  const [manualInstallmentError, setManualInstallmentError] = useState('')
  const [isSavingManualInstallment, setIsSavingManualInstallment] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  
  // Edit form states for employee, client, PM
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: ''
  })
  const [clientFormData, setClientFormData] = useState({
    name: '',
    email: '',
    contact: ''
  })
  const [pmFormData, setPmFormData] = useState({
    name: '',
    email: ''
  })
  const [isSavingUser, setIsSavingUser] = useState(false)

  // PM Options for Combobox
  const getPMOptions = () => {
    return pmOptions.length > 0 ? pmOptions : projectManagers
      .filter(pm => pm.status === 'active')
      .map(pm => ({
        value: pm.id.toString(),
        label: `${pm.name} - ${pm.projects} projects - ${pm.performance}% performance`,
        icon: FiUser,
        data: pm
      }))
  }

  // Mock data for statistics
  const [statistics, setStatistics] = useState({
    projects: {
      total: 45,
      active: 18,
      completed: 22,
      onHold: 3,
      overdue: 2,
      thisMonth: 8,
      pending: 3
    },
    milestones: {
      total: 156,
      completed: 89,
      inProgress: 45,
      pending: 22,
      overdue: 5
    },
    tasks: {
      total: 892,
      completed: 567,
      inProgress: 198,
      pending: 127,
      overdue: 23
    },
    employees: {
      total: 24,
      active: 22,
      onLeave: 2,
      newThisMonth: 3
    },
    clients: {
      total: 67,
      active: 45,
      inactive: 22,
      newThisMonth: 8
    },
    projectManagers: {
      total: 8,
      active: 7,
      onLeave: 1,
      avgProjects: 5.6
    }
  })

  // Mock data for lists
  const [projects, setProjects] = useState([])
  const [pendingProjects, setPendingProjects] = useState([])
  const [completedProjects, setCompletedProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [clients, setClients] = useState([])
  const [projectManagers, setProjectManagers] = useState([])
  const [pmOptions, setPMOptions] = useState([])
  const [error, setError] = useState(null)
  const getDefaultProjectForm = () => ({
    name: '',
    description: '',
    client: '',
    category: '',
    projectManager: '',
    assignedTeam: [],
    priority: 'normal',
    status: 'active',
    startDate: formatDateForInput(new Date()),
    dueDate: '',
    totalCost: '',
    attachments: [],
    includeProjectExpenses: false,
    projectExpenseReservedAmount: '',
    projectExpenseRequirements: ''
  })
  const [projectForm, setProjectForm] = useState(() => getDefaultProjectForm())
  const [projectFormErrors, setProjectFormErrors] = useState({})
  const [clientOptions, setClientOptions] = useState([])
  const [pmSelectOptions, setPmSelectOptions] = useState([])
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [categories, setCategories] = useState([])
  const [allClients, setAllClients] = useState([]) // Store all clients for category lookup
  const [createModalLoading, setCreateModalLoading] = useState(false)
  const [createModalError, setCreateModalError] = useState(null)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)

  const fetchFullList = async (fetchFn, baseParams = {}, pageSize = 100) => {
    let page = 1
    let aggregated = []
    let hasMore = true

    while (hasMore) {
      const response = await fetchFn({
        ...baseParams,
        page,
        limit: pageSize
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load data')
      }

      const items = response.data || []
      aggregated = aggregated.concat(items)

      const total = response.total ?? response.pagination?.total
      if (total !== undefined) {
        hasMore = aggregated.length < total
      } else {
        hasMore = items.length === pageSize
      }

      if (!items.length) {
        hasMore = false
      }

      page += 1
    }

    return aggregated
  }

  useEffect(() => {
    loadData()
  }, [])

  // Helper function to get date range based on filter type
  const getDateRange = () => {
    if (dateFilterType === 'all') {
      return { startDate: null, endDate: null, startISO: null, endISO: null }
    }
    
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    let start, end
    
    switch (dateFilterType) {
      case 'day':
        start = new Date(today)
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'week':
        start = new Date(today)
        start.setDate(today.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'year':
        start = new Date(today.getFullYear(), 0, 1)
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
        } else {
          start = new Date(today.getFullYear(), today.getMonth(), 1)
          start.setHours(0, 0, 0, 0)
          end = today
        }
        break
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        start.setHours(0, 0, 0, 0)
        end = today
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      startISO: start.toISOString(),
      endISO: end.toISOString()
    }
  }

  // Helper function to get filter label
  const getDateFilterLabel = () => {
    switch (dateFilterType) {
      case 'day':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'year':
        return 'This Year'
      case 'all':
        return 'All Time'
      case 'custom':
        if (startDate && endDate) {
          const start = new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          const end = new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          return `${start} - ${end}`
        }
        return 'Custom Range'
      default:
        return 'All Time'
    }
  }

  // Helper function to check if a date is within the filter range
  const isDateInRange = (dateString) => {
    if (dateFilterType === 'all' || !dateString) return true
    
    const dateRange = getDateRange()
    if (!dateRange.startISO || !dateRange.endISO) return true
    
    try {
      // Handle different date formats
      let date
      if (typeof dateString === 'string') {
        // Try parsing the date string - handle various formats
        date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          // Try parsing as ISO date without time (YYYY-MM-DD format)
          if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateString + 'T00:00:00')
          } else {
            // Try other common formats
            const parsed = Date.parse(dateString)
            if (!isNaN(parsed)) {
              date = new Date(parsed)
            } else {
              return true // If we can't parse, include it
            }
          }
          
          // Final check
          if (isNaN(date.getTime())) {
            return true // If still invalid, include it
          }
        }
      } else if (dateString instanceof Date) {
        date = dateString
        if (isNaN(date.getTime())) {
          return true // Invalid date, include it
        }
      } else {
        return true // Unknown format, include it
      }
      
      const start = new Date(dateRange.startISO)
      const end = new Date(dateRange.endISO)
      
      // Set time to start/end of day for proper comparison
      date.setHours(0, 0, 0, 0)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      
      const isInRange = date >= start && date <= end
      return isInRange
    } catch (error) {
      console.error('Error checking date range:', error, dateString)
      return true // On error, include the item
    }
  }

  // Load categories when switching to project tabs
  useEffect(() => {
    if (activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') {
      // Ensure categories are loaded for project tabs
      if (categories.length === 0) {
        adminSalesService.getAllLeadCategories()
          .then(categoriesRes => {
            if (categoriesRes?.data && Array.isArray(categoriesRes.data)) {
              setCategories(categoriesRes.data)
            }
          })
          .catch(error => {
            console.error('Error loading categories:', error)
          })
      }
    }
  }, [activeTab, categories.length])

  useEffect(() => {
    loadTabData()
  }, [activeTab, selectedFilter, searchTerm, currentPage, dateFilterType, startDate, endDate, selectedCategory])

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDateFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowDateFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDateFilterDropdown])

  const loadMockData = async () => {
    setLoading(true)
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock projects data
      const mockProjects = [
        {
          id: 1,
          name: "E-commerce Platform",
          client: "TechCorp Inc.",
          status: "active",
          progress: 75,
          priority: "high",
          dueDate: "2024-02-15",
          teamSize: 5,
          budget: 50000,
          pm: "Sarah Johnson",
          startDate: "2024-01-01"
        },
        {
          id: 2,
          name: "Mobile App Development",
          client: "StartupXYZ",
          status: "in-progress",
          progress: 45,
          priority: "urgent",
          dueDate: "2024-01-30",
          teamSize: 4,
          budget: 35000,
          pm: "Mike Wilson",
          startDate: "2024-01-10"
        },
        {
          id: 3,
          name: "Website Redesign",
          client: "Global Corp",
          status: "completed",
          progress: 100,
          priority: "normal",
          dueDate: "2024-01-20",
          teamSize: 3,
          budget: 25000,
          pm: "Lisa Davis",
          startDate: "2023-12-01"
        },
        {
          id: 4,
          name: "Database Migration",
          client: "Enterprise Ltd",
          status: "on-hold",
          progress: 30,
          priority: "low",
          dueDate: "2024-03-01",
          teamSize: 2,
          budget: 40000,
          pm: "David Brown",
          startDate: "2024-01-15"
        },
        {
          id: 5,
          name: "API Integration",
          client: "TechStart",
          status: "overdue",
          progress: 60,
          priority: "high",
          dueDate: "2024-01-25",
          teamSize: 3,
          budget: 20000,
          pm: "Emma Taylor",
          startDate: "2023-12-15"
        }
      ]

      // Mock pending projects data (from sales team)
      const mockPendingProjects = [
        {
          id: 'pending-1',
          name: "Restaurant Management System",
          client: "Delicious Bites Restaurant",
          clientContact: "Rajesh Kumar",
          clientPhone: "+91 98765 43210",
          clientEmail: "rajesh@deliciousbites.in",
          package: "Restaurant App + Web Portal",
          budget: 45000,
          priority: "high",
          submittedBy: "Sales Team - Priya Sharma",
          submittedDate: "2024-01-20",
          requirements: "Online ordering, table booking, inventory management",
          status: "pending-assignment"
        },
        {
          id: 'pending-2',
          name: "E-learning Platform",
          client: "EduTech Solutions",
          clientContact: "Dr. Anjali Singh",
          clientPhone: "+91 87654 32109",
          clientEmail: "anjali@edutech.in",
          package: "E-learning Platform",
          budget: 75000,
          priority: "urgent",
          submittedBy: "Sales Team - Amit Patel",
          submittedDate: "2024-01-19",
          requirements: "Course management, student portal, payment integration",
          status: "pending-assignment"
        },
        {
          id: 'pending-3',
          name: "Healthcare Management App",
          client: "HealthCare Plus",
          clientContact: "Dr. Vikram Mehta",
          clientPhone: "+91 76543 21098",
          clientEmail: "vikram@healthcareplus.in",
          package: "Healthcare Management System",
          budget: 60000,
          priority: "normal",
          submittedBy: "Sales Team - Sneha Gupta",
          submittedDate: "2024-01-18",
          requirements: "Patient management, appointment booking, prescription tracking",
          status: "pending-assignment"
        }
      ]

      // Mock completed projects data
      const mockCompletedProjects = [
        {
          id: 101,
          name: "E-commerce Website",
          client: "Fashion Store Ltd",
          status: "completed",
          progress: 100,
          priority: "high",
          dueDate: "2024-01-15",
          teamSize: 4,
          budget: 45000,
          pm: "Sarah Johnson",
          startDate: "2023-11-01",
          completedDate: "2024-01-10",
          clientContact: "Priya Sharma",
          clientPhone: "+91 98765 43210",
          clientEmail: "priya@fashionstore.in",
          requirements: "Online store with payment integration, inventory management, and admin panel",
          submittedBy: "Sales Team - Amit Patel"
        },
        {
          id: 102,
          name: "Restaurant App",
          client: "Delicious Bites",
          status: "completed",
          progress: 100,
          priority: "normal",
          dueDate: "2024-01-20",
          teamSize: 3,
          budget: 35000,
          pm: "Mike Wilson",
          startDate: "2023-12-01",
          completedDate: "2024-01-18",
          clientContact: "Rajesh Kumar",
          clientPhone: "+91 87654 32109",
          clientEmail: "rajesh@deliciousbites.in",
          requirements: "Food ordering app with table booking and delivery tracking",
          submittedBy: "Sales Team - Sneha Gupta"
        },
        {
          id: 103,
          name: "Healthcare Portal",
          client: "MedCare Plus",
          status: "completed",
          progress: 100,
          priority: "urgent",
          dueDate: "2024-01-25",
          teamSize: 5,
          budget: 60000,
          pm: "Lisa Davis",
          startDate: "2023-10-15",
          completedDate: "2024-01-22",
          clientContact: "Dr. Anjali Singh",
          clientPhone: "+91 76543 21098",
          clientEmail: "anjali@medcareplus.in",
          requirements: "Patient management system with appointment booking and prescription tracking",
          submittedBy: "Sales Team - Priya Sharma"
        },
        {
          id: 104,
          name: "School Management System",
          client: "EduTech Academy",
          status: "completed",
          progress: 100,
          priority: "normal",
          dueDate: "2024-01-30",
          teamSize: 4,
          budget: 50000,
          pm: "David Brown",
          startDate: "2023-11-15",
          completedDate: "2024-01-28",
          clientContact: "Vikram Mehta",
          clientPhone: "+91 65432 10987",
          clientEmail: "vikram@edutechacademy.in",
          requirements: "Student management, attendance tracking, and parent portal",
          submittedBy: "Sales Team - Amit Patel"
        },
        {
          id: 105,
          name: "Real Estate Portal",
          client: "Property Hub",
          status: "completed",
          progress: 100,
          priority: "high",
          dueDate: "2024-02-05",
          teamSize: 6,
          budget: 75000,
          pm: "Emma Taylor",
          startDate: "2023-12-01",
          completedDate: "2024-02-02",
          clientContact: "Suresh Patel",
          clientPhone: "+91 54321 09876",
          clientEmail: "suresh@propertyhub.in",
          requirements: "Property listing portal with virtual tours and mortgage calculator",
          submittedBy: "Sales Team - Sneha Gupta"
        }
      ]

      // Mock employees data
      const mockEmployees = [
        {
          id: 1,
          name: "John Doe",
          email: "john.doe@company.com",
          role: "Senior Developer",
          department: "Engineering",
          status: "active",
          projects: 3,
          tasks: 12,
          joinDate: "2023-06-01",
          performance: 95,
          avatar: "JD"
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane.smith@company.com",
          role: "UI/UX Designer",
          department: "Design",
          status: "active",
          projects: 2,
          tasks: 8,
          joinDate: "2023-08-15",
          performance: 88,
          avatar: "JS"
        },
        {
          id: 3,
          name: "Mike Johnson",
          email: "mike.johnson@company.com",
          role: "QA Engineer",
          department: "Engineering",
          status: "active",
          projects: 4,
          tasks: 15,
          joinDate: "2023-04-10",
          performance: 92,
          avatar: "MJ"
        },
        {
          id: 4,
          name: "Sarah Wilson",
          email: "sarah.wilson@company.com",
          role: "Project Manager",
          department: "Management",
          status: "active",
          projects: 5,
          tasks: 20,
          joinDate: "2023-02-01",
          performance: 98,
          avatar: "SW"
        },
        {
          id: 5,
          name: "David Brown",
          email: "david.brown@company.com",
          role: "DevOps Engineer",
          department: "Engineering",
          status: "on-leave",
          projects: 2,
          tasks: 6,
          joinDate: "2023-09-01",
          performance: 85,
          avatar: "DB"
        }
      ]

      // Mock clients data
      const mockClients = [
        {
          id: 1,
          name: "TechCorp Inc.",
          contact: "John Smith",
          email: "john@techcorp.com",
          status: "active",
          projects: 3,
          totalSpent: 125000,
          joinDate: "2023-01-15",
          lastActivity: "2024-01-20"
        },
        {
          id: 2,
          name: "StartupXYZ",
          contact: "Jane Doe",
          email: "jane@startupxyz.com",
          status: "active",
          projects: 1,
          totalSpent: 35000,
          joinDate: "2024-01-01",
          lastActivity: "2024-01-22"
        },
        {
          id: 3,
          name: "Global Corp",
          contact: "Mike Wilson",
          email: "mike@globalcorp.com",
          status: "inactive",
          projects: 2,
          totalSpent: 50000,
          joinDate: "2023-06-01",
          lastActivity: "2023-12-15"
        }
      ]

      // Mock project managers data
      const mockPMs = [
        {
          id: 1,
          name: "Sarah Johnson",
          email: "sarah.johnson@company.com",
          status: "active",
          projects: 5,
          teamSize: 12,
          completionRate: 94,
          joinDate: "2023-02-01",
          performance: 98
        },
        {
          id: 2,
          name: "Mike Wilson",
          email: "mike.wilson@company.com",
          status: "active",
          projects: 4,
          teamSize: 8,
          completionRate: 89,
          joinDate: "2023-05-15",
          performance: 92
        },
        {
          id: 3,
          name: "Lisa Davis",
          email: "lisa.davis@company.com",
          status: "active",
          projects: 3,
          teamSize: 6,
          completionRate: 96,
          joinDate: "2023-08-01",
          performance: 95
        }
      ]

      setProjects(mockProjects)
      setPendingProjects(mockPendingProjects)
      setCompletedProjects(mockCompletedProjects)
      setEmployees(mockEmployees)
      setClients(mockClients)
      setProjectManagers(mockPMs)
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true)
    }
    try {
      // Load categories first (needed for filters) - load this on every page load
      try {
        const categoriesRes = await adminSalesService.getAllLeadCategories()
        console.log('Categories response:', categoriesRes)
        if (categoriesRes?.data && Array.isArray(categoriesRes.data)) {
          console.log('Setting categories:', categoriesRes.data.length, 'categories')
          setCategories(categoriesRes.data)
        } else if (categoriesRes?.success && categoriesRes?.data) {
          // Handle case where data might be wrapped differently
          const categoriesData = Array.isArray(categoriesRes.data) ? categoriesRes.data : []
          console.log('Setting categories (wrapped):', categoriesData.length, 'categories')
          setCategories(categoriesData)
        } else {
          console.warn('Categories data is not an array:', categoriesRes)
          setCategories([])
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        setCategories([])
        // Don't fail the whole load if categories fail
      }

      // Load all clients for category lookup (needed for filtering projects by client category)
      try {
        const clientsRes = await adminProjectService.getClients({ limit: 1000 })
        if (clientsRes?.success && clientsRes?.data && Array.isArray(clientsRes.data)) {
          setAllClients(clientsRes.data)
        }
      } catch (error) {
        console.error('Error loading clients for category lookup:', error)
        // Don't fail if this fails
      }

      // Load statistics
      const statsResponse = await adminProjectService.getProjectManagementStatistics()
      if (statsResponse.success) {
        setStatistics(statsResponse.data)
      }

      // Load PM options for assignment
      const pmOptionsResponse = await adminProjectService.getPMsForAssignment()
      if (pmOptionsResponse.success) {
        setPMOptions(pmOptionsResponse.data)
      }

      // Load data based on active tab
      await loadTabData()
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data. Please try again.')
      // Keep existing mock data as fallback
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  const loadProjectCreationData = async () => {
    setCreateModalLoading(true)
    setCreateModalError(null)

    try {
      const [clients, pms, employees, categoriesRes] = await Promise.all([
        fetchFullList(adminProjectService.getClients.bind(adminProjectService)),
        fetchFullList(adminProjectService.getPMs.bind(adminProjectService)),
        fetchFullList(adminProjectService.getEmployees.bind(adminProjectService)),
        adminSalesService.getAllLeadCategories().catch(() => ({ data: [] }))
      ])
      
      if (categoriesRes?.data) {
        setCategories(categoriesRes.data)
      }

      const clientOpts = clients
        .map((client) => ({
          value: client.id?.toString() || '',
          label: client.companyName
            ? `${client.companyName}${client.name ? ` (${client.name})` : ''}`
            : client.name || client.email || 'Unnamed Client'
        }))
        .filter(option => option.value)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

      const pmOpts = pms
        .map((pm) => ({
          value: pm.id?.toString() || '',
          label: pm.name || pm.email || 'Unnamed PM'
        }))
        .filter(option => option.value)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

      const employeeOpts = employees
        .filter((employee) => {
          // Filter out sales employees - exclude if team is 'sales' or department is 'sales'
          const isSalesTeam = employee.team?.toLowerCase() === 'sales'
          const isSalesDepartment = employee.department?.toLowerCase() === 'sales'
          return !isSalesTeam && !isSalesDepartment
        })
        .map((employee) => ({
          value: employee.id?.toString() || '',
          label: employee.name || employee.email || 'Unnamed Employee',
          subtitle: [employee.role, employee.department].filter(Boolean).join(' • '),
          avatar: employee.avatar
        }))
        .filter(option => option.value)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

      setClientOptions(clientOpts)
      setPmSelectOptions(pmOpts)
      setEmployeeOptions(employeeOpts)

      if (!clientOpts.length || !pmOpts.length || !employeeOpts.length) {
        setCreateModalError('Some lists are empty. Ensure clients, PMs, and employees are registered.')
      }
    } catch (error) {
      console.error('Error loading project creation data:', error)
      setCreateModalError('Failed to load project creation data. Please try again.')
      setClientOptions([])
      setPmSelectOptions([])
      setEmployeeOptions([])
    } finally {
      setCreateModalLoading(false)
    }
  }

  const loadTabData = async () => {
    try {
      switch (activeTab) {
        case 'pending-projects':
          // Fetch all pending projects without server-side filtering
          // We'll do all filtering client-side to support date and category filters
          const pendingResponse = await adminProjectService.getPendingProjects({
            page: 1,
            limit: 1000, // Fetch a large number to get all data for client-side filtering
            populate: 'client' // Request populated client data
          })
          if (pendingResponse.success) {
            setPendingProjects(pendingResponse.data || [])
          }
          break

        case 'active-projects':
          const activeResponse = await adminProjectService.getActiveProjects({
            status: selectedFilter !== 'all' ? selectedFilter : undefined,
            search: searchTerm || undefined,
            page: currentPage,
            limit: itemsPerPage,
            populate: 'client' // Request populated client data
          })
          if (activeResponse.success) {
            setProjects(activeResponse.data || [])
          }
          break

        case 'completed-projects':
          const completedResponse = await adminProjectService.getCompletedProjects({
            priority: selectedFilter !== 'all' ? selectedFilter : undefined,
            search: searchTerm || undefined,
            page: currentPage,
            limit: itemsPerPage,
            populate: 'client' // Request populated client data
          })
          if (completedResponse.success) {
            setCompletedProjects(completedResponse.data || [])
          }
          break

        case 'employees':
          const employeesResponse = await adminProjectService.getEmployees({
            status: selectedFilter !== 'all' ? selectedFilter : undefined,
            search: searchTerm || undefined,
            page: currentPage,
            limit: itemsPerPage
          })
          if (employeesResponse.success) {
            setEmployees(employeesResponse.data)
          }
          break


        case 'project-managers':
          const pmsResponse = await adminProjectService.getPMs({
            status: selectedFilter !== 'all' ? selectedFilter : undefined,
            search: searchTerm || undefined,
            page: currentPage,
            limit: itemsPerPage
          })
          if (pmsResponse.success) {
            setProjectManagers(pmsResponse.data)
          }
          break

        default:
          break
      }
    } catch (error) {
      console.error(`Error loading ${activeTab} data:`, error)
      setError(`Failed to load ${activeTab} data. Please try again.`)
    }
  }

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200'
    const s = String(status).toLowerCase()
    switch (s) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'untouched': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on-leave': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'testing': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount) => {
    const numericValue = Number(amount || 0)
    const safeValue = Number.isFinite(numericValue) ? Math.floor(numericValue) : 0
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(safeValue)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'pending-projects': return pendingProjects
      case 'active-projects': return projects
      case 'completed-projects': return completedProjects
      case 'employees': return employees
      case 'project-managers': return projectManagers
      default: return []
    }
  }

  // Helper function to determine project source
  const getProjectSource = (project) => {
    if (!project) return 'unknown'
    
    // Priority 1: Check if project has submittedBy (Sales Team)
    // submittedBy references Sales model, so if it exists, it's from Sales Team
    if (project.submittedBy) {
      return 'sales'
    }
    
    // Priority 2: Check if project has createdBy (Admin created)
    // createdBy references Admin model
    if (project.createdBy) {
      return 'admin'
    }
    
    // Priority 3: Check if project has projectManager but no submittedBy/createdBy (PM created directly)
    // PMs can create projects directly, which will have projectManager but no submittedBy/createdBy
    if (project.projectManager && !project.submittedBy && !project.createdBy) {
      return 'pm'
    }
    
    // Priority 4: Check for channel partner
    // Channel partner projects typically come from CPLeads converted to projects
    // They might have originLead but no submittedBy/createdBy
    // Note: This detection might need refinement based on actual data structure
    if (project.originLead && !project.submittedBy && !project.createdBy && !project.projectManager) {
      // If it has originLead but no other indicators, might be channel partner
      // However, this is a fallback - ideally backend should mark CP projects explicitly
      return 'channel-partner'
    }
    
    // Default fallback: if projectManager exists, assume PM created
    if (project.projectManager) {
      return 'pm'
    }
    
    // If none of the above match, return unknown
    return 'unknown'
  }

  const filteredData = getCurrentData().filter(item => {
    if (!item) return false
    
    // Project source filter (only for project tabs)
    let matchesSource = true
    if ((activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') && selectedSource !== 'all') {
      const projectSource = getProjectSource(item)
      matchesSource = projectSource === selectedSource
    }
    
    // Search filter
    const searchLower = searchTerm.toLowerCase().trim()
    const matchesSearch = !searchTerm || searchTerm.trim() === '' || 
                         item.name?.toLowerCase().includes(searchLower) ||
                         item.email?.toLowerCase().includes(searchLower) ||
                         (typeof item.client === 'string' 
                           ? item.client?.toLowerCase().includes(searchLower)
                           : (item.client?.name || item.client?.companyName || item.client?.company || '')?.toLowerCase().includes(searchLower)) ||
                         item.clientContact?.toLowerCase().includes(searchLower) ||
                         item.companyName?.toLowerCase().includes(searchLower) ||
                         item.clientEmail?.toLowerCase().includes(searchLower) ||
                         (typeof item.submittedBy === 'string' && item.submittedBy.toLowerCase().includes(searchLower)) ||
                         (typeof item.submittedBy === 'object' && item.submittedBy?.name?.toLowerCase().includes(searchLower))
    
    // Priority/Status filter
    let matchesFilter = true
    if (activeTab === 'pending-projects') {
      if (selectedFilter !== 'all') {
        const itemPriority = item.priority?.toLowerCase() || ''
        const filterPriority = selectedFilter?.toLowerCase() || ''
        matchesFilter = itemPriority === filterPriority || item.priority === selectedFilter
      }
    } else {
      if (selectedFilter !== 'all') {
        const itemStatus = item.status?.toLowerCase() || ''
        const filterStatus = selectedFilter?.toLowerCase() || ''
        matchesFilter = itemStatus === filterStatus || item.status === selectedFilter
      }
    }
    
    // Category filter (only for project tabs) - filter by client's category
    let matchesCategory = true
    if ((activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') && selectedCategory !== 'all') {
      // Get client's category - check if client is an object with category field
      let clientCategoryId = null
      
      if (typeof item.client === 'object' && item.client) {
        // Client is already an object - check various possible category field names
        const clientCategory = item.client.category || item.client.leadCategory || item.client.categoryId
        if (clientCategory) {
          clientCategoryId = typeof clientCategory === 'object' ? (clientCategory?._id || clientCategory?.id) : clientCategory
        }
      } else if (typeof item.client === 'string' || item.clientId) {
        // Client is just an ID - look it up in allClients array
        const clientId = item.client || item.clientId
        if (clientId && allClients && allClients.length > 0) {
          const fullClient = allClients.find(c => 
            (c.id || c._id)?.toString() === clientId?.toString() ||
            c._id?.toString() === clientId?.toString() ||
            c.id?.toString() === clientId?.toString()
          )
          
          if (fullClient) {
            // Check various possible category field names in the full client object
            const clientCategory = fullClient.category || fullClient.leadCategory || fullClient.categoryId
            if (clientCategory) {
              clientCategoryId = typeof clientCategory === 'object' ? (clientCategory?._id || clientCategory?.id) : clientCategory
            }
          }
        }
      }
      
      // Also check project's direct category as fallback
      const projectCategoryId = typeof item.category === 'object' ? (item.category?._id || item.category?.id) : item.category
      
      // Match if either client category or project category matches
      const categoryMatch = (clientCategoryId && clientCategoryId.toString() === selectedCategory.toString()) || 
                           (projectCategoryId && projectCategoryId.toString() === selectedCategory.toString())
      matchesCategory = categoryMatch
    }
    
    // GST filter (only for project tabs) - filter by includeGST
    let matchesGST = true
    if ((activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') && selectedGSTFilter !== 'all') {
      const hasGST = !!(item.financialDetails?.includeGST)
      if (selectedGSTFilter === 'with_gst') {
        matchesGST = hasGST
      } else if (selectedGSTFilter === 'without_gst') {
        matchesGST = !hasGST
      }
    }

    // Date filter (for all tabs)
    let matchesDate = true
    if (dateFilterType !== 'all') {
      let dateToCheck = null
      
      if (activeTab === 'pending-projects') {
        // For pending projects: prioritize submittedDate, then createdAt, then other dates
        dateToCheck = item.submittedDate || item.createdAt || item.startDate || item.updatedAt || item.dateCreated || item.date
      } else if (activeTab === 'active-projects' || activeTab === 'completed-projects') {
        // For active/completed projects: use createdAt, startDate, submittedDate, or updatedAt
        dateToCheck = item.createdAt || item.startDate || item.submittedDate || item.updatedAt || item.dateCreated
      } else if (activeTab === 'employees') {
        // For employees: use createdAt, joinDate, or dateJoined
        dateToCheck = item.createdAt || item.joinDate || item.dateJoined || item.dateCreated
      } else if (activeTab === 'project-managers') {
        // For PMs: use createdAt, joinDate, or dateJoined
        dateToCheck = item.createdAt || item.joinDate || item.dateJoined || item.dateCreated
      }
      
      // Only filter if we have a date to check, otherwise include the item
      if (dateToCheck) {
        matchesDate = isDateInRange(dateToCheck)
      } else {
        // If no date field found, include it (don't filter out items without dates)
        matchesDate = true
      }
    }
    
    return matchesSearch && matchesFilter && matchesCategory && matchesDate && matchesSource && matchesGST
  })

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

const projectFinancialSummary =
  modalType === 'project' && selectedItem
    ? getFinancialSummary(selectedItem)
    : null

  // Management Functions
  const handleCreate = async (type) => {
    setModalType(type)
    setSelectedItem(null)
    if (type === 'project') {
      setProjectForm(getDefaultProjectForm())
      setProjectFormErrors({})
      setCreateModalError(null)
      setShowCreateModal(true)
      await loadProjectCreationData()
      return
    }
    setShowCreateModal(true)
  }

  const handleEdit = async (item, type) => {
    setModalType(type)
    setSelectedItem(item)
    
    if (type === 'project') {
      // Load project creation data if not already loaded (including categories)
      if (clientOptions.length === 0 || pmSelectOptions.length === 0 || employeeOptions.length === 0 || categories.length === 0) {
        await loadProjectCreationData()
      }
      
      // Populate edit form with project data
      const clientId = typeof item.client === 'object' ? (item.client?._id || item.client?.id) : item.client
      const pmId = typeof item.projectManager === 'object' ? (item.projectManager?._id || item.projectManager?.id) : item.projectManager
      const teamIds = Array.isArray(item.assignedTeam) 
        ? item.assignedTeam.map(member => typeof member === 'object' ? (member._id || member.id) : member)
        : []
      
      // Get category ID - handle both object and string cases
      let categoryId = null
      if (typeof item.category === 'object' && item.category) {
        // Category is an object - get the ID
        categoryId = item.category._id || item.category.id
      } else if (typeof item.category === 'string' && item.category) {
        // Category might be an ID string or a name string
        // Check if it's a valid ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(item.category)
        if (isValidObjectId) {
          // It's a valid ObjectId format, use it
          categoryId = item.category
        } else {
          // It's a name string, find the matching category ID
          // Use current categories state (should be loaded by loadProjectCreationData above)
          const categoriesToSearch = categories.length > 0 ? categories : []
          const matchingCategory = categoriesToSearch.find(cat => 
            (cat.name || cat.categoryName) === item.category ||
            cat._id === item.category ||
            cat.id === item.category
          )
          categoryId = matchingCategory ? (matchingCategory._id || matchingCategory.id) : null
        }
      }
      
      // Get total cost from multiple possible locations with better fallback
      let totalCostValue = ''
      if (item.financialDetails?.totalCost && Number(item.financialDetails.totalCost) > 0) {
        totalCostValue = Number(item.financialDetails.totalCost).toString()
      } else if (item.budget && Number(item.budget) > 0) {
        totalCostValue = Number(item.budget).toString()
      } else if (item.totalCost && Number(item.totalCost) > 0) {
        totalCostValue = Number(item.totalCost).toString()
      } else if (item.cost && Number(item.cost) > 0) {
        totalCostValue = Number(item.cost).toString()
      } else {
        // If no valid cost found, try to get any numeric value
        const costFromFinancial = item.financialDetails?.totalCost
        const costFromBudget = item.budget
        const costFromTotal = item.totalCost
        const costFromCost = item.cost
        
        if (costFromFinancial !== undefined && costFromFinancial !== null) {
          totalCostValue = Number(costFromFinancial).toString()
        } else if (costFromBudget !== undefined && costFromBudget !== null) {
          totalCostValue = Number(costFromBudget).toString()
        } else if (costFromTotal !== undefined && costFromTotal !== null) {
          totalCostValue = Number(costFromTotal).toString()
        } else if (costFromCost !== undefined && costFromCost !== null) {
          totalCostValue = Number(costFromCost).toString()
        } else {
          totalCostValue = '0'
        }
      }
      
      setProjectForm({
        name: item.name || '',
        description: item.description || '',
        client: clientId?.toString() || '',
        category: categoryId?.toString() || '',
        projectManager: pmId?.toString() || '',
        assignedTeam: teamIds.map(id => id?.toString()).filter(Boolean),
        priority: item.priority || 'normal',
        status: item.status || 'active',
        startDate: formatDateForInput(item.startDate || item.createdAt),
        dueDate: formatDateForInput(item.dueDate),
        totalCost: totalCostValue,
        attachments: item.attachments || [],
        includeProjectExpenses: item.expenseConfig?.included || false,
        projectExpenseReservedAmount: (item.expenseConfig?.reservedAmount != null ? Number(item.expenseConfig.reservedAmount) : 0).toString(),
        projectExpenseRequirements: item.expenseConfig?.requirementsNotes || ''
      })
      setProjectFormErrors({})
      setCreateModalError(null)
    } else if (type === 'employee') {
      setEmployeeFormData({
        name: item.name || '',
        email: item.email || '',
        role: item.role || item.position || '',
        department: item.department || ''
      })
    } else if (type === 'client') {
      setClientFormData({
        name: item.name || item.companyName || '',
        email: item.email || '',
        contact: item.contact || item.phone || item.phoneNumber || ''
      })
    } else if (type === 'pm') {
      setPmFormData({
        name: item.name || '',
        email: item.email || ''
      })
    }
    
    setShowEditModal(true)
  }

  const handleOpenMilestoneTasksModal = async (project) => {
    const projectId = project._id || project.id
    if (!projectId) return
    setMilestoneTasksProject(project)
    setShowMilestoneTasksModal(true)
    setExpandedMilestoneId(null)
    setMilestoneTasksData({ milestones: [], tasksByMilestone: {} })
    setMilestoneTasksLoading(true)
    try {
      const response = await adminProjectService.getProjectMilestones(projectId)
      if (response.success && response.data) {
        setMilestoneTasksData(prev => ({ ...prev, milestones: response.data }))
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load milestones', variant: 'destructive' })
    } finally {
      setMilestoneTasksLoading(false)
    }
  }

  const handleToggleMilestoneTasks = async (milestoneId) => {
    const projectId = milestoneTasksProject?._id || milestoneTasksProject?.id
    if (!projectId || !milestoneId) return
    if (expandedMilestoneId === milestoneId) {
      setExpandedMilestoneId(null)
      setLoadingMilestoneId(null)
      return
    }
    setLoadingMilestoneId(milestoneId)
    try {
      const response = await adminProjectService.getMilestoneTasks(projectId, milestoneId)
      if (response.success && response.data) {
        setMilestoneTasksData(prev => ({
          ...prev,
          tasksByMilestone: { ...prev.tasksByMilestone, [milestoneId]: response.data }
        }))
        setExpandedMilestoneId(milestoneId)
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' })
    } finally {
      setLoadingMilestoneId(null)
    }
  }

  const handleView = (item, type) => {
    setModalType(type)
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const handleDelete = (item, type) => {
    setModalType(type)
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    // Simulate API call
    console.log(`Deleting ${modalType}:`, selectedItem)
    setShowDeleteModal(false)
    setSelectedItem(null)
    setModalType('')
    // In real app, update the state to remove the item
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (isSavingUser) return
    
    if (!selectedItem || (!selectedItem._id && !selectedItem.id)) {
      toast.error('Item ID is missing. Cannot update.')
      return
    }
    
    setIsSavingUser(true)
    
    try {
      const itemId = selectedItem._id || selectedItem.id
      let userType = ''
      let updateData = {}
      
      if (modalType === 'employee') {
        userType = 'employee'
        updateData = {
          name: employeeFormData.name.trim(),
          email: employeeFormData.email.trim(),
          department: employeeFormData.department || undefined
        }
      } else if (modalType === 'client') {
        userType = 'client'
        updateData = {
          name: clientFormData.name.trim(),
          email: clientFormData.email.trim(),
          phone: clientFormData.contact.trim()
        }
      } else if (modalType === 'pm') {
        userType = 'pm'
        updateData = {
          name: pmFormData.name.trim(),
          email: pmFormData.email.trim()
        }
      }
      
      const response = await adminUserService.updateUser(userType, itemId, updateData)
      
      if (response?.success) {
        toast.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} updated successfully!`)
        setShowEditModal(false)
        setSelectedItem(null)
        setModalType('')
        
        // Reload data
        await loadData(false)
      } else {
        toast.error(response?.message || `Failed to update ${modalType}`)
      }
    } catch (error) {
      console.error(`Error updating ${modalType}:`, error)
      toast.error(error?.response?.data?.message || error?.message || `Failed to update ${modalType}`)
    } finally {
      setIsSavingUser(false)
    }
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setShowDeleteModal(false)
    setShowPMAssignmentModal(false)
    setShowPendingDetailsModal(false)
    setShowCostEditModal(false)
    setShowCostHistoryModal(false)
    setShowInstallmentModal(false)
    setShowDeleteInstallmentModal(false)
    setSelectedItem(null)
    setSelectedPendingProject(null)
    setSelectedPM('')
    setModalType('')
    setProjectForm(getDefaultProjectForm())
    setProjectFormErrors({})
    setCreateModalError(null)
    setIsSubmittingProject(false)
    setCostEditData({ newCost: '', reason: '' })
    setCostEditError('')
    setInstallmentFormData({
      amount: '',
      dueDate: '',
      notes: '',
      status: 'pending'
    })
    setInstallmentToEdit(null)
    setInstallmentToDelete(null)
    setInstallmentError('')
    setIsSavingInstallment(false)
    setEmployeeFormData({ name: '', email: '', role: '', department: '' })
    setClientFormData({ name: '', email: '', contact: '' })
    setPmFormData({ name: '', email: '' })
    setIsSavingUser(false)
  }

  // Handle cost edit
  const handleEditCost = () => {
    if (!selectedItem || modalType !== 'project') return
    const currentCost = selectedItem.financialDetails?.totalCost || selectedItem.budget || 0
    setCostEditData({ newCost: currentCost.toString(), reason: '' })
    setCostEditError('')
    setShowCostEditModal(true)
  }

  // Handle cost history view
  const handleViewCostHistory = () => {
    if (!selectedItem || modalType !== 'project') return
    setShowCostHistoryModal(true)
  }

  // Submit cost update
  const handleUpdateCost = async () => {
    if (!selectedItem || modalType !== 'project') return

    const newCostValue = Number(costEditData.newCost)
    if (!costEditData.newCost || isNaN(newCostValue) || newCostValue < 0) {
      setCostEditError('Please enter a valid cost amount')
      return
    }

    if (!costEditData.reason || costEditData.reason.trim().length === 0) {
      setCostEditError('Please provide a reason for the cost change')
      return
    }

    try {
      setCostEditError('')
      const response = await adminProjectService.updateProjectCost(
        selectedItem._id || selectedItem.id,
        newCostValue,
        costEditData.reason.trim()
      )

      if (response?.success) {
        toast.success('Project cost updated successfully!')
        setShowCostEditModal(false)
        setCostEditData({ newCost: '', reason: '' })
        
        // Reload project data
        await loadData(false)
        
        // Update selectedItem with new data
        if (response.data) {
          setSelectedItem(response.data)
        }
      } else {
        setCostEditError(response?.message || 'Failed to update project cost')
      }
    } catch (error) {
      console.error('Error updating project cost:', error)
      setCostEditError(error?.response?.data?.message || error?.message || 'Failed to update project cost')
    }
  }

  // Get base cost (first cost in history or initial cost)
  const getBaseCost = (project) => {
    if (!project) return 0
    if (project.costHistory && project.costHistory.length > 0) {
      // Base cost is the first entry's previousCost (the original cost)
      return project.costHistory[0].previousCost
    }
    // If no history, use current cost as base
    return project.financialDetails?.totalCost || project.budget || 0
  }

  const getInstallmentStatusMeta = (installment) => {
    if (!installment) {
      return {
        label: 'Pending',
        className: 'bg-gray-100 text-gray-700'
      }
    }

    const status = installment.status || 'pending'
    if (status === 'paid') {
      return {
        label: 'Paid',
        className: 'bg-green-100 text-green-700'
      }
    }

    const dueDate = installment.dueDate ? new Date(installment.dueDate) : null
    const now = new Date()
    if (dueDate && dueDate < now && status !== 'paid') {
      return {
        label: 'Overdue',
        className: 'bg-red-100 text-red-700'
      }
    }

    if (status === 'overdue') {
      return {
        label: 'Overdue',
        className: 'bg-red-100 text-red-700'
      }
    }

    return {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-700'
    }
  }

function getInstallmentTotals(project) {
    if (!project?.installmentPlan?.length) {
      return {
        total: 0,
        pending: 0,
        paid: 0
      }
    }

  return project.installmentPlan.reduce((acc, installment) => {
    const amount = Number(installment.amount) || 0
    acc.total += amount
    if (installment.status === 'paid') {
      acc.paid += amount
    } else {
      acc.pending += amount
    }
    return acc
  }, { total: 0, pending: 0, paid: 0 })
  }

function getFinancialSummary(project) {
  if (!project) {
    return {
      totalCost: 0,
      advance: 0,
      installmentCollected: 0,
      totalCollected: 0,
      scheduled: 0,
      pendingInstallments: 0,
      outstanding: 0
    }
  }

  const totals = getInstallmentTotals(project)
  const totalCost = Number(project.financialDetails?.totalCost ?? project.budget ?? 0)
  
  // Calculate paid installments
  const installmentCollected = Number(totals.paid ?? 0)
  
  // Get total received (which includes advance + receipts + installments)
  const totalReceived = Number(project.financialDetails?.advanceReceived ?? 0)
  
  // Calculate approved PaymentReceipts (if available in project data)
  // Note: We need to subtract paid installments from totalReceived to get advance + receipts
  // But we can't distinguish between advance and receipts without querying PaymentReceipts
  // For display purposes, we'll show:
  // - Advance: totalReceived - installmentCollected (this includes initial advance + receipts)
  // - Installment Collected: paid installments
  // - Total Collected: totalReceived (which is already correct)
  
  // The stored advanceReceived includes: initial advance + approved receipts + paid installments
  // So initial advance + receipts = totalReceived - installmentCollected
  const advanceAndReceipts = Math.max(0, totalReceived - installmentCollected)
  
  // For the summary cards, we'll show:
  // - Advance Received: advanceAndReceipts (includes initial advance + any approved receipts)
  // - Installment Collected: installmentCollected
  // - Total Collected: totalReceived (which equals advanceAndReceipts + installmentCollected)
  
  const totalCollected = totalReceived // This is already the sum of all payments

  const storedRemaining = Number(project.financialDetails?.remainingAmount)
  let outstanding = 0
  if (Number.isFinite(storedRemaining)) {
    outstanding = Math.max(0, storedRemaining)
  } else {
    const computedRemaining = totalCost - totalCollected
    outstanding = Number.isFinite(computedRemaining) ? Math.max(0, computedRemaining) : 0
  }

  return {
    totalCost: Number.isFinite(totalCost) ? totalCost : 0,
    advance: Number.isFinite(advanceAndReceipts) ? advanceAndReceipts : 0,
    installmentCollected,
    totalCollected,
    scheduled: Number(totals.total ?? 0),
    pendingInstallments: Number(totals.pending ?? 0),
    outstanding
  }
}

  const getSortedInstallments = (project) => {
    if (!project?.installmentPlan?.length) return []
    return project.installmentPlan
      .slice()
      .sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
        return dateA - dateB
      })
  }

  const handleAddInstallment = () => {
    setInstallmentToEdit(null)
    setInstallmentFormData({
      amount: '',
      dueDate: '',
      notes: '',
      status: 'pending'
    })
    setInstallmentError('')
    setShowInstallmentModal(true)
  }

  const handleEditInstallment = (installment) => {
    setInstallmentToEdit(installment)
    setInstallmentFormData({
      amount: installment.amount?.toString() || '',
      dueDate: formatDateForInput(installment.dueDate),
      notes: installment.notes || '',
      status: installment.status || 'pending'
    })
    setInstallmentError('')
    setShowInstallmentModal(true)
  }

  const handleSaveInstallment = async () => {
    if (!selectedItem || modalType !== 'project') return

    const amountValue = Number(installmentFormData.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setInstallmentError('Please enter a valid installment amount greater than 0')
      return
    }

    if (!installmentFormData.dueDate) {
      setInstallmentError('Please select a due date for the installment')
      return
    }

    const projectId = selectedItem._id || selectedItem.id
    setIsSavingInstallment(true)

    try {
      let response
      if (installmentToEdit) {
        const installmentId = installmentToEdit._id || installmentToEdit.id
        const updatePayload = {
          amount: amountValue,
          dueDate: installmentFormData.dueDate,
          notes: installmentFormData.notes
        }

        if (installmentFormData.status) {
          updatePayload.status = installmentFormData.status
        }

        response = await adminProjectService.updateProjectInstallment(
          projectId,
          installmentId,
          updatePayload
        )
      } else {
        response = await adminProjectService.addProjectInstallments(projectId, [
          {
            amount: amountValue,
            dueDate: installmentFormData.dueDate,
            notes: installmentFormData.notes
          }
        ])
      }

      if (response?.success) {
        toast.success(installmentToEdit ? 'Installment updated successfully!' : 'Installment added successfully!')
        await loadData(false)
        if (response.data) {
          setSelectedItem(response.data)
        }
        setShowInstallmentModal(false)
        setInstallmentFormData({
          amount: '',
          dueDate: '',
          notes: '',
          status: 'pending'
        })
        setInstallmentToEdit(null)
        setInstallmentError('')
      } else {
        setInstallmentError(response?.message || 'Failed to save installment')
      }
    } catch (error) {
      console.error('Error saving installment:', error)
      setInstallmentError(error?.response?.data?.message || error?.message || 'Failed to save installment')
    } finally {
      setIsSavingInstallment(false)
    }
  }

  const handleDeleteInstallment = (installment) => {
    if (!selectedItem || modalType !== 'project') return
    setInstallmentToDelete(installment)
    setShowDeleteInstallmentModal(true)
  }

  // Fetch accounts for manual installment
  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true)
      const response = await adminFinanceService.getAccounts({ isActive: 'true' })
      if (response.success && response.data) {
        setAccounts(response.data)
      }
    } catch (err) {
      console.error('Error fetching accounts:', err)
      toast.error('Failed to load accounts')
    } finally {
      setAccountsLoading(false)
    }
  }

  const handleAddManualInstallment = () => {
    setManualInstallmentFormData({
      account: '',
      amount: '',
      dueDate: '',
      notes: ''
    })
    setManualInstallmentError('')
    fetchAccounts()
    setShowManualInstallmentModal(true)
  }

  const handleSaveManualInstallment = async () => {
    if (!selectedItem || modalType !== 'project') return

    if (!manualInstallmentFormData.account) {
      setManualInstallmentError('Please select an account')
      return
    }

    const amountValue = Number(manualInstallmentFormData.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setManualInstallmentError('Please enter a valid recovery amount greater than 0')
      return
    }

    if (!manualInstallmentFormData.dueDate) {
      setManualInstallmentError('Please select a payment date')
      return
    }

    const projectId = selectedItem._id || selectedItem.id
    setIsSavingManualInstallment(true)

    try {
      const payload = {
        amount: amountValue,
        accountId: manualInstallmentFormData.account,
        paymentMethod: manualInstallmentFormData.paymentMethod || 'bank_transfer',
        paymentDate: manualInstallmentFormData.dueDate,
        referenceId: manualInstallmentFormData.referenceId || undefined,
        notes: manualInstallmentFormData.notes || undefined
      }

      const response = await adminProjectService.addProjectRecovery(projectId, payload)

      if (response?.success) {
        toast.success('Recovery payment recorded successfully!')
        await loadData(false)
        if (response.data?.project) {
          setSelectedItem(response.data.project)
        }
        setShowManualInstallmentModal(false)
        setManualInstallmentFormData({
          account: '',
          amount: '',
          dueDate: '',
          paymentMethod: 'bank_transfer',
          referenceId: '',
          notes: ''
        })
        setManualInstallmentError('')
      } else {
        setManualInstallmentError(response?.message || 'Failed to save recovery payment')
      }
    } catch (error) {
      console.error('Error saving recovery payment:', error)
      setManualInstallmentError(error?.response?.data?.message || error?.message || 'Failed to save recovery payment')
    } finally {
      setIsSavingManualInstallment(false)
    }
  }

  const confirmDeleteInstallment = async () => {
    if (!selectedItem || modalType !== 'project' || !installmentToDelete) return
    const projectId = selectedItem._id || selectedItem.id
    const installmentId = installmentToDelete._id || installmentToDelete.id

    try {
      const response = await adminProjectService.deleteProjectInstallment(projectId, installmentId)
      if (response?.success) {
        toast.success('Installment removed successfully!')
        await loadData(false)
        if (response.data) {
          setSelectedItem(response.data)
        }
        setShowDeleteInstallmentModal(false)
        setInstallmentToDelete(null)
      } else {
        toast.error(response?.message || 'Failed to remove installment')
      }
    } catch (error) {
      console.error('Error deleting installment:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Failed to remove installment')
    }
  }

  const handleMarkInstallmentPaid = async (installment) => {
    if (!selectedItem || modalType !== 'project') return
    const projectId = selectedItem._id || selectedItem.id
    const installmentId = installment._id || installment.id

    try {
      const response = await adminProjectService.updateProjectInstallment(projectId, installmentId, {
        status: 'paid'
      })
      if (response?.success) {
        toast.success('Installment marked as paid!')
        await loadData(false)
        if (response.data) {
          setSelectedItem(response.data)
        }
      } else {
        toast.error(response?.message || 'Failed to update installment')
      }
    } catch (error) {
      console.error('Error marking installment paid:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update installment')
    }
  }

  // PM Assignment Functions
  const handleAssignPM = (pendingProject) => {
    setSelectedPendingProject(pendingProject)
    setSelectedPM('')
    setShowPMAssignmentModal(true)
  }

  const handleViewPendingDetails = (pendingProject) => {
    setSelectedPendingProject(pendingProject)
    setShowPendingDetailsModal(true)
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const removeAttachment = (attachmentId) => {
    setProjectForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => 
        (att.id || att.public_id || att._id) !== attachmentId
      )
    }))
  }

  const validateProjectForm = () => {
    const errors = {}

    if (!projectForm.name.trim()) {
      errors.name = 'Project name is required.'
    }

    if (!projectForm.description.trim()) {
      errors.description = 'Project description is required.'
    }

    if (!projectForm.client) {
      errors.client = 'Select a client for this project.'
    }

  // Require project category so admin-created projects are classified
  if (!projectForm.category || !projectForm.category.toString().trim()) {
    errors.category = 'Select a project category.'
  }

    if (!projectForm.projectManager) {
      errors.projectManager = 'Select a project manager.'
    }

    if (!projectForm.assignedTeam.length) {
      errors.assignedTeam = 'Assign at least one team member.'
    }

    if (!projectForm.startDate) {
      errors.startDate = 'Start date is required.'
    }

    if (!projectForm.dueDate) {
      errors.dueDate = 'Due date is required.'
    }

    if (projectForm.startDate && projectForm.dueDate) {
      const start = new Date(projectForm.startDate)
      const due = new Date(projectForm.dueDate)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(due.getTime()) && due < start) {
        errors.dueDate = 'Due date must be on or after the start date.'
      }
    }

    const costValue = Number(projectForm.totalCost)
    if (Number.isNaN(costValue) || costValue <= 0) {
      errors.totalCost = 'Enter a valid project cost greater than zero.'
    }

    setProjectFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleProjectCreateSubmit = async (event) => {
    event.preventDefault()
    if (isSubmittingProject) return

    if (!validateProjectForm()) {
      return
    }

    setIsSubmittingProject(true)
    setCreateModalError(null)

    try {
      const totalCostValue = Number(projectForm.totalCost)

    // Validate and convert category to ObjectId if needed (same logic as update)
    let categoryValue = undefined
    if (projectForm.category && projectForm.category.trim() !== '') {
      const categoryStr = projectForm.category.trim()
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(categoryStr)
      if (isValidObjectId) {
        categoryValue = categoryStr
      } else {
        const matchingCategory = categories.find(cat =>
          (cat.name || cat.categoryName) === categoryStr ||
          cat._id === categoryStr ||
          cat.id === categoryStr
        )
        categoryValue = matchingCategory ? (matchingCategory._id || matchingCategory.id) : undefined
      }
    }

      // Prepare expense configuration (light validation)
      let expenseConfig = undefined
      const reservedRaw = projectForm.projectExpenseReservedAmount
      const reservedAmount =
        reservedRaw !== '' && reservedRaw !== null && reservedRaw !== undefined
          ? Number(reservedRaw)
          : 0
      const includeProjectExpenses = !!projectForm.includeProjectExpenses
      const requirementsNotes = (projectForm.projectExpenseRequirements || '').trim()

      if (!Number.isNaN(reservedAmount) && reservedAmount >= 0 && (includeProjectExpenses || reservedAmount > 0 || requirementsNotes)) {
        expenseConfig = {
          included: includeProjectExpenses,
          reservedAmount,
          requirementsNotes
        }
      }

      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        client: projectForm.client,
      category: categoryValue,
      categoryId: categoryValue,
        projectManager: projectForm.projectManager,
        status: projectForm.status,
        priority: projectForm.priority,
        startDate: projectForm.startDate ? new Date(projectForm.startDate).toISOString() : undefined,
        dueDate: projectForm.dueDate ? new Date(projectForm.dueDate).toISOString() : undefined,
        assignedTeam: projectForm.assignedTeam,
        budget: totalCostValue,
        financialDetails: {
          totalCost: totalCostValue,
          advanceReceived: 0,
          includeGST: false,
          remainingAmount: totalCostValue
        },
        ...(expenseConfig ? { expenseConfig } : {}),
        attachments: projectForm.attachments.map(att => ({
          public_id: att.public_id || att.id,
          secure_url: att.secure_url || att.url,
          originalName: att.originalName || att.original_filename || att.name,
          original_filename: att.original_filename || att.originalName || att.name,
          format: att.format || att.type,
          size: att.size || att.bytes,
          bytes: att.bytes || att.size,
          width: att.width,
          height: att.height,
          resource_type: att.resource_type || 'auto'
        }))
      }

      const response = await adminProjectService.createProject(payload)

      if (response?.success) {
        toast.success(`Project "${projectForm.name.trim()}" created successfully!`)
        if (activeTab === 'active-projects' && currentPage !== 1) {
          setCurrentPage(1)
        }
        setError(null)
        closeModals()
        await loadData(false)
      } else {
        const errorMessage = response?.message || 'Failed to create project. Please try again.'
        setCreateModalError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create project. Please try again.'
      setCreateModalError(message)
      toast.error(message)
    } finally {
      setIsSubmittingProject(false)
    }
  }

  const handleProjectUpdateSubmit = async (event) => {
    event.preventDefault()
    if (isSubmittingProject) return

    if (!validateProjectForm()) {
      return
    }

    if (!selectedItem || !selectedItem._id && !selectedItem.id) {
      setCreateModalError('Project ID is missing. Cannot update project.')
      toast.error('Project ID is missing. Cannot update project.')
      return
    }

    setIsSubmittingProject(true)
    setCreateModalError(null)

    try {
      const projectId = selectedItem._id || selectedItem.id
      const totalCostValue = Number(projectForm.totalCost)
      
      // Validate and convert category to ObjectId if needed
      let categoryValue = undefined
      if (projectForm.category && projectForm.category.trim() !== '') {
        const categoryStr = projectForm.category.trim()
        // Check if it's a valid ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(categoryStr)
        if (isValidObjectId) {
          // It's already a valid ObjectId, use it
          categoryValue = categoryStr
        } else {
          // It might be a category name, find the matching category ID
          const matchingCategory = categories.find(cat => 
            (cat.name || cat.categoryName) === categoryStr ||
            cat._id === categoryStr ||
            cat.id === categoryStr
          )
          if (matchingCategory) {
            categoryValue = matchingCategory._id || matchingCategory.id
          } else {
            // If we can't find a match, don't send category (or send undefined)
            console.warn('Category not found for:', categoryStr)
            categoryValue = undefined
          }
        }
      }
      
      // Prepare expense configuration (light validation)
      let expenseConfig = undefined
      const reservedRaw = projectForm.projectExpenseReservedAmount
      const reservedAmount =
        reservedRaw !== '' && reservedRaw !== null && reservedRaw !== undefined
          ? Number(reservedRaw)
          : 0
      const includeProjectExpenses = !!projectForm.includeProjectExpenses
      const requirementsNotes = (projectForm.projectExpenseRequirements || '').trim()

      if (!Number.isNaN(reservedAmount) && reservedAmount >= 0 && (includeProjectExpenses || reservedAmount > 0 || requirementsNotes)) {
        expenseConfig = {
          included: includeProjectExpenses,
          reservedAmount,
          requirementsNotes
        }
      }

      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        client: projectForm.client,
        category: categoryValue,
        categoryId: categoryValue,
        projectManager: projectForm.projectManager,
        status: projectForm.status,
        priority: projectForm.priority,
        startDate: projectForm.startDate ? new Date(projectForm.startDate).toISOString() : undefined,
        dueDate: projectForm.dueDate ? new Date(projectForm.dueDate).toISOString() : undefined,
        assignedTeam: projectForm.assignedTeam,
        budget: totalCostValue,
        financialDetails: {
          totalCost: totalCostValue,
          advanceReceived: selectedItem.financialDetails?.advanceReceived || 0,
          includeGST: selectedItem.financialDetails?.includeGST || false,
          remainingAmount: totalCostValue - (selectedItem.financialDetails?.advanceReceived || 0)
        },
        ...(expenseConfig ? { expenseConfig } : {}),
        attachments: projectForm.attachments.map(att => ({
          public_id: att.public_id || att.id,
          secure_url: att.secure_url || att.url,
          originalName: att.originalName || att.original_filename || att.name,
          original_filename: att.original_filename || att.originalName || att.name,
          format: att.format || att.type,
          size: att.size || att.bytes,
          bytes: att.bytes || att.size,
          width: att.width,
          height: att.height,
          resource_type: att.resource_type || 'auto'
        }))
      }

      const response = await adminProjectService.updateProject(projectId, payload)

      if (response?.success) {
        toast.success(`Project "${projectForm.name.trim()}" updated successfully!`)
        setError(null)
        closeModals()
        await loadData(false)
      } else {
        const errorMessage = response?.message || 'Failed to update project. Please try again.'
        setCreateModalError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error updating project:', error)
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update project. Please try again.'
      setCreateModalError(message)
      toast.error(message)
    } finally {
      setIsSubmittingProject(false)
    }
  }

  const confirmPMAssignment = async () => {
    if (!selectedPM || !selectedPendingProject) return

    try {
      setLoading(true)
      
      // Call API to assign PM to pending project
      const response = await adminProjectService.assignPMToProject(
        selectedPendingProject._id || selectedPendingProject.id, 
        selectedPM
      )
      
      if (response.success) {
        // Remove from pending projects
        setPendingProjects(prev => 
          prev.filter(p => (p._id || p.id) !== (selectedPendingProject._id || selectedPendingProject.id))
        )
        
        // Add to active projects
        setProjects(prev => [...prev, response.data])
        
        // Update statistics
        setStatistics(prev => ({
          ...prev,
          projects: {
            ...prev.projects,
            pending: prev.projects.pending - 1,
            active: prev.projects.active + 1
          }
        }))
        
        // Show success toast
        const projectName = selectedPendingProject.name || 'Project'
        toast.success(`Project "${projectName}" assigned to PM successfully!`)
        setError(null) // Clear any previous errors
      } else {
        const errorMessage = response?.message || 'Failed to assign PM. Please try again.'
        setError(errorMessage)
        toast.error(errorMessage)
      }
      
    } catch (error) {
      console.error('Error assigning PM:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to assign PM. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      closeModals()
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
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5">
                      <button
                        type="button"
                        onClick={() => setError(null)}
                        className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Project Management
            </h1>
            <p className="text-gray-600">
                  Comprehensive management of development teams, projects, and resources.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => loadData()}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => handleCreate('project')}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <FiPlus className="h-4 w-4" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          </div>

          {/* Compact Statistics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
            {/* Projects Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <FiFolder className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Projects</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.projects.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-green-600 font-semibold">+{statistics.projects.thisMonth}</span>
                  <span className="text-xs text-gray-500">this month</span>
                </div>
              </div>
            </motion.div>

            {/* Milestones Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <FiTarget className="h-3 w-3 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Milestones</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.milestones.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-green-600 font-semibold">{statistics.milestones.completed}</span>
                  <span className="text-xs text-gray-500">completed</span>
                </div>
              </div>
            </motion.div>

            {/* Tasks Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <FiCheckSquare className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Tasks</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.tasks.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-green-600 font-semibold">{statistics.tasks.completed}</span>
                  <span className="text-xs text-gray-500">completed</span>
                </div>
              </div>
            </motion.div>

            {/* Developers Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <FiUsers className="h-3 w-3 text-orange-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Developers</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.employees.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-green-600 font-semibold">+{statistics.employees.newThisMonth}</span>
                  <span className="text-xs text-gray-500">new</span>
                </div>
              </div>
            </motion.div>

            {/* Clients Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-teal-100 rounded-lg">
                  <FiHome className="h-3 w-3 text-teal-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Clients</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.clients.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-green-600 font-semibold">+{statistics.clients.newThisMonth}</span>
                  <span className="text-xs text-gray-500">new</span>
                </div>
              </div>
            </motion.div>

            {/* PMs Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <FiUser className="h-3 w-3 text-indigo-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">PMs</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.projectManagers.total}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-blue-600 font-semibold">{statistics.projectManagers.avgProjects}</span>
                  <span className="text-xs text-gray-500">avg projects</span>
                </div>
              </div>
            </motion.div>

            {/* Pending Projects Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <FiClock className="h-3 w-3 text-orange-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Pending</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{statistics.projects.pending}</p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-orange-600 font-semibold">needs PM</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="border-b border-gray-200">
              <nav className="flex flex-wrap gap-1 px-4">
                {[
                  { key: 'pending-projects', label: 'Pending', icon: FiClock },
                  { key: 'active-projects', label: 'Active', icon: FiFolder },
                  { key: 'completed-projects', label: 'Completed', icon: FiCheckCircle },
                  { key: 'employees', label: 'Developers', icon: FiUsers },
                  { key: 'project-managers', label: 'PMs', icon: FiUser }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      if (activeTab === tab.key) return
                      setActiveTab(tab.key)
                      setSelectedFilter('all')
                      setSelectedCategory('all')
                      setSelectedSource('all')
                      setDateFilterType('all')
                      setStartDate('')
                      setEndDate('')
                      setCurrentPage(1)
                    }}
                    className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-medium text-xs transition-colors rounded-t-md ${
                      activeTab === tab.key
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {/* Pending Projects Tab */}
              {activeTab === 'pending-projects' && (
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                    {/* Title Section */}
                    <div className="mb-4">
                      <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900 mb-1">
                        Pending Projects
                      </CardTitle>
                      <p className="text-sm text-gray-600">Projects from sales team waiting for PM assignment</p>
                    </div>

                    {/* Filters Section - Responsive Grid Layout */}
                    <div className="space-y-3">
                      {/* First Row: Date, Category, Source Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                        {/* Date Range Filter */}
                        <div className="relative filter-dropdown-container">
                          <button
                            onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                            className="flex items-center justify-between gap-2 w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-gray-700 truncate">{getDateFilterLabel()}</span>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform flex-shrink-0 ${showDateFilterDropdown ? 'rotate-180' : ''}`} />
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

                          {/* Category Filter */}
                          {(activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') && (
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                              disabled={!categories || categories.length === 0}
                            >
                              <option value="all">All Categories</option>
                              {categories && categories.length > 0 ? (
                                categories.map((cat) => (
                                  <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                    {cat.name || cat.categoryName || 'Unnamed Category'}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>Loading categories...</option>
                              )}
                            </select>
                          )}

                          {/* Project Source Filter */}
                          {(activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') && (
                            <select
                              value={selectedSource}
                              onChange={(e) => setSelectedSource(e.target.value)}
                              className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                            >
                              <option value="all">All Sources</option>
                              <option value="sales">Sales Team</option>
                              <option value="channel-partner">Channel Partner</option>
                              <option value="pm">PM Created</option>
                              <option value="admin">Admin Created</option>
                            </select>
                          )}

                          {/* GST Filter */}
                          {(activeTab === 'pending-projects' || activeTab === 'active-projects' || activeTab === 'completed-projects') && (
                            <select
                              value={selectedGSTFilter}
                              onChange={(e) => setSelectedGSTFilter(e.target.value)}
                              className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                            >
                              <option value="all">All GST</option>
                              <option value="with_gst">GST Included</option>
                              <option value="without_gst">Without GST</option>
                            </select>
                          )}
                        </div>

                        {/* Second Row: Search, Priority/Status, Count Badge */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 items-center">
                          {/* Search Input */}
                          <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              placeholder="Search pending projects..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-colors"
                            />
                          </div>

                          {/* Priority/Status Filter */}
                          <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors whitespace-nowrap"
                          >
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                          </select>

                          {/* Count Badge */}
                          <div className="bg-orange-100 text-orange-800 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap text-center">
                            {filteredData.length} pending
                          </div>
                        </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {filteredData.length > 0 ? (
                      <div className="p-2 lg:p-4">
                        <div className="overflow-x-auto -mx-2 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="w-full min-w-[1000px] border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px]">Project Name</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Client</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden md:table-cell">Contact</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Priority</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Total Cost</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden lg:table-cell">Submitted Date</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden lg:table-cell">Submitted By</th>
                                <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedData.map((pendingProject, index) => {
                                const pendingKey = pendingProject.id || pendingProject._id || pendingProject.projectId || `pending-${index}`
                                return (
                                  <tr key={pendingKey} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-2 px-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                          {pendingProject.name?.charAt(0)?.toUpperCase() || 'P'}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-gray-900 truncate">{pendingProject.name}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-900 truncate max-w-[120px]">
                                        {typeof pendingProject.client === 'string' 
                                          ? pendingProject.client 
                                          : pendingProject.client?.name || 'Unknown Client'
                                        }
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="space-y-0.5">
                                        {(pendingProject.clientContact || (typeof pendingProject.client === 'object' && pendingProject.client?.contactPerson)) && (
                                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                                            <FiUser className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate max-w-[100px]">
                                              {pendingProject.clientContact || (typeof pendingProject.client === 'object' && pendingProject.client?.contactPerson) || ''}
                                            </span>
                                          </div>
                                        )}
                                        {(pendingProject.clientPhone || (typeof pendingProject.client === 'object' && pendingProject.client?.phoneNumber)) && (
                                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                                            <FiUser className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate max-w-[100px]">
                                              {typeof pendingProject.client === 'object' && pendingProject.client?.phoneNumber 
                                                ? pendingProject.client.phoneNumber 
                                                : pendingProject.clientPhone || ''}
                                            </span>
                                          </div>
                                        )}
                                        {!pendingProject.clientContact && 
                                         !(typeof pendingProject.client === 'object' && pendingProject.client?.contactPerson) &&
                                         !pendingProject.clientPhone && 
                                         !(typeof pendingProject.client === 'object' && pendingProject.client?.phoneNumber) && (
                                          <span className="text-xs text-gray-400">N/A</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(pendingProject.priority)}`}>
                                        {pendingProject.priority}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs font-semibold text-green-700">
                                        {formatCurrency(pendingProject.financialDetails?.totalCost || pendingProject.budget || 0)}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 hidden lg:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{formatDate(pendingProject.submittedDate || pendingProject.createdAt || pendingProject.submittedAt)}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 hidden lg:table-cell">
                                      <div className="text-xs text-gray-600 truncate max-w-[100px]">
                                        {typeof pendingProject.submittedBy === 'string' 
                                          ? pendingProject.submittedBy.split(' - ')[1] || pendingProject.submittedBy
                                          : pendingProject.submittedBy?.name || 'Unknown'
                                        }
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center justify-end space-x-1">
                                        <button
                                          onClick={() => handleViewPendingDetails(pendingProject)}
                                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                          title="View Details"
                                        >
                                          <FiEye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleAssignPM(pendingProject)}
                                          className="text-gray-400 hover:text-orange-600 p-1.5 rounded hover:bg-orange-50 transition-all"
                                          title="Assign PM"
                                        >
                                          <FiUser className="h-3.5 w-3.5" />
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
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-700">
                              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} pending projects
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-1 border rounded-md text-sm font-medium ${
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
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiClock className="text-orange-500 text-3xl" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No pending projects</h3>
                          <p className="text-gray-600 text-lg">
                            {filteredData.length === 0 && pendingProjects.length > 0 
                              ? 'No projects match the current filters. Try adjusting your filters.'
                              : 'All projects have been assigned to project managers. New projects from the sales team will appear here.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Active Projects Tab */}
              {activeTab === 'active-projects' && (
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                    {/* Title Section */}
                    <div className="mb-4">
                      <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900 mb-1">
                        Active Projects
                      </CardTitle>
                      <p className="text-sm text-gray-600">Projects currently in progress with assigned PMs</p>
                    </div>

                    {/* Filters Section - Responsive Grid Layout */}
                    <div className="space-y-3">
                      {/* First Row: Date, Category, Source Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                        {/* Date Range Filter */}
                        <div className="relative filter-dropdown-container">
                          <button
                            onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                            className="flex items-center justify-between gap-2 w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-gray-700 truncate">{getDateFilterLabel()}</span>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform flex-shrink-0 ${showDateFilterDropdown ? 'rotate-180' : ''}`} />
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

                          {/* Category Filter */}
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                            disabled={!categories || categories.length === 0}
                          >
                            <option value="all">All Categories</option>
                            {categories && categories.length > 0 ? (
                              categories.map((cat) => (
                                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                  {cat.name || cat.categoryName || 'Unnamed Category'}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>Loading categories...</option>
                            )}
                          </select>

                          {/* Project Source Filter */}
                          <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <option value="all">All Sources</option>
                            <option value="sales">Sales Team</option>
                            <option value="channel-partner">Channel Partner</option>
                            <option value="pm">PM Created</option>
                            <option value="admin">Admin Created</option>
                          </select>

                          {/* GST Filter */}
                          <select
                            value={selectedGSTFilter}
                            onChange={(e) => setSelectedGSTFilter(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <option value="all">All GST</option>
                            <option value="with_gst">GST Included</option>
                            <option value="without_gst">Without GST</option>
                          </select>
                        </div>

                        {/* Second Row: Search, Status, Count Badge */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 items-center">
                          {/* Search Input */}
                          <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              placeholder="Search active projects..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-colors"
                            />
                          </div>

                          {/* Status Filter */}
                          <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors whitespace-nowrap"
                          >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="untouched">Untouched</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                            <option value="overdue">Overdue</option>
                          </select>

                          {/* Count Badge */}
                          <div className="bg-green-100 text-green-800 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap text-center">
                            {filteredData.length} active
                          </div>
                        </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {paginatedData.length > 0 ? (
                      <div className="p-2 lg:p-4">
                        <div className="overflow-x-auto -mx-2 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="w-full min-w-[1000px] border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px]">Project Name</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Client</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">PM</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Status</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Progress</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Milestones</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px] hidden md:table-cell">Due Date</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px] hidden md:table-cell">Team</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Total Cost</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px] hidden lg:table-cell">Start Date</th>
                                <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedData.map((project, index) => {
                                const projectKey = project.id || project._id || project.projectId || `project-${index}`
                                const progressValue = (project.progress !== null && project.progress !== undefined)
                                  ? project.progress
                                  : (project.status === 'completed' ? 100 : 0)
                                return (
                                  <tr key={projectKey} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-2 px-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                          {project.name?.charAt(0)?.toUpperCase() || 'P'}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-gray-900 truncate">{project.name}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-900 truncate max-w-[120px]">
                                        {typeof project.client === 'string'
                                          ? project.client
                                          : project.client?.name || 'Unknown Client'}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-600 truncate max-w-[100px]">
                                        {project.pm || (typeof project.projectManager === 'object' && project.projectManager?.name) || (typeof project.projectManager === 'string' && project.projectManager) || 'Unassigned'}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                                        {project.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold text-gray-700">{progressValue}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                          <div
                                            className="bg-gradient-to-r from-primary to-primary-dark h-1 rounded-full transition-all duration-500"
                                            style={{ width: `${progressValue}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <button
                                        onClick={() => handleOpenMilestoneTasksModal(project)}
                                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold cursor-pointer transition-colors"
                                        title="View milestones & tasks"
                                      >
                                        <FiTarget className="h-3 w-3" />
                                        {project.milestoneCount ?? 0}
                                      </button>
                                    </td>
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{formatDate(project.dueDate)}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="text-xs font-semibold text-gray-700">
                                        {project.teamSize !== null && project.teamSize !== undefined
                                          ? project.teamSize
                                          : project.assignedTeam?.length || 0}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs font-semibold text-green-700">
                                        {formatCurrency(project.financialDetails?.totalCost || project.budget || 0)}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 hidden lg:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{formatDate(project.startDate)}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center justify-end space-x-1">
                                        <button
                                          onClick={() => handleView(project, 'project')}
                                          className="text-gray-400 hover:text-primary p-1.5 rounded hover:bg-primary/10 transition-all"
                                          title="View"
                                        >
                                          <FiEye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEdit(project, 'project')}
                                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                          title="Edit"
                                        >
                                          <FiEdit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(project, 'project')}
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
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} projects
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 border rounded-md text-sm font-medium ${
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
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiFolder className="text-green-500 text-3xl" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No active projects</h3>
                          <p className="text-gray-600 text-lg">
                            There are no active projects at the moment.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Completed Projects Tab */}
              {activeTab === 'completed-projects' && (
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                    {/* Title Section */}
                    <div className="mb-4">
                      <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900 mb-1">
                        Completed Projects
                      </CardTitle>
                      <p className="text-sm text-gray-600">Successfully completed projects with full details</p>
                    </div>

                    {/* Filters Section - Responsive Grid Layout */}
                    <div className="space-y-3">
                      {/* First Row: Date, Category, Source Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                        {/* Date Range Filter */}
                        <div className="relative filter-dropdown-container">
                          <button
                            onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                            className="flex items-center justify-between gap-2 w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-gray-700 truncate">{getDateFilterLabel()}</span>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform flex-shrink-0 ${showDateFilterDropdown ? 'rotate-180' : ''}`} />
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

                          {/* Category Filter */}
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                            disabled={!categories || categories.length === 0}
                          >
                            <option value="all">All Categories</option>
                            {categories && categories.length > 0 ? (
                              categories.map((cat) => (
                                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                  {cat.name || cat.categoryName || 'Unnamed Category'}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>Loading categories...</option>
                            )}
                          </select>

                          {/* Project Source Filter */}
                          <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <option value="all">All Sources</option>
                            <option value="sales">Sales Team</option>
                            <option value="channel-partner">Channel Partner</option>
                            <option value="pm">PM Created</option>
                            <option value="admin">Admin Created</option>
                          </select>

                          {/* GST Filter */}
                          <select
                            value={selectedGSTFilter}
                            onChange={(e) => setSelectedGSTFilter(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors"
                          >
                            <option value="all">All GST</option>
                            <option value="with_gst">GST Included</option>
                            <option value="without_gst">Without GST</option>
                          </select>
                        </div>

                        {/* Second Row: Search, Priority, Count Badge */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 items-center">
                          {/* Search Input */}
                          <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              placeholder="Search completed projects..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-colors"
                            />
                          </div>

                          {/* Priority Filter */}
                          <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white transition-colors whitespace-nowrap"
                          >
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                          </select>

                          {/* Count Badge */}
                          <div className="bg-blue-100 text-blue-800 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap text-center">
                            {filteredData.length} completed
                          </div>
                        </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {paginatedData.length > 0 ? (
                      <div className="p-2 lg:p-4">
                        <div className="overflow-x-auto -mx-2 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="w-full min-w-[1000px] border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px]">Project Name</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Client</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">PM</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Priority</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Progress</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Milestones</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px] hidden md:table-cell">Completed</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px] hidden md:table-cell">Team</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Total Cost</th>
                                <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedData.map((project, index) => {
                                const completedKey = project.id || project._id || project.projectId || `completed-${index}`
                                const progressValue = (project.progress !== null && project.progress !== undefined) ? project.progress : (project.status === 'completed' ? 100 : 0)
                                const duration = project.duration !== null && project.duration !== undefined 
                                  ? `${project.duration} days`
                                  : project.completedDate && project.createdAt
                                  ? `${Math.ceil((new Date(project.completedDate || project.updatedAt) - new Date(project.createdAt)) / (1000 * 60 * 60 * 24))} days`
                                  : 'N/A'
                                return (
                                  <tr key={completedKey} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-2 px-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                          {project.name?.charAt(0)?.toUpperCase() || 'P'}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-gray-900 truncate">{project.name}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-900 truncate max-w-[120px]">
                                        {typeof project.client === 'string' 
                                          ? project.client 
                                          : project.client?.name || 'Unknown Client'}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-600 truncate max-w-[100px]">
                                        {project.pm || (typeof project.projectManager === 'object' && project.projectManager?.name) || (typeof project.projectManager === 'string' && project.projectManager) || 'Unassigned'}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(project.priority)}`}>
                                        {project.priority}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold text-green-600">{progressValue}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                          <div
                                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-1 rounded-full transition-all duration-500"
                                            style={{ width: `${progressValue}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <button
                                        onClick={() => handleOpenMilestoneTasksModal(project)}
                                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold cursor-pointer transition-colors"
                                        title="View milestones & tasks"
                                      >
                                        <FiTarget className="h-3 w-3" />
                                        {project.milestoneCount ?? 0}
                                      </button>
                                    </td>
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{formatDate(project.completedDate || project.completedAt || project.updatedAt || (project.status === 'completed' && project.dueDate ? project.dueDate : null))}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="text-xs font-semibold text-gray-700">
                                        {project.teamSize !== null && project.teamSize !== undefined 
                                          ? project.teamSize 
                                          : project.assignedTeam?.length || 0}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs font-semibold text-green-700">
                                        {formatCurrency(project.financialDetails?.totalCost || project.budget || 0)}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center justify-end space-x-1">
                                        <button
                                          onClick={() => handleView(project, 'project')}
                                          className="text-gray-400 hover:text-primary p-1.5 rounded hover:bg-primary/10 transition-all"
                                          title="View"
                                        >
                                          <FiEye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEdit(project, 'project')}
                                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                          title="Edit"
                                        >
                                          <FiEdit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(project, 'project')}
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
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} completed projects
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 border rounded-md text-sm font-medium ${
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
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiCheckCircle className="text-green-500 text-3xl" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No completed projects</h3>
                          <p className="text-gray-600 text-lg">
                            There are no completed projects at the moment.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Developers Tab */}
              {activeTab === 'employees' && (
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                          Developers
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Manage your development team members</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Date Range Filter */}
                        <div className="relative filter-dropdown-container">
                          <button
                            onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-full sm:w-auto bg-white"
                          >
                            <Filter className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-700">{getDateFilterLabel()}</span>
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
                            placeholder="Search developers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-64 text-sm"
                          />
                        </div>
                        <select
                          value={selectedFilter}
                          onChange={(e) => setSelectedFilter(e.target.value)}
                          className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-full sm:w-auto"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="on-leave">On Leave</option>
                        </select>
                        <div className="bg-orange-100 text-orange-800 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">
                          {filteredData.length} developers
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {paginatedData.length > 0 ? (
                      <div className="p-2 lg:p-4">
                        <div className="overflow-x-auto -mx-2 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="w-full min-w-[800px] border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px]">Name</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Role</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Department</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Status</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Projects</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px] hidden md:table-cell">Tasks</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden lg:table-cell">Joined</th>
                                <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedData.map((employee, index) => {
                                const employeeKey = employee.id || employee._id || employee.userId || `employee-${index}`
                                return (
                                  <tr key={employeeKey} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-2 px-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                          {employee.avatar || employee.name?.charAt(0)?.toUpperCase() || 'E'}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-gray-900 truncate">{employee.name}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-600 truncate max-w-[120px]">{employee.role}</div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs text-gray-700 truncate max-w-[100px]">{employee.department}</div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(employee.status)}`}>
                                        {employee.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="text-xs font-semibold text-gray-700">{employee.projects || 0}</div>
                                    </td>
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="text-xs font-semibold text-gray-700">{employee.tasks || 0}</div>
                                    </td>
                                    <td className="py-2 px-2 hidden lg:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{formatDate(employee.joinDate)}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center justify-end space-x-1">
                                        <button
                                          onClick={() => handleView(employee, 'employee')}
                                          className="text-gray-400 hover:text-primary p-1.5 rounded hover:bg-primary/10 transition-all"
                                          title="View"
                                        >
                                          <FiEye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEdit(employee, 'employee')}
                                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                          title="Edit"
                                        >
                                          <FiEdit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(employee, 'employee')}
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
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} developers
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 border rounded-md text-sm font-medium ${
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
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiUsers className="text-primary text-3xl" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No developers found</h3>
                          <p className="text-gray-600 text-lg">
                            There are no developers at the moment.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Project Managers Tab */}
              {activeTab === 'project-managers' && (
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="border-b border-gray-200 p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                          Project Managers
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Manage project managers and their assignments</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Date Range Filter */}
                        <div className="relative filter-dropdown-container">
                          <button
                            onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-full sm:w-auto bg-white"
                          >
                            <Filter className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-700">{getDateFilterLabel()}</span>
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
                            placeholder="Search project managers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-64 text-sm"
                          />
                        </div>
                        <select
                          value={selectedFilter}
                          onChange={(e) => setSelectedFilter(e.target.value)}
                          className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-full sm:w-auto"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="on-leave">On Leave</option>
                        </select>
                        <div className="bg-indigo-100 text-indigo-800 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">
                          {filteredData.length} PMs
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {paginatedData.length > 0 ? (
                      <div className="p-2 lg:p-4">
                        <div className="overflow-x-auto -mx-2 lg:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="w-full min-w-[800px] border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px]">Name</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Status</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Completion</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Performance</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Projects</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[150px] hidden md:table-cell">Email</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden lg:table-cell">Joined</th>
                                <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedData.map((pm) => (
                                <tr key={pm.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-2 px-2">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                        {pm.name.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 truncate">{pm.name}</p>
                                        <p className="text-xs text-gray-500">PM</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(pm.status)}`}>
                                      {pm.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="text-xs font-semibold text-green-700">{pm.completionRate}%</div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="text-xs font-semibold text-blue-700">{pm.performance}%</div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="text-xs font-semibold text-gray-700">{pm.projects}</div>
                                  </td>
                                  <td className="py-2 px-2 hidden md:table-cell">
                                    <a href={`mailto:${pm.email}`} className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-[150px] block">
                                      {pm.email}
                                    </a>
                                  </td>
                                  <td className="py-2 px-2 hidden lg:table-cell">
                                    <div className="flex items-center space-x-1 text-xs text-gray-600">
                                      <FiCalendar className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{formatDate(pm.joinDate)}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="flex items-center justify-end space-x-1">
                                      <button
                                        onClick={() => handleView(pm, 'pm')}
                                        className="text-gray-400 hover:text-primary p-1.5 rounded hover:bg-primary/10 transition-all"
                                        title="View"
                                      >
                                        <FiEye className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleEdit(pm, 'pm')}
                                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                        title="Edit"
                                      >
                                        <FiEdit3 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(pm, 'pm')}
                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-all"
                                        title="Delete"
                                      >
                                        <FiTrash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} project managers
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 border rounded-md text-sm font-medium ${
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
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiUser className="text-indigo-500 text-3xl" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No project managers found</h3>
                          <p className="text-gray-600 text-lg">
                            There are no project managers at the moment.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <FiTrash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete {modalType}</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete {selectedItem?.name || 'this item'}? This will permanently remove all associated data.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {showCreateModal ? `Create New ${modalType}` : `Edit ${modalType}`}
                </h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              
              {modalType === 'project' && (showCreateModal || showEditModal) ? (
                <form className="space-y-6" onSubmit={showCreateModal ? handleProjectCreateSubmit : handleProjectUpdateSubmit}>
                  {createModalError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {createModalError}
                    </div>
                  )}

                  {createModalLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loading size="large" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Project Name</label>
                          <input
                            type="text"
                            value={projectForm.name}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                            placeholder="Enter project name"
                          />
                          {projectFormErrors.name && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={projectForm.category}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select project category</option>
                            {categories.map((cat) => (
                              <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                {cat.name || cat.categoryName}
                              </option>
                            ))}
                          </select>
                          {projectFormErrors.category && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.category}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Client</label>
                          <Combobox
                            options={clientOptions}
                            value={projectForm.client}
                            onChange={(value) => setProjectForm(prev => ({ ...prev, client: value }))}
                            placeholder="Select client"
                            searchable
                            disabled={!clientOptions.length}
                            error={!!projectFormErrors.client}
                          />
                          {projectFormErrors.client && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.client}</p>
                          )}
                          {!clientOptions.length && !createModalLoading && (
                            <p className="mt-1 text-xs text-amber-600">
                              No active clients found. Add a client before creating a project.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Project Manager</label>
                          <Combobox
                            options={pmSelectOptions}
                            value={projectForm.projectManager}
                            onChange={(value) => setProjectForm(prev => ({ ...prev, projectManager: value }))}
                            placeholder="Assign a project manager"
                            searchable
                            disabled={!pmSelectOptions.length}
                            error={!!projectFormErrors.projectManager}
                          />
                          {projectFormErrors.projectManager && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.projectManager}</p>
                          )}
                          {!pmSelectOptions.length && !createModalLoading && (
                            <p className="mt-1 text-xs text-amber-600">
                              No active project managers found. Activate a PM to proceed.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Project Cost (INR)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={projectForm.totalCost}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, totalCost: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                            placeholder="Enter total project cost"
                          />
                          {projectFormErrors.totalCost && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.totalCost}</p>
                          )}
                        </div>
                      </div>

                      {/* Project Expenses Configuration (Admin) */}
                      <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Project Expenses (Optional)</h3>
                        <p className="text-xs text-gray-500">
                          Configure whether this project includes a purchasing budget for expenses (e.g. domain, server, hosting).
                          This is for visibility for PEM and does not change payment or recovery calculations.
                        </p>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expense handling</label>
                          <select
                            value={projectForm.includeProjectExpenses ? 'included' : 'excluded'}
                            onChange={(e) =>
                              setProjectForm(prev => ({
                                ...prev,
                                includeProjectExpenses: e.target.value === 'included'
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="included">Included in project (company will purchase)</option>
                            <option value="excluded">Excluded – client will purchase directly</option>
                          </select>
                        </div>

                        {projectForm.includeProjectExpenses && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-1">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-700">
                                Reserved amount for project expenses
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={projectForm.projectExpenseReservedAmount}
                                onChange={(e) =>
                                  setProjectForm(prev => ({
                                    ...prev,
                                    projectExpenseReservedAmount: e.target.value
                                  }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary text-sm"
                                placeholder="Optional budget for expenses (part of total cost)"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Optional. If set, PEM will see this as the max budget for purchases on this project.
                              </p>
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-700">
                                Expense requirements (optional)
                              </label>
                              <textarea
                                rows={3}
                                value={projectForm.projectExpenseRequirements}
                                onChange={(e) =>
                                  setProjectForm(prev => ({
                                    ...prev,
                                    projectExpenseRequirements: e.target.value
                                  }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary text-sm resize-none"
                                placeholder="Describe expected expenses for this project"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
                          <input
                            type="date"
                            value={projectForm.startDate}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                          />
                          {projectFormErrors.startDate && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.startDate}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Due Date</label>
                          <input
                            type="date"
                            value={projectForm.dueDate}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                          />
                          {projectFormErrors.dueDate && (
                            <p className="mt-1 text-xs text-red-500">{projectFormErrors.dueDate}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Priority</label>
                          <select
                            value={projectForm.priority}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={projectForm.status}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                          >
                            <option value="pending-assignment">Pending Assignment</option>
                            <option value="untouched">Untouched</option>
                            <option value="started">Started</option>
                            <option value="active">Active</option>
                            <option value="on-hold">On Hold</option>
                            <option value="testing">Testing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Project Description</label>
                        <textarea
                          value={projectForm.description}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                          placeholder="Provide an overview of the project scope and deliverables"
                        />
                        {projectFormErrors.description && (
                          <p className="mt-1 text-xs text-red-500">{projectFormErrors.description}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Assign Development Team Members</label>
                        <MultiSelect
                          options={employeeOptions}
                          value={projectForm.assignedTeam}
                          onChange={(value) => setProjectForm(prev => ({ ...prev, assignedTeam: value }))}
                          placeholder="Select development team members"
                          disabled={!employeeOptions.length}
                        />
                        {projectFormErrors.assignedTeam && (
                          <p className="mt-1 text-xs text-red-500">{projectFormErrors.assignedTeam}</p>
                        )}
                        {!employeeOptions.length && !createModalLoading && (
                          <p className="mt-1 text-xs text-amber-600">
                            No active development team employees available for assignment.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Project Attachments</label>
                        <CloudinaryUpload
                          onUploadSuccess={(uploadData) => {
                            const newAttachments = Array.isArray(uploadData) ? uploadData : [uploadData]
                            setProjectForm(prev => ({
                              ...prev,
                              attachments: [
                                ...prev.attachments,
                                ...newAttachments.map(data => ({
                                  id: data.public_id,
                                  name: data.original_filename || data.originalName,
                                  size: data.bytes || data.size,
                                  type: data.format || data.type,
                                  url: data.secure_url,
                                  public_id: data.public_id,
                                  originalName: data.original_filename || data.originalName,
                                  original_filename: data.original_filename || data.originalName,
                                  format: data.format,
                                  bytes: data.bytes,
                                  width: data.width,
                                  height: data.height,
                                  resource_type: data.resource_type || 'auto'
                                }))
                              ]
                            }))
                          }}
                          onUploadError={(error) => {
                            console.error('Upload error:', error)
                            setCreateModalError('Failed to upload file. Please try again.')
                          }}
                          folder="Revra/projects/attachments"
                          maxSize={10 * 1024 * 1024}
                          allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'application/x-rar-compressed']}
                          accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx,.txt,.zip,.rar"
                          placeholder="Click to upload files or drag and drop"
                          showPreview={true}
                          multiple={true}
                        />
                        {projectForm.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {projectForm.attachments.map((att, index) => (
                              <div key={att.id || att.public_id || att._id || `attachment-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="p-1 bg-primary/10 rounded flex-shrink-0">
                                    <FiFileText className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {(att.secure_url || att.url) ? (
                                      <a
                                        href={att.secure_url || att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-primary hover:text-primary-dark hover:underline truncate block"
                                      >
                                        {att.originalName || att.original_filename || att.name || 'Attachment'}
                                      </a>
                                    ) : (
                                      <p className="text-sm font-medium text-gray-900 truncate">{att.originalName || att.original_filename || att.name || 'Attachment'}</p>
                                    )}
                                    <p className="text-xs text-gray-500">{formatFileSize(att.size || att.bytes)}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(att.id || att.public_id || att._id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200 flex-shrink-0 ml-2"
                                >
                                  <FiX className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                    <button
                      type="button"
                      onClick={closeModals}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingProject || createModalLoading}
                      className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingProject 
                        ? (showCreateModal ? 'Creating...' : 'Updating...') 
                        : (showCreateModal ? 'Create Project' : 'Update Project')}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleSave}>
                  {modalType === 'employee' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={employeeFormData.name}
                            onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter employee name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={employeeFormData.email}
                            onChange={(e) => setEmployeeFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                          <input
                            type="text"
                            value={employeeFormData.role}
                            onChange={(e) => setEmployeeFormData(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter role"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                          <select
                            value={employeeFormData.department}
                            onChange={(e) => setEmployeeFormData(prev => ({ ...prev, department: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="">Select Department</option>
                            <option value="full-stack">Full Stack</option>
                            <option value="nodejs">Node.js</option>
                            <option value="web">Web</option>
                            <option value="app">App</option>
                            <option value="sales">Sales</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === 'client' && (
                    <>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                          <input
                            type="text"
                            value={clientFormData.contact}
                            onChange={(e) => setClientFormData(prev => ({ ...prev, contact: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === 'pm' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={pmFormData.name}
                            onChange={(e) => setPmFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter PM name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={pmFormData.email}
                            onChange={(e) => setPmFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeModals}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={isSavingUser}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingUser ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* View Modal */}
        {showViewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                  {modalType.charAt(0).toUpperCase() + modalType.slice(1)} Details
                </h3>
                  <p className="text-gray-600 text-sm mt-1">Complete information about the {modalType}</p>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              {/* Project Details */}
              {modalType === 'project' && selectedItem && (
                <>
                  {/* Project Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedItem.name}</h4>
                        <p className="text-gray-600 font-medium mb-1">{typeof selectedItem.client === 'string' 
                          ? selectedItem.client 
                          : selectedItem.client?.name || 'Unknown Client'}</p>
                        <p className="text-gray-500">PM: {selectedItem.pm || (typeof selectedItem.projectManager === 'object' && selectedItem.projectManager?.name) || (typeof selectedItem.projectManager === 'string' && selectedItem.projectManager) || 'Unassigned'}</p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(selectedItem.status)}`}>
                          {selectedItem.status}
                    </span>
                        <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getPriorityColor(selectedItem.priority)}`}>
                          {selectedItem.priority} Priority
                    </span>
                  </div>
              </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-blue-600 font-medium mb-1">Progress</div>
                        <div className="text-lg font-bold text-blue-800">{(selectedItem.progress !== null && selectedItem.progress !== undefined) ? selectedItem.progress : (selectedItem.status === 'completed' ? 100 : 0)}%</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm text-green-600 font-medium">Total Cost</div>
                          <div className="flex gap-1">
                            <button
                              onClick={handleEditCost}
                              className="text-xs text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                              title="Edit Cost"
                            >
                              <FiEdit3 className="h-3 w-3" />
                            </button>
                            {(selectedItem.costHistory && selectedItem.costHistory.length > 0) && (
                              <button
                                onClick={handleViewCostHistory}
                                className="text-xs text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded"
                                title="View Cost History"
                              >
                                <FiActivity className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-green-700">{formatCurrency(selectedItem.financialDetails?.totalCost || selectedItem.budget || 0)}</div>
                        {selectedItem.costHistory && selectedItem.costHistory.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Base: {formatCurrency(getBaseCost(selectedItem))}
                          </div>
                        )}
                        {projectFinancialSummary && (
                          <div className="text-xs text-gray-500 mt-2 space-y-1">
                            <div>Advance received: {formatCurrency(projectFinancialSummary.advance)}</div>
                            <div>Outstanding balance: {formatCurrency(projectFinancialSummary.outstanding)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Installments */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                          <FiCalendar className="h-5 w-5 mr-2 text-emerald-600" />
                          Recovery & Installment Overview
                        </h5>
                        <p className="text-sm text-gray-500">
                          Admin can record manual recovery payments here. Client installments are auto-calculated in the wallet (30% / 30% / 40%) and adjusted as payments are received.
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleAddManualInstallment}
                          className="inline-flex items-center px-3 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          <FiPlus className="h-4 w-4 mr-1" />
                          Add Recovery Payment
                        </button>
                      </div>
                    </div>
                    {(() => {
                      const financialSummary = projectFinancialSummary || getFinancialSummary(selectedItem)
                      const summaryCards = [
                        {
                          title: 'Advance Received',
                          value: financialSummary.advance,
                          description: 'Upfront amount received',
                          gradient: 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50',
                          border: 'border-emerald-200',
                          textValue: 'text-emerald-700',
                          textLabel: 'text-emerald-600'
                        },
                        {
                          title: 'Total Scheduled',
                          value: financialSummary.scheduled,
                          description: 'Sum of all installments',
                          gradient: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50',
                          border: 'border-gray-200',
                          textValue: 'text-gray-900',
                          textLabel: 'text-gray-600'
                        },
                        {
                          title: 'Collected',
                          value: financialSummary.totalCollected,
                          description: `Advance ${formatCurrency(financialSummary.advance)} + Installments ${formatCurrency(financialSummary.installmentCollected)}`,
                          gradient: 'bg-gradient-to-br from-green-50 via-green-100 to-green-50',
                          border: 'border-green-200',
                          textValue: 'text-green-700',
                          textLabel: 'text-green-600'
                        },
                        {
                          title: 'Pending Installments',
                          value: financialSummary.pendingInstallments,
                          description: 'Remaining scheduled amount',
                          gradient: 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50',
                          border: 'border-amber-200',
                          textValue: 'text-amber-700',
                          textLabel: 'text-amber-600'
                        },
                        {
                          title: 'Outstanding Balance',
                          value: financialSummary.outstanding,
                          description: 'Total cost minus collected',
                          gradient: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50',
                          border: 'border-orange-200',
                          textValue: 'text-orange-700',
                          textLabel: 'text-orange-600'
                        }
                      ]

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
                          {summaryCards.map((card, idx) => (
                            <div
                              key={`financial-summary-${idx}`}
                              className={`${card.gradient} border ${card.border} rounded-xl px-3 py-2.5 shadow-sm`}
                            >
                              <p className={`text-[10px] font-semibold uppercase tracking-wide ${card.textLabel} mb-1`}>
                                {card.title}
                              </p>
                              <p className={`text-xl font-bold ${card.textValue}`}>
                                {formatCurrency(card.value)}
                              </p>
                              <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                                {card.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    {selectedItem.installmentPlan?.length > 0 ? (
                      <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">#</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Info</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {getSortedInstallments(selectedItem).map((installment, index) => {
                              const statusMeta = getInstallmentStatusMeta(installment)
                              const installmentId = installment._id || installment.id || `installment-${index}`
                              const isPaid = installment.status === 'paid'
                              return (
                                <tr key={installmentId}>
                                  <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                  <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(installment.amount || 0)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{installment.dueDate ? formatDate(installment.dueDate) : 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{installment.notes || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-400 text-right">
                                    Auto-generated or legacy installment (read-only)
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
                        No installment schedule defined for this project. The client wallet will still show auto-calculated 30% / 30% / 40% installments based on the total cost.
                      </div>
                    )}
                  </div>

                  {/* Project Information */}
                  <div className="mb-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiFolder className="h-5 w-5 mr-2 text-blue-600" />
                      Project Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Start Date</div>
                        <div className="text-base font-semibold text-gray-900">{formatDate(selectedItem.startDate || selectedItem.createdAt)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Due Date</div>
                        <div className="text-base font-semibold text-gray-900">{formatDate(selectedItem.dueDate)}</div>
                      </div>
                      {selectedItem.status === 'completed' && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 font-medium mb-1">Duration</div>
                          <div className="text-base font-semibold text-gray-900">
                            {selectedItem.duration !== null && selectedItem.duration !== undefined 
                              ? `${selectedItem.duration} days`
                              : selectedItem.createdAt && (selectedItem.completedDate || selectedItem.updatedAt)
                              ? `${Math.ceil((new Date(selectedItem.completedDate || selectedItem.updatedAt) - new Date(selectedItem.createdAt)) / (1000 * 60 * 60 * 24))} days`
                              : 'N/A'}
                          </div>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Team Size</div>
                        <div className="text-base font-semibold text-gray-900">
                          {(selectedItem.teamSize !== null && selectedItem.teamSize !== undefined) 
                            ? `${selectedItem.teamSize} members`
                            : selectedItem.assignedTeam?.length 
                            ? `${selectedItem.assignedTeam.length} members`
                            : '0 members'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Project Manager</div>
                        <div className="text-base font-semibold text-gray-900">
                          {selectedItem.pm || (typeof selectedItem.projectManager === 'object' && selectedItem.projectManager?.name) || (typeof selectedItem.projectManager === 'string' && selectedItem.projectManager) || 'Unassigned'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Information */}
                  {selectedItem.clientContact && (
                    <div className="mb-6">
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FiUser className="h-5 w-5 mr-2 text-blue-600" />
                        Client Information
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 font-medium mb-1">Client Name</div>
                          <div className="text-base font-semibold text-gray-900">{typeof selectedItem.client === 'string' 
                            ? selectedItem.client 
                            : selectedItem.client?.name || 'Unknown Client'}</div>
                        </div>
                        {selectedItem.clientContact && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 font-medium mb-1">Contact Person</div>
                            <div className="text-base font-semibold text-gray-900">{selectedItem.clientContact}</div>
                          </div>
                        )}
                        {(selectedItem.clientPhone || (typeof selectedItem.client === 'object' && selectedItem.client?.phoneNumber)) && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 font-medium mb-1">Phone Number</div>
                            <div className="text-base font-semibold text-gray-900">{typeof selectedItem.client === 'object' && selectedItem.client?.phoneNumber 
                              ? selectedItem.client.phoneNumber 
                              : selectedItem.clientPhone}</div>
                          </div>
                        )}
                        {(selectedItem.clientEmail || (typeof selectedItem.client === 'object' && selectedItem.client?.email)) && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 font-medium mb-1">Email Address</div>
                            <div className="text-base font-semibold text-gray-900">{typeof selectedItem.client === 'object' && selectedItem.client?.email 
                              ? selectedItem.client.email 
                              : selectedItem.clientEmail}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {selectedItem.requirements && (
                    <div className="mb-6">
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FiTarget className="h-5 w-5 mr-2 text-purple-600" />
                        Project Requirements
                      </h5>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-800 leading-relaxed">{selectedItem.requirements}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Employee Details */}
              {modalType === 'employee' && selectedItem && (
                <>
                  {/* Employee Overview */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                          {selectedItem.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedItem.name}</h4>
                          <p className="text-gray-600 font-medium mb-1">{selectedItem.role}</p>
                          <p className="text-gray-500">{selectedItem.department}</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(selectedItem.status)}`}>
                        {selectedItem.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-green-600 font-medium mb-1">Performance</div>
                        <div className="text-lg font-bold text-green-800">{selectedItem.performance}%</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-blue-600 font-medium mb-1">Projects</div>
                        <div className="text-lg font-bold text-blue-800">{selectedItem.projects}</div>
                      </div>
                    </div>
                  </div>

                  {/* Employee Information */}
                  <div className="mb-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiUsers className="h-5 w-5 mr-2 text-green-600" />
                      Employee Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Email</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.email}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Department</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.department}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Join Date</div>
                        <div className="text-base font-semibold text-gray-900">{formatDate(selectedItem.joinDate)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Active Tasks</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.tasks}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Client Details */}
              {modalType === 'client' && selectedItem && (
                <>
                  {/* Client Overview */}
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 mb-6 border border-teal-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedItem.name}</h4>
                        <p className="text-gray-600 font-medium mb-1">{selectedItem.contact}</p>
                        <p className="text-gray-500">{selectedItem.email}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(selectedItem.status)}`}>
                        {selectedItem.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-teal-600 font-medium mb-1">Total Spent</div>
                        <div className="text-lg font-bold text-teal-800">{formatCurrency(selectedItem.totalSpent)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-blue-600 font-medium mb-1">Projects</div>
                        <div className="text-lg font-bold text-blue-800">{selectedItem.projects}</div>
                      </div>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div className="mb-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiHome className="h-5 w-5 mr-2 text-teal-600" />
                      Client Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Company Name</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.name}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Contact Person</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.contact}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Email</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.email}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Join Date</div>
                        <div className="text-base font-semibold text-gray-900">{formatDate(selectedItem.joinDate)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Last Activity</div>
                        <div className="text-base font-semibold text-gray-900">{formatDate(selectedItem.lastActive)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PM Details */}
              {modalType === 'pm' && selectedItem && (
                <>
                  {/* PM Overview */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                          {selectedItem.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedItem.name}</h4>
                          <p className="text-gray-600 font-medium mb-1">Project Manager</p>
                          <p className="text-gray-500">{selectedItem.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(selectedItem.status)}`}>
                        {selectedItem.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-indigo-600 font-medium mb-1">Performance</div>
                        <div className="text-lg font-bold text-indigo-800">{selectedItem.performance}%</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-sm text-purple-600 font-medium mb-1">Completion Rate</div>
                        <div className="text-lg font-bold text-purple-800">{selectedItem.completionRate}%</div>
                      </div>
                    </div>
                  </div>

                  {/* PM Information */}
                  <div className="mb-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiUser className="h-5 w-5 mr-2 text-indigo-600" />
                      Manager Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Email</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.email}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Join Date</div>
                        <div className="text-base font-semibold text-gray-900">{formatDate(selectedItem.joinDate)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Active Projects</div>
                        <div className="text-base font-semibold text-gray-900">{selectedItem.projects}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Team Size</div>
                        <div className="text-base font-semibold text-gray-900">
                          {(selectedItem.teamSize !== null && selectedItem.teamSize !== undefined) 
                            ? `${selectedItem.teamSize} members`
                            : selectedItem.assignedTeam?.length 
                            ? `${selectedItem.assignedTeam.length} members`
                            : '0 members'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setShowEditModal(true)
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold flex items-center space-x-2"
                >
                  <FiEdit3 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Milestones & Tasks Modal - Nested view */}
        {showMilestoneTasksModal && milestoneTasksProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowMilestoneTasksModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiTarget className="h-5 w-5 text-indigo-600" />
                    Milestones & Tasks
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">{milestoneTasksProject.name}</p>
                </div>
                <button
                  onClick={() => setShowMilestoneTasksModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {milestoneTasksLoading && milestoneTasksData.milestones.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loading size="md" />
                  </div>
                ) : milestoneTasksData.milestones.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FiTarget className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No milestones yet for this project.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {milestoneTasksData.milestones.map((milestone) => (
                      <div key={milestone._id} className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                        <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-500">#{milestone.sequence || '-'}</span>
                            <span className="font-semibold text-gray-900">{milestone.title}</span>
                            <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${getStatusColor(milestone.status)}`}>
                              {milestone.status}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleMilestoneTasks(milestone._id)}
                            disabled={milestone.taskCount === 0}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-100 text-violet-700 hover:bg-violet-200 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Click to view tasks"
                          >
                            <FiCheckSquare className="h-3.5 w-3.5" />
                            {milestone.taskCount ?? 0} tasks
                            {expandedMilestoneId === milestone._id ? (
                              <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {expandedMilestoneId === milestone._id && (
                          <div className="border-t border-gray-200 bg-white">
                            {loadingMilestoneId === milestone._id ? (
                              <div className="p-4 flex justify-center">
                                <Loading size="sm" />
                              </div>
                            ) : (milestoneTasksData.tasksByMilestone[milestone._id] || []).length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">No tasks in this milestone.</div>
                            ) : (
                              <ul className="divide-y divide-gray-100">
                                {(milestoneTasksData.tasksByMilestone[milestone._id] || []).map((task) => (
                                  <li key={task._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getStatusColor(task.status)}`}>
                                        {task.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      {task.priority && (
                                        <span className="px-1.5 py-0.5 bg-gray-100 rounded">{task.priority}</span>
                                      )}
                                      {task.dueDate && <span>{formatDate(task.dueDate)}</span>}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* PM Assignment Modal */}
        {showPMAssignmentModal && selectedPendingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-5 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assign PM</h3>
                  <p className="text-gray-600 text-xs mt-1">Select a project manager</p>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              {/* Project Info */}
              <div className="bg-orange-50 rounded-lg p-3 mb-4 border border-orange-200">
                <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">{selectedPendingProject.name}</h4>
                <div className="space-y-0.5 text-xs text-gray-600">
                  <div><span className="font-medium">Client:</span> {typeof selectedPendingProject.client === 'string' 
                    ? selectedPendingProject.client 
                    : selectedPendingProject.client?.name || 'Unknown Client'}</div>
                  <div><span className="font-medium">Total Cost:</span> {formatCurrency(selectedPendingProject.financialDetails?.totalCost || selectedPendingProject.budget || 0)}</div>
                  <div><span className="font-medium">Priority:</span> <span className="capitalize">{selectedPendingProject.priority}</span></div>
                </div>
              </div>

              {/* PM Selection Combobox */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Project Manager</label>
                <Combobox
                  options={getPMOptions()}
                  value={selectedPM}
                  onChange={(value) => setSelectedPM(value)}
                  placeholder="Choose a PM..."
                  className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Selected PM Info */}
              {selectedPM && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  {(() => {
                    const pm = projectManagers.find(p => p.id.toString() === selectedPM)
                    return pm ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                          {pm.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{pm.name}</div>
                          <div className="text-xs text-gray-600">Projects: {pm.projects} | Performance: {pm.performance}%</div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={closeModals}
                  className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPMAssignment}
                  disabled={!selectedPM}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign PM
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Pending Project Details Modal */}
        {showPendingDetailsModal && selectedPendingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Project Details</h3>
                  <p className="text-gray-600 text-sm mt-1">Complete information about the pending project</p>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Project Overview */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 mb-6 border border-orange-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedPendingProject.name}</h4>
                    <p className="text-gray-600 font-medium mb-1">{typeof selectedPendingProject.client === 'string' 
                      ? selectedPendingProject.client 
                      : selectedPendingProject.client?.name || 'Unknown Client'}</p>
                    <p className="text-gray-500">{selectedPendingProject.clientContact}</p>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getPriorityColor(selectedPendingProject.priority)}`}>
                    {selectedPendingProject.priority} Priority
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-green-600 font-medium mb-1">Total Cost</div>
                    <div className="text-lg font-bold text-green-700">{formatCurrency(selectedPendingProject.financialDetails?.totalCost || selectedPendingProject.budget || 0)}</div>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiUser className="h-5 w-5 mr-2 text-blue-600" />
                  Client Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 font-medium mb-1">Client Name</div>
                    <div className="text-base font-semibold text-gray-900">{typeof selectedPendingProject.client === 'string' 
                      ? selectedPendingProject.client 
                      : selectedPendingProject.client?.name || 'Unknown Client'}</div>
                  </div>
                  {selectedPendingProject.clientContact && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 font-medium mb-1">Contact Person</div>
                      <div className="text-base font-semibold text-gray-900">{selectedPendingProject.clientContact}</div>
                    </div>
                  )}
                  {(selectedPendingProject.clientPhone || (typeof selectedPendingProject.client === 'object' && selectedPendingProject.client?.phoneNumber)) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 font-medium mb-1">Phone Number</div>
                      <div className="text-base font-semibold text-gray-900">{typeof selectedPendingProject.client === 'object' && selectedPendingProject.client?.phoneNumber 
                        ? selectedPendingProject.client.phoneNumber 
                        : selectedPendingProject.clientPhone}</div>
                    </div>
                  )}
                  {(selectedPendingProject.clientEmail || (typeof selectedPendingProject.client === 'object' && selectedPendingProject.client?.email)) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 font-medium mb-1">Email Address</div>
                      <div className="text-base font-semibold text-gray-900">{typeof selectedPendingProject.client === 'object' && selectedPendingProject.client?.email 
                        ? selectedPendingProject.client.email 
                        : selectedPendingProject.clientEmail}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Requirements */}
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiTarget className="h-5 w-5 mr-2 text-purple-600" />
                  Project Requirements
                </h5>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-800 leading-relaxed">{selectedPendingProject.requirements}</div>
                </div>
              </div>

              {/* Submission Information */}
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiClock className="h-5 w-5 mr-2 text-orange-600" />
                  Submission Details
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 font-medium mb-1">Submitted By</div>
                    <div className="text-base font-semibold text-gray-900">{typeof selectedPendingProject.submittedBy === 'string' 
                      ? selectedPendingProject.submittedBy.split(' - ')[1] || selectedPendingProject.submittedBy
                      : selectedPendingProject.submittedBy?.name || 'Unknown'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 font-medium mb-1">Submission Date</div>
                    <div className="text-base font-semibold text-gray-900">{formatDate(selectedPendingProject.submittedDate || selectedPendingProject.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPendingDetailsModal(false)
                    setShowPMAssignmentModal(true)
                  }}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center space-x-2"
                >
                  <FiUser className="h-4 w-4" />
                  <span>Assign PM</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Cost Edit Modal */}
        {showCostEditModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Project Cost</h3>
                  <p className="text-gray-600 text-sm mt-1">Update the project cost</p>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {costEditError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {costEditError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Cost</label>
                  <div className="bg-gray-50 rounded-lg p-3 text-lg font-bold text-gray-700">
                    {formatCurrency(selectedItem.financialDetails?.totalCost || selectedItem.budget || 0)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Cost (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={costEditData.newCost}
                    onChange={(e) => setCostEditData({ ...costEditData, newCost: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new cost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Change *</label>
                  <textarea
                    value={costEditData.reason}
                    onChange={(e) => setCostEditData({ ...costEditData, reason: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Explain why the cost is being changed..."
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCost}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  >
                    Update Cost
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Cost History Modal */}
        {showCostHistoryModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Cost History</h3>
                  <p className="text-gray-600 text-sm mt-1">Project: {selectedItem.name}</p>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Base Cost */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-600 font-medium">Base Cost</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(getBaseCost(selectedItem))}</div>
                    <div className="text-xs text-blue-600 mt-1">Initial cost when project was created</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-blue-600 font-medium">Current Cost</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(selectedItem.financialDetails?.totalCost || selectedItem.budget || 0)}</div>
                  </div>
                </div>
              </div>

              {/* Cost History List */}
              {selectedItem.costHistory && selectedItem.costHistory.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Cost Changes</h4>
                  {selectedItem.costHistory.map((entry, index) => {
                    const changeAmount = entry.newCost - entry.previousCost
                    const isIncrease = changeAmount > 0
                    const changedBy = typeof entry.changedBy === 'object' ? entry.changedBy?.name : 'Admin'
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isIncrease ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {isIncrease ? <FiArrowUp className="h-3 w-3 mr-1" /> : <FiArrowDown className="h-3 w-3 mr-1" />}
                                {isIncrease ? 'Increase' : 'Decrease'}
                              </span>
                              <span className="text-xs text-gray-500">{formatDate(entry.changedAt)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-2">
                              <div>
                                <div className="text-xs text-gray-500">Previous Cost</div>
                                <div className="text-sm font-semibold text-gray-700">{formatCurrency(entry.previousCost)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">New Cost</div>
                                <div className="text-sm font-semibold text-gray-700">{formatCurrency(entry.newCost)}</div>
                              </div>
                            </div>
                            <div className="mb-2">
                              <div className="text-xs text-gray-500">Change Amount</div>
                              <div className={`text-sm font-bold ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                                {isIncrease ? '+' : ''}{formatCurrency(Math.abs(changeAmount))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Reason</div>
                              <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">{entry.reason}</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          Changed by: {changedBy}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiActivity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No cost changes recorded yet</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Installment Modal */}
        {showInstallmentModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {installmentToEdit ? 'Edit Installment' : 'Add Installment'}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {installmentToEdit ? 'Update the installment details' : 'Create a new installment for this project'}
                  </p>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {installmentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {installmentError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={installmentFormData.amount}
                    onChange={(e) =>
                      setInstallmentFormData((prev) => ({
                        ...prev,
                        amount: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter installment amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={installmentFormData.dueDate}
                    onChange={(e) =>
                      setInstallmentFormData((prev) => ({
                        ...prev,
                        dueDate: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={installmentFormData.notes}
                    onChange={(e) =>
                      setInstallmentFormData((prev) => ({
                        ...prev,
                        notes: e.target.value
                      }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder="Optional notes about this installment"
                  />
                </div>

                {installmentToEdit && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={installmentFormData.status}
                      onChange={(e) =>
                        setInstallmentFormData((prev) => ({
                          ...prev,
                          status: e.target.value
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isSavingInstallment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInstallment}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold disabled:opacity-70"
                    disabled={isSavingInstallment}
                  >
                    {isSavingInstallment ? 'Saving...' : installmentToEdit ? 'Update Installment' : 'Add Installment'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Add Recovery Payment Modal (Admin) */}
        {showManualInstallmentModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-2 md:p-4 overflow-y-auto"
            onClick={() => {
              setShowManualInstallmentModal(false)
              setManualInstallmentFormData({
                account: '',
                amount: '',
                dueDate: '',
                paymentMethod: 'bank_transfer',
                referenceId: '',
                notes: ''
              })
              setManualInstallmentError('')
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-4 md:p-6 max-w-md w-full mx-2 md:mx-4 max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Add Recovery Payment
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Record a manual recovery amount received from the client with account and date selection.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowManualInstallmentModal(false)
                    setManualInstallmentFormData({
                      account: '',
                      amount: '',
                      dueDate: '',
                paymentMethod: 'bank_transfer',
                referenceId: '',
                      notes: ''
                    })
                    setManualInstallmentError('')
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {manualInstallmentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {manualInstallmentError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={manualInstallmentFormData.account}
                    onChange={(e) =>
                      setManualInstallmentFormData((prev) => ({
                        ...prev,
                        account: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    disabled={accountsLoading}
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account._id || account.id} value={account._id || account.id}>
                        {account.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualInstallmentFormData.amount}
                    onChange={(e) =>
                      setManualInstallmentFormData((prev) => ({
                        ...prev,
                        amount: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter installment amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={manualInstallmentFormData.dueDate}
                    onChange={(e) =>
                      setManualInstallmentFormData((prev) => ({
                        ...prev,
                        dueDate: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={manualInstallmentFormData.paymentMethod}
                    onChange={(e) =>
                      setManualInstallmentFormData((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reference ID
                  </label>
                  <input
                    type="text"
                    value={manualInstallmentFormData.referenceId}
                    onChange={(e) =>
                      setManualInstallmentFormData((prev) => ({
                        ...prev,
                        referenceId: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional transaction / UTR reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={manualInstallmentFormData.notes}
                    onChange={(e) =>
                      setManualInstallmentFormData((prev) => ({
                        ...prev,
                        notes: e.target.value
                      }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes about this manually"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowManualInstallmentModal(false)
                      setManualInstallmentFormData({
                        account: '',
                        amount: '',
                        dueDate: '',
                    paymentMethod: 'bank_transfer',
                    referenceId: '',
                        notes: ''
                      })
                      setManualInstallmentError('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isSavingManualInstallment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveManualInstallment}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-70"
                    disabled={isSavingManualInstallment}
                  >
                  {isSavingManualInstallment ? 'Saving...' : 'Add Recovery Payment'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Installment Confirmation Modal */}
        {showDeleteInstallmentModal && selectedItem && installmentToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowDeleteInstallmentModal(false)
              setInstallmentToDelete(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Delete Installment</h3>
                    <p className="text-red-100 text-sm">
                      This will permanently remove the selected installment.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDeleteInstallmentModal(false)
                      setInstallmentToDelete(null)
                    }}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    Are you sure you want to delete this installment of{' '}
                    <span className="font-semibold text-red-900">
                      {formatCurrency(installmentToDelete.amount || 0)}
                    </span>{' '}
                    due on{' '}
                    <span className="font-semibold text-red-900">
                      {installmentToDelete.dueDate ? formatDate(installmentToDelete.dueDate) : 'N/A'}
                    </span>
                    ?
                  </p>
                </div>

                {installmentToDelete.notes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{installmentToDelete.notes}</p>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Reminder</p>
                  <p className="text-sm text-gray-600">
                    Removing this installment reduces the scheduled amount. Make sure your remaining
                    installments still align with the project total cost.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteInstallmentModal(false)
                      setInstallmentToDelete(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteInstallment}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Delete Installment
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Range Picker Modal */}
      {showDateRangePicker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDateRangePicker(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Date Range</h3>
              <button
                onClick={() => setShowDateRangePicker(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  max={tempEndDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  min={tempStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    if (tempStartDate && tempEndDate) {
                      setStartDate(tempStartDate)
                      setEndDate(tempEndDate)
                      setDateFilterType('custom')
                      setShowDateRangePicker(false)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Apply Filter
                </button>
                <button
                  onClick={() => {
                    setTempStartDate('')
                    setTempEndDate('')
                    setStartDate('')
                    setEndDate('')
                    setDateFilterType('all')
                    setShowDateRangePicker(false)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default Admin_project_management
