import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import Loading from '../../../components/ui/loading'
import { adminFinanceService } from '../admin-services/adminFinanceService'
import { adminProjectExpenseCategoryService } from '../admin-services/adminProjectExpenseCategoryService'
import { adminProjectCredentialService } from '../admin-services/adminProjectCredentialService'
import { useToast } from '../../../contexts/ToastContext'
import { adminStorage } from '../admin-services/baseApiService'
import { 
  FiTrendingUp,
  FiTrendingDown,
  FiFileText,
  FiSearch,
  FiFilter,
  FiPlus,
  FiEdit,
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiBarChart,
  FiPieChart,
  FiX,
  FiCalendar,
  FiTag,
  FiKey,
  FiLock,
  FiGlobe,
  FiServer,
  FiBook
} from 'react-icons/fi'
import { IndianRupee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

const Admin_project_expenses_management = () => {
  const { toast } = useToast()
  
  // Get admin role (treat PEM like admin for this page)
  const adminData = adminStorage.get()
  const isAdmin = adminData?.role === 'admin' || adminData?.role === 'pem'
  
  // State management
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [error, setError] = useState(null)
  
  // Project Expenses state
  const [projectExpenses, setProjectExpenses] = useState([])
  const [projectExpensesLoading, setProjectExpensesLoading] = useState(false)
  const [projectExpensesTotal, setProjectExpensesTotal] = useState(0)
  const [projectExpensesPages, setProjectExpensesPages] = useState(1)
  
  // Form data
  const [projectExpenseFormData, setProjectExpenseFormData] = useState({
    projectId: '',
    category: '',
    amount: '',
    vendor: '',
    paidBy: 'Revra',
    paymentMethod: 'Bank Transfer',
    expenseDate: new Date().toISOString().split('T')[0],
    description: ''
  })
  
  // Modal states
  const [showProjectExpenseModal, setShowProjectExpenseModal] = useState(false)
  const [projectExpenseModalMode, setProjectExpenseModalMode] = useState('create') // 'create' or 'edit' or 'view'
  const [selectedProjectExpense, setSelectedProjectExpense] = useState(null)
  const [showDeleteProjectExpenseModal, setShowDeleteProjectExpenseModal] = useState(false)
  const [projectExpenseToDelete, setProjectExpenseToDelete] = useState(null)
  const [projectsList, setProjectsList] = useState([])
  
  // Category management state
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false)
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: ''
  })
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [updatingCategory, setUpdatingCategory] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [activeSection, setActiveSection] = useState('projects') // 'projects', 'expenses', 'categories', or 'credentials'
  const [projectStatusFilter, setProjectStatusFilter] = useState('all') // for Projects tab
  const [projectInclusionFilter, setProjectInclusionFilter] = useState('all') // for Projects tab
  const [projectSearch, setProjectSearch] = useState('') // for Projects tab
  const [allProjectsForPem, setAllProjectsForPem] = useState([]) // full projects list for Projects tab
  
  // Credentials management state
  const [credentials, setCredentials] = useState([])
  const [projectsWithExpenses, setProjectsWithExpenses] = useState([])
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [showCredentialModal, setShowCredentialModal] = useState(false)
  const [showCredentialEditModal, setShowCredentialEditModal] = useState(false)
  const [showCredentialDeleteModal, setShowCredentialDeleteModal] = useState(false)
  const [showCredentialViewModal, setShowCredentialViewModal] = useState(false)
  const [viewingCredential, setViewingCredential] = useState(null)
  const [selectedCredential, setSelectedCredential] = useState(null)
  const [credentialFormData, setCredentialFormData] = useState({
    projectId: '',
    credentials: ''
  })
  const [creatingCredential, setCreatingCredential] = useState(false)
  const [updatingCredential, setUpdatingCredential] = useState(false)
  const [deletingCredential, setDeletingCredential] = useState(false)
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all')
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [formProjectSearchTerm, setFormProjectSearchTerm] = useState('')
  const [showExpenseProjectDropdown, setShowExpenseProjectDropdown] = useState(false)
  const [expenseProjectSearchTerm, setExpenseProjectSearchTerm] = useState('')
  const projectDropdownRef = useRef(null)
  const expenseProjectDropdownRef = useRef(null)
  const [expenseInclusionFilter, setExpenseInclusionFilter] = useState('all') // all | included | excluded

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalExpenses: 0,
    totalExpensesIncluded: 0,
    totalExpensesExcluded: 0,
    totalProjects: 0,
    categoryBreakdown: {},
    monthlyExpenses: 0,
    monthlyExpensesIncluded: 0,
    monthlyExpensesExcluded: 0,
    todayExpenses: 0,
    todayExpensesIncluded: 0,
    todayExpensesExcluded: 0
  })
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [projectViewModalProject, setProjectViewModalProject] = useState(null)
  const [showPemGuideSheet, setShowPemGuideSheet] = useState(false)

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Fetch project expenses
  const fetchProjectExpenses = async () => {
    try {
      setProjectExpensesLoading(true)
      setError(null)
      
      const params = {
        page: currentPage,
        limit: itemsPerPage
      }
      
      // Add filters
      if (selectedFilter !== 'all') {
        params.category = selectedFilter
      }
      if (searchTerm) {
        params.search = searchTerm
      }
      
      const response = await adminFinanceService.getProjectExpenses(params)
      
      if (response && response.success) {
        const expensesData = response.data || []
        setProjectExpenses(expensesData)
        setProjectExpensesTotal(response.total || expensesData.length || 0)
        setProjectExpensesPages(response.pages || Math.ceil((response.total || expensesData.length) / parseInt(itemsPerPage)) || 1)
      } else {
        console.error('Failed to fetch project expenses - response:', response)
        setProjectExpenses([])
        setProjectExpensesTotal(0)
        setProjectExpensesPages(1)
      }
    } catch (err) {
      console.error('Error fetching project expenses:', err)
      setError(err.message || 'Failed to fetch project expenses')
      toast.error('Failed to load project expenses')
    } finally {
      setProjectExpensesLoading(false)
      setLoading(false)
    }
  }

  // Fetch project expense statistics
  const fetchStatistics = async () => {
    try {
      setStatisticsLoading(true)
      const response = await adminFinanceService.getProjectExpenseStats()
      
      if (response && response.success && response.data) {
        setStatistics({
          totalExpenses: response.data.totalExpenses || 0,
          totalExpensesIncluded: response.data.totalExpensesIncluded ?? response.data.totalExpenses,
          totalExpensesExcluded: response.data.totalExpensesExcluded ?? 0,
          totalProjects: response.data.totalProjects || 0,
          categoryBreakdown: response.data.categoryBreakdown || {},
          monthlyExpenses: response.data.monthlyExpenses || 0,
          monthlyExpensesIncluded: response.data.monthlyExpensesIncluded ?? response.data.monthlyExpenses,
          monthlyExpensesExcluded: response.data.monthlyExpensesExcluded ?? 0,
          todayExpenses: response.data.todayExpenses || 0,
          todayExpensesIncluded: response.data.todayExpensesIncluded ?? response.data.todayExpenses,
          todayExpensesExcluded: response.data.todayExpensesExcluded ?? 0
        })
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
    } finally {
      setStatisticsLoading(false)
    }
  }

  // Fetch projects list for dropdown
  const fetchProjectsList = async () => {
    try {
      // Import adminProjectService dynamically to avoid circular dependencies
      const { adminProjectService } = await import('../admin-services/adminProjectService')
      
      // Fetch all active projects (including those without PM) for expense tracking
      // We'll fetch active projects without the hasPM filter by calling the API directly
      const queryParams = new URLSearchParams()
      queryParams.append('status', 'active')
      queryParams.append('limit', '1000')
      // Note: We don't include hasPM parameter to get ALL active projects
      
      // Use direct API call to avoid PM filter that getActiveProjects applies
      const { apiRequest } = await import('../admin-services/baseApiService')
      const response = await apiRequest(`/admin/projects?${queryParams.toString()}`)
      
      if (response && response.success && response.data) {
        // Sort projects by name for better UX
        const sortedProjects = [...response.data].sort((a, b) => {
          const nameA = (a.name || '').toLowerCase()
          const nameB = (b.name || '').toLowerCase()
          return nameA.localeCompare(nameB)
        })
        
        setProjectsList(sortedProjects.map(project => {
          // Extract client name - prefer companyName, then name
          let clientName = null
          if (project.client) {
            if (typeof project.client === 'object') {
              clientName = project.client.companyName || project.client.name || null
            } else if (typeof project.client === 'string') {
              clientName = project.client
            }
          }
          
          return {
            value: project._id || project.id,
            label: project.name || 'Unnamed Project',
            client: project.client || null,
            clientName: clientName,
            expenseConfig: project.expenseConfig || null
          }
        }))
      } else {
        // Fallback to getActiveProjects if direct API fails
        const fallbackResponse = await adminProjectService.getActiveProjects({ limit: 1000 })
        if (fallbackResponse.success && fallbackResponse.data) {
          const sortedProjects = [...fallbackResponse.data].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase()
            const nameB = (b.name || '').toLowerCase()
            return nameA.localeCompare(nameB)
          })
          
          setProjectsList(sortedProjects.map(project => {
            let clientName = null
            if (project.client) {
              if (typeof project.client === 'object') {
                clientName = project.client.companyName || project.client.name || null
              } else if (typeof project.client === 'string') {
                clientName = project.client
              }
            }
            
            return {
              value: project._id || project.id,
              label: project.name || 'Unnamed Project',
              client: project.client || null,
              clientName: clientName,
              expenseConfig: project.expenseConfig || null
            }
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      toast.error('Failed to load projects')
    }
  }

  // Fetch full projects list for Projects tab (all projects)
  const fetchAllProjectsForPem = async () => {
    try {
      const { apiRequest } = await import('../admin-services/baseApiService')

      // Fetch all projects with a reasonably high limit; can be extended with pagination later if needed
      const queryParams = new URLSearchParams()
      queryParams.append('limit', '1000')

      const response = await apiRequest(`/admin/projects?${queryParams.toString()}`)

      if (response && response.success && Array.isArray(response.data)) {
        setAllProjectsForPem(response.data)
      } else {
        console.error('Failed to fetch all projects for PEM:', response)
        setAllProjectsForPem([])
      }
    } catch (err) {
      console.error('Error fetching all projects for PEM:', err)
      // Do not toast here every time to avoid noise; main flows still work without this list
      setAllProjectsForPem([])
    }
  }

  // Helper function to extract project ID from expense object
  const extractProjectId = (expense) => {
    if (!expense) return ''
    
    // Try project._id first
    if (expense.project) {
      if (typeof expense.project === 'object') {
        return expense.project._id?.toString() || expense.project.id?.toString() || ''
      }
      return expense.project.toString()
    }
    
    // Try projectId field
    if (expense.projectId) {
      return typeof expense.projectId === 'object' 
        ? expense.projectId.toString() 
        : expense.projectId.toString()
    }
    
    return ''
  }

  // Computed summaries: reserved, spent, available per project (for display only)
  const projectExpenseSummaries = useMemo(() => {
    const summaries = {}

    // Seed summaries from projectsList (used by Expenses tab dropdown)
    projectsList.forEach((p) => {
      const id = p?.value ? String(p.value) : ''
      if (!id) return
      const cfg = p.expenseConfig || {}
      const reserved = Number(cfg.reservedAmount || 0) || 0
      summaries[id] = {
        reservedAmount: reserved,
        spentAmount: 0,
        availableBalance: reserved,
        hasBudget: reserved > 0
      }
    })

    // Also seed from allProjectsForPem (Projects tab - may include inactive projects)
    allProjectsForPem.forEach((project) => {
      const id = project?._id || project?.id
      if (!id) return
      const key = String(id)
      const cfg = project.expenseConfig || {}
      const reserved = Number(cfg.reservedAmount || 0) || 0
      if (!summaries[key]) {
        summaries[key] = {
          reservedAmount: reserved,
          spentAmount: 0,
          availableBalance: reserved,
          hasBudget: reserved > 0
        }
      } else if (reserved > 0 && summaries[key].reservedAmount === 0) {
        // Prefer non-zero reserved from full projects list when dropdown data has none
        summaries[key].reservedAmount = reserved
        summaries[key].availableBalance = reserved - summaries[key].spentAmount
        summaries[key].hasBudget = reserved > 0
      }
    })

    // Add spent amounts from current expenses list
    projectExpenses.forEach((expense) => {
      const id = extractProjectId(expense)
      if (!id) return
      const amount = Number(expense.amount || 0) || 0
      if (!summaries[id]) {
        // Project has expenses but no reserved budget configured
        summaries[id] = {
          reservedAmount: 0,
          spentAmount: 0,
          availableBalance: 0,
          hasBudget: false
        }
      }
      summaries[id].spentAmount += amount
      summaries[id].availableBalance = summaries[id].reservedAmount - summaries[id].spentAmount
    })

    return summaries
  }, [projectsList, allProjectsForPem, projectExpenses])

  // Handle project selection change to auto-fill client
  const handleProjectChange = async (projectId) => {
    setProjectExpenseFormData(prev => ({...prev, projectId}))
    
    // Find the selected project and auto-fill client name
    const selectedProject = projectsList.find(p => String(p.value) === String(projectId))
    if (selectedProject && selectedProject.clientName) {
      setProjectExpenseFormData(prev => ({
        ...prev,
        projectId,
        vendor: selectedProject.clientName
      }))
    } else if (projectId) {
      // If client info not in list, fetch project details
      try {
        const { adminProjectService } = await import('../admin-services/adminProjectService')
        const response = await adminProjectService.getProjectById(projectId)
        if (response.success && response.data) {
          const project = response.data
          let clientName = null
          if (project.client) {
            if (typeof project.client === 'object') {
              clientName = project.client.companyName || project.client.name || null
            }
          }
          if (clientName) {
            setProjectExpenseFormData(prev => ({
              ...prev,
              projectId,
              vendor: clientName
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
      }
    }
  }

  // CRUD Handlers
  const handleCreateProjectExpense = () => {
    setProjectExpenseFormData({
      projectId: '',
      category: '',
      amount: '',
      vendor: '',
      paidBy: 'Revra',
      paymentMethod: 'Bank Transfer',
      expenseDate: new Date().toISOString().split('T')[0],
      description: ''
    })
    setProjectExpenseModalMode('create')
    setSelectedProjectExpense(null)
    setShowProjectExpenseModal(true)
  }

  // Open expense modal scoped to a specific project (used from Projects tab)
  const openExpenseModalForProject = (project) => {
    if (!project) return
    const id = String(project._id || project.id)
    if (!id) return
    // Reset form with selected project
    setProjectExpenseFormData({
      projectId: id,
      category: '',
      amount: '',
      vendor: '',
      paidBy: 'Revra',
      paymentMethod: 'Bank Transfer',
      expenseDate: new Date().toISOString().split('T')[0],
      description: ''
    })
    // Auto-fill client/vendor name for this project
    handleProjectChange(id)
    setProjectExpenseModalMode('create')
    setSelectedProjectExpense(null)
    setShowProjectExpenseModal(true)
  }

  const handleEditProjectExpense = (expense) => {
    // Extract project ID using helper function
    const projectId = extractProjectId(expense)
    
    // Format amount - ensure it's a string for input field
    const amountValue = expense.amount != null ? String(expense.amount) : ''
    
    // Format date - handle various date formats
    let expenseDateValue = new Date().toISOString().split('T')[0]
    if (expense.expenseDate) {
      try {
        const date = expense.expenseDate instanceof Date 
          ? expense.expenseDate 
          : new Date(expense.expenseDate)
        if (!isNaN(date.getTime())) {
          expenseDateValue = date.toISOString().split('T')[0]
        }
      } catch (e) {
        console.error('Error parsing expense date:', e)
      }
    }
    
    setProjectExpenseFormData({
      projectId: projectId,
      category: expense.category || '',
      amount: amountValue,
      vendor: expense.vendor || '',
      paidBy: (expense.paidBy || 'Revra'),
      paymentMethod: expense.paymentMethod || 'Bank Transfer',
      expenseDate: expenseDateValue,
      description: expense.description || ''
    })
    setProjectExpenseModalMode('edit')
    setSelectedProjectExpense(expense)
    setShowProjectExpenseModal(true)
  }

  const handleViewProjectExpense = (expense) => {
    // Extract project ID using helper function
    const projectId = extractProjectId(expense)
    
    // Format amount - ensure it's a string for input field
    const amountValue = expense.amount != null ? String(expense.amount) : ''
    
    // Format date - handle various date formats
    let expenseDateValue = ''
    if (expense.expenseDate) {
      try {
        const date = expense.expenseDate instanceof Date 
          ? expense.expenseDate 
          : new Date(expense.expenseDate)
        if (!isNaN(date.getTime())) {
          expenseDateValue = date.toISOString().split('T')[0]
        }
      } catch (e) {
        console.error('Error parsing expense date:', e)
      }
    }
    
    setProjectExpenseFormData({
      projectId: projectId,
      category: expense.category || '',
      amount: amountValue,
      vendor: expense.vendor || '',
      paidBy: (expense.paidBy || 'Revra'),
      paymentMethod: expense.paymentMethod || 'Bank Transfer',
      expenseDate: expenseDateValue,
      description: expense.description || ''
    })
    setProjectExpenseModalMode('view')
    setSelectedProjectExpense(expense)
    setShowProjectExpenseModal(true)
  }

  const handleDeleteProjectExpense = (expense) => {
    setProjectExpenseToDelete(expense)
    setShowDeleteProjectExpenseModal(true)
  }

  const confirmDeleteProjectExpense = async () => {
    if (!projectExpenseToDelete) return

    try {
      const expenseId = projectExpenseToDelete._id || projectExpenseToDelete.id
      const response = await adminFinanceService.deleteProjectExpense(expenseId)
      if (response.success) {
        toast.success('Project expense deleted successfully')
        setShowDeleteProjectExpenseModal(false)
        setProjectExpenseToDelete(null)
        await fetchProjectExpenses()
        await fetchStatistics()
      } else {
        toast.error(response.message || 'Failed to delete project expense')
      }
    } catch (err) {
      console.error('Error deleting project expense:', err)
      toast.error(err.message || 'Failed to delete project expense')
    }
  }

  const handleSaveProjectExpense = async () => {
    // Validation
    if (!projectExpenseFormData.projectId || 
        !projectExpenseFormData.category || !projectExpenseFormData.amount || 
        !projectExpenseFormData.expenseDate ||
        !projectExpenseFormData.paidBy) {
      toast.error('Please fill in all required fields')
      return
    }

    // Prepare data for API - ensure amount is a number
    const expenseData = {
      ...projectExpenseFormData,
      amount: parseFloat(projectExpenseFormData.amount) || 0
    }

    try {
      let response
      if (projectExpenseModalMode === 'create') {
        response = await adminFinanceService.createProjectExpense(expenseData)
      } else {
        const expenseId = selectedProjectExpense._id || selectedProjectExpense.id
        response = await adminFinanceService.updateProjectExpense(
          expenseId,
          expenseData
        )
      }

      if (response.success) {
        toast.success(`Project expense ${projectExpenseModalMode === 'create' ? 'created' : 'updated'} successfully`)
        setShowProjectExpenseModal(false)
        // Reset form
        setProjectExpenseFormData({
          projectId: '',
          category: '',
          amount: '',
          vendor: '',
          paidBy: 'Revra',
          paymentMethod: 'Bank Transfer',
          expenseDate: new Date().toISOString().split('T')[0],
          description: ''
        })
        setSelectedProjectExpense(null)
        await fetchProjectExpenses()
        await fetchStatistics()
      } else {
        toast.error(response.message || `Failed to ${projectExpenseModalMode === 'create' ? 'create' : 'update'} project expense`)
      }
    } catch (err) {
      console.error(`Error ${projectExpenseModalMode === 'create' ? 'creating' : 'updating'} project expense:`, err)
      toast.error(err.message || `Failed to ${projectExpenseModalMode === 'create' ? 'create' : 'update'} project expense`)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await adminProjectExpenseCategoryService.getAllCategories({ isActive: 'true' })
      if (response && response.success) {
        setCategories(response.data || [])
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
      toast.error('Failed to load categories')
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Category CRUD handlers
  const handleCreateCategory = () => {
    setCategoryFormData({
      name: ''
    })
    setSelectedCategory(null)
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category) => {
    setCategoryFormData({
      name: category.name || ''
    })
    setSelectedCategory(category)
    setShowCategoryEditModal(true)
  }

  const handleDeleteCategory = (category) => {
    setSelectedCategory(category)
    setShowCategoryDeleteModal(true)
  }

  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      setDeletingCategory(true)
      const response = await adminProjectExpenseCategoryService.deleteCategory(
        selectedCategory._id || selectedCategory.id
      )
      if (response.success) {
        toast.success('Category deleted successfully')
        setShowCategoryDeleteModal(false)
        setSelectedCategory(null)
        await fetchCategories()
      } else {
        toast.error(response.message || 'Failed to delete category')
      }
    } catch (err) {
      console.error('Error deleting category:', err)
      toast.error(err.message || 'Failed to delete category')
    } finally {
      setDeletingCategory(false)
    }
  }

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setCreatingCategory(true)
      const response = await adminProjectExpenseCategoryService.createCategory({
        name: categoryFormData.name.trim()
      })
      if (response.success) {
        toast.success('Category created successfully')
        setShowCategoryModal(false)
        setCategoryFormData({
          name: ''
        })
        await fetchCategories()
      } else {
        toast.error(response.message || 'Failed to create category')
      }
    } catch (err) {
      console.error('Error creating category:', err)
      toast.error(err.message || 'Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!categoryFormData.name.trim() || !selectedCategory) {
      toast.error('Category name is required')
      return
    }

    try {
      setUpdatingCategory(true)
      const response = await adminProjectExpenseCategoryService.updateCategory(
        selectedCategory._id || selectedCategory.id,
        {
          name: categoryFormData.name.trim()
        }
      )
      if (response.success) {
        toast.success('Category updated successfully')
        setShowCategoryEditModal(false)
        setSelectedCategory(null)
        setCategoryFormData({
          name: ''
        })
        await fetchCategories()
      } else {
        toast.error(response.message || 'Failed to update category')
      }
    } catch (err) {
      console.error('Error updating category:', err)
      toast.error(err.message || 'Failed to update category')
    } finally {
      setUpdatingCategory(false)
    }
  }

  // Filter projects based on search term (for filter bar)
  const filteredProjectsForFilter = useMemo(() => {
    if (!projectSearchTerm.trim()) {
      return projectsWithExpenses
    }
    const searchLower = projectSearchTerm.toLowerCase()
    return projectsWithExpenses.filter(project => 
      project.name?.toLowerCase().includes(searchLower)
    )
  }, [projectsWithExpenses, projectSearchTerm])

  // Filter projects for form dropdown
  const filteredProjectsForForm = useMemo(() => {
    if (!formProjectSearchTerm.trim()) {
      return projectsWithExpenses
    }
    const searchLower = formProjectSearchTerm.toLowerCase()
    return projectsWithExpenses.filter(project => 
      project.name?.toLowerCase().includes(searchLower)
    )
  }, [projectsWithExpenses, formProjectSearchTerm])

  // Filter projects for expense form dropdown
  const filteredProjectsForExpense = useMemo(() => {
    let list = projectsList

    // Apply include/exclude filter
    if (expenseInclusionFilter === 'included') {
      list = list.filter(p => p.expenseConfig?.included)
    } else if (expenseInclusionFilter === 'excluded') {
      list = list.filter(p => !p.expenseConfig?.included)
    }

    if (!expenseProjectSearchTerm.trim()) {
      return list
    }
    const searchLower = expenseProjectSearchTerm.toLowerCase()
    return list.filter(project =>
      project.label?.toLowerCase().includes(searchLower) ||
      project.clientName?.toLowerCase().includes(searchLower)
    )
  }, [projectsList, expenseProjectSearchTerm, expenseInclusionFilter])

  // Fetch credentials
  const fetchCredentials = async () => {
    try {
      setCredentialsLoading(true)
      const params = {}
      if (selectedProjectFilter !== 'all') {
        params.projectId = selectedProjectFilter
      }
      const response = await adminProjectCredentialService.getAllCredentials(params)
      if (response && response.success) {
        let filteredData = response.data || []
        // Apply search filter on frontend if search term exists
        if (projectSearchTerm.trim() && selectedProjectFilter === 'all') {
          const searchLower = projectSearchTerm.toLowerCase()
          filteredData = filteredData.filter(cred => 
            cred.project?.name?.toLowerCase().includes(searchLower) ||
            cred.title?.toLowerCase().includes(searchLower) ||
            cred.additionalInfo?.toLowerCase().includes(searchLower)
          )
        }
        setCredentials(filteredData)
      }
    } catch (err) {
      console.error('Error fetching credentials:', err)
      toast.error('Failed to load credentials')
    } finally {
      setCredentialsLoading(false)
    }
  }

  // Fetch projects with expenses
  const fetchProjectsWithExpenses = async () => {
    try {
      const response = await adminProjectCredentialService.getProjectsWithExpenses()
      if (response && response.success) {
        setProjectsWithExpenses(response.data || [])
      }
    } catch (err) {
      console.error('Error fetching projects with expenses:', err)
    }
  }

  // Credential CRUD handlers
  const handleCreateCredential = () => {
    setCredentialFormData({
      projectId: '',
      credentials: ''
    })
    setSelectedCredential(null)
    setShowCredentialModal(true)
  }

  const handleEditCredential = (credential) => {
    // Combine all credential details into one text field
    const credentialsText = [
      credential.username && `Username: ${credential.username}`,
      credential.email && `Email: ${credential.email}`,
      credential.password && `Password: ${credential.password}`,
      credential.url && `URL: ${credential.url}`,
      credential.ipAddress && `IP: ${credential.ipAddress}${credential.port ? `:${credential.port}` : ''}`,
      credential.additionalInfo && `Additional Info: ${credential.additionalInfo}`,
      credential.notes && `Notes: ${credential.notes}`,
      credential.expiryDate && `Expiry: ${formatDate(credential.expiryDate)}`
    ].filter(Boolean).join('\n')

    setCredentialFormData({
      projectId: credential.project?._id || credential.project || '',
      credentials: credentialsText || ''
    })
    setSelectedCredential(credential)
    setShowCredentialEditModal(true)
  }

  const handleViewCredential = (credential) => {
    setViewingCredential(credential)
    setShowCredentialViewModal(true)
  }

  const handleDeleteCredential = (credential) => {
    setSelectedCredential(credential)
    setShowCredentialDeleteModal(true)
  }

  const confirmDeleteCredential = async () => {
    if (!selectedCredential) return

    try {
      setDeletingCredential(true)
      const response = await adminProjectCredentialService.deleteCredential(
        selectedCredential._id || selectedCredential.id
      )
      if (response.success) {
        toast.success('Credential deleted successfully')
        setShowCredentialDeleteModal(false)
        setSelectedCredential(null)
        await fetchCredentials()
      } else {
        toast.error(response.message || 'Failed to delete credential')
      }
    } catch (err) {
      console.error('Error deleting credential:', err)
      toast.error(err.message || 'Failed to delete credential')
    } finally {
      setDeletingCredential(false)
    }
  }

  const handleSaveCredential = async () => {
    if (!credentialFormData.projectId || !credentialFormData.credentials) {
      toast.error('Project and credentials are required')
      return
    }

    try {
      setCreatingCredential(true)
      // Store credentials in the additionalInfo field as a simple text
      const response = await adminProjectCredentialService.createCredential({
        projectId: credentialFormData.projectId,
        credentialType: 'other', // Default type since we're simplifying
        title: 'Credential', // Auto-generated title
        password: 'N/A', // Required field, but we'll store actual credentials in additionalInfo
        additionalInfo: credentialFormData.credentials.trim(),
        isActive: true
      })
      if (response.success) {
        toast.success('Credential created successfully')
        setShowCredentialModal(false)
        setCredentialFormData({
          projectId: '',
          credentials: ''
        })
        await fetchCredentials()
        await fetchProjectsWithExpenses()
      } else {
        toast.error(response.message || 'Failed to create credential')
      }
    } catch (err) {
      console.error('Error creating credential:', err)
      toast.error(err.message || 'Failed to create credential')
    } finally {
      setCreatingCredential(false)
    }
  }

  const handleToggleCredentialStatus = async (credential) => {
    try {
      const response = await adminProjectCredentialService.updateCredential(
        credential._id || credential.id,
        {
          isActive: !credential.isActive
        }
      )
      if (response.success) {
        toast.success(`Credential ${!credential.isActive ? 'activated' : 'deactivated'} successfully`)
        await fetchCredentials()
      } else {
        toast.error(response.message || 'Failed to update credential status')
      }
    } catch (err) {
      console.error('Error toggling credential status:', err)
      toast.error(err.message || 'Failed to update credential status')
    }
  }

  const handleUpdateCredential = async () => {
    if (!credentialFormData.credentials || !selectedCredential) {
      toast.error('Credentials are required')
      return
    }

    try {
      setUpdatingCredential(true)
      const response = await adminProjectCredentialService.updateCredential(
        selectedCredential._id || selectedCredential.id,
        {
          additionalInfo: credentialFormData.credentials.trim()
        }
      )
      if (response.success) {
        toast.success('Credential updated successfully')
        setShowCredentialEditModal(false)
        setSelectedCredential(null)
        setCredentialFormData({
          projectId: '',
          credentials: ''
        })
        await fetchCredentials()
        await fetchProjectsWithExpenses()
      } else {
        toast.error(response.message || 'Failed to update credential')
      }
    } catch (err) {
      console.error('Error updating credential:', err)
      toast.error(err.message || 'Failed to update credential')
    } finally {
      setUpdatingCredential(false)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false)
      }
      if (expenseProjectDropdownRef.current && !expenseProjectDropdownRef.current.contains(event.target)) {
        setShowExpenseProjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchProjectExpenses()
    fetchStatistics()
    fetchProjectsList()
    fetchAllProjectsForPem()
    fetchCategories()
    if (activeSection === 'credentials') {
      fetchCredentials()
      fetchProjectsWithExpenses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedFilter, searchTerm, activeSection, selectedProjectFilter, projectSearchTerm])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedFilter])

  // Pagination
  const totalPages = projectExpensesPages

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
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Project Expenses Management
              </h1>
              <p className="text-gray-600 text-lg">
                Manage and track all project-related expenses in detail
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPemGuideSheet(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors duration-200"
              >
                <FiBook className="text-sm" />
                <span>Guide</span>
              </button>
              <button
                onClick={() => {
                  fetchProjectExpenses()
                  fetchStatistics()
                  fetchCategories()
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <FiRefreshCw className="text-sm" />
                <span>Refresh</span>
              </button>
              {activeSection === 'expenses' && (
                <button
                  onClick={handleCreateProjectExpense}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <FiPlus className="text-sm" />
                  <span>Add Project Expense</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Section Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveSection('projects')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'projects'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiFileText className="h-4 w-4" />
                <span>Projects</span>
              </button>
              <button
                onClick={() => setActiveSection('expenses')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'expenses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiFileText className="h-4 w-4" />
                <span>Expenses</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveSection('categories')}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === 'categories'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiTag className="h-4 w-4" />
                  <span>Categories</span>
                </button>
              )}
              <button
                onClick={() => setActiveSection('credentials')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === 'credentials'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiKey className="h-4 w-4" />
                <span>Project Credentials</span>
              </button>
            </nav>
          </div>

          {/* Content based on active section */}
          {activeSection === 'projects' && (
            <>
              {/* Projects Tab: high-level project expense overview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
                <div className="px-4 sm:px-5 py-4 sm:py-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Projects</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Overview of expense inclusion, reserved budget, spending, and remaining balance
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="relative flex-1 sm:max-w-[200px] min-w-0">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 shrink-0" />
                        <input
                          type="text"
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          placeholder="Search projects or clients..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">
                            Inclusion
                          </label>
                          <select
                            value={projectInclusionFilter}
                            onChange={(e) => setProjectInclusionFilter(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[140px]"
                          >
                            <option value="all">All</option>
                            <option value="included">Included</option>
                            <option value="excluded">Excluded / Not specified</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">
                            Status
                          </label>
                          <select
                            value={projectStatusFilter}
                            onChange={(e) => setProjectStatusFilter(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[140px]"
                          >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="pending-assignment">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On hold</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects list */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="min-w-full overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expenses
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reserved
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Spent
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Left
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {allProjectsForPem
                        .filter((project) => {
                          // Inclusion filter
                          const included = !!project.expenseConfig?.included
                          if (projectInclusionFilter === 'included' && !included) return false
                          if (projectInclusionFilter === 'excluded' && included) return false

                          // Status filter
                          if (projectStatusFilter !== 'all') {
                            if ((project.status || '') !== projectStatusFilter) return false
                          }

                          // Search filter
                          if (projectSearch.trim()) {
                            const q = projectSearch.toLowerCase()
                            const name = (project.name || '').toLowerCase()
                            const clientName =
                              typeof project.client === 'object'
                                ? (project.client.companyName || project.client.name || '').toLowerCase()
                                : String(project.client || '').toLowerCase()
                            return name.includes(q) || clientName.includes(q)
                          }

                          return true
                        })
                        .map((project) => {
                          const id = String(project._id || project.id)
                          const summary = projectExpenseSummaries[id] || {
                            reservedAmount: 0,
                            spentAmount: 0,
                            availableBalance: 0,
                            hasBudget: false
                          }
                          const cfg = project.expenseConfig || {}
                          const reserved = summary.reservedAmount
                          const spent = summary.spentAmount
                          const available = summary.availableBalance
                          const hasIncludedFlag = Object.prototype.hasOwnProperty.call(cfg, 'included')
                          const included = !!cfg.included

                          let inclusionLabel
                          if (hasIncludedFlag && included) {
                            inclusionLabel = 'Included'
                          } else if (hasIncludedFlag && !included) {
                            inclusionLabel = 'Excluded'
                          } else {
                            inclusionLabel = 'Excluded / Not specified'
                          }

                          const inclusionClass =
                            hasIncludedFlag && included
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-gray-50 text-gray-600 border border-gray-200'

                          const status = project.status || 'unknown'

                          return (
                            <tr key={id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 truncate">
                                    {project.name || 'Unnamed Project'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-700">
                                  {typeof project.client === 'object'
                                    ? project.client.companyName || project.client.name || 'N/A'
                                    : project.client || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${inclusionClass}`}>
                                  {inclusionLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span className="text-sm text-gray-900">
                                  {reserved > 0 ? formatCurrency(reserved) : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span className="text-sm text-gray-900">
                                  {spent > 0 ? formatCurrency(spent) : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span
                                  className={`text-sm font-semibold ${
                                    available < 0 ? 'text-red-600' : available > 0 ? 'text-emerald-700' : 'text-gray-700'
                                  }`}
                                >
                                  {reserved > 0 || spent > 0 ? formatCurrency(available) : '—'}
                                  {available < 0 && ' (Over)'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end space-x-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setProjectViewModalProject(project)}
                                    className="text-gray-400 hover:text-primary p-1.5 rounded hover:bg-primary/10 transition-all"
                                    aria-label="View project details"
                                    title="View project details"
                                  >
                                    <FiEye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openExpenseModalForProject(project)}
                                    className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-all"
                                    aria-label="Add expense"
                                    title="Add expense"
                                  >
                                    <FiPlus className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCredentialFormData((prev) => ({
                                        ...prev,
                                        projectId: id
                                      }))
                                      setShowCredentialModal(true)
                                    }}
                                    className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-all"
                                    aria-label="Add credentials"
                                    title="Add credentials"
                                  >
                                    <FiKey className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      {allProjectsForPem.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                            No projects found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Project view modal */}
              {projectViewModalProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {projectViewModalProject.name || 'Project details'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Expense configuration and requirements for this project.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProjectViewModalProject(null)}
                        className="p-2 rounded-full hover:bg-gray-100"
                        aria-label="Close"
                      >
                        <FiX className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
                      {(() => {
                        const p = projectViewModalProject
                        const clientObj = typeof p.client === 'object' ? p.client : null
                        const id = String(p._id || p.id)
                        const summary = projectExpenseSummaries[id] || {
                          reservedAmount: 0,
                          spentAmount: 0,
                          availableBalance: 0,
                          hasBudget: false
                        }
                        const cfg = p.expenseConfig || {}
                        const reserved = summary.reservedAmount
                        const spent = summary.spentAmount
                        const available = summary.availableBalance
                        const included = !!cfg.included

                        return (
                          <>
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Project
                              </h4>
                              <p className="mt-0.5 text-gray-900">
                                {p.name || 'Unnamed Project'}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Status: {p.status || 'unknown'}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Client:{' '}
                                {typeof p.client === 'object'
                                  ? p.client.companyName || p.client.name || 'N/A'
                                  : p.client || 'N/A'}
                              </p>
                              {clientObj && (clientObj.email || clientObj.phoneNumber || clientObj.phone || clientObj.mobile) && (
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                  {clientObj.email && (
                                    <p>
                                      Email:{' '}
                                      <span className="text-gray-800">
                                        {clientObj.email}
                                      </span>
                                    </p>
                                  )}
                                  {(clientObj.phoneNumber || clientObj.phone || clientObj.mobile) && (
                                    <p>
                                      Contact:{' '}
                                      <span className="text-gray-800">
                                        {clientObj.phoneNumber || clientObj.phone || clientObj.mobile}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Expense configuration
                              </h4>
                              <p className="mt-0.5 text-sm">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    included
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                                  }`}
                                >
                                  {included ? 'Included in project' : 'Excluded / Not specified'}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-gray-600">
                                Reserved:{' '}
                                <span className="font-semibold text-gray-900">
                                  {reserved > 0 ? formatCurrency(reserved) : 'No budget set'}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-600">
                                Spent:{' '}
                                <span className="font-semibold text-gray-900">
                                  {spent > 0 ? formatCurrency(spent) : formatCurrency(0)}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-600">
                                Available:{' '}
                                <span
                                  className={`font-semibold ${
                                    available < 0
                                      ? 'text-red-600'
                                      : available > 0
                                      ? 'text-emerald-700'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {formatCurrency(available)}
                                  {available < 0 && ' (Over budget)'}
                                </span>
                              </p>
                              {!included && (
                                <p className="mt-1 text-[11px] text-amber-700">
                                  This project&apos;s expenses are{' '}
                                  <span className="font-semibold">excluded from the contract</span>.
                                  Purchases you add here are for Project Expense Management tracking
                                  only and do{' '}
                                  <span className="font-semibold">not create any transactions</span>{' '}
                                  or change the client&apos;s pending amount.
                                </p>
                              )}
                            </div>

                            {cfg.requirementsNotes && cfg.requirementsNotes.trim() && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Expense requirements
                                </h4>
                                <p className="mt-1 text-sm whitespace-pre-wrap">
                                  {cfg.requirementsNotes}
                                </p>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {activeSection === 'expenses' && (
            <>
          {/* Statistics Cards - separate Included/Excluded, compact to fit one line */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 p-3">
                <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">Total Incl</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{statisticsLoading ? '...' : formatCurrency(statistics.totalExpensesIncluded)}</p>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 p-3">
                <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Total Excl</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{statisticsLoading ? '...' : formatCurrency(statistics.totalExpensesExcluded)}</p>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 p-3">
                <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">Monthly Incl</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{statisticsLoading ? '...' : formatCurrency(statistics.monthlyExpensesIncluded)}</p>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 p-3">
                <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Monthly Excl</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{statisticsLoading ? '...' : formatCurrency(statistics.monthlyExpensesExcluded)}</p>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 p-3">
                <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">Today Incl</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{statisticsLoading ? '...' : formatCurrency(statistics.todayExpensesIncluded)}</p>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 p-3">
                <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Today Excl</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{statisticsLoading ? '...' : formatCurrency(statistics.todayExpensesExcluded)}</p>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-3">
                <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">Total Projects</p>
                <p className="text-lg font-bold text-blue-800 mt-0.5">{statisticsLoading ? '...' : statistics.totalProjects}</p>
              </Card>
            </motion.div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by project, client, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id || cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content Grid */}
          {projectExpensesLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loading size="medium" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchProjectExpenses}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : projectExpenses.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No project expenses found</p>
              <button
                onClick={handleCreateProjectExpense}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Project Expense
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[150px]">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[95px]">Incl/Excl</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[110px]">Paid by</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Client</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[130px]">Payment Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 min-w-[150px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectExpenses.map((item, index) => (
                      <motion.tr
                        key={item._id || item.id || `item-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.project?.name || item.projectName || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {item.expensesIncluded === true ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100" title="Included project - creates AdminFinance transactions">
                              Included
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200" title="Excluded / Not specified - PEM tracking only, no transactions">
                              Excluded
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {item.category || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold text-red-600">
                            -{formatCurrency(item.amount)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const paidBy = (item.paidBy || 'Revra').toLowerCase()
                            const label = paidBy === 'client' ? 'Client' : 'Revra'
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                {label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {item.vendor || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {item.paymentMethod || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {formatDate(item.expenseDate || item.date || item.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewProjectExpense(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditProjectExpense(item)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <FiEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProjectExpense(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <span>
                    Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                    <span className="font-semibold">{Math.min(currentPage * itemsPerPage, projectExpensesTotal)}</span> of{' '}
                    <span className="font-semibold">{projectExpensesTotal}</span> expenses
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Project Expense Modal (moved outside expenses tab) */}

          {/* Delete Project Expense Confirmation Modal */}
          {showDeleteProjectExpenseModal && projectExpenseToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Delete Project Expense</h3>
                  <button
                    onClick={() => {
                      setShowDeleteProjectExpenseModal(false)
                      setProjectExpenseToDelete(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the expense <strong>"{projectExpenseToDelete.name}"</strong>? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteProjectExpenseModal(false)
                      setProjectExpenseToDelete(null)
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteProjectExpense}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}

          {/* Category Management Section */}
          {activeSection === 'categories' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Expense Categories</h3>
                  <p className="text-gray-600 text-sm mt-1">Manage project expense categories</p>
                </div>
                <button
                  onClick={handleCreateCategory}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FiPlus className="h-4 w-4" />
                  <span>Add Category</span>
                </button>
              </div>

              {/* Categories List */}
              {categoriesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loading size="medium" />
                </div>
              ) : categories.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-600">No categories found</p>
                  <button
                    onClick={handleCreateCategory}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add First Category
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expenses</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((category, index) => (
                          <motion.tr
                            key={category._id || category.id || `cat-${index}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-gray-900 text-sm">
                                {category.name || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                category.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {category.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-600">
                                {category.expenseCount || 0}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEditCategory(category)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <FiEdit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                  disabled={category.expenseCount > 0}
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Add Category</h3>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleSaveCategory()
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Domain, Server, Hosting"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCategory}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <FiPlus className="h-4 w-4" />
                      <span>{creatingCategory ? 'Creating...' : 'Create Category'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Category Modal */}
          {showCategoryEditModal && selectedCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Edit Category</h3>
                  <button
                    onClick={() => {
                      setShowCategoryEditModal(false)
                      setSelectedCategory(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateCategory()
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Domain, Server, Hosting"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryEditModal(false)
                        setSelectedCategory(null)
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingCategory}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <FiEdit className="h-4 w-4" />
                      <span>{updatingCategory ? 'Updating...' : 'Update Category'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Category Confirmation Modal */}
          {showCategoryDeleteModal && selectedCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Delete Category</h3>
                  <button
                    onClick={() => {
                      setShowCategoryDeleteModal(false)
                      setSelectedCategory(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the category <strong>"{selectedCategory.name}"</strong>? 
                  {selectedCategory.expenseCount > 0 && (
                    <span className="block mt-2 text-red-600">
                      This category is being used in {selectedCategory.expenseCount} expense(s). You must update or remove those expenses first.
                    </span>
                  )}
                  {selectedCategory.expenseCount === 0 && (
                    <span className="block mt-2">This action cannot be undone.</span>
                  )}
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCategoryDeleteModal(false)
                      setSelectedCategory(null)
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCategory}
                    disabled={selectedCategory.expenseCount > 0 || deletingCategory}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingCategory ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Global Project Expense Modal (available from all tabs) */}
          {showProjectExpenseModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {projectExpenseModalMode === 'create'
                      ? 'Add New Project Expense'
                      : projectExpenseModalMode === 'edit'
                        ? 'Edit Project Expense'
                        : 'View Project Expense'}
                  </h3>
                  <button
                    onClick={() => setShowProjectExpenseModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                {/* Project budget/spent/available summary for selected project */}
                {projectExpenseFormData.projectId && (
                  <div className="mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700">
                    {(() => {
                      const summary =
                        projectExpenseSummaries[String(projectExpenseFormData.projectId)] || null
                      const selectedProjectMeta = projectsList.find(
                        (p) => String(p.value) === String(projectExpenseFormData.projectId)
                      )
                      const isExcluded =
                        selectedProjectMeta &&
                        selectedProjectMeta.expenseConfig &&
                        !selectedProjectMeta.expenseConfig.included

                      if (!summary || summary.reservedAmount <= 0) {
                        return (
                          <div className="space-y-1">
                            <p>
                              No reserved expense budget set for this project. Expenses will still
                              be recorded normally.
                            </p>
                            {isExcluded && (
                              <p className="mt-1 text-[11px] text-amber-700">
                                This project is configured as{' '}
                                <span className="font-semibold">
                                  expenses excluded (client pays)
                                </span>
                                . Purchases added here are tracked only inside Project Expense
                                Management and do{' '}
                                <span className="font-semibold">not create any transactions</span> in
                                the finance system or change the client&apos;s pending amount.
                              </p>
                            )}
                          </div>
                        )
                      }

                      const { reservedAmount, spentAmount, availableBalance } = summary
                      return (
                        <div className="space-y-1">
                          <p>
                            Budget:{' '}
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(reservedAmount)}
                            </span>{' '}
                            • Spent:{' '}
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(spentAmount)}
                            </span>{' '}
                            • Available:{' '}
                            <span
                              className={`font-semibold ${
                                availableBalance < 0 ? 'text-red-600' : 'text-emerald-700'
                              }`}
                            >
                              {formatCurrency(availableBalance)}
                              {availableBalance < 0 && ' (Over budget)'}
                            </span>
                          </p>
                          {isExcluded && (
                            <p className="mt-1 text-[11px] text-amber-700">
                              This project is configured as{' '}
                              <span className="font-semibold">
                                expenses excluded (client pays)
                              </span>
                              . Purchases added here are tracked only inside Project Expense
                              Management and do{' '}
                              <span className="font-semibold">not create any transactions</span> in
                              the finance system or change the client&apos;s pending amount.
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (projectExpenseModalMode !== 'view') {
                      handleSaveProjectExpense()
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="relative" ref={expenseProjectDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          !(projectExpenseModalMode === 'view') &&
                          setShowExpenseProjectDropdown(!showExpenseProjectDropdown)
                        }
                        disabled={projectExpenseModalMode === 'view'}
                        className="w-full px-4 py-3 text-left border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between hover:border-gray-400 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        <span
                          className={
                            projectExpenseFormData.projectId ? 'text-gray-900' : 'text-gray-500'
                          }
                        >
                          {projectExpenseFormData.projectId
                            ? projectsList.find(
                                (p) =>
                                  String(p.value) === String(projectExpenseFormData.projectId)
                              )?.label || 'Select Project'
                            : 'Select Project'}
                        </span>
                        <FiFilter
                          className={`h-4 w-4 text-gray-400 transition-transform ${
                            showExpenseProjectDropdown ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {showExpenseProjectDropdown && projectExpenseModalMode !== 'view' && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-64 overflow-hidden">
                          <div className="p-2 border-b border-gray-200 bg-gray-50">
                            <div className="relative">
                              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type="text"
                                placeholder="Search projects..."
                                value={expenseProjectSearchTerm}
                                onChange={(e) => setExpenseProjectSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredProjectsForExpense.length > 0 ? (
                              filteredProjectsForExpense.map((project) => (
                                <button
                                  key={project.value}
                                  type="button"
                                  onClick={() => {
                                    handleProjectChange(String(project.value))
                                    setShowExpenseProjectDropdown(false)
                                    setExpenseProjectSearchTerm('')
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                    String(projectExpenseFormData.projectId) ===
                                    String(project.value)
                                      ? 'bg-blue-50 text-blue-600 font-medium'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  <div className="font-medium">{project.label}</div>
                                  {project.clientName && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {project.clientName}
                                    </div>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                No projects found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={projectExpenseFormData.category}
                      onChange={(e) =>
                        setProjectExpenseFormData({
                          ...projectExpenseFormData,
                          category: e.target.value
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={projectExpenseModalMode === 'view'}
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id || cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={projectExpenseFormData.amount}
                        onChange={(e) =>
                          setProjectExpenseFormData({
                            ...projectExpenseFormData,
                            amount: e.target.value
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                        required
                        disabled={projectExpenseModalMode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expense Date *
                      </label>
                      <input
                        type="date"
                        value={projectExpenseFormData.expenseDate}
                        onChange={(e) =>
                          setProjectExpenseFormData({
                            ...projectExpenseFormData,
                            expenseDate: e.target.value
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={projectExpenseModalMode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paid by *
                      </label>
                      <select
                        value={projectExpenseFormData.paidBy}
                        onChange={(e) =>
                          setProjectExpenseFormData({
                            ...projectExpenseFormData,
                            paidBy: e.target.value
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={projectExpenseModalMode === 'view'}
                      >
                        <option value="Revra">Paid by Revra</option>
                        <option value="client">Paid by Client</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client
                      </label>
                      <input
                        type="text"
                        value={projectExpenseFormData.vendor}
                        onChange={(e) =>
                          setProjectExpenseFormData({
                            ...projectExpenseFormData,
                            vendor: e.target.value
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Client name"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={projectExpenseFormData.paymentMethod}
                        onChange={(e) =>
                          setProjectExpenseFormData({
                            ...projectExpenseFormData,
                            paymentMethod: e.target.value
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={projectExpenseModalMode === 'view'}
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={projectExpenseFormData.description}
                      onChange={(e) =>
                        setProjectExpenseFormData({
                          ...projectExpenseFormData,
                          description: e.target.value
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter additional notes or description"
                      disabled={projectExpenseModalMode === 'view'}
                    />
                  </div>

                  {projectExpenseModalMode !== 'view' && (
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowProjectExpenseModal(false)}
                        className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <FiPlus className="h-4 w-4" />
                        <span>
                          {projectExpenseModalMode === 'create'
                            ? 'Add Project Expense'
                            : 'Update Project Expense'}
                        </span>
                      </button>
                    </div>
                  )}
                  {projectExpenseModalMode === 'view' && (
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowProjectExpenseModal(false)}
                        className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditProjectExpense(selectedProjectExpense)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <FiEdit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Project Credentials Section */}
          {activeSection === 'credentials' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Project Credentials</h3>
                  <p className="text-gray-600 text-sm mt-1">Manage credentials for projects with purchases</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={handleCreateCredential}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="h-4 w-4" />
                    <span>Add Credential</span>
                  </button>
                )}
              </div>

              {/* Filters - Compact Search Bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearchTerm}
                    onChange={(e) => {
                      setProjectSearchTerm(e.target.value)
                      if (e.target.value.trim() === '') {
                        setSelectedProjectFilter('all')
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {projectSearchTerm && (
                  <button
                    onClick={() => {
                      setProjectSearchTerm('')
                      setSelectedProjectFilter('all')
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Credentials List */}
              {credentialsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loading size="medium" />
                </div>
              ) : credentials.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <FiKey className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No credentials found</p>
                  {isAdmin && (
                    <button
                      onClick={handleCreateCredential}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add First Credential
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Project</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Credentials</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credentials.map((credential, index) => (
                          <motion.tr
                            key={credential._id || credential.id || `cred-${index}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-gray-900 text-sm">
                                {credential.project?.name || 'N/A'}
                              </div>
                              {credential.project?.client && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {credential.project.client?.companyName || credential.project.client?.name || ''}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-600 max-w-[300px]">
                                {credential.additionalInfo ? (
                                  <div className="truncate" title={credential.additionalInfo}>
                                    {credential.additionalInfo.substring(0, 80)}
                                    {credential.additionalInfo.length > 80 ? '...' : ''}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No details</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {isAdmin ? (
                                <button
                                  onClick={() => handleToggleCredentialStatus(credential)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    credential.isActive ? 'bg-green-600' : 'bg-gray-300'
                                  }`}
                                  title={`Click to ${credential.isActive ? 'deactivate' : 'activate'}`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      credential.isActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  credential.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {credential.isActive ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleViewCredential(credential)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <FiEye className="h-4 w-4" />
                                </button>
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleEditCredential(credential)}
                                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <FiEdit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCredential(credential)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <FiTrash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Credential Modal */}
          {showCredentialModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Add Credential</h3>
                  <button
                    onClick={() => setShowCredentialModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleSaveCredential()
                }} className="space-y-4">
                  <div className="relative" ref={projectDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="w-full px-4 py-3 text-left border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between hover:border-gray-400 transition-colors"
                      >
                        <span className={credentialFormData.projectId ? 'text-gray-900' : 'text-gray-500'}>
                          {credentialFormData.projectId
                            ? (
                                projectsWithExpenses.find(p => (p._id || p.id) === credentialFormData.projectId)?.name ||
                                allProjectsForPem.find(p => String(p._id || p.id) === String(credentialFormData.projectId))?.name ||
                                'Select Project'
                              )
                            : 'Select Project'}
                        </span>
                        <FiFilter className={`h-4 w-4 text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showProjectDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-64 overflow-hidden">
                          <div className="p-2 border-b border-gray-200 bg-gray-50">
                            <div className="relative">
                              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type="text"
                                placeholder="Search projects..."
                                value={formProjectSearchTerm}
                                onChange={(e) => setFormProjectSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredProjectsForForm.length > 0 ? (
                              filteredProjectsForForm.map(project => (
                                <button
                                  key={project._id || project.id}
                                  type="button"
                                  onClick={() => {
                                    setCredentialFormData({...credentialFormData, projectId: project._id || project.id})
                                    setShowProjectDropdown(false)
                                    setFormProjectSearchTerm('')
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                    credentialFormData.projectId === (project._id || project.id) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-900'
                                  }`}
                                >
                                  <div className="font-medium">{project.name}</div>
                                  {project.credentialCount > 0 && (
                                    <div className="text-xs text-gray-500 mt-0.5">{project.credentialCount} credential{project.credentialCount !== 1 ? 's' : ''}</div>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">No projects found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credentials *</label>
                    <textarea
                      value={credentialFormData.credentials}
                      onChange={(e) => setCredentialFormData({...credentialFormData, credentials: e.target.value})}
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter all credential details here, e.g:&#10;Email: admin@example.com&#10;Password: yourpassword123&#10;Domain: example.com&#10;URL: https://example.com&#10;IP: 192.168.1.1:80&#10;Additional notes..."
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Enter all credential information in this box (email, password, domain name, URL, IP address, etc.)
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowCredentialModal(false)}
                      className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCredential}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <FiPlus className="h-4 w-4" />
                      <span>{creatingCredential ? 'Creating...' : 'Create Credential'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Credential Modal */}
          {showCredentialEditModal && selectedCredential && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Edit Credential</h3>
                  <button
                    onClick={() => {
                      setShowCredentialEditModal(false)
                      setSelectedCredential(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateCredential()
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                    <input
                      type="text"
                      value={selectedCredential.project?.name || 'N/A'}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credentials *</label>
                    <textarea
                      value={credentialFormData.credentials}
                      onChange={(e) => setCredentialFormData({...credentialFormData, credentials: e.target.value})}
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter all credential details here, e.g:&#10;Email: admin@example.com&#10;Password: yourpassword123&#10;Domain: example.com&#10;URL: https://example.com&#10;IP: 192.168.1.1:80&#10;Additional notes..."
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Enter all credential information in this box (email, password, domain name, URL, IP address, etc.)
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCredentialEditModal(false)
                        setSelectedCredential(null)
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingCredential}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <FiEdit className="h-4 w-4" />
                      <span>{updatingCredential ? 'Updating...' : 'Update Credential'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Credential Modal */}
          {showCredentialViewModal && viewingCredential && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Credential Details</h3>
                  <button
                    onClick={() => {
                      setShowCredentialViewModal(false)
                      setViewingCredential(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Project & Client Information */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Project</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          {viewingCredential.project?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</label>
                        <p className="text-base font-semibold text-gray-800 mt-1">
                          {viewingCredential.project?.client?.companyName || 
                           viewingCredential.project?.client?.name || 
                           (typeof viewingCredential.project?.client === 'string' ? viewingCredential.project.client : 'N/A')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Credentials Details */}
                  {viewingCredential.additionalInfo && (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
                        <FiLock className="h-4 w-4 text-blue-600" />
                        <span>Credential Details</span>
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                          {viewingCredential.additionalInfo}
                        </pre>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingCredential.additionalInfo)
                          toast.success('Credentials copied to clipboard')
                        }}
                        className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <FiFileText className="h-4 w-4" />
                        <span>Copy All</span>
                      </button>
                    </div>
                  )}

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium text-gray-500 uppercase">Status:</span>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        viewingCredential.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingCredential.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowCredentialViewModal(false)
                          handleEditCredential(viewingCredential)
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <FiEdit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Credential Confirmation Modal */}
          {showCredentialDeleteModal && selectedCredential && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Delete Credential</h3>
                  <button
                    onClick={() => {
                      setShowCredentialDeleteModal(false)
                      setSelectedCredential(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the credential <strong>"{selectedCredential.title}"</strong>? 
                  <span className="block mt-2">This action cannot be undone.</span>
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCredentialDeleteModal(false)
                      setSelectedCredential(null)
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCredential}
                    disabled={deletingCredential}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingCredential ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PEM Guide Sheet */}
          <AnimatePresence>
            {showPemGuideSheet && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowPemGuideSheet(false)}
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="fixed right-0 top-0 z-[70] h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto border-l border-gray-200"
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <FiBook className="h-6 w-6 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">PEM User Guide</h2>
                    </div>
                    <button
                      onClick={() => setShowPemGuideSheet(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiX className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                  <div className="p-6 pb-12 space-y-6 text-sm text-gray-900">
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">What is PEM?</h3>
                    <p>
                      <strong>Project Expenses Management (PEM)</strong> lets you track, add, and manage project expenses. 
                      You can view projects, their expense inclusion status, budgets, and credentials in one place.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Tabs Overview</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>Projects</strong> — Overview of all projects with expense status, reserved budget, spent amount, and remaining balance. Filter by inclusion status and project status.</li>
                      <li><strong>Expenses</strong> — Full list of all project expenses. Search, filter by category, add/edit/delete expenses. View stats split by Included vs Excluded.</li>
                      <li><strong>Categories</strong> — Manage expense categories (Admin only).</li>
                      <li><strong>Project Credentials</strong> — Store and manage project credentials, login info, and access details.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Included vs Excluded Projects</h3>
                    <p className="mb-2">Projects can be marked as <strong>Included</strong> or <strong>Excluded</strong> for expenses:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>Included</strong> — Expenses create AdminFinance transactions and affect financial reporting. Reserved budget and remaining balance are calculated.</li>
                      <li><strong>Excluded</strong> — Expenses are for PEM tracking only. No AdminFinance transactions, no impact on finance reports. Useful for client-billed or out-of-scope projects.</li>
                    </ul>
                    <p className="mt-2 text-gray-700">The statistics cards show separate totals for Included and Excluded expenses.</p>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Adding an Expense</h3>
                    <ol className="list-decimal pl-5 space-y-1.5">
                      <li>Go to the <strong>Expenses</strong> tab.</li>
                      <li>Click <strong>Add Project Expense</strong>.</li>
                      <li>Select project, category, amount, vendor/client, paid by (Revra/Client), payment method, date, and description.</li>
                      <li>For excluded projects, a warning appears — expenses will not create system transactions.</li>
                      <li>Click Save to create the expense.</li>
                    </ol>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Statistics Cards</h3>
                    <p>On the Expenses tab, you see:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1.5">
                      <li><strong>Total Incl / Total Excl</strong> — Total expenses from included vs excluded projects</li>
                      <li><strong>Monthly Incl / Monthly Excl</strong> — Current month expenses split</li>
                      <li><strong>Today Incl / Today Excl</strong> — Today's expenses split</li>
                      <li><strong>Total Projects</strong> — Number of projects with expenses</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Project Credentials</h3>
                    <p>Store usernames, passwords, URLs, IPs, and other access info per project. Edit and delete as needed. Useful for handing off access to team members.</p>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Tips</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use <strong>Refresh</strong> to reload data if something looks stale.</li>
                      <li>Filter the expense list by category or search by project, client, or category.</li>
                      <li>View a project's details (Expenses column badge, reserved/spent/remaining) by clicking the eye icon in the Projects tab.</li>
                    </ul>
                  </section>
                </div>
              </motion.div>
            </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default Admin_project_expenses_management
