import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import Loading from '../../../components/ui/loading'
import { adminFinanceService } from '../admin-services/adminFinanceService'
import adminRequestService from '../admin-services/adminRequestService'
import { adminStorage } from '../admin-services/baseApiService'
import { useToast } from '../../../contexts/ToastContext'
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCreditCard,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiPlus,
  FiEdit,
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiBarChart,
  FiPieChart,
  FiActivity,
  FiTarget,
  FiAward,
  FiHome,
  FiX,
  FiClock,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiCheckSquare,
  FiSend,
  FiPercent,
  FiCheck
} from 'react-icons/fi'

const Admin_finance_management = () => {
  const { toast } = useToast()

  // Accountant has same power as admin on this page (no role-based restrictions)
  const adminData = adminStorage.get()
  const isFullAccessOnPage = !adminData || adminData?.role === 'admin' || adminData?.role === 'accountant'

  // State management
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('transactions')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  // Date range filter (same as dashboard)
  const [filterType, setFilterType] = useState('all') // 'day', 'week', 'month', 'year', 'custom', 'all'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showAccountViewModal, setShowAccountViewModal] = useState(false)
  const [showAccountEditModal, setShowAccountEditModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showBudgetViewModal, setShowBudgetViewModal] = useState(false)
  const [showBudgetEditModal, setShowBudgetEditModal] = useState(false)
  const [showBudgetSpendModal, setShowBudgetSpendModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [accountFormData, setAccountFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'current',
    isActive: true,
    description: ''
  })

  // Form data for different tabs
  const [transactionFormData, setTransactionFormData] = useState({
    type: 'incoming',
    category: '',
    amount: '',
    date: '',
    account: '',
    description: ''
  })

  // Accounts state
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)

  const [budgetFormData, setBudgetFormData] = useState({
    name: '',
    category: '',
    allocated: '',
    startDate: '',
    endDate: '',
    description: ''
  })


  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    amount: '',
    date: '',
    description: ''
  })

  const [budgetSpendFormData, setBudgetSpendFormData] = useState({
    amount: '',
    date: '',
    description: ''
  })

  // Finance statistics state - fetched from API
  const [statistics, setStatistics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingPayments: 0,
    activeProjects: 0,
    totalClients: 0,
    totalSales: 0,
    todayEarnings: 0,
    rewardMoney: 0,
    employeeSalary: 0,
    otherExpenses: 0,
    profitLoss: 0,
    revenueChange: '0',
    expensesChange: '0',
    profitChange: '0',
    // New breakdown fields
    revenueBreakdown: {
      paymentRevenue: 0,
      projectAdvanceRevenue: 0,
      projectInstallmentRevenue: 0,
      paymentReceiptRevenue: 0,
      transactionRevenue: 0
    },
    expenseBreakdown: {
      salaryExpenses: 0,
      recurringExpenses: 0,
      monthlyRecurringExpenses: {},
      projectExpenses: 0,
      incentiveExpenses: 0,
      rewardExpenses: 0,
      otherExpenses: 0
    },
    pendingAmounts: {
      pendingSalaries: 0,
      pendingRecurringExpenses: 0,
      pendingProjectOutstanding: 0,
      totalPendingReceivables: 0,
      totalPendingPayables: 0
    },
    todayExpenses: 0,
    todayProfit: 0,
    profitMargin: '0'
  })
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [showAllStats, setShowAllStats] = useState(false)

  // Helper: get date range based on filter type (same as dashboard)
  const getDateRange = () => {
    if (filterType === 'all') {
      return { startDate: null, endDate: null, startISO: null, endISO: null }
    }
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    let start, end
    switch (filterType) {
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

  // Helper: get filter label for display (same as dashboard)
  const getFilterLabel = () => {
    switch (filterType) {
      case 'day': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'year': return 'This Year'
      case 'all': return 'All Time'
      case 'custom':
        if (startDate && endDate) {
          const s = new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          const e = new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          return `${s} - ${e}`
        }
        return 'Custom Range'
      default: return 'This Month'
    }
  }

  // Fetch finance statistics from API
  const fetchFinanceStatistics = async () => {
    try {
      setStatisticsLoading(true)
      const dateRange = getDateRange()
      let timeFilter = 'all'
      const params = {}
      if (filterType === 'day') timeFilter = 'day'
      else if (filterType === 'week') timeFilter = 'week'
      else if (filterType === 'month') timeFilter = 'month'
      else if (filterType === 'year') timeFilter = 'year'
      else if (filterType === 'custom' && dateRange.startDate && dateRange.endDate) {
        timeFilter = 'custom'
        params.startDate = dateRange.startDate
        params.endDate = dateRange.endDate
      }
      const response = await adminFinanceService.getFinanceStatistics(timeFilter, params)

      if (response && response.success && response.data) {
        setStatistics({
          totalRevenue: response.data.totalRevenue || 0,
          totalExpenses: response.data.totalExpenses || 0,
          netProfit: response.data.netProfit || 0,
          pendingPayments: response.data.pendingPayments || 0,
          activeProjects: response.data.activeProjects || 0,
          totalClients: response.data.totalClients || 0,
          totalSales: response.data.totalSales || 0,
          todayEarnings: response.data.todayEarnings || 0,
          rewardMoney: response.data.rewardMoney || 0,
          employeeSalary: response.data.employeeSalary || 0,
          otherExpenses: response.data.otherExpenses || 0,
          profitLoss: response.data.profitLoss || 0,
          revenueChange: response.data.revenueChange || '0',
          expensesChange: response.data.expensesChange || '0',
          profitChange: response.data.profitChange || '0',
          // New breakdown fields
          revenueBreakdown: response.data.revenueBreakdown || {
            paymentRevenue: 0,
            projectAdvanceRevenue: 0,
            projectInstallmentRevenue: 0,
            paymentReceiptRevenue: 0,
            transactionRevenue: 0
          },
          expenseBreakdown: {
            salaryExpenses: response.data.expenseBreakdown?.salaryExpenses || 0,
            recurringExpenses: response.data.expenseBreakdown?.recurringExpenses || 0,
            monthlyRecurringExpenses: response.data.expenseBreakdown?.monthlyRecurringExpenses || {},
            projectExpenses: response.data.expenseBreakdown?.projectExpenses || 0,
            incentiveExpenses: response.data.expenseBreakdown?.incentiveExpenses || 0,
            rewardExpenses: response.data.expenseBreakdown?.rewardExpenses || 0,
            otherExpenses: response.data.expenseBreakdown?.otherExpenses || 0
          },
          pendingAmounts: response.data.pendingAmounts || {
            pendingSalaries: 0,
            pendingRecurringExpenses: 0,
            pendingProjectOutstanding: 0,
            totalPendingReceivables: 0,
            totalPendingPayables: 0
          },
          todayExpenses: response.data.todayExpenses || 0,
          todayProfit: response.data.todayProfit || 0,
          profitMargin: response.data.profitMargin || '0'
        })
      }
    } catch (err) {
      console.error('Error fetching finance statistics:', err)
      toast.error('Failed to load finance statistics')
    } finally {
      setStatisticsLoading(false)
    }
  }

  // Fetch statistics when component mounts or date filter changes
  useEffect(() => {
    if (filterType === 'all' || filterType !== 'custom' || (startDate && endDate)) {
      fetchFinanceStatistics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, startDate, endDate])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown])

  // Time-based statistics (now using real API data)
  const getTimeBasedStats = () => {
    return {
      todayEarnings: statistics.todayEarnings,
      rewardMoney: statistics.expenseBreakdown?.rewardExpenses || 0, // Use paid reward expenses from breakdown
      employeeSalary: statistics.employeeSalary,
      otherExpenses: statistics.otherExpenses,
      profitLoss: statistics.profitLoss
    }
  }

  // Transactions state - fetched from API
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [transactionsPages, setTransactionsPages] = useState(1)

  // Budgets state - fetched from API
  const [budgets, setBudgets] = useState([])
  const [budgetsLoading, setBudgetsLoading] = useState(false)
  const [budgetsTotal, setBudgetsTotal] = useState(0)
  const [budgetsPages, setBudgetsPages] = useState(1)


  // Expenses state - fetched from API
  const [expenses, setExpenses] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesPages, setExpensesPages] = useState(1)

  // Project Expenses state
  const [projectExpenses, setProjectExpenses] = useState([])
  const [projectExpensesLoading, setProjectExpensesLoading] = useState(false)
  const [projectExpensesTotal, setProjectExpensesTotal] = useState(0)
  const [projectExpensesPages, setProjectExpensesPages] = useState(1)
  const [projectExpenseFormData, setProjectExpenseFormData] = useState({
    projectId: '',
    name: '',
    category: '',
    amount: '',
    vendor: '',
    paymentMethod: 'Bank Transfer',
    expenseDate: new Date().toISOString().split('T')[0],
    description: ''
  })
  const [showProjectExpenseModal, setShowProjectExpenseModal] = useState(false)
  const [projectExpenseModalMode, setProjectExpenseModalMode] = useState('create') // 'create' or 'edit' or 'view'
  const [selectedProjectExpense, setSelectedProjectExpense] = useState(null)
  const [showDeleteProjectExpenseModal, setShowDeleteProjectExpenseModal] = useState(false)
  const [projectExpenseToDelete, setProjectExpenseToDelete] = useState(null)
  const [projectsList, setProjectsList] = useState([])

  // Payment approval requests (from sales / channel partners) - shown only on Finance page
  const [paymentApprovalRequests, setPaymentApprovalRequests] = useState([])
  const [paymentApprovalLoading, setPaymentApprovalLoading] = useState(false)
  const [paymentApprovalTotal, setPaymentApprovalTotal] = useState(0)
  const [paymentApprovalPages, setPaymentApprovalPages] = useState(1)
  const [showPaymentApprovalViewModal, setShowPaymentApprovalViewModal] = useState(false)
  const [showPaymentApprovalRespondModal, setShowPaymentApprovalRespondModal] = useState(false)
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null)
  const [paymentResponseText, setPaymentResponseText] = useState('')
  const [paymentResponseType, setPaymentResponseType] = useState('approve')
  const [isSubmittingPaymentResponse, setIsSubmittingPaymentResponse] = useState(false)

  // Pending recovery (projects with outstanding amount)
  const [pendingRecoveryList, setPendingRecoveryList] = useState([])
  const [pendingRecoveryLoading, setPendingRecoveryLoading] = useState(false)

  // GST projects (projects with GST applied - for finance management)
  const [gstProjectsList, setGstProjectsList] = useState([])
  const [gstProjectsLoading, setGstProjectsLoading] = useState(false)

  // Fetch accounts from API
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

  // Fetch expenses from API
  const fetchExpenses = async () => {
    try {
      setExpensesLoading(true)
      setError(null)

      const params = {
        page: currentPage,
        limit: itemsPerPage
      }

      const dateRange = getDateRange()
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate

      const response = await adminFinanceService.getExpenses(params)

      if (response.success && response.data) {
        setExpenses(response.data)
        setExpensesTotal(response.total || response.data.length)
        setExpensesPages(response.pages || 1)
      }
    } catch (err) {
      console.error('Error fetching expenses:', err)
      setError(err.message || 'Failed to fetch expenses')
      toast.error('Failed to load expenses')
    } finally {
      setExpensesLoading(false)
      setLoading(false)
    }
  }

  // Fetch project expenses from API
  const fetchProjectExpenses = async () => {
    try {
      setProjectExpensesLoading(true)
      setError(null)

      const params = {
        page: currentPage,
        limit: itemsPerPage
      }

      const dateRange = getDateRange()
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate

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

  // Fetch payment approval requests (from sales / channel partners only)
  const fetchPaymentApprovalRequests = async () => {
    try {
      setPaymentApprovalLoading(true)
      setError(null)
      const params = {
        direction: 'all',
        paymentApprovalOnly: true,
        page: currentPage,
        limit: itemsPerPage
      }
      const dateRange = getDateRange()
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate
      const response = await adminRequestService.getRequests(params)
      if (response.success && response.data) {
        setError(null)
        const transformed = response.data.map(req => ({
          id: req._id || req.id,
          module: req.module,
          type: req.type,
          title: req.title,
          description: req.description,
          status: req.status,
          priority: req.priority,
          submittedDate: req.createdAt,
          submittedBy: req.requestedBy?.name || 'Unknown',
          projectName: req.project?.name || 'N/A',
          accountName: req.metadata?.accountName || '',
          category: req.category || '',
          amount: req.amount,
          screenshotUrl: req.metadata?.screenshotUrl || null,
          response: req.response ? { type: req.response.type, message: req.response.message, respondedDate: req.response.respondedDate, respondedBy: req.response.respondedBy?.name } : null,
          _full: req
        }))
        setPaymentApprovalRequests(transformed)
        setPaymentApprovalTotal(response.pagination?.total || 0)
        setPaymentApprovalPages(response.pagination?.pages || 1)
      } else {
        setPaymentApprovalRequests([])
        setPaymentApprovalTotal(0)
        setPaymentApprovalPages(1)
      }
    } catch (err) {
      console.error('Error fetching payment approval requests:', err)
      setError(err.message || 'Failed to load payment approval requests')
      toast.error('Failed to load payment approval requests')
      setPaymentApprovalRequests([])
    } finally {
      setPaymentApprovalLoading(false)
    }
  }

  // Fetch pending recovery (projects with outstanding amount)
  const fetchPendingRecovery = async () => {
    try {
      setPendingRecoveryLoading(true)
      setError(null)
      const dateRange = getDateRange()
      const params = {}
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate
      const response = await adminFinanceService.getPendingRecovery(params)
      if (response.success && response.data) {
        setError(null)
        setPendingRecoveryList(response.data)
      } else {
        setPendingRecoveryList([])
      }
    } catch (err) {
      console.error('Error fetching pending recovery:', err)
      setError(err.message || 'Failed to load pending recovery')
      toast.error('Failed to load pending recovery')
      setPendingRecoveryList([])
    } finally {
      setPendingRecoveryLoading(false)
    }
  }

  // Fetch GST projects (projects with GST applied)
  const fetchGstProjects = async () => {
    try {
      setGstProjectsLoading(true)
      setError(null)
      const dateRange = getDateRange()
      const params = {}
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate
      const response = await adminFinanceService.getGstProjects(params)
      if (response.success && response.data) {
        setError(null)
        setGstProjectsList(response.data)
      } else {
        setGstProjectsList([])
      }
    } catch (err) {
      console.error('Error fetching GST projects:', err)
      setError(err.message || 'Failed to load GST projects')
      toast.error('Failed to load GST projects')
      setGstProjectsList([])
    } finally {
      setGstProjectsLoading(false)
    }
  }

  // Fetch projects list for dropdown
  const fetchProjectsList = async () => {
    try {
      // Import adminProjectService dynamically to avoid circular dependencies
      const { adminProjectService } = await import('../admin-services/adminProjectService')
      const response = await adminProjectService.getActiveProjects({ limit: 1000 })
      if (response.success && response.data) {
        setProjectsList(response.data.map(project => {
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
            clientName: clientName
          }
        }))
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      toast.error('Failed to load projects')
    }
  }

  // Handle project selection change to auto-fill vendor
  const handleProjectChange = async (projectId) => {
    setProjectExpenseFormData(prev => ({ ...prev, projectId }))

    // Find the selected project and auto-fill vendor with client name
    const selectedProject = projectsList.find(p => p.value === projectId)
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
          // Extract client name - prefer companyName, then name
          let clientName = null
          if (project.client) {
            if (typeof project.client === 'object') {
              clientName = project.client.companyName || project.client.name || null
            } else if (typeof project.client === 'string') {
              clientName = project.client
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

  // Fetch budgets from API
  const fetchBudgets = async () => {
    try {
      setBudgetsLoading(true)
      setError(null)

      const params = {
        page: currentPage,
        limit: itemsPerPage
      }

      const dateRange = getDateRange()
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate

      const response = await adminFinanceService.getBudgets(params)

      if (response.success && response.data) {
        // Map backend fields to frontend fields
        const mappedBudgets = response.data.map(budget => ({
          ...budget,
          id: budget._id || budget.id,
          name: budget.budgetName || budget.name,
          category: budget.budgetCategory || budget.category,
          allocated: budget.allocatedAmount || budget.allocated,
          spent: budget.spentAmount || budget.spent || 0,
          remaining: budget.remainingAmount || budget.remaining,
          startDate: budget.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : budget.startDate,
          endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : budget.endDate,
          projects: budget.budgetProjects || budget.projects || []
        }))
        setBudgets(mappedBudgets)
        setBudgetsTotal(response.total || response.data.length)
        setBudgetsPages(response.pages || 1)
      }
    } catch (err) {
      console.error('Error fetching budgets:', err)
      setError(err.message || 'Failed to fetch budgets')
      toast.error('Failed to load budgets')
    } finally {
      setBudgetsLoading(false)
      setLoading(false)
    }
  }

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true)
      setError(null)

      const params = {
        page: currentPage,
        limit: itemsPerPage
      }

      const dateRange = getDateRange()
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate

      const response = await adminFinanceService.getTransactions(params)

      if (response.success && response.data) {
        setTransactions(response.data)
        setTransactionsTotal(response.total || response.data.length)
        setTransactionsPages(response.pages || Math.ceil((response.total || response.data.length) / itemsPerPage))
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err.message || 'Failed to fetch transactions')
      toast.error('Failed to load transactions')
    } finally {
      setTransactionsLoading(false)
      setLoading(false)
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    if (activeTab === 'transactions' || activeTab === 'expenses' || activeTab === 'budgets' || activeTab === 'project-expenses' || activeTab === 'payment-approvals' || activeTab === 'pending-recovery' || activeTab === 'gst-projects') {
      setCurrentPage(1)
    }
  }, [filterType, startDate, endDate, activeTab, itemsPerPage])

  // Load data when component mounts or filters change
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions()
      fetchAccounts() // Fetch accounts when transactions tab is active
    } else if (activeTab === 'expenses') {
      fetchExpenses()
    } else if (activeTab === 'budgets') {
      fetchBudgets()
    } else if (activeTab === 'project-expenses') {
      fetchProjectExpenses()
      fetchProjectsList() // Fetch projects list for dropdown
    } else if (activeTab === 'payment-approvals') {
      fetchPaymentApprovalRequests()
    } else if (activeTab === 'pending-recovery') {
      fetchPendingRecovery()
    } else if (activeTab === 'gst-projects') {
      fetchGstProjects()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, filterType, startDate, endDate, itemsPerPage])

  // Fetch accounts when component mounts
  useEffect(() => {
    fetchAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type) => {
    return type === 'incoming' ? 'text-green-600' : 'text-red-600'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleExportToExcel = async () => {
    try {
      setExporting(true)
      const dateRange = getDateRange()
      let timeFilter = 'all'
      if (filterType === 'day') timeFilter = 'day'
      else if (filterType === 'week') timeFilter = 'week'
      else if (filterType === 'month') timeFilter = 'month'
      else if (filterType === 'year') timeFilter = 'year'
      else if (filterType === 'custom') timeFilter = 'custom'
      const params = { limit: 10000 }
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate
      const statsParams = {}
      if (dateRange.startDate) statsParams.startDate = dateRange.startDate
      if (dateRange.endDate) statsParams.endDate = dateRange.endDate

      const [
        statsRes,
        txRes,
        expRes,
        budgetRes,
        projectExpRes,
        pendingRecRes,
        gstRes,
        accountsRes,
        paymentApprovalRes
      ] = await Promise.all([
        adminFinanceService.getFinanceStatistics(timeFilter, statsParams),
        adminFinanceService.getTransactions(params),
        adminFinanceService.getExpenses(params),
        adminFinanceService.getBudgets(params),
        adminFinanceService.getProjectExpenses(params),
        adminFinanceService.getPendingRecovery(params),
        adminFinanceService.getGstProjects(params),
        adminFinanceService.getAccounts({}),
        adminRequestService.getRequests({ direction: 'all', paymentApprovalOnly: true, limit: 10000, ...(dateRange.startDate && { startDate: dateRange.startDate }), ...(dateRange.endDate && { endDate: dateRange.endDate }) })
      ])

      const stats = (statsRes && statsRes.success && statsRes.data) ? statsRes.data : {}
      const transactionsList = (txRes && txRes.success && txRes.data) ? txRes.data : []
      const expensesList = (expRes && expRes.success && expRes.data) ? expRes.data : []
      const budgetsList = (budgetRes && budgetRes.success && budgetRes.data) ? budgetRes.data : []
      const projectExpensesList = (projectExpRes && projectExpRes.success && projectExpRes.data) ? projectExpRes.data : []
      const pendingRecoveryListExport = (pendingRecRes && pendingRecRes.success && pendingRecRes.data) ? pendingRecRes.data : []
      const gstProjectsListExport = (gstRes && gstRes.success && gstRes.data) ? gstRes.data : []
      const accountsList = (accountsRes && accountsRes.success && accountsRes.data) ? accountsRes.data : []
      const paymentApprovalList = (paymentApprovalRes && paymentApprovalRes.success && paymentApprovalRes.data) ? paymentApprovalRes.data : []

      const wb = XLSX.utils.book_new()

      const filterLabel = getFilterLabel()
      const summaryRows = [
        { Metric: 'Report Info', Value: '' },
        { Metric: 'Date filter applied', Value: filterLabel },
        { Metric: 'From (date)', Value: dateRange.startDate || 'All' },
        { Metric: 'To (date)', Value: dateRange.endDate || 'All' },
        { Metric: 'Exported at', Value: new Date().toLocaleString('en-IN') },
        { Metric: '', Value: '' },
        { Metric: 'Summary (statistics for selected period)', Value: '' },
        { Metric: 'Total Revenue', Value: stats.totalRevenue ?? 0 },
        { Metric: 'Total Expenses', Value: stats.totalExpenses ?? 0 },
        { Metric: 'Net Profit', Value: stats.netProfit ?? 0 },
        { Metric: 'Total Sales', Value: stats.totalSales ?? 0 },
        { Metric: 'Today Earnings', Value: stats.todayEarnings ?? 0 },
        { Metric: 'Today Expenses', Value: stats.todayExpenses ?? 0 },
        { Metric: 'Today Profit', Value: stats.todayProfit ?? 0 },
        { Metric: 'Pending Receivables', Value: (stats.pendingAmounts && stats.pendingAmounts.totalPendingReceivables) ?? 0 },
        { Metric: 'Pending Salaries', Value: (stats.pendingAmounts && stats.pendingAmounts.pendingSalaries) ?? 0 },
        { Metric: 'Employee Salary', Value: stats.employeeSalary ?? 0 },
        { Metric: 'Reward Money', Value: stats.rewardMoney ?? 0 },
        { Metric: 'Project Advance Revenue', Value: (stats.revenueBreakdown && stats.revenueBreakdown.projectAdvanceRevenue) ?? 0 },
        { Metric: 'Incentive Expenses', Value: (stats.expenseBreakdown && stats.expenseBreakdown.incentiveExpenses) ?? 0 },
        { Metric: 'Reward Expenses', Value: (stats.expenseBreakdown && stats.expenseBreakdown.rewardExpenses) ?? 0 },
        { Metric: 'Active Projects', Value: stats.activeProjects ?? 0 },
        { Metric: 'Total Clients', Value: stats.totalClients ?? 0 }
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary')

      const txRows = transactionsList.map(t => ({
        Type: t.transactionType || t.type || '',
        Category: t.category || '',
        Amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0,
        Date: t.transactionDate || t.date || t.createdAt ? new Date(t.transactionDate || t.date || t.createdAt).toISOString().split('T')[0] : '',
        Account: (t.account && (t.account.accountName || t.account.name)) ? (t.account.accountName || t.account.name) : (t.account && t.account._id) ? t.account._id : '',
        Description: t.description || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ Type: '', Category: '', Amount: '', Date: '', Account: '', Description: '' }]), 'Transactions')

      const expRows = expensesList.map(e => ({
        Category: e.category || e.expenseCategory || '',
        Amount: typeof e.amount === 'number' ? e.amount : parseFloat(e.amount) || 0,
        Date: e.expenseDate || e.date || e.createdAt ? new Date(e.expenseDate || e.date || e.createdAt).toISOString().split('T')[0] : '',
        Description: e.description || '',
        Status: e.status || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Category: '', Amount: '', Date: '', Description: '', Status: '' }]), 'Expenses')

      const budgetRows = budgetsList.map(b => ({
        Name: b.budgetName || b.name || '',
        Category: b.budgetCategory || b.category || '',
        Allocated: typeof (b.allocatedAmount ?? b.allocated) === 'number' ? (b.allocatedAmount ?? b.allocated) : parseFloat(b.allocatedAmount ?? b.allocated) || 0,
        Spent: typeof (b.spentAmount ?? b.spent) === 'number' ? (b.spentAmount ?? b.spent) : parseFloat(b.spentAmount ?? b.spent) || 0,
        Remaining: typeof (b.remainingAmount ?? b.remaining) === 'number' ? (b.remainingAmount ?? b.remaining) : parseFloat(b.remainingAmount ?? b.remaining) || 0,
        'Start Date': b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
        'End Date': b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '',
        Description: b.description || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetRows.length ? budgetRows : [{ Name: '', Category: '', Allocated: '', Spent: '', Remaining: '', 'Start Date': '', 'End Date': '', Description: '' }]), 'Budgets')

      const projectExpRows = projectExpensesList.map(pe => ({
        Project: (pe.project && (pe.project.name || pe.project.projectName)) ? (pe.project.name || pe.project.projectName) : '',
        Name: pe.name || '',
        Category: pe.category || '',
        Amount: typeof pe.amount === 'number' ? pe.amount : parseFloat(pe.amount) || 0,
        Vendor: pe.vendor || '',
        'Payment Method': pe.paymentMethod || '',
        Date: pe.expenseDate || pe.date || pe.createdAt ? new Date(pe.expenseDate || pe.date || pe.createdAt).toISOString().split('T')[0] : '',
        Description: pe.description || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectExpRows.length ? projectExpRows : [{ Project: '', Name: '', Category: '', Amount: '', Vendor: '', 'Payment Method': '', Date: '', Description: '' }]), 'Project Expenses')

      const accountRows = accountsList.map(a => ({
        'Account Name': a.accountName || a.name || '',
        Bank: a.bankName || a.bank || '',
        'Account Number': a.accountNumber || '',
        IFSC: a.ifscCode || a.ifsc || '',
        Branch: a.branchName || a.branch || '',
        Type: a.accountType || '',
        Active: a.isActive !== false ? 'Yes' : 'No',
        Description: a.description || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountRows.length ? accountRows : [{ 'Account Name': '', Bank: '', 'Account Number': '', IFSC: '', Branch: '', Type: '', Active: '', Description: '' }]), 'Accounts')

      const pendingRecRows = pendingRecoveryListExport.map(pr => ({
        'Project Name': (pr.project && (pr.project.name || pr.project.projectName)) ? (pr.project.name || pr.project.projectName) : pr.projectName || '',
        Client: (pr.client && pr.client.name) ? pr.client.name : pr.clientName || '',
        'Outstanding Amount': typeof (pr.outstandingAmount ?? pr.amount) === 'number' ? (pr.outstandingAmount ?? pr.amount) : parseFloat(pr.outstandingAmount ?? pr.amount) || 0,
        Status: pr.status || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingRecRows.length ? pendingRecRows : [{ 'Project Name': '', Client: '', 'Outstanding Amount': '', Status: '' }]), 'Pending Recovery')

      const gstRows = gstProjectsListExport.map(g => ({
        'Project Name': (g.project && (g.project.name || g.project.projectName)) ? (g.project.name || g.project.projectName) : g.name || g.projectName || '',
        Client: (g.client && g.client.name) ? g.client.name : g.clientName || '',
        Status: g.status || '',
        Progress: g.progress != null ? g.progress : '',
        'Total Cost': typeof (g.totalCost ?? g.cost) === 'number' ? (g.totalCost ?? g.cost) : parseFloat(g.totalCost ?? g.cost) || 0
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gstRows.length ? gstRows : [{ 'Project Name': '', Client: '', Status: '', Progress: '', 'Total Cost': '' }]), 'GST Projects')

      const paymentRows = paymentApprovalList.map(req => ({
        Module: req.module || '',
        Type: req.type || '',
        Title: req.title || '',
        Description: req.description || '',
        Amount: typeof req.amount === 'number' ? req.amount : parseFloat(req.amount) || 0,
        Status: req.status || '',
        Priority: req.priority || '',
        'Submitted Date': req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : '',
        'Submitted By': (req.requestedBy && req.requestedBy.name) ? req.requestedBy.name : ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows.length ? paymentRows : [{ Module: '', Type: '', Title: '', Description: '', Amount: '', Status: '', Priority: '', 'Submitted Date': '', 'Submitted By': '' }]), 'Payment Approvals')

      const fileName = `Finance_Export_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Finance data exported to Excel successfully')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error(err?.message || 'Failed to export finance data')
    } finally {
      setExporting(false)
    }
  }

  // Payment approval request helpers
  const getRequestStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'responded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  const handlePaymentApprovalView = (request) => {
    setSelectedPaymentRequest(request)
    setShowPaymentApprovalViewModal(true)
  }
  const handlePaymentApprovalRespond = (request) => {
    setSelectedPaymentRequest(request)
    setPaymentResponseText('')
    setPaymentResponseType('approve')
    setShowPaymentApprovalRespondModal(true)
  }
  const handleSubmitPaymentResponse = async () => {
    if (paymentResponseType !== 'approve' && !paymentResponseText.trim()) {
      toast.error('Please enter a message when rejecting or requesting changes')
      return
    }
    setIsSubmittingPaymentResponse(true)
    try {
      const requestId = selectedPaymentRequest._full?._id || selectedPaymentRequest.id
      const response = await adminRequestService.respondToRequest(requestId, paymentResponseType, paymentResponseText)
      if (response.success) {
        await fetchPaymentApprovalRequests()
        setShowPaymentApprovalRespondModal(false)
        setSelectedPaymentRequest(null)
        setPaymentResponseText('')
        setPaymentResponseType('approve')
        toast.success('Response submitted successfully')
      } else {
        toast.error(response.message || 'Failed to submit response')
      }
    } catch (err) {
      console.error('Error submitting payment response:', err)
      toast.error(err?.message || 'Failed to submit response')
    } finally {
      setIsSubmittingPaymentResponse(false)
    }
  }

  // Project Expense CRUD Handlers
  const handleCreateProjectExpense = () => {
    setProjectExpenseFormData({
      projectId: '',
      name: '',
      category: '',
      amount: '',
      vendor: '',
      paymentMethod: 'Bank Transfer',
      expenseDate: new Date().toISOString().split('T')[0],
      description: ''
    })
    setProjectExpenseModalMode('create')
    setSelectedProjectExpense(null)
    setShowProjectExpenseModal(true)
  }

  const handleEditProjectExpense = (expense) => {
    setProjectExpenseFormData({
      projectId: expense.project?._id || expense.projectId || '',
      name: expense.name || '',
      category: expense.category || '',
      amount: expense.amount || '',
      vendor: expense.vendor || '',
      paymentMethod: expense.paymentMethod || 'Bank Transfer',
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: expense.description || ''
    })
    setProjectExpenseModalMode('edit')
    setSelectedProjectExpense(expense)
    setShowProjectExpenseModal(true)
  }

  const handleViewProjectExpense = (expense) => {
    setProjectExpenseFormData({
      projectId: expense.project?._id || expense.projectId || '',
      name: expense.name || '',
      category: expense.category || '',
      amount: expense.amount || '',
      vendor: expense.vendor || '',
      paymentMethod: expense.paymentMethod || 'Bank Transfer',
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '',
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
        fetchFinanceStatistics() // Refresh statistics
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
    if (!projectExpenseFormData.projectId || !projectExpenseFormData.name ||
      !projectExpenseFormData.category || !projectExpenseFormData.amount ||
      !projectExpenseFormData.expenseDate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      let response
      if (projectExpenseModalMode === 'create') {
        response = await adminFinanceService.createProjectExpense(projectExpenseFormData)
      } else {
        response = await adminFinanceService.updateProjectExpense(
          selectedProjectExpense._id || selectedProjectExpense.id,
          projectExpenseFormData
        )
      }

      if (response.success) {
        toast.success(`Project expense ${projectExpenseModalMode === 'create' ? 'created' : 'updated'} successfully`)
        setShowProjectExpenseModal(false)
        // Reset form
        setProjectExpenseFormData({
          projectId: '',
          name: '',
          category: '',
          amount: '',
          vendor: '',
          paymentMethod: 'Bank Transfer',
          expenseDate: new Date().toISOString().split('T')[0],
          description: ''
        })
        setSelectedProjectExpense(null)
        // Always refresh project expenses data after create/update
        await fetchProjectExpenses()
        fetchFinanceStatistics() // Refresh statistics
      } else {
        toast.error(response.message || `Failed to ${projectExpenseModalMode === 'create' ? 'create' : 'update'} project expense`)
      }
    } catch (err) {
      console.error(`Error ${projectExpenseModalMode === 'create' ? 'creating' : 'updating'} project expense:`, err)
      toast.error(err.message || `Failed to ${projectExpenseModalMode === 'create' ? 'create' : 'update'} project expense`)
    }
  }

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'transactions':
        return transactions.map(t => ({
          ...t,
          id: t._id || t.id,
          type: t.transactionType || t.type,
          date: t.transactionDate || t.date || t.createdAt
        }))
      case 'budgets':
        return budgets.map(b => ({
          ...b,
          id: b._id || b.id
        }))
      case 'expenses':
        return expenses.map(e => ({
          ...e,
          id: e._id || e.id,
          date: e.transactionDate || e.date || e.createdAt
        }))
      case 'project-expenses':
        return projectExpenses.map(e => ({
          ...e,
          id: e._id || e.id,
          date: e.expenseDate || e.createdAt
        }))
      case 'accounts':
        return accounts.map(a => ({
          ...a,
          id: a._id || a.id
        }))
      case 'payment-approvals':
        return paymentApprovalRequests
      case 'pending-recovery':
        return pendingRecoveryList
      case 'gst-projects':
        return gstProjectsList
      default:
        return transactions
    }
  }

  // Filter data based on search and filter criteria
  // Note: Transactions, expenses, and budgets are filtered on the backend, so we skip client-side filtering for them
  const filteredData = useMemo(() => {
    const data = getCurrentData()

    // For transactions, expenses, budgets, project-expenses, and payment-approvals, backend handles filtering
    if (activeTab === 'transactions' || activeTab === 'expenses' || activeTab === 'budgets' || activeTab === 'project-expenses' || activeTab === 'payment-approvals' || activeTab === 'pending-recovery' || activeTab === 'gst-projects') {
      return data
    }

    // For other tabs (e.g. accounts), return data as-is (no client-side filters)
    return data
  }, [activeTab, transactions, expenses, budgets, projectExpenses, paymentApprovalRequests, pendingRecoveryList, gstProjectsList, accounts])

  // Pagination
  const paginatedData = useMemo(() => {
    // For transactions, expenses, budgets, project-expenses, and payment-approvals, backend handles pagination
    if (activeTab === 'transactions' || activeTab === 'expenses' || activeTab === 'budgets' || activeTab === 'project-expenses' || activeTab === 'payment-approvals' || activeTab === 'pending-recovery' || activeTab === 'gst-projects') {
      return filteredData
    }
    // For other tabs, apply client-side pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage, activeTab])

  const totalPages = activeTab === 'transactions'
    ? transactionsPages
    : activeTab === 'expenses'
      ? expensesPages
      : activeTab === 'budgets'
        ? budgetsPages
        : activeTab === 'project-expenses'
          ? projectExpensesPages
          : activeTab === 'payment-approvals'
            ? paymentApprovalPages
            : activeTab === 'pending-recovery'
              ? 1
              : activeTab === 'gst-projects'
                ? 1
                : Math.ceil(filteredData.length / itemsPerPage)

  // Management functions
  const handleCreate = () => {
    setSelectedItem(null)
    setShowCreateModal(true)
  }

  const handleEdit = (item) => {
    if (activeTab === 'budgets') {
      handleEditBudget(item)
    } else if (activeTab === 'transactions') {
      handleEditTransaction(item)
    } else if (activeTab === 'expenses') {
      handleEditExpense(item)
    } else {
      setSelectedItem(item)
      setShowEditModal(true)
    }
  }

  const handleView = (item) => {
    if (activeTab === 'budgets') {
      handleViewBudget(item)
    } else if (activeTab === 'transactions') {
      handleViewTransaction(item)
    } else {
      setSelectedItem(item)
      setShowViewModal(true)
    }
  }

  // Transaction-specific handlers
  const handleViewTransaction = (transaction) => {
    setSelectedItem(transaction)
    setShowViewModal(true)
  }

  const handleEditTransaction = async (transaction) => {
    setSelectedItem(transaction)

    // Ensure accounts are loaded before opening edit modal
    if (accounts.length === 0) {
      await fetchAccounts()
    }

    setTransactionFormData({
      type: transaction.transactionType || transaction.type || 'incoming',
      category: transaction.category || '',
      amount: transaction.amount || '',
      date: transaction.transactionDate || transaction.date || transaction.createdAt ? new Date(transaction.transactionDate || transaction.date || transaction.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      account: transaction.account?._id || transaction.account?.id || transaction.account || '',
      description: transaction.description || ''
    })
    setShowTransactionModal(true)
  }

  // Budget-specific handlers
  const handleViewBudget = (budget) => {
    setSelectedItem(budget)
    setShowBudgetViewModal(true)
  }

  const handleEditBudget = (budget) => {
    setSelectedItem(budget)
    setBudgetFormData({
      name: budget.name || budget.budgetName || '',
      category: budget.category || budget.budgetCategory || '',
      allocated: budget.allocated || budget.allocatedAmount || '',
      startDate: budget.startDate ? (typeof budget.startDate === 'string' ? budget.startDate : new Date(budget.startDate).toISOString().split('T')[0]) : '',
      endDate: budget.endDate ? (typeof budget.endDate === 'string' ? budget.endDate : new Date(budget.endDate).toISOString().split('T')[0]) : '',
      description: budget.description || ''
    })
    setShowBudgetEditModal(true)
  }

  const handleSpendBudget = (budget) => {
    setSelectedItem(budget)
    setBudgetSpendFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
    setShowBudgetSpendModal(true)
  }

  const handleDelete = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (deleteConfirm === 'DELETE') {
      // Handle delete logic here
      console.log('Deleting item:', selectedItem)
      setShowDeleteModal(false)
      setDeleteConfirm('')
      setSelectedItem(null)
    }
  }

  const handleSave = (formData) => {
    // Handle save logic here
    console.log('Saving data:', formData)
    setShowCreateModal(false)
    setShowEditModal(false)
    setSelectedItem(null)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setShowDeleteModal(false)
    setShowAccountModal(false)
    setShowAccountViewModal(false)
    setShowAccountEditModal(false)
    setShowTransactionModal(false)
    setShowBudgetModal(false)
    setShowBudgetViewModal(false)
    setShowBudgetEditModal(false)
    setShowBudgetSpendModal(false)
    setShowExpenseModal(false)
    setShowProjectExpenseModal(false)
    setShowDeleteProjectExpenseModal(false)
    setProjectExpenseToDelete(null)
    setSelectedItem(null)
    setDeleteConfirm('')
    setAccountFormData({
      accountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: 'current',
      isActive: true,
      description: ''
    })
    setTransactionFormData({
      type: 'incoming',
      category: '',
      amount: '',
      date: '',
      account: '',
      description: ''
    })
    setBudgetFormData({
      name: '',
      category: '',
      allocated: '',
      startDate: '',
      endDate: '',
      description: ''
    })
    setExpenseFormData({
      category: '',
      amount: '',
      date: '',
      description: ''
    })
  }

  const handleCreateAccount = () => {
    setAccountFormData({
      accountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: 'current',
      isActive: true,
      description: ''
    })
    setShowAccountModal(true)
  }

  const handleSaveAccount = async () => {
    if (!accountFormData.accountName || !accountFormData.bankName || !accountFormData.accountNumber) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const response = await adminFinanceService.createAccount(accountFormData)

      if (response && response.success) {
        toast.success(response.message || 'Account created successfully')
        setShowAccountModal(false)
        closeModals()
        // Refresh accounts list
        await fetchAccounts()
      } else {
        toast.error(response?.message || 'Failed to create account')
      }
    } catch (err) {
      console.error('Error creating account:', err)
      toast.error(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleViewAccount = (account) => {
    setSelectedItem(account)
    setShowAccountViewModal(true)
  }

  const handleEditAccount = (account) => {
    setSelectedItem(account)
    setAccountFormData({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      branchName: account.branchName,
      accountType: account.accountType,
      isActive: account.isActive,
      description: account.description
    })
    setShowAccountEditModal(true)
  }

  const handleUpdateAccount = async () => {
    if (!accountFormData.accountName || !accountFormData.bankName || !accountFormData.accountNumber) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const accountId = selectedItem._id || selectedItem.id
      const response = await adminFinanceService.updateAccount(accountId, accountFormData)

      if (response && response.success) {
        toast.success(response.message || 'Account updated successfully')
        setShowAccountEditModal(false)
        closeModals()
        setSelectedItem(null)
        // Reset form
        setAccountFormData({
          accountName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branchName: '',
          accountType: 'current',
          isActive: true,
          description: ''
        })
        // Refresh accounts list
        await fetchAccounts()
      } else {
        toast.error(response?.message || 'Failed to update account')
      }
    } catch (err) {
      console.error('Error updating account:', err)
      toast.error(err.message || 'Failed to update account')
    } finally {
      setLoading(false)
    }
  }

  // Handler functions for different tabs
  const handleCreateTransaction = () => {
    setSelectedItem(null)
    setTransactionFormData({
      type: 'incoming',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      account: '',
      description: ''
    })
    setShowTransactionModal(true)
  }

  const handleCreateBudget = () => {
    setBudgetFormData({
      name: '',
      category: '',
      allocated: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      description: ''
    })
    setShowBudgetModal(true)
  }


  const handleCreateExpense = () => {
    setSelectedItem(null)
    setExpenseFormData({
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
    setShowExpenseModal(true)
  }

  const handleEditExpense = (expense) => {
    setSelectedItem(expense)
    setExpenseFormData({
      category: expense.category || '',
      amount: expense.amount || '',
      date: expense.transactionDate || expense.date || expense.createdAt
        ? new Date(expense.transactionDate || expense.date || expense.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      description: expense.description || ''
    })
    setShowExpenseModal(true)
  }

  const handleSaveTransaction = async () => {
    if (!transactionFormData.category || !transactionFormData.amount || !transactionFormData.date) {
      toast.error('Please fill in all required fields')
      return
    }

    // Account is recommended but not strictly required by backend for outgoing, 
    // but we can keep it optional for now or make it required for better tracking.
    // The user's request specificies "ensure it's shown whenever a new transaction is added"
    if (!transactionFormData.account) {
      toast.error('Please select an account')
      return
    }

    try {
      setLoading(true)

      const transactionData = {
        type: transactionFormData.type,
        category: transactionFormData.category,
        amount: parseFloat(transactionFormData.amount),
        date: transactionFormData.date,
        description: transactionFormData.description || ''
      }

      // Add account if selected
      if (transactionFormData.account) {
        transactionData.account = transactionFormData.account
      }

      let response
      if (selectedItem && (selectedItem._id || selectedItem.id)) {
        // Update existing transaction
        const transactionId = selectedItem._id || selectedItem.id
        console.log('Updating transaction with data:', transactionData)
        response = await adminFinanceService.updateTransaction(transactionId, transactionData)
        console.log('Transaction update response:', response)
      } else {
        // Create new transaction
        console.log('Creating transaction with data:', transactionData)
        response = await adminFinanceService.createTransaction(transactionData)
        console.log('Transaction creation response:', response)
      }

      if (response && response.success) {
        toast.success(response.message || (selectedItem ? 'Transaction updated successfully' : 'Transaction created successfully'))
        setShowTransactionModal(false)
        closeModals()
        // Refresh transactions list
        await fetchTransactions()
        // Refresh statistics
        await fetchFinanceStatistics()
      } else {
        toast.error(response?.message || 'Failed to save transaction')
      }
    } catch (err) {
      console.error('Error saving transaction:', err)
      toast.error(err.message || 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBudget = async () => {
    if (!budgetFormData.name || !budgetFormData.category || !budgetFormData.allocated || !budgetFormData.startDate || !budgetFormData.endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      const budgetData = {
        name: budgetFormData.name,
        category: budgetFormData.category,
        allocated: parseFloat(budgetFormData.allocated),
        startDate: budgetFormData.startDate,
        endDate: budgetFormData.endDate,
        description: budgetFormData.description || ''
      }

      console.log('Creating budget with data:', budgetData)
      const response = await adminFinanceService.createBudget(budgetData)
      console.log('Budget creation response:', response)

      if (response && response.success) {
        toast.success(response.message || 'Budget created successfully')
        setShowBudgetModal(false)
        closeModals()
        // Refresh budgets list
        await fetchBudgets()
      } else {
        toast.error(response?.message || 'Failed to create budget')
      }
    } catch (err) {
      console.error('Error creating budget:', err)
      toast.error(err.message || 'Failed to create budget')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBudget = async () => {
    if (!budgetFormData.name || !budgetFormData.category || !budgetFormData.allocated || !budgetFormData.startDate || !budgetFormData.endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!selectedItem || !selectedItem._id && !selectedItem.id) {
      toast.error('Budget not selected')
      return
    }

    try {
      setLoading(true)

      const budgetData = {
        name: budgetFormData.name,
        category: budgetFormData.category,
        allocated: parseFloat(budgetFormData.allocated),
        startDate: budgetFormData.startDate,
        endDate: budgetFormData.endDate,
        description: budgetFormData.description || '',
        status: selectedItem.status || 'active'
      }

      const budgetId = selectedItem._id || selectedItem.id
      const response = await adminFinanceService.updateBudget(budgetId, budgetData)

      if (response && response.success) {
        toast.success(response.message || 'Budget updated successfully')
        setShowBudgetEditModal(false)
        closeModals()
        // Refresh budgets list
        await fetchBudgets()
      } else {
        toast.error(response?.message || 'Failed to update budget')
      }
    } catch (err) {
      console.error('Error updating budget:', err)
      toast.error(err.message || 'Failed to update budget')
    } finally {
      setLoading(false)
    }
  }

  const handleSpendFromBudget = async () => {
    if (!budgetSpendFormData.amount || !budgetSpendFormData.date) {
      toast.error('Please fill in amount and date')
      return
    }

    if (!selectedItem || !selectedItem._id && !selectedItem.id) {
      toast.error('Budget not selected')
      return
    }

    const spendAmount = parseFloat(budgetSpendFormData.amount)
    if (spendAmount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    try {
      setLoading(true)

      // Create an outgoing transaction with the budget's category
      const budgetCategory = selectedItem.category || selectedItem.budgetCategory
      const expenseData = {
        category: budgetCategory,
        amount: spendAmount,
        date: budgetSpendFormData.date,
        description: budgetSpendFormData.description || `Budget spend for ${selectedItem.name || selectedItem.budgetName}`
      }

      // Create the expense (which is an outgoing transaction)
      const expenseResponse = await adminFinanceService.createExpense(expenseData)

      if (expenseResponse && expenseResponse.success) {
        toast.success(`₹${spendAmount.toLocaleString()} spent from budget successfully`)
        setShowBudgetSpendModal(false)
        closeModals()
        // Refresh budgets list to update spent amount
        await fetchBudgets()
      } else {
        toast.error(expenseResponse?.message || 'Failed to record budget spend')
      }
    } catch (err) {
      console.error('Error spending from budget:', err)
      toast.error(err.message || 'Failed to record budget spend')
    } finally {
      setLoading(false)
    }
  }


  const handleSaveExpense = async () => {
    if (!expenseFormData.category || !expenseFormData.amount || !expenseFormData.date) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      const expenseData = {
        category: expenseFormData.category,
        amount: parseFloat(expenseFormData.amount),
        date: expenseFormData.date,
        description: expenseFormData.description || ''
      }

      let response
      if (selectedItem && (selectedItem._id || selectedItem.id)) {
        // Update existing expense
        const expenseId = selectedItem._id || selectedItem.id
        console.log('Updating expense with data:', expenseData)
        response = await adminFinanceService.updateExpense(expenseId, expenseData)
        console.log('Expense update response:', response)
      } else {
        // Create new expense
        console.log('Creating expense with data:', expenseData)
        response = await adminFinanceService.createExpense(expenseData)
        console.log('Expense creation response:', response)
      }

      if (response && response.success) {
        toast.success(response.message || (selectedItem ? 'Expense updated successfully' : 'Expense created successfully'))
        setShowExpenseModal(false)
        closeModals()
        setSelectedItem(null)
        // Reset form
        setExpenseFormData({
          category: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        })
        // Refresh expenses list
        await fetchExpenses()
      } else {
        toast.error(response?.message || (selectedItem ? 'Failed to update expense' : 'Failed to create expense'))
      }
    } catch (err) {
      console.error('Error saving expense:', err)
      toast.error(err.message || (selectedItem ? 'Failed to update expense' : 'Failed to create expense'))
    } finally {
      setLoading(false)
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
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Finance Management
                </h1>
                <p className="text-gray-600">
                  Comprehensive financial oversight and management dashboard
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Date Range Filter (same as dashboard) */}
                <div className="relative filter-dropdown-container">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200 shadow-sm text-sm font-medium text-gray-700 min-w-[140px] justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FiCalendar className="h-4 w-4 text-blue-600" />
                      <span>{getFilterLabel()}</span>
                    </span>
                    <FiChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
                    >
                      <div className="px-3 pt-2 pb-2">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Date range</p>
                        <div className="space-y-0.5">
                          {[
                            { type: 'all', label: 'All Time' },
                            { type: 'day', label: 'Today' },
                            { type: 'week', label: 'This Week' },
                            { type: 'month', label: 'This Month' },
                            { type: 'year', label: 'This Year' }
                          ].map(({ type, label }) => (
                            <button
                              key={type}
                              onClick={() => {
                                setStartDate('')
                                setEndDate('')
                                setFilterType(type)
                                setShowFilterDropdown(false)
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${filterType === type ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                              <span className="flex-1">{label}</span>
                              {filterType === type && <FiCheck className="h-4 w-4 text-blue-600 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50">
                        <button
                          onClick={() => {
                            setTempStartDate(startDate)
                            setTempEndDate(endDate)
                            setFilterType('custom')
                            setShowDateRangePicker(true)
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${filterType === 'custom' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                          <FiCalendar className="h-3.5 w-3.5" />
                          <span className="flex-1">Custom range</span>
                          {filterType === 'custom' && <FiCheck className="h-4 w-4 text-blue-600 shrink-0" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => setShowBreakdownModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 shadow-sm text-sm font-medium text-gray-700"
                >
                  <FiBarChart className="h-4 w-4 text-gray-500" />
                  <span>How it's calculated</span>
                </button>

                <button
                  onClick={handleExportToExcel}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 shadow-sm text-sm font-medium text-gray-700"
                  title="Export all financial data to Excel"
                >
                  <FiDownload className={`h-4 w-4 text-gray-600 ${exporting ? 'animate-pulse' : ''}`} />
                  <span>{exporting ? 'Exporting…' : 'Export to Excel'}</span>
                </button>

                <button
                  onClick={() => {
                    fetchFinanceStatistics() // Always refresh statistics
                    if (activeTab === 'transactions') {
                      fetchTransactions()
                    } else if (activeTab === 'expenses') {
                      fetchExpenses()
                    } else if (activeTab === 'budgets') {
                      fetchBudgets()
                    } else if (activeTab === 'payment-approvals') {
                      fetchPaymentApprovalRequests()
                    } else if (activeTab === 'pending-recovery') {
                      fetchPendingRecovery()
                    } else if (activeTab === 'gst-projects') {
                      fetchGstProjects()
                    }
                  }}
                  disabled={loading || statisticsLoading || (activeTab === 'transactions' && transactionsLoading) || (activeTab === 'expenses' && expensesLoading) || (activeTab === 'budgets' && budgetsLoading) || (activeTab === 'payment-approvals' && paymentApprovalLoading) || (activeTab === 'pending-recovery' && pendingRecoveryLoading) || (activeTab === 'gst-projects' && gstProjectsLoading)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw className={`text-sm ${(loading || statisticsLoading || transactionsLoading || expensesLoading || budgetsLoading || paymentApprovalLoading || pendingRecoveryLoading || gstProjectsLoading) ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Custom Date Range Picker Modal */}
              {showDateRangePicker && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
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
                        <FiX className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          max={tempEndDate || new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
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
                              setShowDateRangePicker(false)
                              setShowFilterDropdown(false)
                            }
                          }}
                          disabled={!tempStartDate || !tempEndDate}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => setShowDateRangePicker(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Statistics Breakdown Sheet - How it's calculated */}
              <AnimatePresence>
                {showBreakdownModal && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowBreakdownModal(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      className="fixed right-0 top-0 z-[70] h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto border-l border-gray-200"
                      style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}
                    >
                      {/* Sheet header */}
                      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiBarChart className="h-5 w-5 text-blue-600" />
                          <h2 className="text-lg font-semibold text-gray-900">Finance Guide — How Cards Are Calculated</h2>
                        </div>
                        <button
                          onClick={() => setShowBreakdownModal(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FiX className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>

                      <div className="px-6 py-5 space-y-6 text-sm text-gray-900">
                      <p className="text-gray-700">All metrics respect the selected date range. Sources are mutually exclusive to prevent double-counting.</p>

                      {/* Revenue section */}
                      <section>
                        <h3 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Revenue (Incoming)</h3>
                        <div className="space-y-2 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="font-medium text-gray-900">Total Revenue</p>
                            <p className="text-gray-700 mt-1">= Completed Payments + Approved Payment Receipts + Paid Installments + Other Incoming Transactions</p>
                            <p className="text-xs text-gray-600 mt-2">(Payment receipts & installments are excluded from &quot;Other&quot; to avoid double-counting.)</p>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                            <li><strong>Completed Payments</strong> — Payment model, paid in period</li>
                            <li><strong>Payment Receipts</strong> — Approved receipts (verifiedAt in period)</li>
                            <li><strong>Paid Installments</strong> — Project installment plans, paid in period</li>
                            <li><strong>Other Incoming</strong> — Manual/other transactions (excludes payment, installment, paymentReceipt)</li>
                          </ul>
                        </div>
                      </section>

                      {/* Expenses section */}
                      <section>
                        <h3 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Expenses (Outgoing)</h3>
                        <div className="space-y-2 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="font-medium text-gray-900">Total Expenses</p>
                            <p className="text-gray-700 mt-1">= Salaries + Recurring + Incentives + Rewards (incl. PM) + Project Expenses + Other Expenses</p>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                            <li><strong>Salary</strong> — Paid salaries (Salary model, month filter)</li>
                            <li><strong>Recurring</strong> — Paid expense entries (ExpenseEntry, paidDate)</li>
                            <li><strong>Incentives</strong> — Incentive Payment transactions (AdminFinance)</li>
                            <li><strong>Rewards</strong> — Reward Payment + PM Reward transactions</li>
                            <li><strong>Project Expenses</strong> — Project.expenses array (expenseDate)</li>
                            <li><strong>Other</strong> — Outgoing transactions not from above sources</li>
                          </ul>
                        </div>
                      </section>

                      {/* Derived metrics */}
                      <section>
                        <h3 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Derived Metrics</h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li><strong>Net Profit</strong> = Total Revenue − Total Expenses</li>
                          <li><strong>Today Earnings</strong> = Today&apos;s payments + receipts + installments + other incoming</li>
                          <li><strong>Today Expenses</strong> = Today&apos;s salaries + recurring + project expenses + incentives + rewards + other</li>
                          <li><strong>Today Profit</strong> = Today Earnings − Today Expenses</li>
                          <li><strong>Total Sales</strong> = Sum of project costs (financialDetails.totalCost) in period</li>
                          <li><strong>Pending Receivables</strong> = Sum of project remainingAmount (outstanding from clients)</li>
                          <li><strong>Pending Payables</strong> = Pending salaries + pending recurring expenses</li>
                        </ul>
                      </section>

                      {/* Change percentages */}
                      <section>
                        <h3 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Change Percentages</h3>
                        <p className="text-gray-700">When filter is &quot;This Month&quot;: Revenue, Expenses, and Profit % are compared to last month.</p>
                      </section>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            </div>
          </div>

          {/* Statistics Loading State */}
          {statisticsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loading size="medium" />
            </div>
          ) : (
            <>
              {/* PRIMARY KPIs - Hero Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5"
              >
                {/* Total Revenue - Hero Card */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <FiTrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-700">Total</p>
                        <p className="text-xs text-green-600">revenue</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">Total Revenue</p>
                      <p className="text-xl font-bold text-green-800 mb-1">{formatCurrency(statistics.totalRevenue)}</p>
                      <p className={`text-xs font-semibold ${parseFloat(statistics.revenueChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(statistics.revenueChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(statistics.revenueChange))}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Expenses - Hero Card */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <FiTrendingDown className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-red-700">Total</p>
                        <p className="text-xs text-red-600">expenses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">Total Expenses</p>
                      <p className="text-xl font-bold text-red-800 mb-1">{formatCurrency(statistics.totalExpenses)}</p>
                      <p className={`text-xs font-semibold ${parseFloat(statistics.expensesChange) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {parseFloat(statistics.expensesChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(statistics.expensesChange))}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Net Profit - Hero Card */}
                <div className={`group relative overflow-hidden rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${statistics.netProfit >= 0
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200/50'
                    : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50'
                  }`}>
                  <div className={`absolute top-0 right-0 w-12 h-12 rounded-full -translate-y-6 translate-x-6 ${statistics.netProfit >= 0
                      ? 'bg-gradient-to-br from-blue-400/20 to-indigo-500/20'
                      : 'bg-gradient-to-br from-red-400/20 to-rose-500/20'
                    }`}></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${statistics.netProfit >= 0
                          ? 'bg-blue-500/10'
                          : 'bg-red-500/10'
                        }`}>
                        {statistics.netProfit >= 0 ? (
                          <FiTrendingUp className={`h-4 w-4 ${statistics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                        ) : (
                          <FiTrendingDown className={`h-4 w-4 text-red-600`} />
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${statistics.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net</p>
                        <p className={`text-xs ${statistics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>profit</p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs font-medium mb-1 ${statistics.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net Profit</p>
                      <p className={`text-xl font-bold mb-1 ${statistics.netProfit >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{formatCurrency(statistics.netProfit)}</p>
                      <p className={`text-xs font-semibold ${parseFloat(statistics.profitChange) >= 0 ? (statistics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600') : 'text-red-600'}`}>
                        {parseFloat(statistics.profitChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(statistics.profitChange))}%
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ALL STATISTICS IN COMPACT GRID - Single Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6"
              >
                {/* 1. Total Sales */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-indigo-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">₹</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-purple-700">Total</p>
                        <p className="text-xs text-purple-600">sales</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-purple-700 mb-1">Total Sales</p>
                      <p className="text-lg font-bold text-purple-800">{formatCurrency(statistics.totalSales || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Pending Receivables */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <FiTrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-700">Pending</p>
                        <p className="text-xs text-green-600">receivables</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">Pending Receivables</p>
                      <p className="text-lg font-bold text-green-800">{formatCurrency(statistics.pendingAmounts?.totalPendingReceivables || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Today Earnings */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-emerald-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-emerald-600">₹</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-emerald-700">Today</p>
                        <p className="text-xs text-emerald-600">earnings</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-700 mb-1">Today Earnings</p>
                      <p className="text-lg font-bold text-emerald-800">{formatCurrency(getTimeBasedStats().todayEarnings)}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Today Profit */}
                <div className={`group relative overflow-hidden rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${(statistics.todayProfit || 0) >= 0
                    ? 'bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-200/50'
                    : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50'
                  }`}>
                  <div className={`absolute top-0 right-0 w-12 h-12 rounded-full -translate-y-6 translate-x-6 ${(statistics.todayProfit || 0) >= 0
                      ? 'bg-gradient-to-br from-teal-400/20 to-cyan-500/20'
                      : 'bg-gradient-to-br from-red-400/20 to-rose-500/20'
                    }`}></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${(statistics.todayProfit || 0) >= 0
                          ? 'bg-teal-500/10'
                          : 'bg-red-500/10'
                        }`}>
                        {(statistics.todayProfit || 0) >= 0 ? (
                          <FiTrendingUp className={`h-4 w-4 text-teal-600`} />
                        ) : (
                          <FiTrendingDown className={`h-4 w-4 text-red-600`} />
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${(statistics.todayProfit || 0) >= 0
                            ? 'text-teal-700'
                            : 'text-red-700'
                          }`}>
                          Today
                        </p>
                        <p className={`text-xs ${(statistics.todayProfit || 0) >= 0
                            ? 'text-teal-600'
                            : 'text-red-600'
                          }`}>
                          profit
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs font-medium mb-1 ${(statistics.todayProfit || 0) >= 0
                          ? 'text-teal-700'
                          : 'text-red-700'
                        }`}>
                        Today Profit
                      </p>
                      <p className={`text-lg font-bold ${(statistics.todayProfit || 0) >= 0
                          ? 'text-teal-800'
                          : 'text-red-800'
                        }`}>
                        {formatCurrency(Math.abs(statistics.todayProfit || 0))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Sales Incentives */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-amber-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <FiTarget className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-amber-700">Sales</p>
                        <p className="text-xs text-amber-600">incentives</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-amber-700 mb-1">Sales Incentives (Paid)</p>
                      <p className="text-lg font-bold text-amber-800">{formatCurrency(statistics.expenseBreakdown?.incentiveExpenses || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 4. Reward Money */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-violet-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-400/20 to-violet-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <FiAward className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-purple-700">Rewards</p>
                        <p className="text-xs text-purple-600">bonuses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-purple-700 mb-1">Reward Money (Paid)</p>
                      <p className="text-lg font-bold text-purple-800">{formatCurrency(statistics.expenseBreakdown?.rewardExpenses || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 7. Project Advances */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-cyan-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-teal-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-teal-500/10">
                        <FiHome className="h-4 w-4 text-teal-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-teal-700">Project</p>
                        <p className="text-xs text-teal-600">advances</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-teal-700 mb-1">Project Advances</p>
                      <p className="text-lg font-bold text-teal-800">{formatCurrency(statistics.revenueBreakdown?.projectAdvanceRevenue || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 8. Employee Salary */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <FiUsers className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-orange-700">Monthly</p>
                        <p className="text-xs text-orange-600">payroll</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-orange-700 mb-1">Employee Salary</p>
                      <p className="text-lg font-bold text-orange-800">{formatCurrency(getTimeBasedStats().employeeSalary)}</p>
                    </div>
                  </div>
                </div>

                {/* 9. Pending Salaries */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <FiUsers className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-orange-700">Pending</p>
                        <p className="text-xs text-orange-600">salaries</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-orange-700 mb-1">Pending Salaries</p>
                      <p className="text-lg font-bold text-orange-800">{formatCurrency(statistics.pendingAmounts?.pendingSalaries || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 12. Today Expenses */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-red-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-rose-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-rose-400/20 to-red-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-rose-500/10">
                        <FiCalendar className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-rose-700">Today</p>
                        <p className="text-xs text-rose-600">expenses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-rose-700 mb-1">Today Expenses</p>
                      <p className="text-lg font-bold text-rose-800">{formatCurrency(statistics.todayExpenses || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 13. Recurring Expenses */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <FiCalendar className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-red-700">Recurring</p>
                        <p className="text-xs text-red-600">expenses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">Recurring Expenses</p>
                      <p className="text-lg font-bold text-red-800">{formatCurrency(statistics.expenseBreakdown?.recurringExpenses || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 14. Pending Payables */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <FiTrendingDown className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-red-700">Pending</p>
                        <p className="text-xs text-red-600">payables</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">Pending Payables</p>
                      <p className="text-lg font-bold text-red-800">{formatCurrency(statistics.pendingAmounts?.totalPendingPayables || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 15. Project Expenses Total */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FiFileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-blue-700">Project</p>
                        <p className="text-xs text-blue-600">expenses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-700 mb-1">Project Expenses</p>
                      <p className="text-lg font-bold text-blue-800">{formatCurrency(statistics.expenseBreakdown?.projectExpenses || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* 16. Other Expenses */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-pink-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-rose-200/50">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-rose-400/20 to-pink-500/20 rounded-full -translate-y-6 translate-x-6"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-rose-500/10">
                        <FiFileText className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-rose-700">Misc</p>
                        <p className="text-xs text-rose-600">expenses</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-rose-700 mb-1">Other Expenses</p>
                      <p className="text-lg font-bold text-rose-800">{formatCurrency(getTimeBasedStats().otherExpenses)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

            </>
          )}

          {/* Navigation Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'transactions', label: 'Transactions', icon: FiActivity },
                  { id: 'budgets', label: 'Budgets', icon: FiTarget },
                  { id: 'expenses', label: 'Expenses', icon: FiTrendingDown },
                  { id: 'project-expenses', label: 'Project Expenses', icon: FiFileText },
                  { id: 'payment-approvals', label: 'Payment Approvals', icon: FiCheckSquare },
                  { id: 'pending-recovery', label: 'Pending Recovery', icon: FiDollarSign },
                  { id: 'gst-projects', label: 'GST Projects', icon: FiPercent },
                  { id: 'accounts', label: 'Accounts', icon: FiCreditCard }
                ].map((tab) => {
                  const Icon = tab.icon
                  const isPaymentApprovals = tab.id === 'payment-approvals'
                  const isPendingRecovery = tab.id === 'pending-recovery'
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={
                        isPaymentApprovals
                          ? `flex items-center space-x-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm ${isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white border-2 border-emerald-500 shadow-md ring-2 ring-emerald-200 ring-offset-2'
                            : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow'
                          }`
                          : `flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${isActive
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`
                      }
                    >
                      {isPendingRecovery ? (
                        <span className={isActive ? 'text-blue-600 font-semibold text-base' : 'text-gray-500 text-sm'} aria-hidden>₹</span>
                      ) : (
                        <Icon className={isPaymentApprovals ? 'h-4 w-4' : 'text-sm'} />
                      )}
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Add Buttons */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex justify-end">
              {activeTab === 'transactions' && (
                <button
                  onClick={handleCreateTransaction}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <FiPlus className="text-sm" />
                  <span>Add Transaction</span>
                </button>
              )}
              {activeTab === 'budgets' && (
                <button
                  onClick={handleCreateBudget}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <FiPlus className="text-sm" />
                  <span>Add Budget</span>
                </button>
              )}
              {activeTab === 'expenses' && (
                <button
                  onClick={handleCreateExpense}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <FiPlus className="text-sm" />
                  <span>Add Expense</span>
                </button>
              )}
              {activeTab === 'accounts' && (
                <button
                  onClick={handleCreateAccount}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <FiPlus className="text-sm" />
                  <span>Add Account</span>
                </button>
              )}
            </div>
          </div>

          {/* Content Grid */}
          {(transactionsLoading && activeTab === 'transactions') || (expensesLoading && activeTab === 'expenses') || (budgetsLoading && activeTab === 'budgets') || (projectExpensesLoading && activeTab === 'project-expenses') || (paymentApprovalLoading && activeTab === 'payment-approvals') || (pendingRecoveryLoading && activeTab === 'pending-recovery') || (gstProjectsLoading && activeTab === 'gst-projects') ? (
            <div className="flex justify-center items-center py-12">
              <Loading size="medium" />
            </div>
          ) : error && (activeTab === 'transactions' || activeTab === 'expenses' || activeTab === 'budgets' || activeTab === 'project-expenses' || activeTab === 'payment-approvals' || activeTab === 'pending-recovery' || activeTab === 'gst-projects') ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => {
                  if (activeTab === 'transactions') fetchTransactions()
                  else if (activeTab === 'expenses') fetchExpenses()
                  else if (activeTab === 'budgets') fetchBudgets()
                  else if (activeTab === 'project-expenses') fetchProjectExpenses()
                  else if (activeTab === 'payment-approvals') fetchPaymentApprovalRequests()
                  else if (activeTab === 'pending-recovery') fetchPendingRecovery()
                  else if (activeTab === 'gst-projects') fetchGstProjects()
                }}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'payment-approvals' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <FiCheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No payment approval requests found</p>
              <p className="text-sm text-gray-500 mt-1">Requests from sales and channel partners for payment approval will appear here</p>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'pending-recovery' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <span className="text-4xl text-gray-300 font-medium mx-auto mb-3 block" aria-hidden>₹</span>
              <p className="text-gray-600">No pending recovery</p>
              <p className="text-sm text-gray-500 mt-1">Projects with outstanding amount to collect will appear here</p>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'gst-projects' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <FiPercent className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No GST projects found</p>
              <p className="text-sm text-gray-500 mt-1">Projects with GST applied will appear here for finance management</p>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'transactions' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No transactions found</p>
              <button
                onClick={handleCreateTransaction}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Transaction
              </button>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'expenses' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No expenses found</p>
              <button
                onClick={handleCreateExpense}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Expense
              </button>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'budgets' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No budgets found</p>
              <button
                onClick={handleCreateBudget}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Budget
              </button>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'project-expenses' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No project expenses found</p>
            </div>
          ) : paginatedData.length === 0 && activeTab === 'accounts' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No accounts found</p>
              <button
                onClick={() => setShowAccountModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Account
              </button>
            </div>
          ) : activeTab === 'transactions' ? (
            /* Transactions Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Account</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 max-w-[200px]">Description</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <motion.tr
                        key={item._id || item.id || `tx-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium capitalize ${getTypeColor(item.transactionType || item.type)}`}>
                            {(item.transactionType || item.type) === 'incoming' ? 'Incoming' : 'Outgoing'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-semibold ${getTypeColor(item.transactionType || item.type)}`}>
                            {(item.transactionType || item.type) === 'incoming' ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{item.category || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.account?.accountName || item.vendor || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(item.transactionDate || item.date || item.createdAt)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate" title={item.description || ''}>{item.description || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleView(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><FiEye className="h-4 w-4" /></button>
                            <button onClick={() => handleEdit(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><FiEdit className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'budgets' ? (
            /* Budgets Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Allocated</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Spent</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Remaining</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <motion.tr
                        key={item._id || item.id || `budget-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.name || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">{item.category || '—'}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">{formatCurrency(item.allocated)}</td>
                        <td className="py-3 px-4 text-sm text-right text-amber-600 font-medium">{formatCurrency(item.spent || 0)}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-green-700">{formatCurrency(item.remaining)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(item.startDate)} – {formatDate(item.endDate)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleView(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><FiEye className="h-4 w-4" /></button>
                            <button onClick={() => handleEdit(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><FiEdit className="h-4 w-4" /></button>
                            <button onClick={() => handleSpendBudget(item)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Spend"><span className="text-xs font-medium">₹ Spend</span></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'expenses' ? (
            /* Expenses Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Vendor / Payee</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 max-w-[200px]">Description</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <motion.tr
                        key={item._id || item.id || `exp-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 capitalize">{item.category || '—'}</td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-red-600">{formatCurrency(item.amount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.vendor || item.employee?.name || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(item.transactionDate || item.date || item.createdAt)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate" title={item.description || ''}>{item.description || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleView(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><FiEye className="h-4 w-4" /></button>
                            <button onClick={() => handleEdit(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><FiEdit className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'project-expenses' ? (
            /* Project Expenses Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[150px]">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[110px]">Paid by</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Vendor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[130px]">Payment Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[120px]">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 min-w-[200px]">Description</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 min-w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
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
                          <div className="text-sm text-gray-600 max-w-[200px] truncate" title={item.description || ''}>
                            {item.description || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleViewProjectExpense(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'payment-approvals' ? (
            /* Payment Approvals Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">From</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Account</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <motion.tr
                        key={item.id || `pay-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">{item.type ? item.type.replace(/-/g, ' ') : '—'}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900 text-sm block truncate max-w-[180px]" title={item.title}>{item.title}</span>
                          {item.description && <span className="text-xs text-gray-500 truncate block max-w-[180px]" title={item.description}>{item.description}</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.submittedBy || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[120px] truncate" title={item.projectName}>{item.projectName || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[160px] truncate" title={item.accountName}>
                          {item.accountName || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.amount != null && item.amount !== '' ? <span className="text-sm font-semibold text-teal-600">{formatCurrency(item.amount)}</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.submittedDate ? formatDate(item.submittedDate) : '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getRequestStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handlePaymentApprovalView(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><FiEye className="h-4 w-4" /></button>
                            {item.status === 'pending' && (
                              <button onClick={() => handlePaymentApprovalRespond(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Respond"><FiSend className="h-4 w-4" /></button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'pending-recovery' ? (
            /* Pending Recovery Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Pending Recovery</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Recovered Amount</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Cost</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sales / Channel Partner</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-[140px]">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, index) => (
                      <motion.tr
                        key={row.projectId || `rec-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{row.projectName || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{row.clientName || '—'}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-amber-600">{formatCurrency(row.pendingRecovery || 0)}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-green-600">{formatCurrency(row.recoveredAmount || 0)}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">{formatCurrency(row.totalCost || 0)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{row.relatedSalesOrCp || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-[64px] h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, row.progress || 0))}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 tabular-nums w-9">{row.progress != null ? `${Math.round(row.progress)}%` : '0%'}</span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'gst-projects' ? (
            /* GST Projects Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-teal-50/50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Project</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Recovered</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Pending Recovery</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Cost</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">GST Applied</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sales/CP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, index) => (
                      <motion.tr
                        key={row.projectId || `gst-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-gray-900">{row.projectName || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{row.clientName || '—'}</span>
                            {row.clientPhone && <p className="text-xs text-gray-500">{row.clientPhone}</p>}
                            {row.clientEmail && <p className="text-xs text-gray-500">{row.clientEmail}</p>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {row.projectStatus ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded capitalize ${row.projectStatus === 'completed' ? 'bg-green-100 text-green-800' : row.projectStatus === 'active' ? 'bg-blue-100 text-blue-800' : row.projectStatus === 'on-hold' ? 'bg-amber-100 text-amber-800' : row.projectStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{row.projectStatus.replace(/-/g, ' ')}</span>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-green-600">{formatCurrency(row.recoveredAmount || 0)}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-amber-600">{formatCurrency(row.pendingRecovery || 0)}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(row.totalCost || 0)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{formatCurrency(row.gstApplied || 0)}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{row.relatedSalesOrCp || '—'}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'accounts' ? (
            /* Accounts Table */
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Account Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bank</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Account Number</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">IFSC</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <motion.tr
                        key={item._id || item.id || `acc-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.accountName || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.bankName || '—'}</td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-700">{item.accountNumber || '—'}</td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-600">{item.ifscCode || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.branchName || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">{item.accountType || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleViewAccount(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><FiEye className="h-4 w-4" /></button>
                            <button onClick={() => handleEditAccount(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><FiEdit className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Results Info */}
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <span>
                    {activeTab === 'transactions' ? (
                      <>Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, transactionsTotal)}</span> of <span className="font-semibold">{transactionsTotal}</span> transactions</>
                    ) : activeTab === 'expenses' ? (
                      <>Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, expensesTotal)}</span> of <span className="font-semibold">{expensesTotal}</span> expenses</>
                    ) : activeTab === 'budgets' ? (
                      <>Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, budgetsTotal)}</span> of <span className="font-semibold">{budgetsTotal}</span> budgets</>
                    ) : activeTab === 'project-expenses' ? (
                      <>Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, projectExpensesTotal)}</span> of <span className="font-semibold">{projectExpensesTotal}</span> project expenses</>
                    ) : activeTab === 'payment-approvals' ? (
                      <>Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, paymentApprovalTotal)}</span> of <span className="font-semibold">{paymentApprovalTotal}</span> payment approval requests</>
                    ) : (
                      <>Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-semibold">{filteredData.length}</span> results</>
                    )}
                  </span>

                  {/* Items Per Page Selector */}
                  {activeTab === 'transactions' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span className="text-gray-500">per page</span>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  {/* First Page */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="First page"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = []
                      const maxVisiblePages = 5
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                      if (endPage - startPage < maxVisiblePages - 1) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1)
                      }

                      // First page
                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            1
                          </button>
                        )
                        if (startPage > 2) {
                          pages.push(
                            <span key="ellipsis-start" className="px-2 text-gray-500">
                              ...
                            </span>
                          )
                        }
                      }

                      // Visible page numbers
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${currentPage === i
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {i}
                          </button>
                        )
                      }

                      // Last page
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="ellipsis-end" className="px-2 text-gray-500">
                              ...
                            </span>
                          )
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            {totalPages}
                          </button>
                        )
                      }

                      return pages
                    })()}
                  </div>

                  {/* Next Page */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Last page"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Jump to Page */}
              {totalPages > 10 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-600">Go to page:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value)
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page)
                      }
                    }}
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">of {totalPages}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Account Creation Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Bank Account</h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveAccount(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
                  <input
                    type="text"
                    value={accountFormData.accountName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter account name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    value={accountFormData.bankName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bankName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter bank name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    value={accountFormData.accountNumber}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter account number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
                  <input
                    type="text"
                    value={accountFormData.ifscCode}
                    onChange={(e) => setAccountFormData({ ...accountFormData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter IFSC code"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={accountFormData.branchName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, branchName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter branch name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <select
                    value={accountFormData.accountType}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="business">Business Account</option>
                    <option value="corporate">Corporate Account</option>
                  </select>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={accountFormData.description}
                  onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter account description"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={accountFormData.isActive}
                    onChange={(e) => setAccountFormData({ ...accountFormData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active Account</span>
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
                  <FiPlus className="h-4 w-4" />
                  <span>Add Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account View Modal */}
      {showAccountViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Account Details</h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Account Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedItem.accountName}</h4>
                  <p className="text-sm text-gray-600">{selectedItem.bankName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {selectedItem.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Account Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <p className="text-lg font-mono bg-gray-50 p-3 rounded-lg">{selectedItem.accountNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                    <p className="text-lg font-mono bg-gray-50 p-3 rounded-lg">{selectedItem.ifscCode}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <p className="text-lg bg-gray-50 p-3 rounded-lg capitalize">{selectedItem.accountType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                    <p className="text-lg bg-gray-50 p-3 rounded-lg">{selectedItem.branchName}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedItem.description}</p>
              </div>

              {/* Account Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{formatDate(selectedItem.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Used</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{formatDate(selectedItem.lastUsed)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeModals}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowAccountViewModal(false)
                    handleEditAccount(selectedItem)
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FiEdit className="h-4 w-4" />
                  <span>Edit Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Edit Modal */}
      {showAccountEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Account</h3>
              <button
                onClick={() => {
                  closeModals()
                  setSelectedItem(null)
                  setAccountFormData({
                    accountName: '',
                    bankName: '',
                    accountNumber: '',
                    ifscCode: '',
                    branchName: '',
                    accountType: 'current',
                    isActive: true,
                    description: ''
                  })
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateAccount(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
                  <input
                    type="text"
                    value={accountFormData.accountName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter account name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    value={accountFormData.bankName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bankName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter bank name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    value={accountFormData.accountNumber}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter account number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
                  <input
                    type="text"
                    value={accountFormData.ifscCode}
                    onChange={(e) => setAccountFormData({ ...accountFormData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter IFSC code"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={accountFormData.branchName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, branchName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter branch name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <select
                    value={accountFormData.accountType}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="business">Business Account</option>
                    <option value="corporate">Corporate Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={accountFormData.description}
                  onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter account description"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={accountFormData.isActive}
                    onChange={(e) => setAccountFormData({ ...accountFormData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active Account</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    closeModals()
                    setSelectedItem(null)
                    setAccountFormData({
                      accountName: '',
                      bankName: '',
                      accountNumber: '',
                      ifscCode: '',
                      branchName: '',
                      accountType: 'current',
                      isActive: true,
                      description: ''
                    })
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiEdit className="h-4 w-4" />
                  <span>Update Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction View Modal */}
      {showViewModal && selectedItem && activeTab === 'transactions' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Transaction Details</h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Transaction Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{selectedItem.category}</h4>
                  <p className={`text-2xl font-bold mt-2 ${getTypeColor(selectedItem.transactionType || selectedItem.type)}`}>
                    {(selectedItem.transactionType || selectedItem.type) === 'incoming' ? '+' : '-'}{formatCurrency(selectedItem.amount)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
              </div>

              {/* Transaction Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <p className={`text-lg font-semibold ${getTypeColor(selectedItem.transactionType || selectedItem.type)}`}>
                    {(selectedItem.transactionType || selectedItem.type) === 'incoming' ? 'Incoming' : 'Outgoing'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-lg bg-gray-50 p-3 rounded-lg">{selectedItem.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className={`text-lg font-bold bg-gray-50 p-3 rounded-lg ${getTypeColor(selectedItem.transactionType || selectedItem.type)}`}>
                    {formatCurrency(selectedItem.amount)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <p className="text-lg bg-gray-50 p-3 rounded-lg">
                    {formatDate(selectedItem.transactionDate || selectedItem.date || selectedItem.createdAt)}
                  </p>
                </div>
                {selectedItem.account && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                    <p className="text-lg bg-gray-50 p-3 rounded-lg">
                      {selectedItem.account?.accountName || selectedItem.accountName || 'N/A'}
                    </p>
                  </div>
                )}
                {selectedItem.paymentMethod && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <p className="text-lg bg-gray-50 p-3 rounded-lg">{selectedItem.paymentMethod}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedItem.description}</p>
                </div>
              )}

              {/* Additional Info */}
              {(selectedItem.client || selectedItem.project || selectedItem.employee) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItem.client && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedItem.client?.name || selectedItem.client}</p>
                    </div>
                  )}
                  {selectedItem.project && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedItem.project?.name || selectedItem.project}</p>
                    </div>
                  )}
                  {selectedItem.employee && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedItem.employee?.name || selectedItem.employee}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedItem.createdAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{formatDate(selectedItem.createdAt)}</p>
                  </div>
                )}
                {selectedItem.updatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{formatDate(selectedItem.updatedAt)}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeModals}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEditTransaction(selectedItem)
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FiEdit className="h-4 w-4" />
                  <span>Edit Transaction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Creation/Edit Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedItem ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleSaveTransaction();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type *</label>
                  <select
                    value={transactionFormData.type}
                    onChange={(e) => {
                      const newType = e.target.value
                      setTransactionFormData({
                        ...transactionFormData,
                        type: newType,
                        account: newType === 'outgoing' ? '' : transactionFormData.account // Clear account if switching to outgoing
                      })
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <input
                    type="text"
                    value={transactionFormData.category}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category (e.g., Client Payment, Salary, etc.)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={transactionFormData.date}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Account dropdown - only show for incoming transactions */}
              {transactionFormData.type === 'incoming' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account *</label>
                  {accountsLoading ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500">
                      Loading accounts...
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="w-full px-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-600 text-sm">
                      No active accounts found. Please create an account first.
                    </div>
                  ) : (
                    <select
                      value={transactionFormData.account}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, account: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select an account</option>
                      {accounts.map((account) => (
                        <option key={account._id || account.id} value={account._id || account.id}>
                          {account.accountName} - {account.bankName} ({account.accountNumber})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter transaction description"
                />
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
                  {selectedItem ? (
                    <>
                      <FiEdit className="h-4 w-4" />
                      <span>Update Transaction</span>
                    </>
                  ) : (
                    <>
                      <FiPlus className="h-4 w-4" />
                      <span>Add Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Creation Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Budget</h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveBudget(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Name *</label>
                  <input
                    type="text"
                    value={budgetFormData.name}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter budget name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <input
                    type="text"
                    value={budgetFormData.category}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocated Amount *</label>
                <input
                  type="number"
                  value={budgetFormData.allocated}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, allocated: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter allocated amount"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={budgetFormData.startDate}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={budgetFormData.endDate}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={budgetFormData.description}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter budget description"
                />
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
                  <FiPlus className="h-4 w-4" />
                  <span>Add Budget</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget View Modal */}
      {showBudgetViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Budget Details</h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget Name</label>
                <p className="text-lg bg-gray-50 p-3 rounded-lg">{selectedItem.name || selectedItem.budgetName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <p className="text-lg bg-gray-50 p-3 rounded-lg">{selectedItem.category || selectedItem.budgetCategory}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <p className={`text-lg p-3 rounded-lg ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status || 'active'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allocated</label>
                  <p className="text-lg font-semibold bg-blue-50 p-3 rounded-lg text-blue-700">
                    {formatCurrency(selectedItem.allocated || selectedItem.allocatedAmount)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spent</label>
                  <p className="text-lg font-semibold bg-red-50 p-3 rounded-lg text-red-700">
                    {formatCurrency(selectedItem.spent || selectedItem.spentAmount || 0)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remaining</label>
                  <p className="text-lg font-semibold bg-green-50 p-3 rounded-lg text-green-700">
                    {formatCurrency(selectedItem.remaining || selectedItem.remainingAmount)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Progress</label>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${((selectedItem.spent || selectedItem.spentAmount || 0) / (selectedItem.allocated || selectedItem.allocatedAmount)) > 0.9
                        ? 'bg-red-600'
                        : ((selectedItem.spent || selectedItem.spentAmount || 0) / (selectedItem.allocated || selectedItem.allocatedAmount)) > 0.7
                          ? 'bg-yellow-600'
                          : 'bg-blue-600'
                      }`}
                    style={{
                      width: `${Math.min(100, ((selectedItem.spent || selectedItem.spentAmount || 0) / (selectedItem.allocated || selectedItem.allocatedAmount)) * 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((selectedItem.spent || selectedItem.spentAmount || 0) / (selectedItem.allocated || selectedItem.allocatedAmount) * 100).toFixed(1)}% used
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <p className="text-lg bg-gray-50 p-3 rounded-lg">
                    {formatDate(selectedItem.startDate)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <p className="text-lg bg-gray-50 p-3 rounded-lg">
                    {formatDate(selectedItem.endDate)}
                  </p>
                </div>
              </div>

              {selectedItem.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedItem.description}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBudgetViewModal(false)
                    handleSpendBudget(selectedItem)
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <span className="text-lg">₹</span>
                  <span>Record Spend</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Edit Modal */}
      {showBudgetEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Budget</h3>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateBudget(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Name *</label>
                  <input
                    type="text"
                    value={budgetFormData.name}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter budget name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <input
                    type="text"
                    value={budgetFormData.category}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocated Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetFormData.allocated}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, allocated: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter allocated amount"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={budgetFormData.startDate}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={budgetFormData.endDate}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={budgetFormData.description}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter budget description"
                />
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
                  <FiEdit className="h-4 w-4" />
                  <span>Update Budget</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Spend Modal */}
      {showBudgetSpendModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Record Budget Spend</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Budget: {selectedItem.name || selectedItem.budgetName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Remaining: {formatCurrency(selectedItem.remaining || selectedItem.remainingAmount)}
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSpendFromBudget(); }} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Recording a spend will create an outgoing transaction with category "{selectedItem.category || selectedItem.budgetCategory}"
                  and automatically update the budget's spent amount.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedItem.remaining || selectedItem.remainingAmount}
                  value={budgetSpendFormData.amount}
                  onChange={(e) => setBudgetSpendFormData({ ...budgetSpendFormData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount to spend"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {formatCurrency(selectedItem.remaining || selectedItem.remainingAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={budgetSpendFormData.date}
                  onChange={(e) => setBudgetSpendFormData({ ...budgetSpendFormData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={budgetSpendFormData.description}
                  onChange={(e) => setBudgetSpendFormData({ ...budgetSpendFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description for this spend"
                />
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
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <span className="text-lg">₹</span>
                  <span>Record Spend</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Creation Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedItem ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button
                onClick={() => {
                  closeModals()
                  setSelectedItem(null)
                  setExpenseFormData({
                    category: '',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    description: ''
                  })
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveExpense();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <input
                    type="text"
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category (e.g., Salaries, Rent, Software, etc.)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenseFormData.amount}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={expenseFormData.date}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter expense description"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    closeModals()
                    setSelectedItem(null)
                    setExpenseFormData({
                      category: '',
                      amount: '',
                      date: new Date().toISOString().split('T')[0],
                      description: ''
                    })
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  {selectedItem ? (
                    <>
                      <FiEdit className="h-4 w-4" />
                      <span>Update Expense</span>
                    </>
                  ) : (
                    <>
                      <FiPlus className="h-4 w-4" />
                      <span>Add Expense</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Expense Modal */}
      {showProjectExpenseModal && projectExpenseModalMode !== 'view' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {projectExpenseModalMode === 'create' ? 'Add New Project Expense' :
                  projectExpenseModalMode === 'edit' ? 'Edit Project Expense' :
                    'View Project Expense'}
              </h3>
              <button
                onClick={() => setShowProjectExpenseModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (projectExpenseModalMode !== 'view') {
                handleSaveProjectExpense();
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
                <select
                  value={projectExpenseFormData.projectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={projectExpenseModalMode === 'view'}
                >
                  <option value="">Select a project</option>
                  {projectsList.map(project => (
                    <option key={project.value} value={project.value}>{project.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={projectExpenseFormData.name}
                    onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Domain Purchase, Server Hosting"
                    required
                    disabled={projectExpenseModalMode === 'view'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={projectExpenseFormData.category}
                    onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={projectExpenseModalMode === 'view'}
                  >
                    <option value="">Select category</option>
                    <option value="domain">Domain</option>
                    <option value="server">Server</option>
                    <option value="api">API Service</option>
                    <option value="hosting">Hosting</option>
                    <option value="ssl">SSL Certificate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={projectExpenseFormData.amount}
                    onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    required
                    disabled={projectExpenseModalMode === 'view'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expense Date *</label>
                  <input
                    type="date"
                    value={projectExpenseFormData.expenseDate}
                    onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, expenseDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={projectExpenseModalMode === 'view'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                  <input
                    type="text"
                    value={projectExpenseFormData.vendor}
                    onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, vendor: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Vendor/provider name"
                    disabled={projectExpenseModalMode === 'view'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={projectExpenseFormData.paymentMethod}
                    onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, paymentMethod: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={projectExpenseFormData.description}
                  onChange={(e) => setProjectExpenseFormData({ ...projectExpenseFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter additional notes or description"
                  disabled={projectExpenseModalMode === 'view'}
                />
              </div>

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
                  <span>{projectExpenseModalMode === 'create' ? 'Add Project Expense' : 'Update Project Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced View Modal for Project Expenses (View Only) */}
      {showProjectExpenseModal && projectExpenseModalMode === 'view' && selectedProjectExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Project Expense Details</h3>
              <button
                onClick={() => {
                  setShowProjectExpenseModal(false)
                  setSelectedProjectExpense(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Project Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FiFileText className="h-5 w-5 text-blue-600" />
                  <span>Project Information</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Project Name</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {selectedProjectExpense.project?.name ||
                        (projectExpenseFormData.projectId && projectsList.find(p => p.value === projectExpenseFormData.projectId)?.label) ||
                        'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</label>
                    <p className="text-base font-semibold text-gray-800 mt-1">
                      {selectedProjectExpense.vendor || projectExpenseFormData.vendor || 'N/A'}
                    </p>
                  </div>
                  {selectedProjectExpense.project?.client && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client Company</label>
                      <p className="text-base text-gray-800 mt-1">
                        {selectedProjectExpense.project.client?.companyName ||
                          selectedProjectExpense.project.client?.name ||
                          'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction/Expense Information Section */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-5 border border-red-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FiTrendingDown className="h-5 w-5 text-red-600" />
                  <span>Transaction Information</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Expense Name</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {selectedProjectExpense.name || projectExpenseFormData.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</label>
                    <p className="mt-1">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                        {selectedProjectExpense.category || projectExpenseFormData.category || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</label>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      -{formatCurrency(selectedProjectExpense.amount || projectExpenseFormData.amount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Method</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {selectedProjectExpense.paymentMethod || projectExpenseFormData.paymentMethod || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Expense Date</label>
                    <p className="text-base font-semibold text-gray-900 mt-1 flex items-center space-x-2">
                      <FiCalendar className="h-4 w-4 text-gray-500" />
                      <span>
                        {formatDate(selectedProjectExpense.expenseDate || projectExpenseFormData.expenseDate || selectedProjectExpense.createdAt)}
                      </span>
                    </p>
                  </div>
                  {selectedProjectExpense.createdAt && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Created At</label>
                      <p className="text-base text-gray-700 mt-1 flex items-center space-x-2">
                        <FiClock className="h-4 w-4 text-gray-500" />
                        <span>{formatDate(selectedProjectExpense.createdAt)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {(selectedProjectExpense.description || projectExpenseFormData.description) && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                    <FiFileText className="h-4 w-4 text-gray-600" />
                    <span>Description</span>
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedProjectExpense.description || projectExpenseFormData.description || 'N/A'}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectExpenseModal(false)
                    setSelectedProjectExpense(null)
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this project expense? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Name:</span>
                    <span className="ml-2 text-gray-900">{projectExpenseToDelete.name}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Project:</span>
                    <span className="ml-2 text-gray-900">{projectExpenseToDelete.project?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Amount:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{formatCurrency(projectExpenseToDelete.amount)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Category:</span>
                    <span className="ml-2 text-gray-900 capitalize">{projectExpenseToDelete.category}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteProjectExpenseModal(false)
                  setProjectExpenseToDelete(null)
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProjectExpense}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <FiTrash2 className="h-4 w-4" />
                <span>Delete Expense</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Approval View Modal */}
      {showPaymentApprovalViewModal && selectedPaymentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{selectedPaymentRequest.title}</h2>
              <button onClick={() => { setShowPaymentApprovalViewModal(false); setSelectedPaymentRequest(null) }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-gray-600">{selectedPaymentRequest.description}</p>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>From: {selectedPaymentRequest.submittedBy}</p>
                <p>Project: {selectedPaymentRequest.projectName}</p>
                {selectedPaymentRequest.accountName && (
                  <p>Account: {selectedPaymentRequest.accountName}</p>
                )}
                <p>Submitted: {selectedPaymentRequest.submittedDate ? formatDate(selectedPaymentRequest.submittedDate) : '—'}</p>
                {selectedPaymentRequest.amount != null && selectedPaymentRequest.amount !== '' && (
                  <p className="font-semibold text-teal-600 mt-1">Amount: {formatCurrency(selectedPaymentRequest.amount)}</p>
                )}
              </div>
              {(selectedPaymentRequest.screenshotUrl || selectedPaymentRequest._full?.metadata?.screenshotUrl) && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Payment screenshot (from sales)</p>
                  <a
                    href={selectedPaymentRequest.screenshotUrl || selectedPaymentRequest._full?.metadata?.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                  >
                    <img
                      src={selectedPaymentRequest.screenshotUrl || selectedPaymentRequest._full?.metadata?.screenshotUrl}
                      alt="Payment screenshot"
                      className="w-full max-h-64 object-contain"
                    />
                  </a>
                  <p className="text-xs text-gray-500 mt-1">Click image to open full size</p>
                </div>
              )}
              <div>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRequestStatusColor(selectedPaymentRequest.status)}`}>{selectedPaymentRequest.status}</span>
              </div>
              {selectedPaymentRequest.response && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Response: {selectedPaymentRequest.response.type}</p>
                  <p className="text-sm text-gray-600">{selectedPaymentRequest.response.message}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => { setShowPaymentApprovalViewModal(false); setSelectedPaymentRequest(null) }} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              {selectedPaymentRequest.status === 'pending' && (
                <button onClick={() => { setShowPaymentApprovalViewModal(false); handlePaymentApprovalRespond(selectedPaymentRequest) }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Respond</button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Approval Respond Modal */}
      {showPaymentApprovalRespondModal && selectedPaymentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Respond to request</h2>
              <button onClick={() => { setShowPaymentApprovalRespondModal(false); setSelectedPaymentRequest(null); setPaymentResponseText(''); setPaymentResponseType('approve') }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-gray-600">{selectedPaymentRequest.title}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setPaymentResponseType('approve')} className={`px-3 py-2 rounded-lg text-sm font-medium ${paymentResponseType === 'approve' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Approve</button>
                  <button type="button" onClick={() => setPaymentResponseType('reject')} className={`px-3 py-2 rounded-lg text-sm font-medium ${paymentResponseType === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Reject</button>
                  <button type="button" onClick={() => setPaymentResponseType('request_changes')} className={`px-3 py-2 rounded-lg text-sm font-medium ${paymentResponseType === 'request_changes' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Request changes</button>
                </div>
                <textarea value={paymentResponseText} onChange={(e) => setPaymentResponseText(e.target.value)} placeholder={paymentResponseType === 'approve' ? 'Optional message...' : 'Message (required for reject/request changes)'} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => { setShowPaymentApprovalRespondModal(false); setSelectedPaymentRequest(null); setPaymentResponseText(''); setPaymentResponseType('approve') }} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmitPaymentResponse} disabled={isSubmittingPaymentResponse || (paymentResponseType !== 'approve' && !paymentResponseText.trim())} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmittingPaymentResponse ? <Loading size="small" className="h-4 w-4" /> : <FiSend className="h-4 w-4" />}
                Submit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Admin_finance_management
