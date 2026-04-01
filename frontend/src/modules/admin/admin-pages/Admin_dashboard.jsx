import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import {
  Users,
  FolderOpen,
  DollarSign,
  TrendingUp,
  Activity,
  Award,
  Code,
  Trophy,
  Gift,
  AlertTriangle,
  CheckCircle,
  Clock,
  PieChart,
  LineChart,
  Download,
  Settings,
  Bell,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  Zap,
  Shield,
  Database,
  Server,
  TrendingDown,
  IndianRupee,
  CreditCard,
  Minus,
  BarChart3,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Star,
  TrendingUp as TrendingUpIcon,
  ArrowRight,
  Sparkles,
  Crown,
  Flame,
  X,
  ChevronDown,
  CalendarDays,
  Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import Loading from '../../../components/ui/loading'
import { MagicCard } from '../../../components/ui/magic-card'
import { BorderBeam } from '../../../components/ui/border-beam'
import { SparklesText } from '../../../components/ui/sparkles-text'
import { AuroraText } from '../../../components/ui/aurora-text'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts'

// Import custom components
import ChartContainer from '../admin-components/ChartContainer'
import NotificationPanel from '../admin-components/NotificationPanel'
import QuickActionButton from '../admin-components/QuickActionButton'

// Import dashboard service
import adminDashboardService from '../admin-services/adminDashboardService'
import { adminFinanceService } from '../admin-services/adminFinanceService'
import { adminChannelPartnerService } from '../admin-services/adminChannelPartnerService'
import adminSalesService from '../admin-services/adminSalesService'

const Admin_dashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('7d')
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state - default to 'month'
  const [filterType, setFilterType] = useState('month') // 'day', 'week', 'month', 'year', 'custom', 'all'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tempStartDate, setTempStartDate] = useState('') // Temporary state for date picker
  const [tempEndDate, setTempEndDate] = useState('')   // Temporary state for date picker
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [topChannelPartners, setTopChannelPartners] = useState([])
  const [projectCategoryPerformance, setProjectCategoryPerformance] = useState([])
  const [categoryFinancialDetails, setCategoryFinancialDetails] = useState([])

  // Dashboard data - loaded from API
  const [dashboardData, setDashboardData] = useState({
    // User Statistics
    users: {
      total: 0,
      sales: 0,
      pm: 0,
      employees: 0,
      clients: 0,
      active: 0,
      newThisMonth: 0,
      growth: 0
    },

    // Project Statistics
    projects: {
      total: 0,
      active: 0,
      completed: 0,
      onHold: 0,
      overdue: 0,
      totalRevenue: 0,
      avgProjectValue: 0,
      completionRate: 0
    },

    // Sales Statistics
    sales: {
      totalLeads: 0,
      converted: 0,
      conversionRate: 0,
      totalRevenue: 0,
      avgDealSize: 0,
      growth: 0
    },

    // Financial Statistics
    finance: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      outstandingPayments: 0,
      expenses: 0,
      profit: 0,
      profitMargin: 0,
      growth: 0
    },

    // Today's Financial Metrics
    today: {
      earnings: 0,
      expenses: 0,
      sales: 0,
      pendingAmount: 0,
      profit: 0,
      loss: 0,
      earningsGrowth: 0,
      expensesGrowth: 0,
      salesGrowth: 0,
      profitGrowth: 0,
      lossGrowth: 0
    },

    // System Health
    system: {
      uptime: 0,
      performance: 0,
      errors: 0,
      activeUsers: 0,
      serverLoad: 0
    },

    // Revenue trend data
    revenueTrend: [],

    // Project status distribution
    projectStatusDistribution: []
  })

  // Chart data from API
  const revenueData = dashboardData.revenueTrend || []

  // Project status data from API
  const projectStatusData = dashboardData.projectStatusDistribution || []

  // Mock notifications (can be replaced with real API later)
  const mockNotifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Payment Overdue',
      message: `${dashboardData.projects.overdue || 0} projects have overdue payments totaling ${dashboardData.finance.outstandingPayments ? `₹${(dashboardData.finance.outstandingPayments / 1000).toFixed(0)}k` : '₹0'}`,
      time: '2 hours ago',
      icon: AlertTriangle
    },
    {
      id: 2,
      type: 'success',
      title: 'Project Completed',
      message: `${dashboardData.projects.completed || 0} projects completed successfully`,
      time: '4 hours ago',
      icon: CheckCircle
    },
    {
      id: 3,
      type: 'info',
      title: 'New User Registration',
      message: `${dashboardData.users.newThisMonth || 0} new users registered this month`,
      time: '6 hours ago',
      icon: Users
    },
    {
      id: 4,
      type: 'error',
      title: 'System Alert',
      message: `Server load: ${dashboardData.system.serverLoad || 0}%`,
      time: '1 day ago',
      icon: Server
    }
  ]


  // Fetch top channel partners
  const fetchTopChannelPartners = async () => {
    try {
      const [partnersResponse, leadsBreakdownResponse] = await Promise.all([
        adminChannelPartnerService.getAllChannelPartners(),
        adminChannelPartnerService.getChannelPartnerLeadsBreakdown()
      ]);

      if (partnersResponse.success && partnersResponse.data && leadsBreakdownResponse.success && leadsBreakdownResponse.data) {
        const partners = partnersResponse.data;
        const leadsBreakdown = leadsBreakdownResponse.data;

        const partnersWithConversions = partners.map(partner => {
          const breakdown = leadsBreakdown.find(lb => lb._id === partner._id || lb.channelPartnerId === partner._id);
          const totalLeads = breakdown ? breakdown.totalLeads : 0;
          const convertedLeads = breakdown ? breakdown.convertedLeads : 0;
          const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

          return {
            ...partner,
            totalLeads,
            convertedLeads,
            conversionRate
          };
        });

        const sortedPartners = partnersWithConversions.sort((a, b) => b.convertedLeads - a.convertedLeads);
        setTopChannelPartners(sortedPartners.slice(0, 3));
      } else {
        setTopChannelPartners([]);
      }
    } catch (err) {
      console.error('Error fetching top channel partners:', err);
      setTopChannelPartners([]);
    }
  };

  // Fetch project category performance
  const fetchProjectCategoryPerformance = async () => {
    try {
      // Get date range based on current filter
      const dateRange = getDateRange();

      // Build query params with date filters for ALL filter types
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const response = await adminSalesService.getCategoryAnalytics(params);
      if (response.success && response.data) {
        // Map and sort categories - show ALL categories (backend now returns all categories)
        const sortedCategories = response.data
          .map(category => ({
            name: category.categoryName || 'Uncategorized',
            convertedLeads: category.convertedLeads || 0,
            totalLeads: category.totalLeads || 0,
            conversionRate: category.conversionRate || 0,
            convertedValue: category.convertedValue || 0,
            totalValue: category.totalValue || 0,
            color: category.categoryColor || '#6366f1'
          }))
          // Don't filter - show all categories even if they have 0 data
          .sort((a, b) => {
            // Sort by converted leads first, then by total leads
            if (b.convertedLeads !== a.convertedLeads) {
              return b.convertedLeads - a.convertedLeads;
            }
            return b.totalLeads - a.totalLeads;
          });

        setProjectCategoryPerformance(sortedCategories);
      } else {
        setProjectCategoryPerformance([]);
      }
    } catch (err) {
      console.error('Error fetching project category performance:', err);
      setProjectCategoryPerformance([]);
    }
  };

  // Fetch category financial details
  const fetchCategoryFinancialDetails = async () => {
    try {
      const response = await adminSalesService.getCategoryFinancialDetails();
      if (response.success && response.data) {
        setCategoryFinancialDetails(response.data);
      } else {
        setCategoryFinancialDetails([]);
      }
    } catch (err) {
      console.error('Error fetching category financial details:', err);
      setCategoryFinancialDetails([]);
    }
  };

  // Helper function to get icon component based on icon name
  const getActivityIcon = (iconName, color) => {
    const colorClasses = {
      green: 'text-emerald-600',
      red: 'text-red-600',
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600'
    }
    const iconClass = `h-3 w-3 ${colorClasses[color] || 'text-gray-600'}`

    switch (iconName) {
      case 'trending-up':
        return <TrendingUp className={iconClass} />
      case 'trending-down':
        return <TrendingDown className={iconClass} />
      case 'folder':
        return <FolderOpen className={iconClass} />
      case 'dollar':
        return <DollarSign className={iconClass} />
      case 'target':
        return <Target className={iconClass} />
      default:
        return <Activity className={iconClass} />
    }
  }

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now'
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  // Helper function to get date range based on filter type
  const getDateRange = () => {
    // If 'all' filter is selected, return null to indicate no date filtering
    if (filterType === 'all') {
      return {
        startDate: null,
        endDate: null,
        startISO: null,
        endISO: null
      }
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    let start, end

    switch (filterType) {
      case 'day':
        start = new Date(today)
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'week':
        start = new Date(today)
        start.setDate(today.getDate() - 6) // Last 7 days
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
          // Default to current month if custom dates not set
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
  const getFilterLabel = () => {
    switch (filterType) {
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
        return 'This Month'
    }
  }

  // Load dashboard data with filters
  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get date range based on filter
      const dateRange = getDateRange()

      // Map filter type to API timeFilter
      let timeFilter = null // null means no filter (all time)
      if (filterType === 'day') timeFilter = 'day'
      else if (filterType === 'week') timeFilter = 'week'
      else if (filterType === 'month') timeFilter = 'month'
      else if (filterType === 'year') timeFilter = 'year'
      else if (filterType === 'custom') timeFilter = 'custom'
      // 'all' keeps timeFilter as null

      const financeParams = {}
      const dashboardParams = {}

      // Build dashboard params with date filters
      if (filterType === 'all') {
        // For 'all' filter, don't pass any timeFilter or date params
        // This will show all-time data
      } else if (filterType === 'custom' && dateRange.startDate && dateRange.endDate) {
        dashboardParams.timeFilter = 'custom'
        dashboardParams.startDate = dateRange.startDate
        dashboardParams.endDate = dateRange.endDate
        financeParams.startDate = dateRange.startDate
        financeParams.endDate = dateRange.endDate
      } else if (filterType !== 'custom' && timeFilter) {
        // For non-custom filters, pass the timeFilter
        dashboardParams.timeFilter = timeFilter
      }

      const [dashboardResponse, financeResponse] = await Promise.all([
        adminDashboardService.getDashboardStats(dashboardParams).catch(err => {
          console.error('Error fetching dashboard stats:', err)
          return null
        }),
        // For 'all' filter, pass 'all' to finance service, otherwise pass timeFilter
        adminFinanceService.getFinanceStatistics(filterType === 'all' ? 'all' : (timeFilter || 'month'), financeParams).catch(err => {
          console.error('Error fetching finance statistics:', err)
          return null
        })
      ])

      if (dashboardResponse && dashboardResponse.success && dashboardResponse.data) {
        let dashboardData = { ...dashboardResponse.data }

        // Override financial data with comprehensive finance statistics if available
        const financeData = financeResponse?.success && financeResponse?.data ? financeResponse.data : null

        if (financeData) {
          // Update finance section with filtered data
          dashboardData.finance = {
            totalRevenue: financeData.totalRevenue || 0,
            monthlyRevenue: financeData.totalRevenue || 0, // Use filtered revenue
            outstandingPayments: financeData.pendingAmounts?.totalPendingReceivables || 0,
            expenses: financeData.totalExpenses || 0,
            profit: financeData.netProfit || 0,
            profitMargin: parseFloat(financeData.profitMargin || 0),
            growth: parseFloat(financeData.revenueChange || 0)
          }

          // Update financial metrics with filtered data (not "today" but filtered period)
          dashboardData.today = {
            ...dashboardData.today,
            earnings: financeData.totalRevenue || financeData.todayEarnings || 0,
            expenses: financeData.totalExpenses || 0,
            sales: financeData.totalSales || 0,
            pendingAmount: financeData.pendingAmounts?.totalPendingReceivables || 0,
            profit: financeData.netProfit || 0,
            loss: (financeData.totalExpenses || 0) > (financeData.totalRevenue || 0)
              ? (financeData.totalExpenses || 0) - (financeData.totalRevenue || 0)
              : 0,
            earningsGrowth: parseFloat(financeData.revenueChange || 0),
            expensesGrowth: parseFloat(financeData.expenseChange || 0),
            salesGrowth: parseFloat(financeData.revenueChange || 0),
            profitGrowth: parseFloat(financeData.profitChange || 0),
            lossGrowth: 0
          }
        }

        setDashboardData(dashboardData)

        // Update notifications with real data
        const updatedNotifications = [
          {
            id: 1,
            type: 'warning',
            title: 'Payment Overdue',
            message: `${dashboardData.projects.overdue || 0} projects have overdue payments`,
            time: 'Just now',
            icon: AlertTriangle
          },
          {
            id: 2,
            type: 'success',
            title: 'Project Completed',
            message: `${dashboardData.projects.completed || 0} projects completed successfully`,
            time: 'Just now',
            icon: CheckCircle
          },
          {
            id: 3,
            type: 'info',
            title: 'New User Registration',
            message: `${dashboardData.users.newThisMonth || 0} new users registered this month`,
            time: 'Just now',
            icon: Users
          },
          {
            id: 4,
            type: 'error',
            title: 'System Alert',
            message: `Server load: ${dashboardData.system.serverLoad || 0}%`,
            time: 'Just now',
            icon: Server
          }
        ]
        setNotifications(updatedNotifications)
      } else {
        throw new Error('Failed to load dashboard data')
      }

      // Fetch top channel partners, category performance, and financial details separately
      await Promise.all([
        fetchTopChannelPartners(),
        fetchProjectCategoryPerformance(),
        fetchCategoryFinancialDetails()
      ])
    } catch (err) {
      console.error('Error loading dashboard data:', err)

      // Check if it's a connection error
      const errorMessage = err.message || 'Failed to load dashboard data'
      const isConnectionError = err.name === 'ConnectionError' ||
        errorMessage.includes('Backend server is not running') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('NetworkError') ||
        String(err).includes('ERR_CONNECTION_REFUSED')

      if (isConnectionError) {
        setError('Backend server is not running. Please start the backend server on port 5000.')
      } else {
        setError(errorMessage)
      }

      // Set notifications with mock data on error
      setNotifications(mockNotifications)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Load dashboard data when filter changes
    // For 'all' filter, load immediately. For 'custom', only load if dates are set
    if (filterType === 'all' || filterType !== 'custom' || (startDate && endDate)) {
      loadDashboardData()
    }

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


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  if (isLoading) {
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

  if (error) {
    const isConnectionError = error.includes('Backend server is not running') ||
      error.includes('ERR_CONNECTION_REFUSED') ||
      error.includes('Failed to fetch');

    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_navbar />
        <Admin_sidebar />
        <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className={`${isConnectionError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-6 text-center`}>
              <AlertTriangle className={`h-12 w-12 ${isConnectionError ? 'text-yellow-600' : 'text-red-600'} mx-auto mb-4`} />
              <h3 className={`text-lg font-semibold ${isConnectionError ? 'text-yellow-900' : 'text-red-900'} mb-2`}>
                {isConnectionError ? 'Backend Server Not Running' : 'Error Loading Dashboard'}
              </h3>
              <p className={`${isConnectionError ? 'text-yellow-700' : 'text-red-700'} mb-4`}>{error}</p>
              {isConnectionError && (
                <div className="bg-white rounded-lg p-4 mb-4 text-left max-w-2xl mx-auto">
                  <p className="text-sm font-semibold text-gray-900 mb-2">To start the backend server:</p>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Open a terminal/command prompt</li>
                    <li>Navigate to the backend directory: <code className="bg-gray-100 px-2 py-1 rounded">cd backend</code></li>
                    <li>Run: <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code> (for development) or <code className="bg-gray-100 px-2 py-1 rounded">npm start</code> (for production)</li>
                    <li>Wait for the server to start on port 5000</li>
                    <li>Then click Retry below</li>
                  </ol>
                </div>
              )}
              <Button
                onClick={loadDashboardData}
                variant="outline"
                className={isConnectionError ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-100' : ''}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navbar */}
      <Admin_navbar />

      {/* Sidebar */}
      <Admin_sidebar />

      {/* Main Content */}
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          >
            <div className="space-y-2">
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Dashboard Overview
              </h1>
              <p className="text-gray-600 text-lg">
                Welcome back! Here's what's happening with your business today.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Dropdown */}
              <div className="relative filter-dropdown-container">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-sm hover:shadow border-gray-200 bg-white hover:bg-gray-50"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-700">{getFilterLabel()}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </Button>

                {/* Filter Dropdown Menu */}
                {showFilterDropdown && (
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
                              setFilterType(type)
                              setShowFilterDropdown(false)
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${filterType === type
                                ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                          >
                            <div className={`p-1.5 rounded-lg ${filterType === type ? 'bg-blue-100' : 'bg-gray-100'}`}>
                              <Icon className={`h-3.5 w-3.5 ${filterType === type ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>
                            <span className="flex-1 text-left">{label}</span>
                            {filterType === type && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${filterType === 'custom'
                            ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <div className={`p-1.5 rounded-lg ${filterType === 'custom' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <CalendarDays className={`h-3.5 w-3.5 ${filterType === 'custom' ? 'text-blue-600' : 'text-gray-500'}`} />
                        </div>
                        <span className="flex-1 text-left">Custom range</span>
                        {filterType === 'custom' && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

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
                    onMount={() => {
                      setTempStartDate(startDate)
                      setTempEndDate(endDate)
                    }}
                    className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Select Date Range</h3>
                      <button
                        onClick={() => setShowDateRangePicker(false)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-gray-500" />
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
                        <Button
                          onClick={() => {
                            if (tempStartDate && tempEndDate) {
                              setStartDate(tempStartDate)
                              setEndDate(tempEndDate)
                              setFilterType('custom')
                              setShowDateRangePicker(false)
                            }
                          }}
                          className="flex-1"
                          disabled={!tempStartDate || !tempEndDate}
                        >
                          Apply Filter
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setTempStartDate('')
                            setTempEndDate('')
                            setStartDate('')
                            setEndDate('')
                            setFilterType('month')
                            setShowDateRangePicker(false)
                          }}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={loadDashboardData}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </motion.div>

          {/* Today's Financial Metrics Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4"
          >
            {/* Earnings */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-emerald-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-emerald-700 text-right">{getFilterLabel()} Earnings</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-800">{formatCurrency(dashboardData.today.earnings)}</p>
                </div>
              </div>
            </div>

            {/* Expense */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-xs font-medium text-red-700 text-right">{getFilterLabel()} Expense</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-800">{formatCurrency(dashboardData.today.expenses)}</p>
                </div>
              </div>
            </div>

            {/* Sales */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <IndianRupee className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-blue-700 text-right">{getFilterLabel()} Sales</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(dashboardData.today.sales)}</p>
                </div>
              </div>
            </div>

            {/* Pending Amount */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-xs font-medium text-orange-700 text-right">Pending Amount</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-800">{formatCurrency(dashboardData.today.pendingAmount)}</p>
                </div>
              </div>
            </div>

            {/* Profit */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-cyan-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-teal-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-teal-500/10">
                    <Plus className="h-4 w-4 text-teal-600" />
                  </div>
                  <p className="text-xs font-medium text-teal-700 text-right">{getFilterLabel()} Profit</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-teal-800">{formatCurrency(dashboardData.today.profit)}</p>
                </div>
              </div>
            </div>

            {/* Loss */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-pink-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-rose-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-rose-400/20 to-pink-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <Minus className="h-4 w-4 text-rose-600" />
                  </div>
                  <p className="text-xs font-medium text-rose-700 text-right">{getFilterLabel()} Loss</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-rose-800">{formatCurrency(dashboardData.today.loss)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Performance Metrics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {/* Revenue */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-emerald-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-100 to-green-100">
                  <DollarSign className="h-3 w-3 text-emerald-600" />
                </div>
                <p className="text-xs font-medium text-emerald-700 text-right">{getFilterLabel()} Revenue</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(dashboardData.finance.monthlyRevenue || dashboardData.finance.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">Total earnings</p>
              </div>
            </div>

            {/* Converted Leads */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-orange-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                  <Trophy className="h-3 w-3 text-orange-600" />
                </div>
                <p className="text-xs font-medium text-orange-700 text-right">{getFilterLabel()} Converted Leads</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-700">{formatNumber(dashboardData.sales.converted)}</p>
                <p className="text-xs text-gray-500 mt-1">Total conversions</p>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-blue-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                  <Target className="h-3 w-3 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-blue-700 text-right">{getFilterLabel()} Conversion Rate</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-700">{dashboardData.sales.conversionRate?.toFixed(2) || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">Lead to client</p>
              </div>
            </div>

            {/* Overdue Projects */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-red-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-100 to-rose-100">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                </div>
                <p className="text-xs font-medium text-red-700 text-right">{getFilterLabel()} Overdue Projects</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-700">{formatNumber(dashboardData.projects.overdue)}</p>
                <p className="text-xs text-gray-500 mt-1">Need attention</p>
              </div>
            </div>

            {/* Total Clients */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-indigo-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100">
                  <Users className="h-3 w-3 text-indigo-600" />
                </div>
                <p className="text-xs font-medium text-indigo-700 text-right">{getFilterLabel()} Total Clients</p>
              </div>
              <div>
                <p className="text-lg font-bold text-indigo-700">{formatNumber(dashboardData.users.clients)}</p>
                <p className="text-xs text-gray-500 mt-1">Active clients</p>
              </div>
            </div>
          </motion.div>

          {/* Analytics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Revenue Trend Chart */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Revenue Trend</h3>
                  <p className="text-sm text-gray-600">Monthly revenue growth</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100">
                  <LineChart className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Project Status Distribution */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Project Status</h3>
                  <p className="text-sm text-gray-600">Project distribution ({getFilterLabel()})</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                  <PieChart className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="h-48 flex items-center">
                {projectStatusData.length > 0 ? (
                  <>
                    <div className="w-32 h-32 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={projectStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {projectStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry?.color || '#6B7280'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              fontSize: '12px'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 flex flex-col justify-center space-y-3 pl-6">
                      {projectStatusData.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: item?.color || '#6B7280' }}
                          ></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item?.name}</p>
                            <p className="text-xs text-gray-600">{item?.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                    No projects in this period
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Project Category Performance & Top Performing Channel Partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Project Category Performance */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 lg:p-6 shadow-xl border border-gray-200/50 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Project Category Performance</h3>
                  <p className="text-sm text-gray-600">Performance by category ({getFilterLabel()})</p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 shrink-0">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                {projectCategoryPerformance.length > 0 ? (
                  <>
                    {/* Best Performing Category Badge */}
                    {projectCategoryPerformance[0] && (
                      <div className="mb-3 p-2.5 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 shrink-0">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-medium text-emerald-900 leading-tight">
                            Best: <span className="font-bold">{projectCategoryPerformance[0].name}</span>
                            {' '}({projectCategoryPerformance[0].convertedLeads} leads, {projectCategoryPerformance[0].conversionRate.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Column Chart */}
                    <div className="flex-1 min-h-[280px] max-h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projectCategoryPerformance}
                          margin={{ top: 10, right: 10, left: 5, bottom: 50 }}
                          barCategoryGap="15%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={50}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 500 }}
                            interval={0}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 9 }}
                            width={35}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                              fontSize: '11px',
                              padding: '6px 10px'
                            }}
                            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                            formatter={(value, name) => {
                              if (name === 'convertedLeads') {
                                return [value, 'Converted Leads'];
                              }
                              return [value, name];
                            }}
                          />
                          <Bar
                            dataKey="convertedLeads"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={40}
                          >
                            {projectCategoryPerformance.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || '#6366f1'}
                                style={{ transition: 'opacity 0.2s' }}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-600 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></div>
                        <span className="font-medium">Converted Leads</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500 flex-1">
                    <div className="text-center">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No category performance data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Performing Channel Partners */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 lg:p-6 shadow-xl border border-gray-200/50 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Top Performing Channel Partners</h3>
                  <p className="text-sm text-gray-600">Based on converted leads</p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {topChannelPartners.length > 0 ? (
                  topChannelPartners.map((partner, index) => (
                    <motion.div
                      key={partner._id || `partner-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                        {adminChannelPartnerService.generateAvatar(partner.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900">{partner.name}</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Converted Leads: {partner.convertedLeads || 0}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-medium text-emerald-600 block">
                          {partner.conversionRate ? partner.conversionRate.toFixed(1) : '0.0'}%
                        </span>
                        <span className="text-xs text-gray-500">Conversion</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <div className="text-center">
                      <Crown className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No top performing channel partners yet.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Category Financial Details Cards */}
          {categoryFinancialDetails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="w-full"
            >
              <div className="mb-3">
                <h2 className="text-xl font-bold text-gray-900">Category Financial Overview</h2>
                <p className="text-xs text-gray-500 mt-0.5">Financial performance by category</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {categoryFinancialDetails.map((category, index) => (
                  <motion.div
                    key={category.categoryName || `category-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="bg-white/80 backdrop-blur-sm rounded-xl p-3 lg:p-4 shadow-md border border-gray-200/50 hover:shadow-lg transition-shadow"
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white font-semibold text-xs shrink-0"
                        style={{ backgroundColor: category.categoryColor || '#6366f1' }}
                      >
                        {category.categoryName?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{category.categoryName || 'Uncategorized'}</h3>
                        <p className="text-xs text-gray-400">{category.totalProjects || 0} Projects</p>
                      </div>
                    </div>

                    {/* Financial Details - Compact Grid */}
                    <div className="space-y-1.5">
                      {/* Total Project Cost */}
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50/80">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3 text-blue-600" />
                          <span className="text-[10px] font-medium text-gray-600">Cost</span>
                        </div>
                        <span className="text-xs font-bold text-blue-700">
                          ₹{formatNumber(Math.round(category.totalProjectCost || 0))}
                        </span>
                      </div>

                      {/* Total Recovery */}
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50/80">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-600" />
                          <span className="text-[10px] font-medium text-gray-600">Recovery</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{formatNumber(Math.round(category.totalRecovery || 0))}
                        </span>
                      </div>

                      {/* Total Pending Recovery */}
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50/80">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                          <span className="text-[10px] font-medium text-gray-600">Pending Recovery</span>
                        </div>
                        <span className="text-xs font-bold text-orange-700">
                          ₹{formatNumber(Math.round(category.totalPendingRecovery || 0))}
                        </span>
                      </div>

                      {/* Conversion Ratio */}
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50/80">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-purple-600" />
                          <span className="text-[10px] font-medium text-gray-600">Conv.</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-purple-700">
                            {category.conversionRatio ? category.conversionRatio.toFixed(1) : '0.0'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

export default Admin_dashboard
