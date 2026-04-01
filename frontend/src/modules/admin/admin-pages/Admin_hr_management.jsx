import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import HR_sidebar from '../admin-components/HR_sidebar'
import { adminStorage } from '../admin-services/baseApiService'
import { 
  Users, 
  UserCheck,
  X,
  Plus,
  Cake,
  Shield,
  User,
  UserPlus,
  Edit3,
  Trash2,
  Eye,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  Code,
  TrendingUp,
  Home,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Upload,
  FileText,
  FileSpreadsheet,
  Download,
  BarChart3,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  UserCheck as UserCheckIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Banknote,
  CreditCard,
  Receipt,
  Calculator,
  PieChart,
  TrendingDown,
  Wallet,
  MessageSquare,
  Send,
  Laptop,
  Monitor,
  Smartphone,
  Headphones,
  Wifi,
  Car,
  Gift,
  Package,
  ClipboardList,
  FileCheck,
  UserX,
  Award
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Combobox } from '../../../components/ui/combobox'
import Loading from '../../../components/ui/loading'
import CloudinaryUpload from '../../../components/ui/cloudinary-upload'
import adminAttendanceService from '../admin-services/adminAttendanceService'
import { useToast } from '../../../contexts/ToastContext'
import { adminUserService } from '../admin-services'
import adminSalaryService from '../admin-services/adminSalaryService'
import adminAllowanceService from '../admin-services/adminAllowanceService'
import adminRecurringExpenseService from '../admin-services/adminRecurringExpenseService'
import adminRequestService from '../admin-services/adminRequestService'

// Normalize employeeId to string (API may return ObjectId as object or string)
const normalizeEmployeeId = (val) => {
  if (val == null) return null
  if (typeof val === 'string') return val
  if (typeof val === 'object' && val !== null) {
    const id = val._id ?? val.$oid ?? val.id
    return id != null ? String(id) : null
  }
  return String(val)
}

const Admin_hr_management = () => {
  const { addToast } = useToast()
  const normalizePhone = (value) => {
    if (!value) return ''
    const trimmed = String(value).trim()
    const hasPlus = trimmed.startsWith('+')
    const digits = trimmed.replace(/[^0-9]/g, '')
    return hasPlus ? `+${digits}` : digits
  }

  const isValidPhone = (value) => {
    const phone = normalizePhone(value)
    return /^[\+]?[1-9]\d{9,15}$/.test(phone)
  }
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('team')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [birthdayData, setBirthdayData] = useState({
    personId: '',
    birthday: '',
    personType: 'employee' // 'employee' or 'pm'
  })
  
  // Attendance states
  const [attendanceData, setAttendanceData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM format
  const [attendanceFile, setAttendanceFile] = useState(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    attendanceRate: 0
  })

  // Salary states
  const [salaryData, setSalaryData] = useState([])
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(new Date().toISOString().slice(0, 7))
  const [salaryMonthView, setSalaryMonthView] = useState('current') // 'current' | 'next'
  const [selectedSalaryDepartment, setSelectedSalaryDepartment] = useState('all')
  const [selectedSalaryWeek, setSelectedSalaryWeek] = useState('all')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all')
  const [salaryStats, setSalaryStats] = useState({
    totalEmployees: 0,
    paidEmployees: 0,
    pendingEmployees: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalIncentiveAmount: 0,
    paidIncentiveAmount: 0,
    pendingIncentiveAmount: 0,
    totalRewardAmount: 0,
    paidRewardAmount: 0,
    pendingRewardAmount: 0
  })
  const [showIncentiveModal, setShowIncentiveModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [selectedIncentiveRecord, setSelectedIncentiveRecord] = useState(null)
  const [selectedRewardRecord, setSelectedRewardRecord] = useState(null)
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [showSalaryDetailsModal, setShowSalaryDetailsModal] = useState(false)
  const [selectedSalaryDetails, setSelectedSalaryDetails] = useState(null)
  const [selectedSalaryRecord, setSelectedSalaryRecord] = useState(null)
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false)
  const [showAddEmployeeSalaryModal, setShowAddEmployeeSalaryModal] = useState(false)
  const [showDeleteSalaryModal, setShowDeleteSalaryModal] = useState(false)
  const [showSalaryHistoryModal, setShowSalaryHistoryModal] = useState(false)
  const [salaryHistory, setSalaryHistory] = useState([])
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [salaryToDelete, setSalaryToDelete] = useState(null)
  const [newEmployeeSalaryData, setNewEmployeeSalaryData] = useState({
    employeeId: '',
    salary: '',
    effectiveFromMonth: new Date().toISOString().slice(0, 7)
  })
  const [employeesWithSalaryIds, setEmployeesWithSalaryIds] = useState([])
  const [employeesWithSalaryDetails, setEmployeesWithSalaryDetails] = useState([])
  const [showEmployeesWithSalaryModal, setShowEmployeesWithSalaryModal] = useState(false)
  const [loadingEmployeesWithSalary, setLoadingEmployeesWithSalary] = useState(false)
  const [editSalaryData, setEditSalaryData] = useState({
    basicSalary: ''
  })

  // Requests states
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestData, setRequestData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'normal',
    department: '',
    type: 'approval',
    recipientType: 'admin', // Default to admin so HR can send requests to admin
    recipientId: ''
  })
  const [requestRecipients, setRequestRecipients] = useState({})

  // Allowances states
  const [allowances, setAllowances] = useState([])
  const [showAllowanceModal, setShowAllowanceModal] = useState(false)
  const [showEditAllowanceModal, setShowEditAllowanceModal] = useState(false)
  const [selectedAllowance, setSelectedAllowance] = useState(null)
  const [allowanceData, setAllowanceData] = useState({
    employeeId: '',
    itemType: '',
    itemName: '',
    serialNumber: '',
    issueDate: '',
    returnDate: '',
    status: 'active',
    value: '',
    remarks: ''
  })

  // Recurring Expenses states
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false)
  const [showExpenseEntriesModal, setShowExpenseEntriesModal] = useState(false)
  const [expenseEntries, setExpenseEntries] = useState([])
  const [expenseEntriesLoading, setExpenseEntriesLoading] = useState(false)
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [paymentFormData, setPaymentFormData] = useState({
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: ''
  })
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [expenseData, setExpenseData] = useState({
    name: '',
    category: '',
    amount: '',
    frequency: 'monthly',
    startDate: '',
    endDate: '',
    status: 'active',
    description: '',
    vendor: '',
    paymentMethod: 'bank_transfer',
    autoPay: false
  })
  const [expenseStats, setExpenseStats] = useState({
    totalExpenses: 0,
    activeExpenses: 0,
    monthlyTotal: 0,
    yearlyTotal: 0,
    categories: {}
  })

  // Expense filter states
  const [expenseFilters, setExpenseFilters] = useState({
    selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    selectedYear: new Date().getFullYear().toString(),
    selectedCategory: 'all',
    selectedStatus: 'all',
    selectedFrequency: 'all',
    viewMode: 'all' // 'all', 'monthly', 'yearly'
  })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    team: '',
    department: '',
    status: 'active',
    dateOfBirth: '',
    joiningDate: '',
    document: null,
    password: '',
    confirmPassword: ''
  })

  // Birthday filter: 'today' | 'week' | 'month'
  const [birthdayFilter, setBirthdayFilter] = useState('today')

  // Birthday Statistics
  const [statistics, setStatistics] = useState({
    totalBirthdays: 8,
    todayBirthdays: 2,
    thisWeekBirthdays: 5,
    thisMonthBirthdays: 8
  })

  // Users data (from backend)
  const [employees, setEmployees] = useState([])
  const [projectManagers, setProjectManagers] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [allUsers, setAllUsers] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  // Build department options dynamically from loaded users
  const departmentFilterOptions = React.useMemo(() => {
    const unique = new Set()
    allUsers.forEach(u => {
      const dept = u.department || u.team || 'General'
      if (dept) unique.add(dept)
    })
    return Array.from(unique).sort()
  }, [allUsers])

  // Salary department options: Admin roles use employee.role (hr, accountant, pem) in Salary; others use department.
  // Include hr/accountant/pem/admin explicitly since they don't match allUsers display depts (HR, Finance, Management).
  const salaryDepartmentOptions = React.useMemo(() => {
    const adminDepts = [
      { value: 'hr', label: 'HR' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'pem', label: 'PEM' },
      { value: 'admin', label: 'Admin' }
    ]
    const otherDepts = departmentFilterOptions
      .filter(d => !['HR', 'Finance'].includes(d))
      .map(dept => {
        const d = dept.toLowerCase()
        const icon = d.includes('sales') ? TrendingUp : d.includes('manage') || d.includes('lead') ? Shield : Code
        return { value: dept, label: dept, icon }
      })
    return [
      { value: 'all', label: 'All Departments', icon: Users },
      ...adminDepts.map(({ value, label }) => {
        const d = value.toLowerCase()
        const icon = d === 'hr' ? Shield : d === 'accountant' ? Calculator : d === 'pem' ? ClipboardList : Shield
        return { value, label, icon }
      }),
      ...otherDepts
    ]
  }, [departmentFilterOptions])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch all users by setting a very high limit
      const [usersResponse] = await Promise.all([
        adminUserService.getAllUsers({ role: 'all', limit: 10000, page: 1 })
      ])

      const formatted = usersResponse.data.map(u => adminUserService.formatUserForDisplay(u))

      // Build unified list for team + birthdays: all roles (employee, sales, project-manager, accountant, pem, hr)
      const avatarFromName = (name) => (name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U')
      const allUsersList = []
      formatted.forEach(u => {
        const base = {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          status: u.status,
          joinDate: u.joiningDate,
          joiningDate: u.joiningDate,
          birthday: u.dateOfBirth,
          dateOfBirth: u.dateOfBirth,
          document: u.document,
          avatar: u.avatar || avatarFromName(u.name),
          department: u.department || u.team || 'General',
          team: u.team
        }
        if (u.userType === 'employee' || u.userType === 'sales') {
          allUsersList.push({ ...base, role: u.userType === 'sales' ? 'sales' : 'employee', department: u.department || u.team || 'General' })
        } else if (u.userType === 'project-manager') {
          allUsersList.push({ ...base, role: 'project-manager', department: 'Management' })
        } else if (u.userType === 'accountant') {
          allUsersList.push({ ...base, role: 'accountant', department: u.department || 'Finance' })
        } else if (u.userType === 'pem') {
          allUsersList.push({ ...base, role: 'pem', department: u.department || 'Management' })
        } else if (u.userType === 'admin' && u.role === 'hr') {
          // HR only: show HR users from Admin collection; do not show super admins (role === 'admin')
          allUsersList.push({ ...base, role: 'hr', department: u.department || 'HR' })
        }
      })

      // Keep employees and PMs for salary/allowance dropdowns and existing logic
      const emps = allUsersList.filter(u => u.role === 'employee' || u.role === 'sales')
      const pms = allUsersList.filter(u => u.role === 'project-manager')

      setEmployees(emps)
      setProjectManagers(pms)

      const mockBirthdays = allUsersList
        .filter(p => !!p.birthday)
        .slice(0, 50)
        .map((p, idx) => ({
          id: p.id || idx + 1,
          personId: p.id,
          personName: p.name,
          personType: p.role === 'project-manager' ? 'pm' : p.role,
          birthday: p.birthday,
          age: new Date().getFullYear() - new Date(p.birthday).getFullYear(),
          department: p.department,
          role: p.role
        }))
      setBirthdays(mockBirthdays)

      setAllUsers(allUsersList)
      setCurrentPage(1) // Reset to first page when data loads
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get today's birthdays (all users: employees, PMs, PEM, accountant, HR, etc.)
  const getTodaysBirthdays = () => {
    const today = new Date()
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`
    return allUsers.filter(person => {
      if (!person.birthday) return false
      const birthday = new Date(person.birthday)
      const birthdayStr = `${birthday.getMonth() + 1}-${birthday.getDate()}`
      return birthdayStr === todayStr
    })
  }

  // Get this week's birthdays
  const getThisWeekBirthdays = () => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return allUsers.filter(person => {
      if (!person.birthday) return false
      const birthday = new Date(person.birthday)
      const currentYear = today.getFullYear()
      birthday.setFullYear(currentYear)
      return birthday >= weekStart && birthday <= weekEnd
    })
  }

  // Get this month's birthdays
  const getThisMonthBirthdays = () => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return allUsers.filter(person => {
      if (!person.birthday) return false
      const birthday = new Date(person.birthday)
      const currentYear = today.getFullYear()
      birthday.setFullYear(currentYear)
      return birthday >= monthStart && birthday <= monthEnd
    })
  }

  // Get birthdays based on selected filter
  const getFilteredBirthdays = () => {
    switch (birthdayFilter) {
      case 'week': return getThisWeekBirthdays()
      case 'month': return getThisMonthBirthdays()
      default: return getTodaysBirthdays()
    }
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Requests functions - now using real API
  // Load requests data from backend
  const loadRequests = async () => {
    setRequestsLoading(true)
    try {
      const response = await adminRequestService.getRequests({
        direction: 'all',
        // Load all requests (not just employee module) to see requests sent to admin
        status: 'all'
      })
      
      if (response.success) {
        // Transform API data to match component expectations
        const transformedRequests = (response.data || []).map(req => ({
          id: req._id || req.id,
          title: req.title,
          description: req.description,
          category: req.category || '',
          priority: req.priority || 'normal',
          department: req.department || 'all',
          status: req.status || 'pending',
          requestedBy: req.requestedBy?.name || 'HR Manager',
          requestDate: req.createdAt || new Date().toISOString(),
          adminResponse: req.response?.message || null,
          responseDate: req.response?.respondedDate || null,
          responseType: req.response?.type || null,
          respondedBy: req.response?.respondedBy?.name || null,
          // Store full request object for API calls
          _full: req
        }))
        setRequests(transformedRequests)
      } else {
        setRequests([])
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load requests' })
      setRequests([])
    } finally {
      setRequestsLoading(false)
    }
  }

  // Load recipients for request creation
  const loadRequestRecipients = async () => {
    try {
      const types = ['employee', 'pm', 'sales', 'admin']
      const recipientsData = {}
      
      for (const type of types) {
        try {
          const response = await adminRequestService.getRecipients(type)
          if (response.success) {
            recipientsData[type] = response.data || []
          }
        } catch (error) {
          console.error(`Error loading ${type} recipients:`, error)
          recipientsData[type] = []
        }
      }
      
      setRequestRecipients(recipientsData)
    } catch (error) {
      console.error('Error loading recipients:', error)
    }
  }

  const handleCreateRequest = async () => {
    setRequestData({
      title: '',
      description: '',
      category: '',
      priority: 'normal',
      department: '',
      type: 'approval',
      recipientType: 'admin', // Default to admin so HR can easily send requests to admin
      recipientId: ''
    })
    // Load recipients when opening modal
    await loadRequestRecipients()
    setShowRequestModal(true)
  }

  const handleSaveRequest = async () => {
    // Validation
    if (!requestData.title.trim() || !requestData.description.trim()) {
      addToast({ type: 'error', message: 'Please fill in title and description' })
      return
    }

    if (requestData.recipientType && !requestData.recipientId) {
      addToast({ type: 'error', message: 'Please select a recipient' })
      return
    }

    try {
      const requestPayload = {
        title: requestData.title,
        description: requestData.description,
        type: requestData.type || 'approval',
        priority: requestData.priority || 'normal',
        category: requestData.category || '',
        department: requestData.department || 'all'
      }

      // Add recipient if provided
      if (requestData.recipientId && requestData.recipientType) {
        requestPayload.recipient = requestData.recipientId
        // Map recipient types to correct model names
        const recipientModelMap = {
          'pm': 'PM',
          'admin': 'Admin',
          'employee': 'Employee',
          'sales': 'Sales'
        }
        requestPayload.recipientModel = recipientModelMap[requestData.recipientType] || 
          requestData.recipientType.charAt(0).toUpperCase() + requestData.recipientType.slice(1)
      }

      const response = await adminRequestService.createRequest(requestPayload)
      
      if (response.success) {
        addToast({ type: 'success', message: 'Request created successfully' })
        setShowRequestModal(false)
        setRequestData({
          title: '',
          description: '',
          category: '',
          priority: 'normal',
          department: '',
          type: 'approval',
          recipientType: 'admin',
          recipientId: ''
        })
        // Reload requests
        await loadRequests()
      } else {
        addToast({ type: 'error', message: response.message || 'Failed to create request' })
      }
    } catch (error) {
      console.error('Error creating request:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to create request' })
    }
  }

  const getRequestStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved':
      case 'responded': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal':
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Allowances functions - now using real API
  // Load allowances data when allowances tab is active
  const loadAllowances = async () => {
    try {
      const res = await adminAllowanceService.getAllAllowances()
      const allowancesData = (res.data || []).map((allowance, idx) => ({
        id: allowance._id || idx + 1,
        employeeId: allowance.employeeId?._id || allowance.employeeId,
        employeeName: allowance.employeeName,
        itemType: allowance.itemType,
        itemName: allowance.itemName,
        serialNumber: allowance.serialNumber || '',
        issueDate: allowance.issueDate ? new Date(allowance.issueDate).toISOString().split('T')[0] : '',
        returnDate: allowance.returnDate ? new Date(allowance.returnDate).toISOString().split('T')[0] : null,
        status: allowance.status,
        value: allowance.value,
        remarks: allowance.remarks || ''
      }))
      setAllowances(allowancesData)
    } catch (error) {
      console.error('Error loading allowances:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load allowances' })
      setAllowances([])
    }
  }

  // Load allowances when tab is active
  useEffect(() => {
    if (activeTab === 'allowances') {
      loadAllowances()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleCreateAllowance = () => {
    setAllowanceData({
      employeeId: '',
      itemType: '',
      itemName: '',
      serialNumber: '',
      issueDate: '',
      returnDate: '',
      status: 'active',
      value: '',
      remarks: ''
    })
    setShowAllowanceModal(true)
  }

  const handleSaveAllowance = async () => {
    // Validation
    if (!allowanceData.employeeId || !allowanceData.itemType || !allowanceData.itemName || !allowanceData.issueDate || !allowanceData.value) {
      addToast({ type: 'error', message: 'Please fill in all required fields' })
      return
    }

    const selectedEmployee = allUsers.find(user => {
      const userIdStr = user._id || user.id || user.employeeId
      return userIdStr.toString() === allowanceData.employeeId.toString()
    })

    if (!selectedEmployee) {
      addToast({ type: 'error', message: 'Selected employee not found' })
      return
    }

    const value = parseFloat(allowanceData.value)
    if (isNaN(value) || value < 0) {
      addToast({ type: 'error', message: 'Please enter a valid value' })
      return
    }

    try {
      // Determine user type
      const userType = selectedEmployee.role === 'project-manager' ? 'pm' : 
                      selectedEmployee.team === 'sales' ? 'sales' : 'employee'
      const employeeId = selectedEmployee._id || selectedEmployee.id || selectedEmployee.employeeId

      const allowancePayload = {
        employeeId: employeeId.toString(),
        userType,
        itemType: allowanceData.itemType,
        itemName: allowanceData.itemName,
        serialNumber: allowanceData.serialNumber || '',
        issueDate: allowanceData.issueDate,
        returnDate: allowanceData.returnDate || null,
        status: allowanceData.status || 'active',
        value: value,
        remarks: allowanceData.remarks || ''
      }

      await adminAllowanceService.createAllowance(allowancePayload)
      addToast({ type: 'success', message: 'Allowance created successfully' })
      
      setShowAllowanceModal(false)
      setAllowanceData({
        employeeId: '',
        itemType: '',
        itemName: '',
        serialNumber: '',
        issueDate: '',
        returnDate: '',
        status: 'active',
        value: '',
        remarks: ''
      })
      
      // Reload allowances
      await loadAllowances()
    } catch (error) {
      console.error('Error creating allowance:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to create allowance' })
    }
  }

  const handleEditAllowance = (allowance) => {
    setSelectedAllowance(allowance)
    setAllowanceData({
      employeeId: allowance.employeeId,
      itemType: allowance.itemType,
      itemName: allowance.itemName,
      serialNumber: allowance.serialNumber || '',
      issueDate: allowance.issueDate,
      returnDate: allowance.returnDate || '',
      status: allowance.status,
      value: allowance.value.toString(),
      remarks: allowance.remarks || ''
    })
    setShowEditAllowanceModal(true)
  }

  const handleUpdateAllowance = async () => {
    if (!selectedAllowance) return

    // Validation
    if (!allowanceData.itemType || !allowanceData.itemName || !allowanceData.issueDate || !allowanceData.value) {
      addToast({ type: 'error', message: 'Please fill in all required fields' })
      return
    }

    const value = parseFloat(allowanceData.value)
    if (isNaN(value) || value < 0) {
      addToast({ type: 'error', message: 'Please enter a valid value' })
      return
    }

    try {
      const updates = {
        itemType: allowanceData.itemType,
        itemName: allowanceData.itemName,
        serialNumber: allowanceData.serialNumber || '',
        issueDate: allowanceData.issueDate,
        returnDate: allowanceData.returnDate || null,
        status: allowanceData.status,
        value: value,
        remarks: allowanceData.remarks || ''
      }

      await adminAllowanceService.updateAllowance(selectedAllowance.id, updates)
      addToast({ type: 'success', message: 'Allowance updated successfully' })
      
      setShowEditAllowanceModal(false)
      setSelectedAllowance(null)
      setAllowanceData({
        employeeId: '',
        itemType: '',
        itemName: '',
        serialNumber: '',
        issueDate: '',
        returnDate: '',
        status: 'active',
        value: '',
        remarks: ''
      })
      
      // Reload allowances
      await loadAllowances()
    } catch (error) {
      console.error('Error updating allowance:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to update allowance' })
    }
  }

  const handleDeleteAllowance = async (allowance) => {
    if (!window.confirm(`Are you sure you want to delete the allowance "${allowance.itemName}" for ${allowance.employeeName}?`)) {
      return
    }

    try {
      await adminAllowanceService.deleteAllowance(allowance.id)
      addToast({ type: 'success', message: 'Allowance deleted successfully' })
      await loadAllowances()
    } catch (error) {
      console.error('Error deleting allowance:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to delete allowance' })
    }
  }

  const getItemIcon = (itemType) => {
    switch (itemType) {
      case 'laptop': return <Laptop className="h-4 w-4" />
      case 'monitor': return <Monitor className="h-4 w-4" />
      case 'smartphone': return <Smartphone className="h-4 w-4" />
      case 'headphones': return <Headphones className="h-4 w-4" />
      case 'wifi': return <Wifi className="h-4 w-4" />
      case 'car': return <Car className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getAllowanceStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'returned': return 'bg-blue-100 text-blue-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Recurring Expenses functions - now using real API
  // Load recurring expenses data
  const loadRecurringExpenses = async () => {
    try {
      const res = await adminRecurringExpenseService.getAllRecurringExpenses({
        status: expenseFilters.selectedStatus !== 'all' ? expenseFilters.selectedStatus : undefined,
        category: expenseFilters.selectedCategory !== 'all' ? expenseFilters.selectedCategory : undefined,
        frequency: expenseFilters.selectedFrequency !== 'all' ? expenseFilters.selectedFrequency : undefined
      })
      
      const expensesData = (res.data || []).map((expense, idx) => ({
        id: expense._id || idx + 1,
        name: expense.name,
        category: expense.category,
        amount: expense.amount,
        frequency: expense.frequency,
        startDate: expense.startDate ? new Date(expense.startDate).toISOString().split('T')[0] : '',
        endDate: expense.endDate ? new Date(expense.endDate).toISOString().split('T')[0] : null,
        status: expense.status,
        description: expense.description || '',
        vendor: expense.vendor || '',
        paymentMethod: expense.paymentMethod || 'bank_transfer',
        autoPay: expense.autoPay || false,
        lastPaidDate: expense.lastPaidDate ? new Date(expense.lastPaidDate).toISOString().split('T')[0] : null,
        nextDueDate: expense.nextDueDate ? new Date(expense.nextDueDate).toISOString().split('T')[0] : null,
        dayOfMonth: expense.dayOfMonth || 1
      }))
      
      setRecurringExpenses(expensesData)
      
      // Update stats from backend if available
      if (res.stats) {
        setExpenseStats({
          totalExpenses: res.stats.totalExpenses || 0,
          activeExpenses: res.stats.activeExpenses || 0,
          monthlyTotal: res.stats.monthlyTotal || 0,
          yearlyTotal: res.stats.yearlyTotal || 0,
          categories: res.stats.categories || {}
        })
      } else {
        calculateExpenseStats(expensesData)
      }
    } catch (error) {
      console.error('Error loading recurring expenses:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load recurring expenses' })
      setRecurringExpenses([])
    }
  }

  // Load recurring expenses when tab is active
  useEffect(() => {
    if (activeTab === 'expenses') {
      loadRecurringExpenses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, expenseFilters.selectedStatus, expenseFilters.selectedCategory, expenseFilters.selectedFrequency])

  const calculateExpenseStats = (expenses) => {
    const totalExpenses = expenses.length
    const activeExpenses = expenses.filter(exp => exp.status === 'active').length
    
    let monthlyTotal = 0
    let yearlyTotal = 0
    const categories = {}

    expenses.forEach(expense => {
      if (expense.status === 'active') {
        // Calculate monthly contribution
        if (expense.frequency === 'monthly') {
          monthlyTotal += expense.amount
          yearlyTotal += expense.amount * 12
        } else if (expense.frequency === 'yearly') {
          monthlyTotal += expense.amount / 12
          yearlyTotal += expense.amount
        } else if (expense.frequency === 'quarterly') {
          monthlyTotal += expense.amount / 3
          yearlyTotal += expense.amount * 4
        }

        // Count by category
        if (!categories[expense.category]) {
          categories[expense.category] = 0
        }
        categories[expense.category]++
      }
    })

    setExpenseStats({
      totalExpenses,
      activeExpenses,
      monthlyTotal: Math.round(monthlyTotal),
      yearlyTotal: Math.round(yearlyTotal),
      categories
    })
  }

  const handleCreateExpense = () => {
    setExpenseData({
      name: '',
      category: '',
      amount: '',
      frequency: 'monthly',
      startDate: '',
      endDate: '',
      status: 'active',
      description: '',
      vendor: '',
      paymentMethod: 'bank_transfer'
    })
    setShowExpenseModal(true)
  }

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense)
    setExpenseData({
      name: expense.name,
      category: expense.category,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      startDate: expense.startDate,
      endDate: expense.endDate || '',
      status: expense.status,
      description: expense.description,
      vendor: expense.vendor,
      paymentMethod: expense.paymentMethod,
      autoPay: expense.autoPay || false
    })
    setShowEditExpenseModal(true)
  }

  const handleSaveExpense = async () => {
    // Validation
    if (!expenseData.name || !expenseData.amount || !expenseData.category || !expenseData.startDate) {
      addToast({ type: 'error', message: 'Please fill in all required fields' })
      return
    }

    const amount = parseFloat(expenseData.amount)
    if (isNaN(amount) || amount < 0) {
      addToast({ type: 'error', message: 'Please enter a valid amount' })
      return
    }

    try {
      const expensePayload = {
        name: expenseData.name,
        category: expenseData.category,
        amount: amount,
        frequency: expenseData.frequency || 'monthly',
        startDate: expenseData.startDate,
        endDate: expenseData.endDate || null,
        status: expenseData.status || 'active',
        description: expenseData.description || '',
        vendor: expenseData.vendor || '',
        paymentMethod: expenseData.paymentMethod || 'bank_transfer',
        dayOfMonth: new Date(expenseData.startDate).getDate(),
        autoPay: expenseData.autoPay || false
      }

      const res = await adminRecurringExpenseService.createRecurringExpense(expensePayload)
      addToast({ 
        type: 'success', 
        message: `Recurring expense created successfully. ${res.entriesGenerated?.created || 0} entries generated.` 
      })
      
      setShowExpenseModal(false)
      resetExpenseData()
      
      // Reload expenses
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Error creating recurring expense:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to create recurring expense' })
    }
  }

  const handleUpdateExpense = async () => {
    if (!selectedExpense) return

    // Validation
    if (!expenseData.name || !expenseData.amount || !expenseData.category || !expenseData.startDate) {
      addToast({ type: 'error', message: 'Please fill in all required fields' })
      return
    }

    const amount = parseFloat(expenseData.amount)
    if (isNaN(amount) || amount < 0) {
      addToast({ type: 'error', message: 'Please enter a valid amount' })
      return
    }

    try {
      const updates = {
        name: expenseData.name,
        category: expenseData.category,
        amount: amount,
        frequency: expenseData.frequency,
        startDate: expenseData.startDate,
        endDate: expenseData.endDate || null,
        status: expenseData.status,
        description: expenseData.description || '',
        vendor: expenseData.vendor || '',
        paymentMethod: expenseData.paymentMethod || 'bank_transfer',
        dayOfMonth: new Date(expenseData.startDate).getDate(),
        autoPay: expenseData.autoPay || false
      }

      await adminRecurringExpenseService.updateRecurringExpense(selectedExpense.id, updates)
      addToast({ type: 'success', message: 'Recurring expense updated successfully' })
      
      setShowEditExpenseModal(false)
      setSelectedExpense(null)
      resetExpenseData()
      
      // Reload expenses
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Error updating recurring expense:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to update recurring expense' })
    }
  }

  const handleDeleteExpense = (expense) => {
    setExpenseToDelete(expense)
    setShowDeleteExpenseModal(true)
  }

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return
    
    try {
      await adminRecurringExpenseService.deleteRecurringExpense(expenseToDelete.id)
      addToast({ type: 'success', message: 'Recurring expense deleted successfully' })
      setShowDeleteExpenseModal(false)
      setExpenseToDelete(null)
      await loadRecurringExpenses()
    } catch (error) {
      console.error('Error deleting recurring expense:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to delete recurring expense' })
    }
  }

  // Load expense entries for a recurring expense
  const loadExpenseEntries = async (expenseId) => {
    setExpenseEntriesLoading(true)
    try {
      const res = await adminRecurringExpenseService.getExpenseEntries({
        recurringExpenseId: expenseId
      })
      setExpenseEntries(res.data || [])
    } catch (error) {
      console.error('Error loading expense entries:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load expense entries' })
      setExpenseEntries([])
    } finally {
      setExpenseEntriesLoading(false)
    }
  }

  // Handle view/manage expense entries
  const handleViewExpenseEntries = async (expense) => {
    setSelectedExpense(expense)
    setShowExpenseEntriesModal(true)
    await loadExpenseEntries(expense.id)
  }

  // Handle mark entry as paid
  const handleMarkEntryAsPaid = async () => {
    if (!selectedEntry) return
    
    try {
      await adminRecurringExpenseService.markEntryAsPaid(selectedEntry._id, {
        paymentMethod: paymentFormData.paymentMethod,
        paymentReference: paymentFormData.paymentReference,
        notes: paymentFormData.notes
      })
      addToast({ type: 'success', message: 'Expense entry marked as paid successfully' })
      setShowMarkPaidModal(false)
      setSelectedEntry(null)
      setPaymentFormData({
        paymentMethod: 'bank_transfer',
        paymentReference: '',
        notes: ''
      })
      // Reload entries and recurring expenses
      if (selectedExpense) {
        await loadExpenseEntries(selectedExpense.id)
        await loadRecurringExpenses()
      }
    } catch (error) {
      console.error('Error marking entry as paid:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to mark entry as paid' })
    }
  }

  // Open mark paid modal
  const openMarkPaidModal = (entry) => {
    setSelectedEntry(entry)
    setPaymentFormData({
      paymentMethod: entry.recurringExpenseId?.paymentMethod || 'bank_transfer',
      paymentReference: '',
      notes: ''
    })
    setShowMarkPaidModal(true)
  }

  // Note: calculateNextDueDate removed - nextDueDate is now calculated by backend automatically

  const resetExpenseData = () => {
    setExpenseData({
      name: '',
      category: '',
      amount: '',
      frequency: 'monthly',
      startDate: '',
      endDate: '',
      status: 'active',
      description: '',
      vendor: '',
      paymentMethod: 'bank_transfer',
      autoPay: false
    })
  }

  const getExpenseStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getExpenseCategoryIcon = (category) => {
    switch (category) {
      case 'rent': return <Home className="h-4 w-4" />
      case 'utilities': return <Wifi className="h-4 w-4" />
      case 'maintenance': return <Package className="h-4 w-4" />
      case 'software': return <Laptop className="h-4 w-4" />
      case 'insurance': return <Shield className="h-4 w-4" />
      case 'marketing': return <TrendingUp className="h-4 w-4" />
      case 'travel': return <Car className="h-4 w-4" />
      default: return <Receipt className="h-4 w-4" />
    }
  }

  const getExpenseCategoryColor = (category) => {
    switch (category) {
      case 'rent': return 'bg-blue-100 text-blue-800'
      case 'utilities': return 'bg-green-100 text-green-800'
      case 'maintenance': return 'bg-orange-100 text-orange-800'
      case 'software': return 'bg-purple-100 text-purple-800'
      case 'insurance': return 'bg-red-100 text-red-800'
      case 'marketing': return 'bg-pink-100 text-pink-800'
      case 'travel': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Expense filter functions
  const getFilteredExpenses = () => {
    let filtered = [...recurringExpenses]

    // Filter by category
    if (expenseFilters.selectedCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === expenseFilters.selectedCategory)
    }

    // Filter by status
    if (expenseFilters.selectedStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === expenseFilters.selectedStatus)
    }

    // Filter by frequency
    if (expenseFilters.selectedFrequency !== 'all') {
      filtered = filtered.filter(expense => expense.frequency === expenseFilters.selectedFrequency)
    }

    // Filter by view mode
    if (expenseFilters.viewMode === 'monthly') {
      filtered = filtered.filter(expense => expense.frequency === 'monthly')
    } else if (expenseFilters.viewMode === 'yearly') {
      filtered = filtered.filter(expense => expense.frequency === 'yearly')
    }

    // Sort: unpaid first (due to pay on top), then by next due date ascending (nearest first); paid at bottom
    return filtered.sort((a, b) => {
      const paidA = a.paymentStatus === 'paid'
      const paidB = b.paymentStatus === 'paid'
      if (paidA && !paidB) return 1
      if (!paidA && paidB) return -1
      const dateA = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER
      const dateB = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER
      return dateA - dateB
    })
  }

  const getFilteredExpenseStats = () => {
    const filtered = getFilteredExpenses()
    const activeFiltered = filtered.filter(exp => exp.status === 'active')
    
    let monthlyTotal = 0
    let yearlyTotal = 0
    const categories = {}

    activeFiltered.forEach(expense => {
      if (expense.frequency === 'monthly') {
        monthlyTotal += expense.amount
        yearlyTotal += expense.amount * 12
      } else if (expense.frequency === 'yearly') {
        monthlyTotal += expense.amount / 12
        yearlyTotal += expense.amount
      } else if (expense.frequency === 'quarterly') {
        monthlyTotal += expense.amount / 3
        yearlyTotal += expense.amount * 4
      }
      
      if (!categories[expense.category]) {
        categories[expense.category] = 0
      }
      categories[expense.category]++
    })

    return {
      totalExpenses: filtered.length,
      activeExpenses: activeFiltered.length,
      monthlyTotal: Math.round(monthlyTotal),
      yearlyTotal: Math.round(yearlyTotal),
      categories
    }
  }

  const getMonthlyExpenseBreakdown = () => {
    const selectedMonth = expenseFilters.selectedMonth
    const selectedYear = selectedMonth.split('-')[0]
    const selectedMonthNum = selectedMonth.split('-')[1]
    
    return recurringExpenses.filter(expense => {
      if (expense.status !== 'active') return false
      
      const startDate = new Date(expense.startDate)
      const endDate = expense.endDate ? new Date(expense.endDate) : new Date('2099-12-31')
      const currentDate = new Date(selectedYear, selectedMonthNum - 1, 1)
      
      return startDate <= currentDate && endDate >= currentDate
    })
  }

  const getYearlyExpenseBreakdown = () => {
    const selectedYear = expenseFilters.selectedYear
    
    return recurringExpenses.filter(expense => {
      if (expense.status !== 'active') return false
      
      const startDate = new Date(expense.startDate)
      const endDate = expense.endDate ? new Date(expense.endDate) : new Date('2099-12-31')
      const currentYear = new Date(selectedYear, 0, 1)
      const nextYear = new Date(selectedYear, 11, 31)
      
      return startDate <= nextYear && endDate >= currentYear
    })
  }

  const getCategoryOptions = () => {
    const categories = [...new Set(recurringExpenses.map(exp => exp.category))]
    return [
      { value: 'all', label: 'All Categories' },
      ...categories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
    ]
  }

  const getFrequencyOptions = () => [
    { value: 'all', label: 'All Frequencies' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ]

  const getStatusOptions = () => [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'paused', label: 'Paused' }
  ]

  const getViewModeOptions = () => [
    { value: 'all', label: 'All Expenses' },
    { value: 'monthly', label: 'Monthly Only' },
    { value: 'yearly', label: 'Yearly Only' }
  ]

  const handleFilterChange = (filterType, value) => {
    setExpenseFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const resetExpenseFilters = () => {
    setExpenseFilters({
      selectedMonth: new Date().toISOString().slice(0, 7),
      selectedYear: new Date().getFullYear().toString(),
      selectedCategory: 'all',
      selectedStatus: 'all',
      selectedFrequency: 'all',
      viewMode: 'all'
    })
  }


  // Handle birthday assignment
  const handleBirthdayAssignment = () => {
    if (!birthdayData.personId || !birthdayData.birthday) return

    const person = birthdayData.personType === 'employee' 
      ? employees.find(emp => emp.id.toString() === birthdayData.personId)
      : projectManagers.find(pm => pm.id.toString() === birthdayData.personId)

    if (person) {
      // Update person's birthday
      if (birthdayData.personType === 'employee') {
        setEmployees(prev => prev.map(emp => 
          emp.id.toString() === birthdayData.personId 
            ? { ...emp, birthday: birthdayData.birthday }
            : emp
        ))
      } else {
        setProjectManagers(prev => prev.map(pm => 
          pm.id.toString() === birthdayData.personId 
            ? { ...pm, birthday: birthdayData.birthday }
            : pm
        ))
      }

      // Add to birthdays list
      const newBirthday = {
        id: Date.now(),
        personId: birthdayData.personId,
        personName: person.name,
        personType: birthdayData.personType,
        birthday: birthdayData.birthday,
        age: new Date().getFullYear() - new Date(birthdayData.birthday).getFullYear(),
        department: person.department,
        role: person.role
      }
      setBirthdays(prev => [...prev, newBirthday])
    }

    // Reset form
    setBirthdayData({
      personId: '',
      birthday: '',
      personType: 'employee'
    })
    setShowBirthdayModal(false)
  }

  // Get person options for birthday assignment
  const getPersonOptions = () => {
    const employeeOptions = employees.map(emp => ({
      value: emp.id.toString(),
      label: `${emp.name} - ${emp.role} (Employee)`,
      icon: User,
      data: { ...emp, type: 'employee' }
    }))

    const pmOptions = projectManagers.map(pm => ({
      value: pm.id.toString(),
      label: `${pm.name} - ${pm.role} (PM)`,
      icon: Shield,
      data: { ...pm, type: 'pm' }
    }))

    return [...employeeOptions, ...pmOptions]
  }

  // Helper functions for team management
  const getRoleColor = (role) => {
    switch (role) {
      case 'project-manager': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'employee': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'sales': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'accountant': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'pem': return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'hr': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'project-manager': return 'PM'
      case 'employee': return 'Emp'
      case 'sales': return 'Sales'
      case 'accountant': return 'Acct'
      case 'pem': return 'PEM'
      case 'hr': return 'HR'
      case 'admin': return 'Admin'
      default: return role ? String(role).slice(0, 4) : '—'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
      case 'on-leave': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTeamColor = (team) => {
    switch (team) {
      case 'developer': return 'bg-indigo-100 text-indigo-800'
      case 'sales': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCurrentUsers = () => {
    let filteredUsers = allUsers

    // Filter by search term
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
      )
    }

    // Filter by status
    if (selectedFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === selectedFilter)
    }

    // Filter by department (only for employees)
    if (selectedDepartment !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.department === selectedDepartment)
    }

    return filteredUsers
  }

  // Get paginated users for display
  const getPaginatedUsers = () => {
    const filteredUsers = getCurrentUsers()
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage)
  }

  // Calculate total pages
  const totalPages = Math.ceil(getCurrentUsers().length / itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedFilter, selectedDepartment])

  const handleCreateUser = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      team: '',
      department: '',
      status: 'active',
      dateOfBirth: '',
      joiningDate: '',
      document: null,
      password: '',
      confirmPassword: ''
    })
    setShowCreateModal(true)
  }

  // Helper function to format date for date input (YYYY-MM-DD format)
  const formatDateForInput = (date) => {
    if (!date) return '';
    // If already in YYYY-MM-DD format, return as-is
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    // If it's an ISO string or Date object, extract the date part
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      // Get year, month, day in local timezone
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  }

  const handleEditUser = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      team: user.team || '',
      department: user.department || '',
      status: user.status,
      dateOfBirth: formatDateForInput(user.dateOfBirth || user.birthday),
      joiningDate: formatDateForInput(user.joiningDate || user.joinDate),
      document: user.document || null,
      password: '',
      confirmPassword: ''
    })
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleDeleteUser = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const handleSaveUser = async () => {
    // Validation
    if (showCreateModal && (!formData.password || !formData.confirmPassword)) {
      addToast({ type: 'error', message: 'Password and confirm password are required' })
      return
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      addToast({ type: 'error', message: 'Passwords do not match' })
      return
    }
    
    if (formData.password && formData.password.length < 6) {
      addToast({ type: 'error', message: 'Password must be at least 6 characters long' })
      return
    }

    // Validation for department field when role is employee and team is developer
    if (formData.role === 'employee' && formData.team === 'developer' && !formData.department) {
      addToast({ type: 'error', message: 'Please enter a department for developer employees' })
      return
    }

    // Validation for required date fields
    if (!formData.dateOfBirth) {
      addToast({ type: 'error', message: 'Please select date of birth' })
      return
    }

    if (!formData.joiningDate) {
      addToast({ type: 'error', message: 'Please select joining date' })
      return
    }

    // Allow creation/update of Employee, Sales, Project Manager, PEM, Accountant, HR
    if (!['employee', 'sales', 'project-manager', 'pem', 'accountant', 'hr'].includes(formData.role)) {
      addToast({ type: 'error', message: 'Please select a valid role' })
      return
    }

    try {
      // Phone normalization + validation to satisfy backend schema
      const normalizedPhone = normalizePhone(formData.phone)
      if (!isValidPhone(normalizedPhone)) {
        addToast({ type: 'error', message: 'Please enter a valid phone number' })
        return
      }
      // Run shared validation like Admin_user_management
      const validationErrors = adminUserService.validateUserData(formData, !!showEditModal)
      if (validationErrors.length) {
        addToast({ type: 'error', message: validationErrors[0] })
        return
      }
      let response
      if (showCreateModal) {
        // Create new user via admin service
        response = await adminUserService.createUser({
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone,
          role: formData.role,
          team: formData.team || undefined,
          department: formData.department || undefined,
          status: formData.status || 'active',
          dateOfBirth: formData.dateOfBirth,
          joiningDate: formData.joiningDate,
          document: formData.document,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
        addToast({ type: 'success', message: 'User created successfully' })
      } else if (showEditModal && selectedUser) {
        // Update existing user - map role to API userType (pm, employee, sales, admin, accountant, pem)
        const getApiUserType = (role) => {
          if (role === 'project-manager') return 'pm'
          if (role === 'hr') return 'admin'
          return role // employee, sales, accountant, pem
        }
        const userType = getApiUserType(selectedUser.role)
        
        // Build update payload - only include password fields if password is being changed
        const updatePayload = {
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone,
          role: formData.role,
          team: formData.team || undefined,
          department: formData.department || undefined,
          status: formData.status || 'active',
          dateOfBirth: formData.dateOfBirth,
          joiningDate: formData.joiningDate,
          document: formData.document
        }
        
        // Only include password fields if password is provided and not empty
        if (formData.password && formData.password.trim().length > 0) {
          updatePayload.password = formData.password
          // Only include confirmPassword if it's also provided and not empty
          if (formData.confirmPassword && formData.confirmPassword.trim().length > 0) {
            updatePayload.confirmPassword = formData.confirmPassword
          }
        }
        
        response = await adminUserService.updateUser(userType, selectedUser.id, updatePayload)
        addToast({ type: 'success', message: 'User updated successfully' })
      }

      // Reset UI and reload users
      setShowCreateModal(false)
      setShowEditModal(false)
      setSelectedUser(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        team: '',
        department: '',
        status: 'active',
        dateOfBirth: '',
        joiningDate: '',
        document: null,
        password: '',
        confirmPassword: ''
      })
      await loadData()
    } catch (error) {
      console.error('Save user failed:', error)
      addToast({ type: 'error', message: error?.response?.data?.message || error?.message || 'Failed to save user' })
    }
  }

  const confirmDelete = async () => {
    if (!selectedUser) return
    
    try {
      // Map role to API userType for delete
      const getApiUserType = (role) => {
        if (role === 'Project Manager' || role === 'project-manager' || role?.toLowerCase?.().includes('project manager')) return 'pm'
        if (role === 'hr') return 'admin'
        return role || 'employee' // employee, sales, accountant, pem
      }
      const userType = getApiUserType(selectedUser.role)
      
      await adminUserService.deleteUser(userType, selectedUser.id)
      addToast({ type: 'success', message: 'User deleted successfully' })
      setShowDeleteModal(false)
      setSelectedUser(null)
      // Reload data to refresh the user list
      await loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      addToast({ type: 'error', message: error?.response?.data?.message || error?.message || 'Failed to delete user' })
    }
  }

  // Close modals
  const closeModals = () => {
    setShowBirthdayModal(false)
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setShowDeleteModal(false)
    setShowSalaryModal(false)
    setShowEditSalaryModal(false)
    setShowAddEmployeeSalaryModal(false)
    setShowDeleteSalaryModal(false)
    setShowSalaryHistoryModal(false)
    setShowRequestModal(false)
    setShowAllowanceModal(false)
    setShowEditAllowanceModal(false)
    setShowExpenseModal(false)
    setShowEditExpenseModal(false)
    setShowDeleteExpenseModal(false)
    setSelectedUser(null)
    setSelectedSalaryRecord(null)
    setSelectedExpense(null)
    setSelectedAllowance(null)
    setExpenseToDelete(null)
    setEditSalaryData({ 
      basicSalary: ''
    })
    setRequestData({
      title: '',
      description: '',
      category: '',
      priority: 'normal',
      department: '',
      type: 'approval',
      recipientType: 'admin',
      recipientId: ''
    })
    setAllowanceData({
      employeeId: '',
      itemType: '',
      itemName: '',
      serialNumber: '',
      issueDate: '',
      returnDate: '',
      status: 'active',
      value: '',
      remarks: ''
    })
    setBirthdayData({
      personId: '',
      birthday: '',
      personType: 'employee'
    })
    resetExpenseData()
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      team: '',
      department: '',
      status: 'active',
      dateOfBirth: '',
      joiningDate: '',
      document: null,
      password: '',
      confirmPassword: ''
    })
  }

  // Reset department filter when switching tabs
  useEffect(() => {
    if (activeTab !== 'team') {
      setSelectedDepartment('all')
    }
  }, [activeTab])

  // Load requests when requests tab is active
  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Attendance functions
  // Load attendance data for selected month
  const loadAttendanceData = async (month) => {
    try {
      const res = await adminAttendanceService.get(month)
      const recs = res.data?.records || []

      // Simple data model: Name, Present Days, Absent Days
      const processedData = recs.map((r, idx) => ({
        id: idx + 1,
        employeeName: r.name.trim(),
        presentDays: r.attendedDays || 0,
        absentDays: r.absentDays || 0,
        requiredDays: r.requiredDays || 0
      }))

      setAttendanceData(processedData)
      
      // Calculate statistics correctly from stored data
      // Total Employee Count = number of employees with attendance records
      const totalEmployeeCount = processedData.length
      
      // Total Working Days = sum of all requiredDays (office working days * number of employees)
      const totalWorkingDays = processedData.reduce((sum, r) => sum + (r.requiredDays || 0), 0)
      // Total Attendance = sum of all attendedDays (present days)
      const totalAttendance = processedData.reduce((sum, r) => sum + (r.presentDays || 0), 0)
      // Total Absents = sum of all absentDays
      const totalAbsents = processedData.reduce((sum, r) => sum + (r.absentDays || 0), 0)
      
      // If requiredDays is not available, calculate from present + absent as fallback
      const totalDaysForRate = totalWorkingDays > 0 ? totalWorkingDays : (totalAttendance + totalAbsents)
      
      // Attendance Rate = (Total Attendance / Total Working Days) * 100
      const attendanceRate = totalDaysForRate > 0 ? Math.round((totalAttendance / totalDaysForRate) * 10000) / 100 : 0
      
      setAttendanceStats({ 
        totalDays: totalEmployeeCount, // Total Employee Count (displayed in UI)
        presentDays: totalAttendance, // Total Attendance
        absentDays: totalAbsents, // Total Absents
        lateDays: 0, 
        attendanceRate 
      })
    } catch (error) {
      console.error('Error loading attendance data:', error)
      // If error (like 404), set empty data
      setAttendanceData([])
      setAttendanceStats({
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        attendanceRate: 0
      })
    }
  }

  // Load attendance when selectedMonth changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceData(selectedMonth)
    }
  }, [selectedMonth, activeTab])

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    if (!validTypes.includes(file.type)) {
      addToast({ type: 'error', message: 'Please upload a valid Excel file (.xlsx)' })
      return
    }
    setAttendanceFile(file)
    await processAttendanceFile(file)
  }

  const processAttendanceFile = async (file) => {
    setIsProcessingFile(true)
    try {
      // Upload and parse on backend (saves month-wise)
      const uploadResult = await adminAttendanceService.upload(file, selectedMonth)
      
      // Reload the data for the selected month after upload
      await loadAttendanceData(selectedMonth)
      
      // Show detailed success message from backend
      const successMessage = uploadResult?.message || 'Attendance uploaded successfully!'
      addToast({ type: 'success', message: successMessage })
    } catch (error) {
      console.error('Error processing file:', error)
      addToast({ type: 'error', message: error?.message || 'Error processing attendance file. Please check the file format and try again.' })
    } finally {
      setIsProcessingFile(false)
    }
  }

  const calculateAttendanceStats = (data) => {
    const totalDays = data.length
    const presentDays = data.filter(record => record.status === 'present').length
    const absentDays = data.filter(record => record.status === 'absent').length
    const lateDays = data.filter(record => record.isLate).length
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0

    setAttendanceStats({
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100
    })
  }

  // Simple summary: just return the processed data as-is (already has Name, Present Days, Absent Days)
  const getEmployeeAttendanceSummary = () => {
    return attendanceData.map(record => ({
      employeeName: record.employeeName,
      presentDays: record.presentDays,
      absentDays: record.absentDays
    }))
  }

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="h-4 w-4" />
      case 'absent': return <XCircle className="h-4 w-4" />
      case 'late': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Load salary data from backend (fetch only - no auto-generation)
  // Records are created by: Set salary (creates 4 months), Mark paid (creates next month), or "Generate for month" button
  // Optional second arg overrides department/status (e.g. when called from Refresh to avoid stale closure)
  const loadSalaryData = async (month, opts = {}) => {
    const department = opts.department !== undefined ? opts.department : selectedSalaryDepartment
    const status = opts.status !== undefined ? opts.status : selectedPaymentStatus
    // Backend only supports status 'pending'|'paid'. Overdue is computed client-side from pending records.
    const apiStatus = (status && status !== 'all' && status !== 'overdue') ? status : (status === 'overdue' ? 'pending' : undefined)
    try {
      const res = await adminSalaryService.getSalaryRecords({
        month,
        department: department && department !== 'all' ? department : undefined,
        status: apiStatus
      })

      // Transform backend data to frontend format (normalize employeeId to string for history API)
      const transformedData = (res.data || []).map((record, idx) => ({
        id: record._id ? record._id.toString() : (idx + 1).toString(),
        _id: record._id ? record._id.toString() : null, // Keep original _id for API calls
        employeeId: normalizeEmployeeId(record.employeeId) ?? (record.employeeId != null ? String(record.employeeId) : null),
        employeeName: record.employeeName,
        department: record.department,
        role: record.role,
        fixedSalary: record.fixedSalary,
        month: record.month,
        paymentDate: new Date(record.paymentDate),
        paymentDay: record.paymentDay,
        status: record.status,
        paidDate: record.paidDate ? new Date(record.paidDate) : null,
        paymentMethod: record.paymentMethod,
        remarks: record.remarks || '',
        incentiveAmount: record.incentiveAmount || 0,
        incentiveStatus: record.incentiveStatus || 'pending',
        incentivePaidDate: record.incentivePaidDate ? new Date(record.incentivePaidDate) : null,
        rewardAmount: record.rewardAmount || 0,
        rewardStatus: record.rewardStatus || 'pending',
        rewardPaidDate: record.rewardPaidDate ? new Date(record.rewardPaidDate) : null,
        employeeModel: record.employeeModel,
        source: record.source || ''
      }))

      setSalaryData(transformedData)
      
      // Update statistics from backend
      if (res.stats) {
        setSalaryStats({
          totalEmployees: res.stats.totalEmployees || 0,
          paidEmployees: res.stats.paidEmployees || 0,
          pendingEmployees: res.stats.pendingEmployees || 0,
          totalAmount: res.stats.totalAmount || 0,
          paidAmount: res.stats.paidAmount || 0,
          pendingAmount: res.stats.pendingAmount || 0,
          totalIncentiveAmount: res.stats.totalIncentiveAmount || 0,
          paidIncentiveAmount: res.stats.paidIncentiveAmount || 0,
          pendingIncentiveAmount: res.stats.pendingIncentiveAmount || 0,
          totalRewardAmount: res.stats.totalRewardAmount || 0,
          paidRewardAmount: res.stats.paidRewardAmount || 0,
          pendingRewardAmount: res.stats.pendingRewardAmount || 0
        })
      }
    } catch (error) {
      console.error('Error loading salary data:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load salary data' })
      setSalaryData([])
      setSalaryStats({
        totalEmployees: 0,
        paidEmployees: 0,
        pendingEmployees: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalIncentiveAmount: 0,
        paidIncentiveAmount: 0,
        pendingIncentiveAmount: 0,
        totalRewardAmount: 0,
        paidRewardAmount: 0,
        pendingRewardAmount: 0
      })
    }
  }

  // Load salary when filters or tab change
  useEffect(() => {
    if (activeTab === 'salary') {
      loadSalaryData(selectedSalaryMonth, {
        department: selectedSalaryDepartment,
        status: selectedPaymentStatus
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSalaryDepartment, selectedPaymentStatus, activeTab])

  // Load employee IDs who already have salary when Set salary modal opens
  useEffect(() => {
    if (showAddEmployeeSalaryModal) {
      adminSalaryService.getEmployeesWithSalary()
        .then(ids => setEmployeesWithSalaryIds(Array.isArray(ids) ? ids : []))
        .catch(() => setEmployeesWithSalaryIds([]))
    }
  }, [showAddEmployeeSalaryModal])

  const getFilteredSalaryData = () => {
    let filtered = [...salaryData]

    // Overdue: filter client-side (backend has no 'overdue' status; it's computed from pending + past due date)
    if (selectedPaymentStatus === 'overdue') {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      filtered = filtered.filter(record => {
        if (record.status === 'paid') return false
        const paymentDate = new Date(record.paymentDate || record.createdAt)
        paymentDate.setHours(0, 0, 0, 0)
        return paymentDate < now
      })
    }

    if (selectedSalaryWeek !== 'all') {
      const weekNum = parseInt(selectedSalaryWeek)
      filtered = filtered.filter(record => {
        const paymentDate = new Date(record.paymentDate)
        const day = paymentDate.getDate()
        if (weekNum === 1) return day >= 1 && day <= 7
        if (weekNum === 2) return day >= 8 && day <= 14
        if (weekNum === 3) return day >= 15 && day <= 21
        if (weekNum === 4) return day >= 22 && day <= 31
        return true
      })
    }
    
    // Sort: unpaid first (so HR sees due items on top), then by due date ascending (nearest to pay first); paid at bottom
    return filtered.sort((a, b) => {
      const paidA = a.status === 'paid'
      const paidB = b.status === 'paid'
      if (paidA && !paidB) return 1   // paid after unpaid
      if (!paidA && paidB) return -1  // unpaid first
      if (paidA && paidB) {
        const dateA = new Date(a.paymentDate || a.createdAt)
        const dateB = new Date(b.paymentDate || b.createdAt)
        return dateB - dateA // paid: recent first
      }
      const dateA = new Date(a.paymentDate || a.createdAt)
      const dateB = new Date(b.paymentDate || b.createdAt)
      return dateA - dateB // unpaid: nearest due date first
    })
  }

  const handleMarkSalaryPaid = (record) => {
    setSelectedSalaryRecord(record)
    setShowSalaryModal(true)
  }

  const handleEditSalary = (record) => {
    // Check if record is for future month (next month or later)
    let recordMonth = record.month || ''
    if (!recordMonth && record.paymentDate) {
      const paymentDate = new Date(record.paymentDate)
      recordMonth = paymentDate.toISOString().slice(0, 7)
    }
    // If still no month, use selectedSalaryMonth (for next month records)
    if (!recordMonth) {
      recordMonth = selectedSalaryMonth
    }
    
    const today = new Date()
    const currentMonthStr = today.toISOString().slice(0, 7)
    
    // Check if record month OR selected month is in the future (next month or later)
    const isFutureMonth = recordMonth > currentMonthStr || selectedSalaryMonth > currentMonthStr
    
    // Block editing if: paid AND not future month
    // Allow editing if: pending OR future month (next month) - always allow future months
    if (record.status === 'paid' && !isFutureMonth) {
      addToast({ type: 'error', message: 'Cannot edit paid salary records. Next month salaries can be edited.' })
      return
    }
    
    setSelectedSalaryRecord(record)
    setEditSalaryData({
      basicSalary: record.fixedSalary || record.basicSalary || ''
    })
    setShowEditSalaryModal(true)
  }

  const handleSaveSalaryEdit = async () => {
    if (!selectedSalaryRecord || !editSalaryData.basicSalary) {
      addToast({ type: 'error', message: 'Please enter a valid salary amount' })
      return
    }

    // Check if record is for future month (next month or later)
    let recordMonth = selectedSalaryRecord.month || ''
    if (!recordMonth && selectedSalaryRecord.paymentDate) {
      const paymentDate = new Date(selectedSalaryRecord.paymentDate)
      recordMonth = paymentDate.toISOString().slice(0, 7)
    }
    // If still no month, use selectedSalaryMonth (for next month records)
    if (!recordMonth) {
      recordMonth = selectedSalaryMonth
    }
    
    const today = new Date()
    const currentMonthStr = today.toISOString().slice(0, 7)
    // Check if record month OR selected month is in the future
    const isFutureMonth = recordMonth > currentMonthStr || selectedSalaryMonth > currentMonthStr

    // Prevent editing paid salaries only if not future month
    // Allow editing for future months (next month) even if paid
    if (selectedSalaryRecord.status === 'paid' && !isFutureMonth) {
      addToast({ type: 'error', message: 'Cannot edit paid salary records. Next month salaries can be edited.' })
      setShowEditSalaryModal(false)
      setSelectedSalaryRecord(null)
      return
    }

    const fixedSalary = parseFloat(editSalaryData.basicSalary) || 0
    if (fixedSalary <= 0) {
      addToast({ type: 'error', message: 'Salary amount must be greater than 0' })
      return
    }

    try {
      // Use _id if available, otherwise fall back to id
      const salaryRecordId = selectedSalaryRecord._id || selectedSalaryRecord.id
      if (!salaryRecordId) {
        addToast({ type: 'error', message: 'Salary record ID not found' })
        return
      }

      // Update the salary record
      await adminSalaryService.updateSalaryRecord(salaryRecordId, {
        fixedSalary: fixedSalary
      })

      addToast({ type: 'success', message: 'Salary updated successfully!' })
      setShowEditSalaryModal(false)
      setSelectedSalaryRecord(null)
      setEditSalaryData({ basicSalary: '' })
      // Reload salary data
      await loadSalaryData(selectedSalaryMonth)
    } catch (error) {
      console.error('Error updating salary:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to update salary' })
    }
  }

  const handleDeleteSalary = (record) => {
    setSalaryToDelete(record)
    setShowDeleteSalaryModal(true)
  }

  const confirmDeleteSalary = async () => {
    if (!salaryToDelete) return
    
    try {
      await adminSalaryService.deleteSalaryRecord(salaryToDelete.id)
      addToast({ type: 'success', message: 'Salary record deleted successfully!' })
      setShowDeleteSalaryModal(false)
      setSalaryToDelete(null)
      // Reload salary data
      await loadSalaryData(selectedSalaryMonth)
    } catch (error) {
      console.error('Error deleting salary:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to delete salary record' })
    }
  }

  const confirmSalaryPayment = async (paymentData) => {
    if (!selectedSalaryRecord) return
    
    try {
      await adminSalaryService.updateSalaryRecord(selectedSalaryRecord.id, {
        status: 'paid',
        paymentMethod: paymentData.paymentMethod,
        remarks: paymentData.remarks
      })
      
      addToast({ type: 'success', message: 'Salary marked as paid successfully!' })
      setShowSalaryModal(false)
      
      // Reload history if history modal is open
      if (showSalaryHistoryModal && selectedHistoryEmployee) {
        const userType = selectedHistoryEmployee.role === 'project-manager' ? 'pm' : 
                        selectedHistoryEmployee.role === 'sales' ? 'sales' : 
                        selectedHistoryEmployee.role === 'hr' ? 'admin' : 'employee'
        const history = await adminSalaryService.getEmployeeSalaryHistory(userType, selectedHistoryEmployee.employeeId)
        
        // Get current month for filtering
        const currentDate = new Date()
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
        const joiningDate = selectedHistoryEmployee.joiningDate ? new Date(selectedHistoryEmployee.joiningDate) : null
        
        const transformedHistory = (history.data || [])
          .map(item => ({
            id: item._id || item.id,
            month: item.month,
            amount: item.fixedSalary || 0,
            status: item.status,
            paymentDate: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paidDate: item.paidDate ? new Date(item.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paymentMethod: item.paymentMethod || null,
            remarks: item.remarks || ''
          }))
          .filter(item => {
            // Only show paid records
            if (item.status !== 'paid') return false
            
            // Only show current month and previous months (not future months)
            if (item.month > currentMonth) return false
            
            // If joining date is available, only show records from joining date onwards
            if (joiningDate) {
              const itemMonth = new Date(item.month + '-01')
              const joiningMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1)
              if (itemMonth < joiningMonth) return false
            }
            
            return true
          })
          .sort((a, b) => {
            return b.month.localeCompare(a.month)
          })
        
        setSalaryHistory(transformedHistory)
      }
      
      setSelectedSalaryRecord(null)
      // Reload salary data
      await loadSalaryData(selectedSalaryMonth)
    } catch (error) {
      console.error('Error updating salary:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to update salary record' })
    }
  }

  const handleMarkIncentivePaid = (record) => {
    setSelectedIncentiveRecord(record)
    setShowIncentiveModal(true)
  }

  const confirmIncentivePayment = async (paymentData) => {
    if (!selectedIncentiveRecord) return
    
    try {
      await adminSalaryService.updateIncentivePayment(selectedIncentiveRecord.id, {
        incentiveStatus: 'paid',
        paymentMethod: paymentData.paymentMethod,
        remarks: paymentData.remarks
      })
      
      addToast({ type: 'success', message: 'Incentive marked as paid successfully!' })
      setShowIncentiveModal(false)
      setSelectedIncentiveRecord(null)
      // Reload salary data
      await loadSalaryData(selectedSalaryMonth)
    } catch (error) {
      console.error('Error updating incentive:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to update incentive payment' })
    }
  }

  const handleMarkRewardPaid = (record) => {
    setSelectedRewardRecord(record)
    setShowRewardModal(true)
  }

  const confirmRewardPayment = async (paymentData) => {
    if (!selectedRewardRecord) return
    
    try {
      await adminSalaryService.updateRewardPayment(selectedRewardRecord.id, {
        rewardStatus: 'paid',
        paymentMethod: paymentData.paymentMethod,
        remarks: paymentData.remarks
      })
      
      addToast({ type: 'success', message: 'Reward marked as paid successfully!' })
      setShowRewardModal(false)
      setSelectedRewardRecord(null)
      // Reload salary data
      await loadSalaryData(selectedSalaryMonth)
    } catch (error) {
      console.error('Error updating reward:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to update reward payment' })
    }
  }

  const getSalaryStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSalaryStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'overdue': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Helper functions for salary payment management
  const getWeekOfMonth = (date) => {
    const d = new Date(date)
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
    const firstWeekDay = firstDay.getDay()
    const dayOfMonth = d.getDate()
    const weekNumber = Math.ceil((dayOfMonth + firstWeekDay) / 7)
    return Math.min(weekNumber, 4) // Max 4 weeks
  }

  const getPaymentDate = (joiningDate) => {
    const joinDate = new Date(joiningDate)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    
    // Get the day of month from joining date
    const paymentDay = joinDate.getDate()
    
    // Create payment date for current month
    const paymentDate = new Date(currentYear, currentMonth, paymentDay)
    
    // If payment date has passed this month, set for next month
    if (paymentDate < currentDate) {
      return new Date(currentYear, currentMonth + 1, paymentDay)
    }
    
    return paymentDate
  }

  const getPaymentPriority = (salaryRecord) => {
    const paymentDate = getPaymentDate(salaryRecord.joiningDate || new Date())
    const currentDate = new Date()
    const daysUntilPayment = Math.ceil((paymentDate - currentDate) / (1000 * 60 * 60 * 24))
    
    if (salaryRecord.status === 'paid') return 999 // Paid records go to bottom
    if (daysUntilPayment < 0) return -1 // Overdue (highest priority)
    if (daysUntilPayment <= 3) return 0 // Due within 3 days
    if (daysUntilPayment <= 7) return 1 // Due within a week
    return 2 // Future payments
  }

  const getWeekOptions = () => {
    return [
      { value: 'all', label: 'All Weeks', icon: Calendar },
      { value: '1', label: 'Week 1 (1-7)', icon: Calendar },
      { value: '2', label: 'Week 2 (8-14)', icon: Calendar },
      { value: '3', label: 'Week 3 (15-21)', icon: Calendar },
      { value: '4', label: 'Week 4 (22-31)', icon: Calendar }
    ]
  }

  // Handle new employee salary form
  const handleAddEmployeeSalary = () => {
    setShowAddEmployeeSalaryModal(true)
    setNewEmployeeSalaryData({
      employeeId: '',
      salary: '',
      effectiveFromMonth: new Date().toISOString().slice(0, 7)
    })
  }

  const loadEmployeesWithSalaryDetails = async () => {
    try {
      setLoadingEmployeesWithSalary(true)
      const data = await adminSalaryService.getEmployeesWithSalaryDetails()
      setEmployeesWithSalaryDetails(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading employees with salary details:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load employees with salary' })
    } finally {
      setLoadingEmployeesWithSalary(false)
    }
  }

  const handleSaveNewEmployeeSalary = async () => {
    // Validate required fields
    if (!newEmployeeSalaryData.employeeId || !newEmployeeSalaryData.salary) {
      addToast({ type: 'error', message: 'Please select an employee and enter salary amount' })
      return
    }

    // Find selected user (must be salary-eligible: employee, sales, or project-manager)
    const selectedEmployee = allUsers.find(user => {
      const userIdStr = (user._id || user.id || user.employeeId)?.toString()
      return userIdStr && userIdStr === newEmployeeSalaryData.employeeId.toString()
    })
    
    if (!selectedEmployee) {
      addToast({ type: 'error', message: 'Selected employee not found' })
      return
    }

    // Backend supports Employee, Sales, PM, HR, Accountant, PEM
    const salaryEligibleRoles = ['employee', 'sales', 'project-manager', 'hr', 'accountant', 'pem']
    if (!salaryEligibleRoles.includes(selectedEmployee.role)) {
      addToast({ type: 'error', message: 'Salary can only be set for employees, sales team, project managers, HR, accountants, and PEM.' })
      return
    }

    const fixedSalary = parseFloat(newEmployeeSalaryData.salary) || 0
    if (fixedSalary <= 0) {
      addToast({ type: 'error', message: 'Salary amount must be greater than 0' })
      return
    }

    try {
      // Map role to API userType (backend: employee, sales, pm, admin for HR/accountant/PEM)
      const userType = selectedEmployee.role === 'project-manager' ? 'pm' : 
                      selectedEmployee.role === 'sales' ? 'sales' : 
                      ['hr', 'accountant', 'pem', 'admin'].includes(selectedEmployee.role) ? 'admin' : 'employee'
      const employeeId = (selectedEmployee._id || selectedEmployee.id || selectedEmployee.employeeId)?.toString()
      if (!employeeId) {
        addToast({ type: 'error', message: 'Invalid employee ID' })
        return
      }

      // Set employee fixed salary (this will auto-generate salary records)
      const payload = { fixedSalary }
      if (newEmployeeSalaryData.effectiveFromMonth) {
        payload.effectiveFromMonth = newEmployeeSalaryData.effectiveFromMonth
      }
      await adminSalaryService.setEmployeeSalary(userType, employeeId, payload)
      
      addToast({ type: 'success', message: `Fixed salary set to ₹${fixedSalary.toLocaleString()} for ${selectedEmployee.name}` })
      
      setShowAddEmployeeSalaryModal(false)
      setNewEmployeeSalaryData({
        employeeId: '',
        salary: ''
      })
      // Add newly set employee to exclusion list so they won't appear in dropdown if modal reopened
      setEmployeesWithSalaryIds(prev => [...new Set([...prev, employeeId])])
      
      // Reload salary data to show the new records
      await loadSalaryData(selectedSalaryMonth)
    } catch (error) {
      console.error('Error setting employee salary:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to set employee salary' })
    }
  }

  const handleNewEmployeeSalaryInputChange = (field, value) => {
    setNewEmployeeSalaryData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle pay salary from history
  const handlePayFromHistory = async (historyItem) => {
    if (!historyItem.id) {
      addToast({ type: 'error', message: 'Salary record ID not found' })
      return
    }

    // Create a record object that matches the expected format for handleMarkSalaryPaid
    const salaryRecord = {
      id: historyItem.id,
      employeeName: selectedHistoryEmployee?.name || 'Employee',
      employeeId: selectedHistoryEmployee?.employeeId,
      department: selectedHistoryEmployee?.department,
      role: selectedHistoryEmployee?.role,
      month: historyItem.month,
      fixedSalary: historyItem.amount,
      status: historyItem.status,
      paymentDate: historyItem.paymentDate
    }

    // Use the existing payment modal
    setSelectedSalaryRecord(salaryRecord)
    setShowSalaryModal(true)
  }

  // Get employee salary history (read-only)
  const viewSalaryHistory = async (record) => {
    try {
      setLoadingHistory(true)
      
      // Determine user type from record (backend: employee, sales, pm, admin for HR/accountant/PEM)
      // Fallback to employeeModel if role is missing (e.g. Salary doc structure)
      const role = record.role || (record.employeeModel === 'Sales' ? 'sales' : record.employeeModel === 'PM' ? 'project-manager' : record.employeeModel === 'Admin' ? 'hr' : 'employee')
      const userType = role === 'project-manager' ? 'pm' : 
                      role === 'sales' ? 'sales' : 
                      ['hr', 'accountant', 'pem', 'admin'].includes(role) ? 'admin' : 'employee'
      
      const employeeId = normalizeEmployeeId(record.employeeId)
      if (!employeeId) {
        addToast({ type: 'error', message: 'Employee ID is missing' })
        setLoadingHistory(false)
        return
      }

      // Fetch employee details to get joining date
      let joiningDate = null
      try {
        const employeeDetails = await adminUserService.getUser(userType, employeeId)
        if (employeeDetails?.data?.joiningDate) {
          joiningDate = new Date(employeeDetails.data.joiningDate)
        }
      } catch (error) {
        console.error('Error fetching employee details:', error)
      }
      
      setSelectedHistoryEmployee({
        name: record.employeeName,
        department: record.department,
        employeeId,
        role: record.role,
        joiningDate: joiningDate
      })
      
      const history = await adminSalaryService.getEmployeeSalaryHistory(userType, employeeId)
      
      // Get current month for filtering
      const currentDate = new Date()
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      
      // Transform salary records into separate entries for salary, incentive, and reward payments
      const allHistoryEntries = []
      
      history.data?.forEach(item => {
        const itemMonth = item.month
        const itemMonthDate = new Date(itemMonth + '-01')
        
        // Filter: If joining date is available, only show records from joining date onwards
        if (joiningDate) {
          const joiningMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1)
          if (itemMonthDate < joiningMonth) return
        }
        
        // Add Salary Payment Entry (if paid)
        if (item.status === 'paid' && item.fixedSalary > 0) {
          allHistoryEntries.push({
            id: `${item._id || item.id}-salary`,
            paymentType: 'salary',
            month: itemMonth,
            amount: item.fixedSalary || 0,
            status: item.status,
            paymentDate: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paidDate: item.paidDate ? (item.paidDate instanceof Date ? item.paidDate : new Date(item.paidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paymentMethod: item.paymentMethod || null,
            remarks: item.remarks || '',
            paidDateRaw: item.paidDate ? (item.paidDate instanceof Date ? item.paidDate : new Date(item.paidDate)) : null
          })
        }
        
        // Add Incentive Payment Entry (Sales only - incentive is not applicable to other employees)
        if ((item.employeeModel === 'Sales' || role === 'sales') && item.incentiveStatus === 'paid' && item.incentivePaidDate) {
          allHistoryEntries.push({
            id: `${item._id || item.id}-incentive`,
            paymentType: 'incentive',
            month: itemMonth,
            amount: item.incentiveAmount || 0,
            status: item.incentiveStatus,
            paymentDate: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paidDate: item.incentivePaidDate ? (item.incentivePaidDate instanceof Date ? item.incentivePaidDate : new Date(item.incentivePaidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paymentMethod: item.paymentMethod || null,
            remarks: item.remarks || '',
            paidDateRaw: item.incentivePaidDate ? (item.incentivePaidDate instanceof Date ? item.incentivePaidDate : new Date(item.incentivePaidDate)) : null
          })
        }
        
        // Add Reward Payment Entry (if paid - show even if amount is 0 for historical records)
        if (item.rewardStatus === 'paid' && item.rewardPaidDate) {
          allHistoryEntries.push({
            id: `${item._id || item.id}-reward`,
            paymentType: 'reward',
            month: itemMonth,
            amount: item.rewardAmount || 0,
            status: item.rewardStatus,
            paymentDate: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paidDate: item.rewardPaidDate ? (item.rewardPaidDate instanceof Date ? item.rewardPaidDate : new Date(item.rewardPaidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            paymentMethod: item.paymentMethod || null,
            remarks: item.remarks || '',
            paidDateRaw: item.rewardPaidDate ? (item.rewardPaidDate instanceof Date ? item.rewardPaidDate : new Date(item.rewardPaidDate)) : null
          })
        }
      })
      
      // Sort by paid date (newest first), then by payment type
      const transformedHistory = allHistoryEntries.sort((a, b) => {
        if (a.paidDateRaw && b.paidDateRaw) {
          return b.paidDateRaw - a.paidDateRaw
        }
        if (a.paidDateRaw) return -1
        if (b.paidDateRaw) return 1
        // If no paid date, sort by month
        return b.month.localeCompare(a.month)
      })
      
      setSalaryHistory(transformedHistory)
      setShowSalaryHistoryModal(true)
    } catch (error) {
      console.error('Error loading salary history:', error)
      addToast({ type: 'error', message: error?.message || 'Failed to load salary history' })
    } finally {
      setLoadingHistory(false)
    }
  }


  // Tab configuration
  const tabs = [
    { key: 'team', label: 'Team Management', icon: Users },
    { key: 'birthdays', label: 'Birthdays', icon: Cake },
    { key: 'attendance', label: 'Attendance', icon: UserCheck },
    { key: 'salary', label: 'Salary Management', icon: Banknote },
    { key: 'requests', label: 'Requests', icon: MessageSquare },
    { key: 'allowances', label: 'Allowances', icon: Gift },
    { key: 'expenses', label: 'Recurring Expenses', icon: Receipt }
  ]

  // Combobox options for HR: employees, sales, PMs, PEM, accountant, HR (all must match list/API for edit mode to retain role)
  const roleOptions = [
    { value: 'project-manager', label: 'Project Manager', icon: Shield },
    { value: 'employee', label: 'Employee', icon: Code },
    { value: 'sales', label: 'Sales', icon: TrendingUp },
    { value: 'pem', label: 'PEM', icon: ClipboardList },
    { value: 'accountant', label: 'Accountant', icon: Calculator },
    { value: 'hr', label: 'HR', icon: UserCheck }
  ]

  const teamOptions = [
    { value: 'developer', label: 'Developer', icon: Code },
    { value: 'sales', label: 'Sales Team', icon: TrendingUp }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active', icon: CheckCircle },
    { value: 'inactive', label: 'Inactive', icon: AlertCircle },
    { value: 'on-leave', label: 'On Leave', icon: Clock }
  ]

  // Get admin data to check role - HR and Accountant have same power as admin on their panels
  const adminData = adminStorage.get()
  const isHR = adminData?.role === 'hr'
  const isFullAccessOnPage = adminData?.role === 'admin' || adminData?.role === 'accountant' || adminData?.role === 'hr'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_navbar />
        {isHR ? (
          <HR_sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <Admin_sidebar />
        )}
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
      {isHR ? (
        <HR_sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : (
        <Admin_sidebar />
      )}
      
      {/* Main Content */}
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
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
                HR Management
              </h1>
              <p className="text-gray-600 text-lg">
                {activeTab === 'team' && 'Manage team members and organizational structure'}
                {activeTab === 'birthdays' && 'Track and manage employee birthdays'}
                {activeTab === 'attendance' && 'Monitor employee attendance and time tracking'}
                {activeTab === 'salary' && 'Manage employee salaries and payment tracking'}
                {activeTab === 'requests' && 'Submit and track requests to admin'}
                {activeTab === 'allowances' && 'Track employee assets and allowances'}
                {activeTab === 'expenses' && 'Manage recurring monthly and yearly expenses'}
              </p>
            </div>
            {activeTab === 'team' && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={loadData}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={handleCreateUser}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Team Member
                </Button>
              </div>
            )}
            {activeTab === 'expenses' && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={loadData}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={handleCreateExpense}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            )}
          </motion.div>

          {/* Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4"
          >
            <div className="border-b border-gray-200">
              <nav className="flex flex-wrap gap-1 px-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.key
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-medium text-xs transition-colors rounded-t-md ${
                        isActive
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              {activeTab === 'team' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
                    <p className="text-gray-600 mt-1">Manage your team members and organizational structure</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search team members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                      />
                    </div>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Departments</option>
                      {departmentFilterOptions.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full min-w-[900px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[140px]">Name</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[160px] hidden md:table-cell">Email</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden md:table-cell">Phone</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Role</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px] hidden md:table-cell">Team</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden lg:table-cell">Department</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Status</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[95px] hidden lg:table-cell">Joining</th>
                        <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedUsers().map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                {user.avatar}
                              </div>
                              <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                            </div>
                          </td>
                          <td className="py-2 px-2 hidden md:table-cell">
                            <span className="text-xs text-gray-600 truncate max-w-[160px] block">{user.email}</span>
                          </td>
                          <td className="py-2 px-2 hidden md:table-cell">
                            <div className="flex items-center space-x-1 text-xs text-gray-600">
                              <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
                              <span className="truncate max-w-[90px]">{user.phone || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="py-2 px-2 hidden md:table-cell">
                            {user.team ? (
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getTeamColor(user.team)}`}>
                                {user.team === 'developer' ? 'Dev' : 'Sales'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 hidden lg:table-cell">
                            <span className="text-xs text-gray-600 truncate max-w-[100px] block">{user.department || '—'}</span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(user.status)}`}>
                              {user.status === 'active' ? 'Active' : user.status === 'inactive' ? 'Inactive' : 'On Leave'}
                            </span>
                          </td>
                          <td className="py-2 px-2 hidden lg:table-cell">
                            <div className="flex items-center space-x-1 text-xs text-gray-600">
                              <Calendar className="h-3 w-3 flex-shrink-0 text-gray-400" />
                              <span className="truncate">{formatDate(user.joinDate)}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleViewUser(user)}
                                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-all duration-200"
                                title="View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-all duration-200"
                                title="Edit"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all duration-200"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {getCurrentUsers().length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                  </div>
                )}

                {/* Pagination - show results info and per-page when there are users */}
                {getCurrentUsers().length > 0 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                    {/* Results Info */}
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, getCurrentUsers().length)}</span> of <span className="font-semibold">{getCurrentUsers().length}</span> users
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-500">per page</span>
                    </div>

                    {/* Pagination Controls - only when more than one page */}
                    {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      {/* First Page */}
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="First page"
                      >
                        <span className="text-sm font-medium">««</span>
                      </button>
                      {/* Previous Page */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <span className="text-sm font-medium">‹</span>
                      </button>
                      {/* Page Numbers */}
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
                              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              1
                            </button>
                          )
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                            )
                          }
                        }

                        // Visible page numbers
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                currentPage === i
                                  ? 'bg-blue-600 text-white border-blue-600'
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
                              <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                            )
                          }
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              {totalPages}
                            </button>
                          )
                        }

                        return pages
                      })()}
                      {/* Next Page */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <span className="text-sm font-medium">›</span>
                      </button>
                      {/* Last Page */}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Last page"
                      >
                        <span className="text-sm font-medium">»»</span>
                      </button>
                    </div>
                    )}

                    {/* Jump to Page */}
                    {totalPages > 10 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Go to page:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value)
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page)
                            }
                          }}
                          className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">of {totalPages}</span>
                      </div>
                    )}
                  </div>
                )}
                </motion.div>
              )}

              {activeTab === 'birthdays' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4 text-teal-600" />
                      Total members: <span className="font-semibold text-gray-900">{allUsers.length}</span>
                    </span>
                    {/* Birthday filters: Today | This Week | This Month */}
                    <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1">
                      <button
                        type="button"
                        onClick={() => setBirthdayFilter('today')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          birthdayFilter === 'today'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setBirthdayFilter('week')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          birthdayFilter === 'week'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        This Week
                      </button>
                      <button
                        type="button"
                        onClick={() => setBirthdayFilter('month')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          birthdayFilter === 'month'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        This Month
                      </button>
                    </div>
                  </div>

                  {getFilteredBirthdays().length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                      <table className="w-full min-w-[400px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Name</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 hidden md:table-cell">Department</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Role</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Birthday</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredBirthdays().map((person) => (
                            <tr key={person.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {person.avatar}
                                  </div>
                                  <span className="font-semibold text-gray-900">{person.name}</span>
                                  <Cake className="h-3.5 w-3.5 text-pink-600 flex-shrink-0" />
                                </div>
                              </td>
                              <td className="py-2 px-2 hidden md:table-cell text-gray-600">{person.department || '—'}</td>
                              <td className="py-2 px-2">
                                <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getRoleColor(person.role)}`}>
                                  {getRoleLabel(person.role)}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-gray-600">{formatDate(person.birthday)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600 text-sm">
                      {birthdayFilter === 'today' && 'No birthdays today.'}
                      {birthdayFilter === 'week' && 'No birthdays this week.'}
                      {birthdayFilter === 'month' && 'No birthdays this month.'}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'attendance' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
                  <p className="text-gray-600 mt-1">Upload Excel files and track team attendance</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Button
                    onClick={() => document.getElementById('attendance-file-input').click()}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Upload Excel
                  </Button>
                  <input
                    id="attendance-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Upload Section */}
              {!attendanceData.length && (
                <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                  <CardContent className="p-8 text-center">
                    <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload Attendance Excel File</h3>
                    <p className="text-gray-500 mb-6">Upload an Excel file containing attendance data to get started</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button
                        onClick={() => document.getElementById('attendance-file-input').click()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Choose Excel File
                      </Button>
                      <Button
                        variant="outline"
                        className="px-6 py-3 rounded-lg flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Template
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                      Supported formats: .xlsx, .xls | Max file size: 10MB
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Processing Indicator */}
              {isProcessingFile && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-blue-700 font-medium">Processing attendance file...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Statistics - compact row */}
              {attendanceData.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Total Count</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Present</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Absent</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Late</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-blue-600" />
                            <span className="font-semibold text-blue-900">{attendanceStats.totalDays}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="font-semibold text-green-900">{attendanceStats.presentDays}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            <span className="font-semibold text-red-900">{attendanceStats.absentDays}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-semibold text-orange-900">{attendanceStats.lateDays}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1.5">
                            <TrendingUpIcon className="h-3.5 w-3.5 text-purple-600" />
                            <span className="font-semibold text-purple-900">{attendanceStats.attendanceRate}%</span>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Employee Attendance Summary - Simple View */}
              {attendanceData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheckIcon className="h-5 w-5" />
                      Attendance Records - {selectedMonth}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700">Name</th>
                            <th className="text-center py-1.5 px-2 text-xs font-semibold text-gray-700">Present</th>
                            <th className="text-center py-1.5 px-2 text-xs font-semibold text-gray-700">Absent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getEmployeeAttendanceSummary().map((employee, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                    {employee.employeeName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-gray-900 truncate">{employee.employeeName}</span>
                                </div>
                              </td>
                              <td className="text-center py-2 px-2">
                                <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {employee.presentDays}
                                </span>
                              </td>
                              <td className="text-center py-2 px-2">
                                <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3" />
                                  {employee.absentDays}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
                </motion.div>
              )}

              {activeTab === 'salary' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header Section */}
                  <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
                    <div className="p-4 lg:p-5 flex flex-col gap-4">
                      {/* Top row: title + actions */}
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-emerald-600/10 flex items-center justify-center border border-emerald-600/20">
                            <Banknote className="h-5 w-5 text-emerald-700" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">Salary Management</h2>
                            <p className="text-sm text-gray-600 mt-1">
                              Manage salaries, payouts, and exports with clear monthly controls.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <div className="inline-flex rounded-full bg-white/80 border border-gray-200 p-1 text-[11px] font-semibold text-gray-600 shadow-sm">
                            <button
                              type="button"
                              onClick={async () => {
                                setSalaryMonthView('current')
                                const now = new Date()
                                const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                setSelectedSalaryMonth(monthStr)
                                await loadSalaryData(monthStr, {
                                  department: selectedSalaryDepartment,
                                  status: selectedPaymentStatus
                                })
                              }}
                              className={`px-3 py-1 rounded-full transition-all ${
                                salaryMonthView === 'current'
                                  ? 'bg-gray-900 text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              Current
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setSalaryMonthView('next')
                                const now = new Date()
                                const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
                                const monthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
                                setSelectedSalaryMonth(monthStr)
                                await loadSalaryData(monthStr, {
                                  department: selectedSalaryDepartment,
                                  status: selectedPaymentStatus
                                })
                              }}
                              className={`px-3 py-1 rounded-full transition-all ${
                                salaryMonthView === 'next'
                                  ? 'bg-gray-900 text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              Next
                            </button>
                          </div>

                          <Button
                            onClick={() => setShowAddEmployeeSalaryModal(true)}
                            className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold"
                          >
                            <Banknote className="h-4 w-4" />
                            Set Salary
                          </Button>

                          <Button
                            onClick={async () => {
                              setShowEmployeesWithSalaryModal(true)
                              await loadEmployeesWithSalaryDetails()
                            }}
                            variant="outline"
                            className="h-10 px-4 rounded-xl flex items-center gap-2 border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 text-sm"
                          >
                            <Users className="h-4 w-4" />
                            Employees
                          </Button>

                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                await loadSalaryData(selectedSalaryMonth, {
                                  department: selectedSalaryDepartment,
                                  status: selectedPaymentStatus
                                })
                                addToast({ type: 'success', message: 'Salary data refreshed' })
                              } catch (_) {
                                // loadSalaryData already shows error toast
                              }
                            }}
                            variant="outline"
                            className="h-10 px-3.5 rounded-xl flex items-center gap-2 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-sm"
                            title="Refresh salary data"
                          >
                            <RefreshCw className="h-4 w-4" />
                            <span className="hidden sm:inline">Refresh</span>
                          </Button>

                          <Button
                            onClick={() => {
                              const records = getFilteredSalaryData()
                              if (!records.length) {
                                addToast({ type: 'info', message: 'No salary records to export for selected filters' })
                                return
                              }
                              const headers = ['Employee Name', 'Department', 'Role', 'Month', 'Salary', 'Incentive', 'Reward', 'Total', 'Status', 'Payment Date', 'Paid Date', 'Source']
                              const rows = records.map(r => {
                                const isSalesEmployee = r.employeeModel === 'Sales'
                                const totalAmount = (r.fixedSalary || 0) + (isSalesEmployee ? (r.incentiveAmount || 0) : 0) + (r.rewardAmount || 0)
                                return [
                                  r.employeeName,
                                  r.department || '',
                                  r.role || '',
                                  r.month || '',
                                  r.fixedSalary || 0,
                                  isSalesEmployee ? (r.incentiveAmount || 0) : 0,
                                  r.rewardAmount || 0,
                                  totalAmount,
                                  r.status || '',
                                  r.paymentDate ? new Date(r.paymentDate).toISOString() : '',
                                  r.paidDate ? new Date(r.paidDate).toISOString() : '',
                                  r.source || ''
                                ]
                              })
                              const csvContent = [headers, ...rows].map(row =>
                                row.map(value => {
                                  if (value === null || value === undefined) return ''
                                  const str = String(value)
                                  if (/[",\n]/.test(str)) {
                                    return `"${str.replace(/"/g, '""')}"`
                                  }
                                  return str
                                }).join(',')
                              ).join('\n')
                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                              const url = URL.createObjectURL(blob)
                              const link = document.createElement('a')
                              link.href = url
                              link.setAttribute('download', `salary-${selectedSalaryMonth}.csv`)
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                              URL.revokeObjectURL(url)
                            }}
                            variant="outline"
                            className="h-10 px-3.5 rounded-xl flex items-center gap-2 border-2 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-sm"
                            title="Export salary data as CSV"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                          </Button>
                        </div>
                      </div>

                      {/* Bottom row: filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 h-10 shadow-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <input
                            type="month"
                            value={selectedSalaryMonth}
                            onChange={async (e) => {
                              const value = e.target.value
                              setSelectedSalaryMonth(value)
                              await loadSalaryData(value, {
                                department: selectedSalaryDepartment,
                                status: selectedPaymentStatus
                              })
                            }}
                            className="w-full text-sm font-medium text-gray-700 bg-transparent border-none outline-none focus:ring-0"
                          />
                        </div>

                        <Combobox
                          options={salaryDepartmentOptions}
                          value={selectedSalaryDepartment}
                          onChange={(value) => setSelectedSalaryDepartment(value)}
                          placeholder="Department"
                          className="w-full h-10 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white shadow-sm"
                        />

                        <Combobox
                          options={getWeekOptions()}
                          value={selectedSalaryWeek}
                          onChange={(value) => setSelectedSalaryWeek(value)}
                          placeholder="Week"
                          className="w-full h-10 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white shadow-sm"
                        />

                        <Combobox
                          options={[
                            { value: 'all', label: 'All Status', icon: Clock },
                            { value: 'pending', label: 'Pending', icon: Clock },
                            { value: 'paid', label: 'Paid', icon: CheckCircle2 },
                            { value: 'overdue', label: 'Overdue', icon: AlertTriangle }
                          ]}
                          value={selectedPaymentStatus}
                          onChange={(value) => setSelectedPaymentStatus(value)}
                          placeholder="Status"
                          className="w-full h-10 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

              {/* Salary Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide">Total Employees</p>
                        <p className="text-xl font-bold text-blue-900 mt-0.5">{salaryStats.totalEmployees}</p>
                        <p className="text-xs text-gray-600 mt-1">{salaryStats.paidEmployees} paid · {salaryStats.pendingEmployees} pending</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-xs font-semibold uppercase tracking-wide">Total Payable</p>
                        <p className="text-lg font-bold text-purple-900 mt-0.5">
                          {formatCurrency(salaryStats.totalAmount + salaryStats.totalIncentiveAmount + salaryStats.totalRewardAmount)}
                        </p>
                      </div>
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Calculator className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-xs font-semibold uppercase tracking-wide">Paid</p>
                        <p className="text-lg font-bold text-green-900 mt-0.5">
                          {formatCurrency(salaryStats.paidAmount + salaryStats.paidIncentiveAmount + salaryStats.paidRewardAmount)}
                        </p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-600 text-xs font-semibold uppercase tracking-wide">Pending</p>
                        <p className="text-lg font-bold text-orange-900 mt-0.5">
                          {formatCurrency(salaryStats.pendingAmount + salaryStats.pendingIncentiveAmount + salaryStats.pendingRewardAmount)}
                        </p>
                      </div>
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {getFilteredSalaryData().some(r => r.employeeModel === 'Sales') && (
                <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-l-4 border-l-cyan-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-600 text-xs font-semibold uppercase tracking-wide">Incentive (Sales)</p>
                        <p className="text-lg font-bold text-cyan-900 mt-0.5">{formatCurrency(salaryStats.totalIncentiveAmount)}</p>
                        <p className="text-xs text-gray-600 mt-1">Paid: {formatCurrency(salaryStats.paidIncentiveAmount)}</p>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-cyan-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}
                <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-l-4 border-l-pink-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-600 text-xs font-semibold uppercase tracking-wide">Reward</p>
                        <p className="text-lg font-bold text-pink-900 mt-0.5">{formatCurrency(salaryStats.totalRewardAmount)}</p>
                        <p className="text-xs text-gray-600 mt-1">Paid: {formatCurrency(salaryStats.paidRewardAmount)}</p>
                      </div>
                      <div className="p-2 bg-pink-500/10 rounded-lg">
                        <Award className="h-5 w-5 text-pink-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Salary Records Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5 text-gray-700" />
                      Salary Records — {selectedSalaryMonth}
                    </CardTitle>
                    <span className="text-sm text-gray-500">
                      {getFilteredSalaryData().length} employee{getFilteredSalaryData().length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                {getFilteredSalaryData().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse text-xs">
                      <thead>
                        <tr className="border-y border-gray-200 bg-gray-50/80">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[140px]">Employee</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[90px]">Department</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[90px]">Salary</th>
                          {getFilteredSalaryData().some(r => r.employeeModel === 'Sales') && (
                          <th className="text-right py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[90px]" title="Sum of outstanding incentives for this sales employee at payment time">Incentive</th>
                          )}
                          <th className="text-right py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[85px]" title="Combined team and personal target rewards (or Dev/PM rewards)">Reward</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[95px]">Total</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[95px]">Status</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[80px]">Due Date</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[110px]">Created Via</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[200px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getFilteredSalaryData().map((record, index) => {
                          const paymentDate = new Date(record.paymentDate || record.createdAt)
                          const currentDate = new Date()
                          const daysUntilPayment = Math.ceil((paymentDate - currentDate) / (1000 * 60 * 60 * 24))
                          const isOverdue = daysUntilPayment < 0 && record.status !== 'paid'
                          const isDueSoon = daysUntilPayment <= 3 && daysUntilPayment >= 0 && record.status !== 'paid'
                          let recordMonth = record.month || ''
                          if (!recordMonth && record.paymentDate) recordMonth = new Date(record.paymentDate).toISOString().slice(0, 7)
                          if (!recordMonth) recordMonth = selectedSalaryMonth
                          const canEdit = record.status !== 'paid'
                          const isSalesEmployee = record.employeeModel === 'Sales'
                          const totalAmount = (record.fixedSalary || 0) + (isSalesEmployee ? (record.incentiveAmount || 0) : 0) + (record.rewardAmount || 0)
                          const isPaid = record.status === 'paid'
                          const sourceLabel = (() => {
                            switch (record.source) {
                              case 'set-salary-current':
                                return 'Set salary (current)'
                              case 'set-salary':
                                return 'Set salary'
                              case 'auto-next-month':
                                return 'Auto next month'
                              case 'bulk-generate':
                                return 'Bulk generate'
                              default:
                                return record.source || 'Manual/Unknown'
                            }
                          })()
                          return (
                            <tr key={index} className={`transition-colors ${
                              isPaid ? 'bg-gray-200/70 hover:bg-gray-300/70 text-gray-600' : isOverdue ? 'bg-red-50/40 hover:bg-red-50/60' : isDueSoon ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'bg-white hover:bg-gray-50/50'
                            }`}>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {record.employeeName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-gray-900 truncate max-w-[110px]">{record.employeeName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-gray-600">{record.department || '—'}</td>
                              <td className="py-3 px-3 text-right font-medium tabular-nums">{formatCurrency(record.fixedSalary || 0)}</td>
                              {getFilteredSalaryData().some(r => r.employeeModel === 'Sales') && (
                              <td className="py-3 px-3 text-right text-blue-700 font-medium tabular-nums">{isSalesEmployee ? formatCurrency(record.incentiveAmount || 0) : '—'}</td>
                              )}
                              <td className="py-3 px-3 text-right text-purple-700 font-medium tabular-nums">{formatCurrency(record.rewardAmount || 0)}</td>
                              <td className="py-3 px-3 text-right font-semibold text-green-700 tabular-nums">{formatCurrency(totalAmount)}</td>
                              <td className="py-3 px-3">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getSalaryStatusColor(record.status)}`}>
                                    {getSalaryStatusIcon(record.status)}
                                    {record.status === 'paid' ? 'Paid' : 'Pending'}
                                  </span>
                                  {record.status !== 'paid' && (
                                    <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-500'}`}>
                                      {isOverdue ? `${Math.abs(daysUntilPayment)}d overdue` : `${daysUntilPayment}d left`}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-gray-600 tabular-nums">{paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                              <td className="py-3 px-3 text-left text-gray-600 text-[11px]">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700" title={`This record was created via: ${sourceLabel}`}>
                                  {sourceLabel}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <button onClick={() => { setSelectedSalaryDetails(record); setShowSalaryDetailsModal(true) }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors" title="View details"><Eye className="h-4 w-4" /></button>
                                  <button onClick={() => viewSalaryHistory(record)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="History"><Clock className="h-4 w-4" /></button>
                                  <button onClick={() => handleEditSalary(record)} disabled={!canEdit} className={`p-1.5 rounded-md transition-colors ${!canEdit ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50 text-blue-600'}`} title={!canEdit ? 'Cannot edit' : 'Edit'}><Edit3 className="h-4 w-4" /></button>
                                  <button onClick={() => handleDeleteSalary(record)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                  {record.status !== 'paid' && (
                                    <Button onClick={() => handleMarkSalaryPaid(record)} size="sm" className={`h-7 px-2.5 text-xs font-medium ${isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`} title={record.employeeModel === 'Sales' ? 'Pay salary + incentive + reward together' : 'Mark as paid'}>Pay</Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 px-4 text-center border-t border-gray-100">
                    <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">No salary records found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedSalaryDepartment !== 'all' ? `No records for ${selectedSalaryDepartment} in ${selectedSalaryMonth}` : `No records for ${selectedSalaryMonth}`}
                    </p>
                  </div>
                )}
                </CardContent>
              </Card>
                </motion.div>
              )}

              {activeTab === 'requests' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">HR Requests</h2>
                  <p className="text-gray-600 mt-1">Submit and track requests to admin</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={loadRequests}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={requestsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${requestsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleCreateRequest}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    New Request
                  </Button>
                </div>
              </div>

              {/* Request Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide">Total Requests</p>
                        <p className="text-xl font-bold text-blue-900 mt-0.5">{requests.length}</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-l-yellow-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-600 text-xs font-semibold uppercase tracking-wide">Pending</p>
                        <p className="text-xl font-bold text-yellow-900 mt-0.5">{requests.filter(r => r.status === 'pending').length}</p>
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-xs font-semibold uppercase tracking-wide">Approved</p>
                        <p className="text-xl font-bold text-green-900 mt-0.5">{requests.filter(r => r.status === 'approved').length}</p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-600 text-xs font-semibold uppercase tracking-wide">Rejected</p>
                        <p className="text-xl font-bold text-red-900 mt-0.5">{requests.filter(r => r.status === 'rejected').length}</p>
                      </div>
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {requestsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loading />
                </div>
              )}

              {/* Requests List - compact table */}
              {!requestsLoading && requests.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full min-w-[700px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[140px]">Title</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Category</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[70px]">Priority</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px] hidden md:table-cell">Department</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Date</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[80px]">Status</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-2">
                            <p className="font-semibold text-gray-900 truncate max-w-[180px]">{request.title}</p>
                            {request.description && <p className="text-[10px] text-gray-500 truncate max-w-[180px] mt-0.5">{request.description}</p>}
                          </td>
                          <td className="py-2 px-2 text-gray-600">{request.category}</td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                              {request.priority ? request.priority.charAt(0).toUpperCase() + request.priority.slice(1) : 'Normal'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-600 hidden md:table-cell">{request.department}</td>
                          <td className="py-2 px-2 text-gray-600">{new Date(request.requestDate).toLocaleDateString()}</td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getRequestStatusColor(request.status)}`}>
                              {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Pending'}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {request.adminResponse ? (
                              <span className="text-gray-600 truncate max-w-[140px] block" title={request.adminResponse}>
                                {request.adminResponse}
                                {request.responseDate && <span className="text-[10px] text-gray-400 block">{(new Date(request.responseDate).toLocaleDateString())}</span>}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty State */}
              {!requestsLoading && requests.length === 0 && (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Requests Found</h3>
                    <p className="text-gray-500 mb-6">Start by creating your first request.</p>
                    <Button
                      onClick={handleCreateRequest}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <Send className="h-4 w-4" />
                      Create First Request
                    </Button>
                  </CardContent>
                </Card>
              )}
                </motion.div>
              )}

              {activeTab === 'allowances' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Employee Allowances</h2>
                  <p className="text-gray-600 mt-1">Track employee assets and allowances</p>
                </div>
                <Button
                  onClick={handleCreateAllowance}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Allowance
                </Button>
              </div>

              {/* Allowance Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide">Total Items</p>
                        <p className="text-xl font-bold text-blue-900 mt-0.5">{allowances.length}</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-xs font-semibold uppercase tracking-wide">Active</p>
                        <p className="text-xl font-bold text-green-900 mt-0.5">{allowances.filter(a => a.status === 'active').length}</p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-l-4 border-l-cyan-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-600 text-xs font-semibold uppercase tracking-wide">Returned</p>
                        <p className="text-xl font-bold text-cyan-900 mt-0.5">{allowances.filter(a => a.status === 'returned').length}</p>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <RefreshCw className="h-5 w-5 text-cyan-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-xs font-semibold uppercase tracking-wide">Total Value</p>
                        <p className="text-xl font-bold text-purple-900 mt-0.5">
                          {formatCurrency(allowances.reduce((sum, a) => sum + (a.value || 0), 0))}
                        </p>
                      </div>
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Calculator className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Allowances List - compact table */}
              {allowances.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full min-w-[750px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Item</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[110px]">Employee</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Serial</th>
                        <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[75px]">Value</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[75px]">Issue</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[75px] hidden md:table-cell">Return</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[70px]">Status</th>
                        <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Remarks</th>
                        <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowances.map((allowance, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getItemIcon(allowance.itemType)}</span>
                              <span className="font-semibold text-gray-900 truncate max-w-[90px]">{allowance.itemName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-gray-600 truncate max-w-[100px]">{allowance.employeeName}</td>
                          <td className="py-2 px-2 text-gray-600">{allowance.serialNumber || '—'}</td>
                          <td className="py-2 px-2 text-right font-medium text-green-700">{formatCurrency(allowance.value || 0)}</td>
                          <td className="py-2 px-2 text-gray-600">{allowance.issueDate ? new Date(allowance.issueDate).toLocaleDateString() : '—'}</td>
                          <td className="py-2 px-2 text-gray-600 hidden md:table-cell">{allowance.returnDate ? new Date(allowance.returnDate).toLocaleDateString() : '—'}</td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getAllowanceStatusColor(allowance.status)}`}>
                              {allowance.status.charAt(0).toUpperCase() + allowance.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-500 truncate max-w-[100px]" title={allowance.remarks}>{allowance.remarks || '—'}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => handleEditAllowance(allowance)} className="p-1 rounded hover:bg-green-50 text-gray-500 hover:text-green-600" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleDeleteAllowance(allowance)} className="p-1 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Empty State */}
              {allowances.length === 0 && (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-12 text-center">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Allowances Found</h3>
                    <p className="text-gray-500 mb-6">Start by adding your first employee allowance or asset.</p>
                    <Button
                      onClick={handleCreateAllowance}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Allowance
                    </Button>
                  </CardContent>
                </Card>
              )}
                </motion.div>
              )}

              {activeTab === 'expenses' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header Section */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Recurring Expenses</h2>
                      <p className="text-gray-600 mt-1">Manage monthly and yearly recurring expenses</p>
                    </div>
                    
                    {/* Filter Section */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Month Filter */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <input
                          type="month"
                          value={expenseFilters.selectedMonth}
                          onChange={(e) => handleFilterChange('selectedMonth', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      
                      {/* Category Filter */}
                      <Combobox
                        options={getCategoryOptions()}
                        value={expenseFilters.selectedCategory}
                        onChange={(value) => handleFilterChange('selectedCategory', value)}
                        placeholder="Category"
                        className="w-40 h-10 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                      
                      {/* Status Filter */}
                      <Combobox
                        options={getStatusOptions()}
                        value={expenseFilters.selectedStatus}
                        onChange={(value) => handleFilterChange('selectedStatus', value)}
                        placeholder="Status"
                        className="w-32 h-10 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                      
                      {/* View Mode Filter */}
                      <Combobox
                        options={getViewModeOptions()}
                        value={expenseFilters.viewMode}
                        onChange={(value) => handleFilterChange('viewMode', value)}
                        placeholder="View"
                        className="w-36 h-10 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                      
                      {/* Reset Filter Button */}
                      <Button
                        onClick={resetExpenseFilters}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                  </div>

                  {/* Expense Statistics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide">Total Expenses</p>
                            <p className="text-xl font-bold text-blue-900 mt-0.5">{getFilteredExpenseStats().totalExpenses}</p>
                          </div>
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Receipt className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-600 text-xs font-semibold uppercase tracking-wide">Active</p>
                            <p className="text-xl font-bold text-green-900 mt-0.5">{getFilteredExpenseStats().activeExpenses}</p>
                          </div>
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-600 text-xs font-semibold uppercase tracking-wide">Monthly Total</p>
                            <p className="text-lg font-bold text-purple-900 mt-0.5">{formatCurrency(getFilteredExpenseStats().monthlyTotal)}</p>
                          </div>
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Calendar className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-600 text-xs font-semibold uppercase tracking-wide">Yearly Total</p>
                            <p className="text-lg font-bold text-orange-900 mt-0.5">{formatCurrency(getFilteredExpenseStats().yearlyTotal)}</p>
                          </div>
                          <div className="p-2 bg-orange-500/10 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Expenses List - compact table */}
                  {getFilteredExpenses().length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                      <table className="w-full min-w-[850px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Name</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[85px]">Vendor</th>
                            <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[70px]">Amount</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[75px]">Freq</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[75px]">Next Due</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[65px]">Status</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[65px]">Payment</th>
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px] hidden md:table-cell">Description</th>
                            <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[140px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredExpenses().map((expense, index) => {
                            const isPaid = expense.paymentStatus === 'paid'
                            return (
                            <tr key={index} className={`border-b border-gray-100 transition-colors ${
                              isPaid ? 'bg-gray-100 hover:bg-gray-200/80 text-gray-500' : 'hover:bg-gray-50'
                            }`}>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{getExpenseCategoryIcon(expense.category)}</span>
                                  <span className="font-semibold text-gray-900 truncate max-w-[100px]">{expense.name}</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-gray-600 truncate max-w-[80px]">{expense.vendor || '—'}</td>
                              <td className="py-2 px-2 text-right font-semibold text-green-700">{formatCurrency(expense.amount || 0)}</td>
                              <td className="py-2 px-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getExpenseCategoryColor(expense.category)}`}>
                                  {expense.frequency ? expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1) : '—'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-gray-600">{expense.nextDueDate ? formatDate(expense.nextDueDate) : 'N/A'}</td>
                              <td className="py-2 px-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getExpenseStatusColor(expense.status)}`}>
                                  {expense.status ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1) : '—'}
                                </span>
                                <span className={`block mt-0.5 px-1.5 py-0.5 rounded text-[10px] ${expense.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {expense.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                </span>
                                {expense.autoPay && <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] text-purple-600"><RefreshCw className="h-3 w-3" /> Auto</span>}
                              </td>
                              <td className="py-2 px-2 text-gray-600 capitalize">{expense.paymentMethod ? expense.paymentMethod.replace('_', ' ') : '—'}</td>
                              <td className="py-2 px-2 text-gray-500 truncate max-w-[100px] hidden md:table-cell" title={expense.description}>{expense.description || '—'}</td>
                              <td className="py-2 px-2">
                                <div className="flex items-center justify-end gap-0.5 flex-wrap">
                                  <Button onClick={() => handleViewExpenseEntries(expense)} size="sm" variant="outline" className="h-6 px-2 text-[10px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">Entries</Button>
                                  <button onClick={() => handleEditExpense(expense)} className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-blue-600" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => handleDeleteExpense(expense)} className="p-1 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {/* Empty State */}
                  {getFilteredExpenses().length === 0 && (
                    <Card className="border-2 border-dashed border-gray-300">
                      <CardContent className="p-12 text-center">
                        <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Recurring Expenses Found</h3>
                        <p className="text-gray-500 mb-6">Start by adding your first recurring expense like office rent or utilities.</p>
                        <Button
                          onClick={handleCreateExpense}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
                        >
                          <Plus className="h-4 w-4" />
                          Add First Expense
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
            {/* Create/Edit User Modal */}
            {(showCreateModal || showEditModal) && (
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
                  className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header with gradient background */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">
                          {showCreateModal ? 'Add Team Member' : 'Edit Team Member'}
                        </h3>
                        <p className="text-blue-100">
                          {showCreateModal 
                            ? 'Fill in the team member details below. Fields marked with * are required.'
                            : 'Update the team member details below. Fields marked with * are required.'
                          }
                        </p>
                      </div>
                      <button
                        onClick={closeModals}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="p-6 space-y-6 max-h-[calc(95vh-140px)] overflow-y-auto">
                    {/* Name Field */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Full Name <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Enter full name"
                      />
                    </motion.div>

                    {/* Email Field */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Email Address <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Enter email address"
                      />
                    </motion.div>

                    {/* Phone Field */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Phone Number <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="+91 98765 43210"
                      />
                    </motion.div>

                    {/* Role and Team Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Role <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Combobox
                          options={roleOptions}
                          value={formData.role}
                          onChange={(value) => setFormData({...formData, role: value, team: ''})}
                          placeholder="Select role"
                          className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </motion.div>

                      {formData.role === 'employee' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            Team <span className="text-red-500 ml-1">*</span>
                          </label>
                          <Combobox
                            options={teamOptions}
                            value={formData.team}
                            onChange={(value) => setFormData({...formData, team: value, department: ''})}
                            placeholder="Select team"
                            className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Department Field - Only for Developer Employees */}
                    {formData.role === 'employee' && formData.team === 'developer' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Department <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          placeholder="Enter department (e.g. Full Stack, Web, App)"
                        />
                      </motion.div>
                    )}

                    {/* Department Field - Only for Sales Employees */}
                    {formData.role === 'employee' && formData.team === 'sales' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Department <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          placeholder="Enter department (e.g. Sales)"
                        />
                      </motion.div>
                    )}

                    {/* Date Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Date of Birth <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                          className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Joining Date <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.joiningDate}
                          onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                          className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </motion.div>
                    </div>

                {/* Document Upload Field */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    Document (optional)
                  </label>
                  <CloudinaryUpload
                    onUploadSuccess={(uploadData) => {
                      setFormData({...formData, document: uploadData});
                    }}
                    onUploadError={(error) => {
                      console.error('Upload error:', error);
                      addToast({ type: 'error', message: 'Document upload failed' });
                    }}
                    onRemoveExisting={() => {
                      setFormData({...formData, document: null});
                    }}
                    folder="appzeto/users/documents"
                    maxSize={10 * 1024 * 1024} // 10MB
                    allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    placeholder="Click to upload document or drag and drop"
                    showPreview={true}
                    existingDocument={formData.document}
                  />
                  <p className="text-xs text-gray-500">Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)</p>
                </motion.div>

                {/* Status Field */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <Combobox
                    options={statusOptions}
                    value={formData.status}
                    onChange={(value) => setFormData({...formData, status: value})}
                    placeholder="Select status"
                    className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </motion.div>

                    {/* Password Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Password <span className="text-red-500 ml-1">{showCreateModal ? '*' : ''}</span>
                          {!showCreateModal && <span className="text-gray-500 ml-2 text-xs">(Leave blank to keep current)</span>}
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          placeholder={showCreateModal ? "Enter password" : "Enter new password"}
                        />
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          Confirm Password <span className="text-red-500 ml-1">{showCreateModal ? '*' : ''}</span>
                        </label>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          placeholder="Confirm password"
                        />
                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-xs text-red-600 flex items-center"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Passwords do not match
                          </motion.p>
                        )}
                      </motion.div>
                    </div>

                    {/* Form Actions */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeModals}
                        className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        {showCreateModal ? 'Add Team Member' : 'Update Team Member'}
                      </Button>
                    </motion.div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Birthday Assignment Modal */}
            {showBirthdayModal && (
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
                      <h3 className="text-xl font-bold text-gray-900">Add Birthday</h3>
                      <p className="text-gray-600 text-sm mt-1">Assign birthday to an employee or PM</p>
                    </div>
                    <button
                      onClick={closeModals}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Person</label>
                      <Combobox
                        options={getPersonOptions()}
                        value={birthdayData.personId}
                        onChange={(value) => {
                          const selectedOption = getPersonOptions().find(opt => opt.value === value)
                          setBirthdayData({
                            ...birthdayData,
                            personId: value,
                            personType: selectedOption?.data?.type || 'employee'
                          })
                        }}
                        placeholder="Choose employee or PM..."
                        className="w-full h-12 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Birthday</label>
                      <input
                        type="date"
                        value={birthdayData.birthday}
                        onChange={(e) => setBirthdayData({...birthdayData, birthday: e.target.value})}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={closeModals}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBirthdayAssignment}
                      disabled={!birthdayData.personId || !birthdayData.birthday}
                      className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Birthday
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Salary Payment Modal */}
            {showSalaryModal && selectedSalaryRecord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
                onClick={() => setShowSalaryModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-4 max-w-sm w-full mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Mark as Paid</h3>
                    <button
                      onClick={() => setShowSalaryModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Employee:</span>
                          <span className="text-sm font-bold text-gray-900">{selectedSalaryRecord.employeeName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Department:</span>
                          <span className="text-sm text-gray-600">{selectedSalaryRecord.department || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-green-200">
                          <span className="text-base font-semibold text-gray-900">Salary Amount:</span>
                          <span className="text-xl font-bold text-green-600">{formatCurrency(selectedSalaryRecord.fixedSalary || selectedSalaryRecord.basicSalary || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
                      <input
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        id="paidDate"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                      <select
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        id="paymentMethod"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add any remarks..."
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        id="remarks"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200 mt-4">
                    <button
                      onClick={() => setShowSalaryModal(false)}
                      className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const paidDate = document.getElementById('paidDate').value
                        const paymentMethod = document.getElementById('paymentMethod').value
                        const remarks = document.getElementById('remarks').value || 'Salary paid'
                        
                        if (!paidDate || !paymentMethod) {
                          addToast({ type: 'error', message: 'Please fill in all required fields' })
                          return
                        }
                        
                        confirmSalaryPayment({
                          paidDate,
                          paymentMethod,
                          remarks
                        })
                      }}
                      className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-semibold text-sm"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Incentive Payment Modal */}
            {showIncentiveModal && selectedIncentiveRecord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
                onClick={() => setShowIncentiveModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-4 max-w-sm w-full mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Mark Incentive as Paid</h3>
                    <button
                      onClick={() => setShowIncentiveModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Employee:</span>
                          <span className="text-sm font-bold text-gray-900">{selectedIncentiveRecord.employeeName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Department:</span>
                          <span className="text-sm text-gray-600">{selectedIncentiveRecord.department || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                          <span className="text-base font-semibold text-gray-900">Incentive Amount:</span>
                          <span className="text-xl font-bold text-blue-600">{formatCurrency(selectedIncentiveRecord.incentiveAmount || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                      <select
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        id="incentivePaymentMethod"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add any remarks..."
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        id="incentiveRemarks"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200 mt-4">
                    <button
                      onClick={() => setShowIncentiveModal(false)}
                      className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const paymentMethod = document.getElementById('incentivePaymentMethod').value
                        const remarks = document.getElementById('incentiveRemarks').value || 'Incentive paid'
                        
                        if (!paymentMethod) {
                          addToast({ type: 'error', message: 'Please select a payment method' })
                          return
                        }
                        
                        confirmIncentivePayment({
                          paymentMethod,
                          remarks
                        })
                      }}
                      className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-semibold text-sm"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Reward Payment Modal */}
            {showRewardModal && selectedRewardRecord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
                onClick={() => setShowRewardModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-4 max-w-sm w-full mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Mark Reward as Paid</h3>
                    <button
                      onClick={() => setShowRewardModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Employee:</span>
                          <span className="text-sm font-bold text-gray-900">{selectedRewardRecord.employeeName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Department:</span>
                          <span className="text-sm text-gray-600">{selectedRewardRecord.department || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                          <span className="text-base font-semibold text-gray-900">Reward Amount:</span>
                          <span className="text-xl font-bold text-purple-600">{formatCurrency(selectedRewardRecord.rewardAmount || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                      <select
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        id="rewardPaymentMethod"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add any remarks..."
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        id="rewardRemarks"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200 mt-4">
                    <button
                      onClick={() => setShowRewardModal(false)}
                      className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const paymentMethod = document.getElementById('rewardPaymentMethod').value
                        const remarks = document.getElementById('rewardRemarks').value || 'Reward paid'
                        
                        if (!paymentMethod) {
                          addToast({ type: 'error', message: 'Please select a payment method' })
                          return
                        }
                        
                        confirmRewardPayment({
                          paymentMethod,
                          remarks
                        })
                      }}
                      className="px-4 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors font-semibold text-sm"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Salary Details Modal */}
            {showSalaryDetailsModal && selectedSalaryDetails && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
                onClick={() => setShowSalaryDetailsModal(false)}
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
                      <h3 className="text-xl font-bold text-gray-900">Salary Details</h3>
                      <p className="text-sm text-gray-500 mt-1">{selectedSalaryDetails.employeeName} - {selectedSalaryDetails.month}</p>
                    </div>
                    <button
                      onClick={() => setShowSalaryDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Employee Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Employee Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedSalaryDetails.employeeName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Department:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedSalaryDetails.department}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Role:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedSalaryDetails.role}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Month:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedSalaryDetails.month}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Schedule</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Payment Date:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {new Date(selectedSalaryDetails.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {selectedSalaryDetails.paidDate && (
                          <div>
                            <span className="text-gray-600">Paid Date:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {selectedSalaryDetails.paidDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {selectedSalaryDetails.paymentMethod && (
                          <div>
                            <span className="text-gray-600">Payment Method:</span>
                            <span className="ml-2 font-medium text-gray-900 capitalize">
                              {selectedSalaryDetails.paymentMethod.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getSalaryStatusColor(selectedSalaryDetails.status)}`}>
                            {selectedSalaryDetails.status.charAt(0).toUpperCase() + selectedSalaryDetails.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount Breakdown with Payment Buttons */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Amount Breakdown</h4>
                      <div className="space-y-3">
                        {/* Salary Payment Section */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-semibold text-gray-700">Salary</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedSalaryDetails.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedSalaryDetails.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedSalaryDetails.fixedSalary || 0)}</span>
                            {selectedSalaryDetails.status !== 'paid' ? (
                              <Button
                                onClick={() => {
                                  setShowSalaryDetailsModal(false)
                                  handleMarkSalaryPaid(selectedSalaryDetails)
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Pay Salary
                              </Button>
                            ) : (
                              <div className="text-xs text-gray-500">
                                Paid on {selectedSalaryDetails.paidDate ? (selectedSalaryDetails.paidDate instanceof Date ? selectedSalaryDetails.paidDate : new Date(selectedSalaryDetails.paidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Incentive Payment Section - Sales Only */}
                        {selectedSalaryDetails.employeeModel === 'Sales' && selectedSalaryDetails.department === 'sales' && (
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-semibold text-gray-700">Incentive</span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                selectedSalaryDetails.incentiveStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {selectedSalaryDetails.incentiveStatus === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-blue-700">{formatCurrency(selectedSalaryDetails.incentiveAmount || 0)}</span>
                              {selectedSalaryDetails.incentiveStatus !== 'paid' && selectedSalaryDetails.incentiveAmount > 0 ? (
                                <Button
                                  onClick={() => {
                                    setShowSalaryDetailsModal(false)
                                    handleMarkIncentivePaid(selectedSalaryDetails)
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                                >
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Pay Incentive
                                </Button>
                              ) : selectedSalaryDetails.incentiveStatus === 'paid' ? (
                                <div className="text-xs text-gray-500">
                                  Paid on {selectedSalaryDetails.incentivePaidDate ? (selectedSalaryDetails.incentivePaidDate instanceof Date ? selectedSalaryDetails.incentivePaidDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(selectedSalaryDetails.incentivePaidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })) : 'N/A'}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">No incentive amount</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Reward Payment Section - Sales & Dev */}
                        {(selectedSalaryDetails.department === 'sales' || ['nodejs', 'flutter', 'web', 'full-stack', 'app'].includes(selectedSalaryDetails.department)) && (
                          <div className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-semibold text-gray-700">Reward</span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                selectedSalaryDetails.rewardStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {selectedSalaryDetails.rewardStatus === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-purple-700">{formatCurrency(selectedSalaryDetails.rewardAmount || 0)}</span>
                              {selectedSalaryDetails.rewardStatus !== 'paid' && selectedSalaryDetails.rewardAmount > 0 ? (
                                <Button
                                  onClick={() => {
                                    setShowSalaryDetailsModal(false)
                                    handleMarkRewardPaid(selectedSalaryDetails)
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-4"
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  Pay Reward
                                </Button>
                              ) : selectedSalaryDetails.rewardStatus === 'paid' ? (
                                <div className="text-xs text-gray-500">
                                  Paid on {selectedSalaryDetails.rewardPaidDate ? (selectedSalaryDetails.rewardPaidDate instanceof Date ? selectedSalaryDetails.rewardPaidDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(selectedSalaryDetails.rewardPaidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })) : 'N/A'}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">No reward amount</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Total - Sales: salary + incentive + reward; Others: salary + reward only */}
                        <div className="pt-3 border-t-2 border-green-300 flex justify-between items-center">
                          <span className="text-base font-bold text-gray-900">Total Amount:</span>
                          <span className="text-2xl font-bold text-green-700">
                            {formatCurrency(
                              (selectedSalaryDetails.fixedSalary || 0) + 
                              (selectedSalaryDetails.employeeModel === 'Sales' ? (selectedSalaryDetails.incentiveAmount || 0) : 0) + 
                              (selectedSalaryDetails.rewardAmount || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Records Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Records</h4>
                      <div className="space-y-2 text-sm">
                        {/* Salary Payment Record */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <div>
                            <span className="font-medium text-gray-700">Salary Payment:</span>
                            {selectedSalaryDetails.status === 'paid' && selectedSalaryDetails.paidDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                Paid on {(selectedSalaryDetails.paidDate instanceof Date ? selectedSalaryDetails.paidDate : new Date(selectedSalaryDetails.paidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {selectedSalaryDetails.paymentMethod && ` via ${selectedSalaryDetails.paymentMethod.replace('_', ' ')}`}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedSalaryDetails.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedSalaryDetails.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>

                        {/* Incentive Payment Record - Sales Only */}
                        {selectedSalaryDetails.employeeModel === 'Sales' && selectedSalaryDetails.department === 'sales' && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <div>
                              <span className="font-medium text-gray-700">Incentive Payment:</span>
                              {selectedSalaryDetails.incentiveStatus === 'paid' && selectedSalaryDetails.incentivePaidDate && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Paid on {(selectedSalaryDetails.incentivePaidDate instanceof Date ? selectedSalaryDetails.incentivePaidDate : new Date(selectedSalaryDetails.incentivePaidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedSalaryDetails.incentiveStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedSalaryDetails.incentiveStatus === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}

                        {/* Reward Payment Record - Sales, Employee (Dev), PM - all can have rewards */}
                        {(selectedSalaryDetails.employeeModel === 'Sales' || selectedSalaryDetails.employeeModel === 'Employee' || selectedSalaryDetails.employeeModel === 'PM') && (
                          <div className="flex justify-between items-center py-2">
                            <div>
                              <span className="font-medium text-gray-700">Reward Payment:</span>
                              {selectedSalaryDetails.rewardStatus === 'paid' && selectedSalaryDetails.rewardPaidDate && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Paid on {(selectedSalaryDetails.rewardPaidDate instanceof Date ? selectedSalaryDetails.rewardPaidDate : new Date(selectedSalaryDetails.rewardPaidDate)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedSalaryDetails.rewardStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedSalaryDetails.rewardStatus === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks */}
                    {selectedSalaryDetails.remarks && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Remarks</h4>
                        <p className="text-sm text-gray-600">{selectedSalaryDetails.remarks}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => {
                          setShowSalaryDetailsModal(false)
                          handleEditSalary(selectedSalaryDetails)
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Record
                      </Button>
                      <Button
                        onClick={() => {
                          setShowSalaryDetailsModal(false)
                          viewSalaryHistory(selectedSalaryDetails)
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        View History
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Edit Salary Modal */}
            {showEditSalaryModal && selectedSalaryRecord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowEditSalaryModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Edit Employee Salary</h3>
                        <p className="text-blue-100 text-sm">Update salary for {selectedSalaryRecord.employeeName}</p>
                      </div>
                      <button
                        onClick={() => setShowEditSalaryModal(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveSalaryEdit(); }} className="p-6 space-y-6">
                    {/* Employee Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {selectedSalaryRecord.employeeName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{selectedSalaryRecord.employeeName}</h4>
                          <p className="text-sm text-gray-500">{selectedSalaryRecord.department}</p>
                        </div>
                      </div>
                    </div>

                    {/* Salary Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Monthly Salary (₹) <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        value={editSalaryData.basicSalary}
                        onChange={(e) => setEditSalaryData({...editSalaryData, basicSalary: e.target.value})}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Enter monthly salary amount"
                        required
                        min="0"
                        step="100"
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEditSalaryModal(false)}
                        className="flex-1 h-12 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all duration-200"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Update Salary
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowRequestModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">New Request</h3>
                      <p className="text-gray-600 text-sm mt-1">Create a new request</p>
                    </div>
                    <button
                      onClick={() => setShowRequestModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Request Type</label>
                      <select
                        value={requestData.type}
                        onChange={(e) => setRequestData({...requestData, type: e.target.value})}
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="approval">Approval</option>
                        <option value="feedback">Feedback</option>
                        <option value="confirmation">Confirmation</option>
                        <option value="payment-recovery">Payment Recovery</option>
                        <option value="hold-work">Hold Work</option>
                        <option value="accelerate-work">Accelerate Work</option>
                        <option value="increase-cost">Increase Cost</option>
                        <option value="access-request">Access Request</option>
                        <option value="timeline-extension">Timeline Extension</option>
                        <option value="budget-approval">Budget Approval</option>
                        <option value="resource-allocation">Resource Allocation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Type (Optional)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['employee', 'pm', 'sales', 'admin'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setRequestData({...requestData, recipientType: type, recipientId: ''})}
                            className={`p-2 rounded-lg border-2 text-sm transition-all ${
                              requestData.recipientType === type
                                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                : 'border-gray-200 hover:border-blue-300 text-gray-700'
                            }`}
                          >
                            {type === 'pm' ? 'PM' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Select a recipient type to send the request to a specific person, or leave blank for general requests
                      </p>
                    </div>

                    {requestData.recipientType && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Recipient</label>
                        <select
                          value={requestData.recipientId}
                          onChange={(e) => setRequestData({...requestData, recipientId: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a {requestData.recipientType}...</option>
                          {requestRecipients[requestData.recipientType]?.map((recipient) => (
                            <option key={recipient.id || recipient._id} value={recipient.id || recipient._id}>
                              {recipient.name} {recipient.email ? `(${recipient.email})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        value={requestData.title}
                        onChange={(e) => setRequestData({...requestData, title: e.target.value})}
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter request title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                      <textarea
                        value={requestData.description}
                        onChange={(e) => setRequestData({...requestData, description: e.target.value})}
                        className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Describe your request"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                        <input
                          type="text"
                          value={requestData.category}
                          onChange={(e) => setRequestData({...requestData, category: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Equipment, Furniture"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                        <select
                          value={requestData.priority}
                          onChange={(e) => setRequestData({...requestData, priority: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                      <select
                        value={requestData.department}
                        onChange={(e) => setRequestData({...requestData, department: e.target.value})}
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select department</option>
                        <option value="all">All Departments</option>
                        {departmentFilterOptions.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                    <button
                      onClick={() => setShowRequestModal(false)}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRequest}
                      disabled={!requestData.title.trim() || !requestData.description.trim()}
                      className={`px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold ${
                        !requestData.title.trim() || !requestData.description.trim() 
                          ? 'opacity-50 cursor-not-allowed' 
                          : ''
                      }`}
                    >
                      Submit Request
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Allowance Modal */}
            {showAllowanceModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowAllowanceModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-4 max-w-sm w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Add Allowance</h3>
                    <button
                      onClick={() => setShowAllowanceModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Employee</label>
                      <select
                        value={allowanceData.employeeId}
                        onChange={(e) => setAllowanceData({...allowanceData, employeeId: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select employee</option>
                        {allUsers.map(user => {
                          const userIdStr = (user._id || user.id || user.employeeId)?.toString()
                          return (
                            <option key={userIdStr} value={userIdStr}>
                              {user.name} - {user.department || 'General'} ({user.role === 'project-manager' ? 'PM' : user.team === 'sales' ? 'Sales' : 'Employee'})
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Item Type</label>
                        <select
                          value={allowanceData.itemType}
                          onChange={(e) => setAllowanceData({...allowanceData, itemType: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select type</option>
                          <option value="laptop">Laptop</option>
                          <option value="monitor">Monitor</option>
                          <option value="smartphone">Smartphone</option>
                          <option value="headphones">Headphones</option>
                          <option value="wifi">WiFi Device</option>
                          <option value="car">Car</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                        <select
                          value={allowanceData.status}
                          onChange={(e) => setAllowanceData({...allowanceData, status: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="active">Active</option>
                          <option value="returned">Returned</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={allowanceData.itemName}
                        onChange={(e) => setAllowanceData({...allowanceData, itemName: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., MacBook Pro 16"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={allowanceData.serialNumber}
                        onChange={(e) => setAllowanceData({...allowanceData, serialNumber: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter serial number"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={allowanceData.issueDate}
                          onChange={(e) => setAllowanceData({...allowanceData, issueDate: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Return Date</label>
                        <input
                          type="date"
                          value={allowanceData.returnDate}
                          onChange={(e) => setAllowanceData({...allowanceData, returnDate: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Value (₹)</label>
                      <input
                        type="number"
                        value={allowanceData.value}
                        onChange={(e) => setAllowanceData({...allowanceData, value: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter item value"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                      <textarea
                        value={allowanceData.remarks}
                        onChange={(e) => setAllowanceData({...allowanceData, remarks: e.target.value})}
                        className="w-full h-12 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowAllowanceModal(false)}
                      className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAllowance}
                      className="px-4 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    >
                      Add Allowance
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Edit Allowance Modal */}
            {showEditAllowanceModal && selectedAllowance && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowEditAllowanceModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-4 max-w-sm w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Edit Allowance</h3>
                    <button
                      onClick={() => setShowEditAllowanceModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-gray-700">Employee</p>
                      <p className="text-sm font-medium text-gray-900">{selectedAllowance.employeeName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Item Type</label>
                        <select
                          value={allowanceData.itemType}
                          onChange={(e) => setAllowanceData({...allowanceData, itemType: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select type</option>
                          <option value="laptop">Laptop</option>
                          <option value="monitor">Monitor</option>
                          <option value="smartphone">Smartphone</option>
                          <option value="headphones">Headphones</option>
                          <option value="wifi">WiFi Device</option>
                          <option value="car">Car</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                        <select
                          value={allowanceData.status}
                          onChange={(e) => setAllowanceData({...allowanceData, status: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="active">Active</option>
                          <option value="returned">Returned</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={allowanceData.itemName}
                        onChange={(e) => setAllowanceData({...allowanceData, itemName: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., MacBook Pro 16"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={allowanceData.serialNumber}
                        onChange={(e) => setAllowanceData({...allowanceData, serialNumber: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter serial number"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={allowanceData.issueDate}
                          onChange={(e) => setAllowanceData({...allowanceData, issueDate: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Return Date</label>
                        <input
                          type="date"
                          value={allowanceData.returnDate}
                          onChange={(e) => setAllowanceData({...allowanceData, returnDate: e.target.value})}
                          className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Value (₹)</label>
                      <input
                        type="number"
                        value={allowanceData.value}
                        onChange={(e) => setAllowanceData({...allowanceData, value: e.target.value})}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter item value"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                      <textarea
                        value={allowanceData.remarks}
                        onChange={(e) => setAllowanceData({...allowanceData, remarks: e.target.value})}
                        className="w-full h-12 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowEditAllowanceModal(false)}
                      className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateAllowance}
                      className="px-4 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    >
                      Update Allowance
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Create Expense Modal */}
            {showExpenseModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowExpenseModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[95vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Add Recurring Expense</h3>
                      <p className="text-gray-600 text-sm mt-1">Set up a new recurring expense for your organization</p>
                    </div>
                    <button
                      onClick={() => setShowExpenseModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveExpense(); }} className="space-y-4 max-h-[calc(95vh-140px)] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Name *</label>
                        <input
                          type="text"
                          value={expenseData.name}
                          onChange={(e) => setExpenseData({...expenseData, name: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Office Rent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                        <select
                          value={expenseData.category}
                          onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select category</option>
                          <option value="rent">Rent</option>
                          <option value="utilities">Utilities</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="software">Software</option>
                          <option value="insurance">Insurance</option>
                          <option value="marketing">Marketing</option>
                          <option value="travel">Travel</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) *</label>
                        <input
                          type="number"
                          value={expenseData.amount}
                          onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter amount"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency *</label>
                        <select
                          value={expenseData.frequency}
                          onChange={(e) => setExpenseData({...expenseData, frequency: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                        <input
                          type="date"
                          value={expenseData.startDate}
                          onChange={(e) => setExpenseData({...expenseData, startDate: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={expenseData.endDate}
                          onChange={(e) => setExpenseData({...expenseData, endDate: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor</label>
                        <input
                          type="text"
                          value={expenseData.vendor}
                          onChange={(e) => setExpenseData({...expenseData, vendor: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Vendor/Service provider"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                        <select
                          value={expenseData.paymentMethod}
                          onChange={(e) => setExpenseData({...expenseData, paymentMethod: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="auto_debit">Auto Debit</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="cheque">Cheque</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>
                    </div>

                    {/* Auto Pay Toggle */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-900 mb-1">Auto Pay (Auto Debit)</label>
                          <p className="text-xs text-gray-600">
                            When enabled, expenses will be automatically marked as paid on their due date and registered as finance transactions. No manual action required.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={expenseData.autoPay}
                            onChange={(e) => setExpenseData({...expenseData, autoPay: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={expenseData.description}
                        onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                        className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Additional details about this expense"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowExpenseModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                      >
                        Add Expense
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Edit Expense Modal */}
            {showEditExpenseModal && selectedExpense && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowEditExpenseModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[95vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Edit Recurring Expense</h3>
                      <p className="text-gray-600 text-sm mt-1">Update the expense details</p>
                    </div>
                    <button
                      onClick={() => setShowEditExpenseModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleUpdateExpense(); }} className="space-y-4 max-h-[calc(95vh-140px)] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Name *</label>
                        <input
                          type="text"
                          value={expenseData.name}
                          onChange={(e) => setExpenseData({...expenseData, name: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Office Rent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                        <select
                          value={expenseData.category}
                          onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select category</option>
                          <option value="rent">Rent</option>
                          <option value="utilities">Utilities</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="software">Software</option>
                          <option value="insurance">Insurance</option>
                          <option value="marketing">Marketing</option>
                          <option value="travel">Travel</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) *</label>
                        <input
                          type="number"
                          value={expenseData.amount}
                          onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter amount"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency *</label>
                        <select
                          value={expenseData.frequency}
                          onChange={(e) => setExpenseData({...expenseData, frequency: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                        <input
                          type="date"
                          value={expenseData.startDate}
                          onChange={(e) => setExpenseData({...expenseData, startDate: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={expenseData.endDate}
                          onChange={(e) => setExpenseData({...expenseData, endDate: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor</label>
                        <input
                          type="text"
                          value={expenseData.vendor}
                          onChange={(e) => setExpenseData({...expenseData, vendor: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Vendor/Service provider"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                        <select
                          value={expenseData.paymentMethod}
                          onChange={(e) => setExpenseData({...expenseData, paymentMethod: e.target.value})}
                          className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="auto_debit">Auto Debit</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="cheque">Cheque</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>
                    </div>

                    {/* Auto Pay Toggle */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-900 mb-1">Auto Pay (Auto Debit)</label>
                          <p className="text-xs text-gray-600">
                            When enabled, expenses will be automatically marked as paid on their due date and registered as finance transactions. No manual action required.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={expenseData.autoPay}
                            onChange={(e) => setExpenseData({...expenseData, autoPay: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={expenseData.description}
                        onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                        className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Additional details about this expense"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowEditExpenseModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                      >
                        Update Expense
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Delete Expense Confirmation Modal */}
            {showDeleteExpenseModal && expenseToDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowDeleteExpenseModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Delete Recurring Expense</h3>
                        <p className="text-red-100 text-sm">Confirm deletion</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteExpenseModal(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">{expenseToDelete.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {expenseToDelete.category && expenseToDelete.category.charAt(0).toUpperCase() + expenseToDelete.category.slice(1)} • {expenseToDelete.frequency && expenseToDelete.frequency.charAt(0).toUpperCase() + expenseToDelete.frequency.slice(1)}
                        </p>
                      </div>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-red-800 mb-1">Warning</h5>
                          <p className="text-sm text-red-700">
                            This will permanently delete the recurring expense "{expenseToDelete.name}" and all associated expense entries. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDeleteExpenseModal(false)}
                        className="flex-1 h-12 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={confirmDeleteExpense}
                        className="flex-1 h-12 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Expense
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Set Employee Salary Modal */}
            {showAddEmployeeSalaryModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowAddEmployeeSalaryModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Set Employee Salary</h3>
                        <p className="text-green-100 text-sm">Select employee and set their salary</p>
                      </div>
                      <button
                        onClick={() => setShowAddEmployeeSalaryModal(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveNewEmployeeSalary(); }} className="p-6 space-y-6">
                    {/* Employee Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Select Employee <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Combobox
                        options={(() => {
                          // Use employee IDs who already have salary (from API only).
                          // Backend returns distinct employeeIds that have ANY salary record.
                          const idsFromApi = (employeesWithSalaryIds || []).map(id => String(id))
                          const employeesWithSalary = new Set(idsFromApi)
                          
                          // Employees, sales, PMs, HR, Accountant, PEM can have salary set
                          const salaryEligibleRoles = ['employee', 'sales', 'project-manager', 'hr', 'accountant', 'pem']
                          return allUsers
                            .filter(user => salaryEligibleRoles.includes(user.role))
                            .filter(user => {
                              const userIdStr = (user._id || user.id || user.employeeId)?.toString()
                              // Only show employees who do NOT already have any salary records
                              return userIdStr && !employeesWithSalary.has(userIdStr)
                            })
                            .map(user => ({
                              value: (user._id || user.id || user.employeeId).toString(),
                              label: `${user.name} - ${user.department || 'General'} (${user.role})`,
                              icon: user.role === 'hr' ? UserCheck : user.role === 'project-manager' ? Shield : Code
                            }))
                        })()}
                        value={newEmployeeSalaryData.employeeId}
                        onChange={(value) => handleNewEmployeeSalaryInputChange('employeeId', value)}
                        placeholder="Choose an employee..."
                        className="h-12 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      />
                    </div>

                    {/* Salary Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Monthly Salary (₹) <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        value={newEmployeeSalaryData.salary}
                        onChange={(e) => handleNewEmployeeSalaryInputChange('salary', e.target.value)}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                        placeholder="Enter monthly salary amount"
                        required
                        min="0"
                        step="100"
                      />
                    </div>

                    {/* Salary Start Month */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Salary Start Month <span className="text-gray-400 ml-1 text-xs">(default: current month)</span>
                      </label>
                      <input
                        type="month"
                        value={newEmployeeSalaryData.effectiveFromMonth}
                        onChange={(e) => handleNewEmployeeSalaryInputChange('effectiveFromMonth', e.target.value)}
                        className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      />
                      <p className="text-[11px] text-gray-500">
                        This is the first month from which recurring salary records will be generated. It cannot be earlier than the employee&apos;s joining month.
                      </p>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddEmployeeSalaryModal(false)}
                        className="flex-1 h-12 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg transition-all duration-200"
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Set Salary
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Employees With Salary Modal */}
            {showEmployeesWithSalaryModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowEmployeesWithSalaryModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-4xl w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white rounded-t-2xl flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Employees With Salary Set</h3>
                      <p className="text-purple-100 text-sm">View all employees for whom a fixed salary has been configured</p>
                    </div>
                    <button
                      onClick={() => setShowEmployeesWithSalaryModal(false)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6">
                    {loadingEmployeesWithSalary ? (
                      <div className="flex items-center justify-center py-8">
                        <Loading />
                      </div>
                    ) : employeesWithSalaryDetails.length === 0 ? (
                      <div className="py-10 text-center">
                        <Banknote className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700">No employees have salary set yet.</p>
                        <p className="text-xs text-gray-500 mt-1">Use &quot;Set Employee Salary&quot; to configure fixed salary for employees.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[420px]">
                        <table className="w-full min-w-[720px] text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">Fixed Salary</th>
                              <th className="text-center py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">Joining Date</th>
                              <th className="text-center py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">First Salary Month</th>
                              <th className="text-center py-2 px-3 font-semibold text-gray-700 uppercase tracking-wider">Salary Set On</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {employeesWithSalaryDetails.map((emp, index) => (
                              <tr key={emp.id || index} className="hover:bg-gray-50 transition-colors">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                      {emp.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900 text-xs">{emp.name}</span>
                                      <span className="text-[11px] text-gray-500 capitalize">{emp.employeeModel?.toLowerCase()}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-xs text-gray-700">{emp.department || '—'}</td>
                                <td className="py-2 px-3 text-xs text-gray-700 capitalize">{emp.role || '—'}</td>
                                <td className="py-2 px-3 text-right text-xs font-semibold text-green-700 tabular-nums">
                                  {formatCurrency(emp.fixedSalary || 0)}
                                </td>
                                <td className="py-2 px-3 text-center text-[11px] text-gray-600">
                                  {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </td>
                                <td className="py-2 px-3 text-center text-[11px] text-gray-600">
                                  {emp.salaryFirstMonth || '—'}
                                </td>
                                <td className="py-2 px-3 text-center text-[11px] text-gray-600">
                                  {emp.salaryFirstCreatedAt
                                    ? new Date(emp.salaryFirstCreatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEmployeesWithSalaryModal(false)}
                        className="h-10 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-xs px-4"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Delete Salary Confirmation Dialog */}
            {showDeleteSalaryModal && salaryToDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowDeleteSalaryModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Delete Salary Record</h3>
                        <p className="text-red-100 text-sm">This action cannot be undone</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteSalaryModal(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Are you sure?</h4>
                        <p className="text-sm text-gray-600">
                          You are about to delete the salary record for <span className="font-semibold">{salaryToDelete.employeeName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Salary Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Employee:</span>
                          <div className="font-semibold">{salaryToDelete.employeeName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Department:</span>
                          <div className="font-semibold">{salaryToDelete.department}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Salary:</span>
                          <div className="font-semibold text-green-600">{formatCurrency(salaryToDelete.fixedSalary || salaryToDelete.basicSalary || 0)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <div className="font-semibold">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSalaryStatusColor(salaryToDelete.status)}`}>
                              {getSalaryStatusIcon(salaryToDelete.status)}
                              {salaryToDelete.status.charAt(0).toUpperCase() + salaryToDelete.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-red-800 mb-1">Warning</h5>
                          <p className="text-sm text-red-700">
                            This will permanently delete the salary record. This action cannot be undone and will remove all associated payment history.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDeleteSalaryModal(false)}
                        className="flex-1 h-12 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={confirmDeleteSalary}
                        className="flex-1 h-12 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Record
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Salary History Modal */}
            {showSalaryHistoryModal && selectedHistoryEmployee && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => {
                  setShowSalaryHistoryModal(false)
                  setSalaryHistory([])
                  setSelectedHistoryEmployee(null)
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Payment History</h3>
                        <p className="text-blue-100 text-sm">
                          {selectedHistoryEmployee.name} - {selectedHistoryEmployee.department}
                        </p>
                        <p className="text-blue-200 text-xs mt-1">
                          Salary, Incentive & Reward Records
                        </p>
                      </div>
                      <button
                        onClick={() => {
                  setShowSalaryHistoryModal(false)
                  setSalaryHistory([])
                  setSelectedHistoryEmployee(null)
                }}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="text-gray-600 text-sm">Loading payment history...</p>
                        </div>
                      </div>
                    ) : salaryHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-12 w-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">No Payment History</h4>
                        <p className="text-gray-500 text-sm">No payment records found for this employee</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Type</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Payment Date</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Paid Date</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salaryHistory.map((item, idx) => {
                              const getPaymentTypeColor = (type) => {
                                switch(type) {
                                  case 'salary': return 'bg-blue-100 text-blue-800'
                                  case 'incentive': return 'bg-cyan-100 text-cyan-800'
                                  case 'reward': return 'bg-pink-100 text-pink-800'
                                  default: return 'bg-gray-100 text-gray-800'
                                }
                              }
                              
                              const getPaymentTypeIcon = (type) => {
                                switch(type) {
                                  case 'salary': return <Banknote className="h-3 w-3" />
                                  case 'incentive': return <TrendingUp className="h-3 w-3" />
                                  case 'reward': return <Award className="h-3 w-3" />
                                  default: return null
                                }
                              }
                              
                              return (
                                <tr
                                  key={item.id || idx}
                                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-gray-900">
                                      {new Date(item.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${getPaymentTypeColor(item.paymentType)}`}>
                                      {getPaymentTypeIcon(item.paymentType)}
                                      {item.paymentType}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <span className={`font-semibold ${
                                      item.paymentType === 'salary' ? 'text-blue-600' :
                                      item.paymentType === 'incentive' ? 'text-cyan-600' :
                                      'text-pink-600'
                                    }`}>
                                      {formatCurrency(item.amount)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSalaryStatusColor(item.status)}`}>
                                      {getSalaryStatusIcon(item.status)}
                                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-gray-600 text-xs">
                                    {item.paymentDate || '-'}
                                  </td>
                                  <td className="py-3 px-4 text-center text-gray-600 text-xs">
                                    {item.paidDate || '-'}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {item.paymentMethod ? (
                                      <span className="text-xs text-gray-600 capitalize">
                                        {item.paymentMethod.replace('_', ' ')}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Footer Summary */}
                  {salaryHistory.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Records:</span>
                          <span className="ml-2 font-semibold text-gray-900">{salaryHistory.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Salary Paid:</span>
                          <span className="ml-2 font-semibold text-blue-600">
                            {formatCurrency(salaryHistory.filter(h => h.paymentType === 'salary').reduce((sum, h) => sum + h.amount, 0))}
                          </span>
                        </div>
                        {selectedHistoryEmployee?.role === 'sales' && (
                        <div>
                          <span className="text-gray-600">Incentive Paid:</span>
                          <span className="ml-2 font-semibold text-cyan-600">
                            {formatCurrency(salaryHistory.filter(h => h.paymentType === 'incentive').reduce((sum, h) => sum + h.amount, 0))}
                          </span>
                        </div>
                        )}
                        <div>
                          <span className="text-gray-600">Reward Paid:</span>
                          <span className="ml-2 font-semibold text-pink-600">
                            {formatCurrency(salaryHistory.filter(h => h.paymentType === 'reward').reduce((sum, h) => sum + h.amount, 0))}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 font-semibold">Grand Total:</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(salaryHistory.reduce((sum, h) => sum + h.amount, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Close Button */}
                  <div className="border-t border-gray-200 p-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setShowSalaryHistoryModal(false)
                        setSalaryHistory([])
                        setSelectedHistoryEmployee(null)
                      }}
                      variant="outline"
                      className="px-6"
                    >
                      Close
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Expense Entries Modal */}
            {showExpenseEntriesModal && selectedExpense && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => {
                  setShowExpenseEntriesModal(false)
                  setExpenseEntries([])
                  setSelectedExpense(null)
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Expense Entries - {selectedExpense.name}</h3>
                        <p className="text-blue-100">Manage and mark expense entries as paid</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowExpenseEntriesModal(false)
                          setExpenseEntries([])
                          setSelectedExpense(null)
                        }}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                    {expenseEntriesLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <Loading />
                      </div>
                    ) : expenseEntries.length === 0 ? (
                      <div className="text-center py-12">
                        <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Expense Entries Found</h3>
                        <p className="text-gray-500">No entries have been generated for this recurring expense yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {([...expenseEntries].sort((a, b) => {
                          const aPaid = a.status === 'paid'
                          const bPaid = b.status === 'paid'
                          if (aPaid && !bPaid) return 1  // paid entries go to bottom
                          if (!aPaid && bPaid) return -1 // unpaid/overdue first
                          // Within same status, sort by dueDate ascending
                          const aDate = a.dueDate ? new Date(a.dueDate) : new Date(0)
                          const bDate = b.dueDate ? new Date(b.dueDate) : new Date(0)
                          return aDate - bDate
                        })).map((entry) => (
                          <div
                            key={entry._id}
                            className={`border rounded-lg p-4 ${
                              entry.status === 'paid'
                                ? 'bg-gray-100 border-gray-300'
                                : entry.status === 'overdue'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    entry.status === 'paid'
                                      ? 'bg-gray-200 text-gray-800'
                                      : entry.status === 'overdue'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">{entry.period}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="ml-2 font-semibold text-gray-900">{formatCurrency(entry.amount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Due Date:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {entry.dueDate ? formatDate(entry.dueDate) : 'N/A'}
                                    </span>
                                  </div>
                                  {entry.paidDate && (
                                    <div>
                                      <span className="text-gray-600">Paid Date:</span>
                                      <span className="ml-2 font-semibold text-green-600">
                                        {formatDate(entry.paidDate)}
                                      </span>
                                    </div>
                                  )}
                                  {entry.paymentMethod && (
                                    <div>
                                      <span className="text-gray-600">Payment Method:</span>
                                      <span className="ml-2 font-semibold text-gray-900 capitalize">
                                        {entry.paymentMethod.replace('_', ' ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {entry.notes && (
                                  <div className="mt-2">
                                    <span className="text-gray-600 text-sm">Notes: </span>
                                    <span className="text-sm text-gray-700">{entry.notes}</span>
                                  </div>
                                )}
                              </div>
                              {entry.status !== 'paid' && (
                                <div className="ml-4">
                                  <Button
                                    onClick={() => openMarkPaidModal(entry)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-200 p-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setShowExpenseEntriesModal(false)
                        setExpenseEntries([])
                        setSelectedExpense(null)
                      }}
                      variant="outline"
                      className="px-6"
                    >
                      Close
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Mark Paid Modal */}
            {showMarkPaidModal && selectedEntry && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => {
                  setShowMarkPaidModal(false)
                  setSelectedEntry(null)
                  setPaymentFormData({
                    paymentMethod: 'bank_transfer',
                    paymentReference: '',
                    notes: ''
                  })
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Mark Entry as Paid</h3>
                        <p className="text-green-100">Period: {selectedEntry.period} - Amount: {formatCurrency(selectedEntry.amount)}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowMarkPaidModal(false)
                          setSelectedEntry(null)
                          setPaymentFormData({
                            paymentMethod: 'bank_transfer',
                            paymentReference: '',
                            notes: ''
                          })
                        }}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleMarkEntryAsPaid()
                    }}
                    className="p-6 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={paymentFormData.paymentMethod}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="auto_debit">Auto Debit</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Reference
                      </label>
                      <input
                        type="text"
                        value={paymentFormData.paymentReference}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentReference: e.target.value })}
                        placeholder="Transaction ID, Cheque Number, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={paymentFormData.notes}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                        placeholder="Additional notes about this payment..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          setShowMarkPaidModal(false)
                          setSelectedEntry(null)
                          setPaymentFormData({
                            paymentMethod: 'bank_transfer',
                            paymentReference: '',
                            notes: ''
                          })
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

        {/* View User Modal */}
        {showViewModal && selectedUser && (
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
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">User Details</h3>
                    <p className="text-indigo-100">View and manage user information</p>
                  </div>
                  <button
                    onClick={closeModals}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  {/* User Avatar and Basic Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      {selectedUser.avatar || (selectedUser.name ? selectedUser.name.split(' ').map(n=>n[0]).join('').toUpperCase() : 'U')}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          selectedUser.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Joining Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser.joiningDate || selectedUser.joinDate 
                            ? formatDate(selectedUser.joiningDate || selectedUser.joinDate) 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Cake className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Date of Birth</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser.dateOfBirth || selectedUser.birthday 
                            ? formatDate(selectedUser.dateOfBirth || selectedUser.birthday) 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {selectedUser.department && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Code className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Department</p>
                          <p className="text-sm font-medium text-gray-900">{selectedUser.department}</p>
                        </div>
                      </div>
                    )}

                    {selectedUser.team && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Users className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Team</p>
                          <p className="text-sm font-medium text-gray-900">{selectedUser.team}</p>
                        </div>
                      </div>
                    )}

                    {/* Document Display */}
                    {selectedUser.document && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <p className="text-sm font-medium text-gray-700">Document</p>
                          </div>
                          {selectedUser.document.secure_url && (
                            <button
                              onClick={() => window.open(selectedUser.document.secure_url, '_blank')}
                              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          {selectedUser.document.secure_url && selectedUser.document.secure_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img
                              src={selectedUser.document.secure_url}
                              alt="User Document"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
                              onClick={() => window.open(selectedUser.document.secure_url, '_blank')}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <FileText className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 font-medium">
                              {selectedUser.document.originalName || selectedUser.document.original_filename || 'Document'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedUser.document.size ? `${Math.round(selectedUser.document.size / 1024)} KB` : 'Document'}
                            </p>
                            {selectedUser.document.secure_url && (
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = selectedUser.document.secure_url;
                                  link.download = selectedUser.document.originalName || selectedUser.document.original_filename || 'document';
                                  link.target = '_blank';
                                  link.click();
                                }}
                                className="mt-1 flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200"
                >
                  <Button
                    variant="outline"
                    onClick={closeModals}
                    className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      closeModals()
                      handleEditUser(selectedUser)
                    }}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Edit User
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedUser && (
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
              className="bg-white rounded-2xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Delete User</h3>
                    <p className="text-red-100 text-sm">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {selectedUser.avatar || (selectedUser.name ? selectedUser.name.split(' ').map(n=>n[0]).join('').toUpperCase() : 'U')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 mb-1">Warning</p>
                        <p className="text-sm text-amber-700">
                          Are you sure you want to delete <strong>{selectedUser.name}</strong>? This will permanently remove the user and all associated data from the system.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-3 pt-6"
                >
                  <Button
                    variant="outline"
                    onClick={closeModals}
                    className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Delete User
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Admin_hr_management