import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import CloudinaryUpload from '../../../components/ui/cloudinary-upload'
import {
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Eye,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  Shield,
  Code,
  TrendingUp,
  Home,
  User,
  MoreVertical,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  Upload,
  FileText,
  Download,
  Calculator,
  Receipt
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Combobox } from '../../../components/ui/combobox'
import Loading from '../../../components/ui/loading'
import { adminUserService } from '../admin-services'
import { useToast } from '../../../contexts/ToastContext'

const Admin_user_management = () => {
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('project-managers')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteTeamLeadModal, setShowDeleteTeamLeadModal] = useState(false)
  const [selectedTeamLeadForDelete, setSelectedTeamLeadForDelete] = useState(null)
  const [showAssignDevTeamModal, setShowAssignDevTeamModal] = useState(false)
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false)
  const [selectedTeamLeadForMembers, setSelectedTeamLeadForMembers] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDevTeamMembers, setSelectedDevTeamMembers] = useState([])
  const [alreadyAssignedDevMembers, setAlreadyAssignedDevMembers] = useState([])
  const [assigningDevMembers, setAssigningDevMembers] = useState(false)
  const [deletingTeamLead, setDeletingTeamLead] = useState(false)
  const [devLeadToggle, setDevLeadToggle] = useState(false)
  const [developerTeam, setDeveloperTeam] = useState([])
  const [showCreateDevLeadModal, setShowCreateDevLeadModal] = useState(false)
  const [selectedDeveloperForLead, setSelectedDeveloperForLead] = useState(null)
  const [devLeadCreationStep, setDevLeadCreationStep] = useState(1) // 1: Select developer, 2: Assign team
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
    confirmPassword: '',
    linkedSalesEmployee: ''
  })

  // Statistics data
  const [statistics, setStatistics] = useState({
    total: 0,
    admins: 0,
    hr: 0,
    accountant: 0,
    pem: 0,
    projectManagers: 0,
    employees: 0,
    clients: 0,
    developers: 0,
    salesTeam: 0,
    active: 0,
    inactive: 0
  })

  // Sales team data for client linking
  const [salesTeam, setSalesTeam] = useState([])

  // Users data
  const [users, setUsers] = useState([])
  const { addToast } = useToast()

  // Load developer team (employees with team='developer')
  const loadDeveloperTeam = async () => {
    try {
      const response = await adminUserService.getAllUsers({
        role: 'employee',
        team: 'developer',
        status: 'active',
        limit: 10000
      })
      if (response.success) {
        const formattedDevelopers = response.data.map(user => adminUserService.formatUserForDisplay(user))
        setDeveloperTeam(formattedDevelopers)
      }
    } catch (error) {
      console.error('Error loading developer team:', error)
    }
  }

  // Load sales team (employees with team='sales')
  const loadSalesTeam = async () => {
    try {
      const response = await adminUserService.getAllUsers({
        role: 'employee',
        team: 'sales',
        status: 'active',
        limit: 10000
      })
      if (response.success) {
        const formattedSales = response.data.map(user => adminUserService.formatUserForDisplay(user))
        setSalesTeam(formattedSales)
      }
    } catch (error) {
      console.error('Error loading sales team:', error)
    }
  }

  useEffect(() => {
    loadData()
    loadDeveloperTeam()
    loadSalesTeam()
  }, [])

  // Reload users when filters change (without full page reload)
  useEffect(() => {
    if (!loading) {
      loadUsersOnly()
    }
  }, [activeTab, selectedFilter, selectedDepartment, searchTerm])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load users and statistics
      // Fetch all users by setting a very high limit
      const [usersResponse, statisticsResponse] = await Promise.all([
        adminUserService.getAllUsers({
          role: 'all',
          team: activeTab === 'employees' && selectedDepartment !== 'all' ? selectedDepartment : undefined,
          status: selectedFilter !== 'all' ? selectedFilter : undefined,
          search: searchTerm || undefined,
          limit: 10000, // Fetch all users
          page: 1
        }),
        adminUserService.getUserStatistics()
      ])

      // Format users for display
      const formattedUsers = usersResponse.data.map(user => adminUserService.formatUserForDisplay(user))

      setUsers(formattedUsers)
      setStatistics(statisticsResponse.data)
      setCurrentPage(1) // Reset to first page when data loads
    } catch (error) {
      console.error('Error loading data:', error)
      addToast({ type: 'error', message: 'Failed to load user data' })
    } finally {
      setLoading(false)
    }
  }

  const loadUsersOnly = async () => {
    setUsersLoading(true)
    try {
      // Load only users data - Fetch all users by setting a very high limit
      const usersResponse = await adminUserService.getAllUsers({
        role: 'all',
        team: activeTab === 'employees' && selectedDepartment !== 'all' ? selectedDepartment : undefined,
        status: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: searchTerm || undefined,
        limit: 10000, // Fetch all users
        page: 1
      })

      // Format users for display
      const formattedUsers = usersResponse.data.map(user => adminUserService.formatUserForDisplay(user))

      setUsers(formattedUsers)
      setCurrentPage(1) // Reset to first page when filters change
    } catch (error) {
      console.error('Error loading users:', error)
      addToast({ type: 'error', message: 'Failed to load user data' })
    } finally {
      setUsersLoading(false)
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'hr': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'accountant': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'pem': return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'project-manager': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'employee': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'client': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCurrentUsers = () => {
    let filteredUsers = users

    // Filter by tab/role
    filteredUsers = users.filter(user => {
      switch (activeTab) {
        case 'employees':
          return user.userType === 'employee' || user.userType === 'sales'
        case 'developer-team-leads':
          return user.userType === 'employee' && user.team === 'developer' && user.isTeamLead === true
        case 'project-managers':
          return user.userType === 'project-manager'
        case 'clients':
          return user.userType === 'client'
        case 'admin-hr':
          return user.userType === 'admin' || user.role === 'hr'
        case 'accountant':
          return user.userType === 'accountant' || user.role === 'accountant'
        case 'pem':
          return user.userType === 'pem' || user.role === 'pem'
        default:
          return true
      }
    })

    // Filter by department (only for employees)
    if (activeTab === 'employees' && selectedDepartment !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.department === selectedDepartment)
    }

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
      confirmPassword: '',
      linkedSalesEmployee: ''
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
      dateOfBirth: formatDateForInput(user.dateOfBirth),
      joiningDate: formatDateForInput(user.joiningDate),
      document: user.document || null,
      password: '',
      confirmPassword: '',
      linkedSalesEmployee: user.linkedSalesEmployee?._id || user.linkedSalesEmployee || ''
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

  // Handle phone number input with validation
  const handlePhoneChange = (value) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '')

    // Handle +91 prefix
    if (cleaned.startsWith('+91')) {
      // Extract digits after +91
      const digitsAfterPrefix = cleaned.substring(3)
      // Limit to 10 digits after +91
      const limitedDigits = digitsAfterPrefix.slice(0, 10)
      setFormData({ ...formData, phone: '+91' + limitedDigits })
    } else if (cleaned.startsWith('91') && cleaned.length > 2) {
      // Handle 91 prefix (without +)
      const digitsAfterPrefix = cleaned.substring(2)
      const limitedDigits = digitsAfterPrefix.slice(0, 10)
      setFormData({ ...formData, phone: '+91' + limitedDigits })
    } else if (cleaned.startsWith('+')) {
      // If starts with + but not +91, remove it
      const digitsOnly = cleaned.substring(1).slice(0, 10)
      setFormData({ ...formData, phone: digitsOnly })
    } else {
      // No prefix, limit to 10 digits
      const limitedDigits = cleaned.slice(0, 10)
      setFormData({ ...formData, phone: limitedDigits })
    }
  }

  const handleSaveUser = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)

      // Validate user data
      const validationErrors = adminUserService.validateUserData(formData, showEditModal)
      if (validationErrors.length > 0) {
        addToast({ type: 'error', message: validationErrors[0] })
        setIsSubmitting(false)
        return
      }

      let response;
      const dataToSave = { ...formData };

      // Clean phone number before sending to backend
      if (dataToSave.phone) {
        // Remove +91 prefix if present, keep only digits
        let phoneNumber = dataToSave.phone.replace(/\+91/g, '').replace(/\D/g, '')
        // Ensure it's exactly 10 digits
        if (phoneNumber.length === 10) {
          dataToSave.phone = phoneNumber
        } else {
          addToast({ type: 'error', message: 'Phone number must be exactly 10 digits' })
          setIsSubmitting(false)
          return
        }
      }

      if (showCreateModal) {
        // Create new user
        response = await adminUserService.createUser(dataToSave);
        addToast({ type: 'success', message: 'User created successfully' });
      } else {
        // Update existing user
        const userType = selectedUser.userType
        response = await adminUserService.updateUser(userType, selectedUser.id, formData)
        addToast({ type: 'success', message: 'User updated successfully' })
      }

      // Close modals and reset form
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
        confirmPassword: '',
        linkedSalesEmployee: ''
      })

      // Reload data
      await loadUsersOnly()
    } catch (error) {
      console.error('Error saving user:', error)
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to save user' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    try {
      await adminUserService.deleteUser(selectedUser.userType, selectedUser.id)
      addToast({ type: 'success', message: 'User deleted successfully' })
      setShowDeleteModal(false)
      setSelectedUser(null)
      await loadUsersOnly()
    } catch (error) {
      console.error('Error deleting user:', error)
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to delete user' })
    }
  }

  const handleRemoveTeamLead = (teamLead) => {
    setSelectedTeamLeadForDelete(teamLead)
    setShowDeleteTeamLeadModal(true)
  }

  const confirmRemoveTeamLead = async () => {
    // Prevent multiple clicks
    if (deletingTeamLead || !selectedTeamLeadForDelete) {
      return
    }

    try {
      setDeletingTeamLead(true)
      const teamLeadId = selectedTeamLeadForDelete.id || selectedTeamLeadForDelete._id
      const teamMembers = selectedTeamLeadForDelete.teamMembers || []
      const teamMemberCount = Array.isArray(teamMembers) ? teamMembers.length : 0

      // Remove team lead status and unassign all team members
      await adminUserService.updateDeveloperTeamMembers(teamLeadId, {
        teamMembers: [],
        isTeamLead: false
      })

      addToast({
        type: 'success',
        message: `${selectedTeamLeadForDelete.name} has been removed as team lead. ${teamMemberCount} team member(s) have been unassigned.`
      })

      // Close modal
      setShowDeleteTeamLeadModal(false)
      setSelectedTeamLeadForDelete(null)

      // Reload data
      await loadUsersOnly()
      await loadDeveloperTeam()
    } catch (error) {
      console.error('Error removing team lead:', error)
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to remove team lead status'
      })
    } finally {
      setDeletingTeamLead(false)
    }
  }

  const handleAssignDevTeam = async (user) => {
    setSelectedUser(user)

    // Ensure developer team is loaded before opening modal
    if (developerTeam.length === 0) {
      await loadDeveloperTeam()
    }

    // Get currently assigned team members if any
    const existingTeamMembers = user.teamMembers || []
    const existingTeamMemberIds = existingTeamMembers.map(tm => {
      return typeof tm === 'object' ? String(tm._id || tm.id) : String(tm)
    })
    setAlreadyAssignedDevMembers(existingTeamMemberIds)
    setSelectedDevTeamMembers([])
    setDevLeadToggle(user.isTeamLead || false)

    setShowAssignDevTeamModal(true)
  }

  // Get all developers already assigned to any team leads (excluding current team lead if editing)
  const getAssignedToOtherLeads = (currentTeamLeadId = null) => {
    const assignedIds = new Set()
    users.forEach(user => {
      if (user.userType === 'employee' && user.team === 'developer' && user.isTeamLead) {
        const teamLeadId = String(user.id || user._id)
        // If currentTeamLeadId is provided, exclude that team lead's members
        if (!currentTeamLeadId || teamLeadId !== String(currentTeamLeadId)) {
          const teamMembers = user.teamMembers || []
          teamMembers.forEach(memberId => {
            const id = typeof memberId === 'object' ? String(memberId._id || memberId.id) : String(memberId)
            assignedIds.add(id)
          })
        }
      }
    })
    return Array.from(assignedIds)
  }

  // Get all developers who are team leads
  const getAllTeamLeadIds = () => {
    const teamLeadIds = new Set()
    users.forEach(user => {
      if (user.userType === 'employee' && user.team === 'developer' && user.isTeamLead) {
        const teamLeadId = String(user.id || user._id)
        teamLeadIds.add(teamLeadId)
      }
    })
    return Array.from(teamLeadIds)
  }

  const handleDevTeamMemberToggle = (memberId) => {
    // Use selectedDeveloperForLead if creating new, otherwise use selectedUser
    const userToUse = selectedDeveloperForLead || selectedUser
    const currentTeamLeadId = userToUse?.id || userToUse?._id

    // Check if this member is already assigned to another team lead
    const assignedToOtherLeads = getAssignedToOtherLeads(currentTeamLeadId)
    const memberIdStr = String(memberId)

    if (assignedToOtherLeads.includes(memberIdStr)) {
      const member = developerTeam.find(m => {
        const mId = String(m.id || m._id)
        return mId === memberIdStr
      })
      const memberName = member?.name || 'This developer'
      addToast({
        type: 'error',
        message: `${memberName} is already assigned to another team lead. Please remove them from that team lead first.`
      })
      return
    }

    setSelectedDevTeamMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId)
      } else {
        return [...prev, memberId]
      }
    })
  }

  const handleConfirmDevAssignment = async () => {
    // Prevent multiple clicks
    if (assigningDevMembers) {
      return
    }

    // Use selectedDeveloperForLead if creating new, otherwise use selectedUser
    const userToUse = selectedDeveloperForLead || selectedUser

    if (!userToUse) {
      addToast({ type: 'error', message: 'Please select a developer to make a team lead' })
      return
    }

    try {
      setAssigningDevMembers(true)
      const userId = userToUse.id || userToUse._id

      if (!userId) {
        addToast({ type: 'error', message: 'Team leader ID not found' })
        return
      }

      // Check if any selected members are already assigned to other team leads
      const assignedToOtherLeads = getAssignedToOtherLeads(userId)
      const conflictingMembers = selectedDevTeamMembers.filter(memberId => {
        const memberIdStr = String(memberId)
        return assignedToOtherLeads.includes(memberIdStr)
      })

      if (conflictingMembers.length > 0) {
        const conflictingNames = conflictingMembers.map(memberId => {
          const member = developerTeam.find(m => {
            const mId = String(m.id || m._id)
            return mId === String(memberId)
          })
          return member?.name || 'Unknown'
        }).join(', ')

        addToast({
          type: 'error',
          message: `Cannot assign: ${conflictingNames} ${conflictingMembers.length > 1 ? 'are' : 'is'} already assigned to another team lead. Please remove them first.`
        })
        setAssigningDevMembers(false)
        return
      }

      // Merge newly selected members with already assigned members
      const allAssignedIds = [...new Set([
        ...alreadyAssignedDevMembers.map(id => typeof id === 'object' ? String(id._id || id.id) : String(id)),
        ...selectedDevTeamMembers.map(id => String(id))
      ])]

      // Save to backend
      const response = await adminUserService.updateDeveloperTeamMembers(userId, {
        teamMembers: allAssignedIds,
        isTeamLead: devLeadToggle
      })

      if (response && response.success) {
        const teamLeadStatus = devLeadToggle ? 'enabled' : 'disabled'
        const membersCount = allAssignedIds.length

        if (selectedDeveloperForLead) {
          addToast({ type: 'success', message: `Team lead created successfully! ${membersCount} team member(s) assigned` })
        } else {
          addToast({ type: 'success', message: `Team lead status: ${teamLeadStatus}, ${membersCount} team member(s) assigned` })
        }
      } else {
        throw new Error(response?.message || 'Failed to update team members')
      }

      // Close modals after confirmation
      setShowAssignDevTeamModal(false)
      setShowCreateDevLeadModal(false)
      setSelectedUser(null)
      setSelectedDeveloperForLead(null)
      setSelectedDevTeamMembers([])
      setAlreadyAssignedDevMembers([])
      setDevLeadToggle(false)
      setDevLeadCreationStep(1)

      // Reload users to reflect changes
      await loadUsersOnly()
      await loadDeveloperTeam()

    } catch (error) {
      console.error('Error assigning team member:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to assign team member'
      addToast({ type: 'error', message: errorMessage })
    } finally {
      setAssigningDevMembers(false)
    }
  }

  const handleSelectDeveloperForLead = (developer) => {
    setSelectedDeveloperForLead(developer)
    setAlreadyAssignedDevMembers([])
    setSelectedDevTeamMembers([])
    setDevLeadToggle(true) // Auto-enable team lead toggle when creating new
    setDevLeadCreationStep(2) // Move to step 2: assign team
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setShowDeleteModal(false)
    setShowDeleteTeamLeadModal(false)
    setSelectedTeamLeadForDelete(null)
    setShowAssignDevTeamModal(false)
    setShowCreateDevLeadModal(false)
    setShowTeamMembersModal(false)
    setSelectedTeamLeadForMembers(null)
    setSelectedUser(null)
    setSelectedDeveloperForLead(null)
    setSelectedDevTeamMembers([])
    setAlreadyAssignedDevMembers([])
    setDevLeadToggle(false)
    setDevLeadCreationStep(1)
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
    if (activeTab !== 'employees') {
      setSelectedDepartment('all')
    }
  }, [activeTab])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, selectedFilter, selectedDepartment, searchTerm])

  // Get developer team leads count
  const developerTeamLeadsCount = users.filter(user =>
    user.userType === 'employee' &&
    user.team === 'developer' &&
    user.isTeamLead === true
  ).length

  const tabs = [
    { key: 'project-managers', label: 'Project Managers', icon: Shield, count: statistics.projectManagers || 0 },
    { key: 'employees', label: 'Employees', icon: Code, count: statistics.employees || 0 },
    { key: 'developer-team-leads', label: 'Dev Leads', icon: Users, count: developerTeamLeadsCount },
    { key: 'clients', label: 'Clients', icon: Home, count: statistics.clients || 0 },
    { key: 'admin-hr', label: 'Admin & HR', icon: User, count: (statistics.admins || 0) + (statistics.hr || 0) },
    { key: 'accountant', label: 'Accountant', icon: Calculator, count: statistics.accountant || 0 },
    { key: 'pem', label: 'PEM', icon: Receipt, count: statistics.pem || 0 }
  ]

  // Combobox options
  const roleOptions = [
    { value: 'admin', label: 'Admin', icon: User },
    { value: 'hr', label: 'HR', icon: User },
    { value: 'accountant', label: 'Accountant', icon: Calculator },
    { value: 'pem', label: 'Project Expense Manager (PEM)', icon: Receipt },
    { value: 'project-manager', label: 'Project Manager', icon: Shield },
    { value: 'employee', label: 'Employee', icon: Code },
    { value: 'client', label: 'Client', icon: Home }
  ]

  const teamOptions = [
    { value: 'developer', label: 'Developer', icon: Code },
    { value: 'sales', label: 'Sales Team', icon: TrendingUp }
  ]

  const departmentOptions = [
    { value: 'full-stack', label: 'Full Stack', icon: Code },
    { value: 'nodejs', label: 'Node.js', icon: Code },
    { value: 'web', label: 'Web', icon: Code },
    { value: 'app', label: 'App', icon: Code }
  ]

  const salesDepartmentOptions = [
    { value: 'sales', label: 'Sales', icon: TrendingUp }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active', icon: CheckCircle },
    { value: 'inactive', label: 'Inactive', icon: AlertCircle }
  ]

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                User Management
              </h1>
              <p className="text-gray-600">
                Manage all users, roles, and permissions across the platform.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={loadUsersOnly}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={usersLoading}
              >
                <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                {usersLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                onClick={handleCreateUser}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          {/* Statistics Cards - Row 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            {/* Total Users */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-blue-700">
                      {statistics.total > 0 ? `+${Math.round((statistics.total / 10) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-blue-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">Total Users</p>
                  <p className="text-lg font-bold text-blue-800">{statistics.total}</p>
                </div>
              </div>
            </div>

            {/* Project Managers */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-violet-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-400/20 to-violet-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-purple-700">
                      {statistics.projectManagers > 0 ? `+${Math.round((statistics.projectManagers / 5) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-purple-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-700 mb-1">Project Managers</p>
                  <p className="text-lg font-bold text-purple-800">{statistics.projectManagers}</p>
                </div>
              </div>
            </div>

            {/* Employees */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-emerald-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Code className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-emerald-700">
                      {statistics.employees > 0 ? `+${Math.round((statistics.employees / 8) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-emerald-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-700 mb-1">Employees</p>
                  <p className="text-lg font-bold text-emerald-800">{statistics.employees}</p>
                </div>
              </div>
            </div>

            {/* Clients */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Home className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-orange-700">
                      {statistics.clients > 0 ? `+${Math.round((statistics.clients / 6) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-orange-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-700 mb-1">Clients</p>
                  <p className="text-lg font-bold text-orange-800">{statistics.clients}</p>
                </div>
              </div>
            </div>

            {/* Admin Users */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <User className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-700">
                      {statistics.admins > 0 ? `+${Math.round((statistics.admins / 2) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-red-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Admin Users</p>
                  <p className="text-lg font-bold text-red-800">{statistics.admins}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Statistics Cards - Row 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            {/* Developers */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-indigo-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-indigo-400/20 to-blue-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <Code className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-indigo-700">
                      {statistics.developers > 0 ? `+${Math.round((statistics.developers / 7) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-indigo-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-700 mb-1">Developers</p>
                  <p className="text-lg font-bold text-indigo-800">{statistics.developers}</p>
                </div>
              </div>
            </div>

            {/* Sales Team */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-pink-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-rose-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-rose-400/20 to-pink-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <TrendingUp className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-rose-700">
                      {statistics.salesTeam > 0 ? `+${Math.round((statistics.salesTeam / 4) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-rose-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-rose-700 mb-1">Sales Team</p>
                  <p className="text-lg font-bold text-rose-800">{statistics.salesTeam}</p>
                </div>
              </div>
            </div>

            {/* Active Users */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-cyan-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-teal-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-teal-500/10">
                    <CheckCircle className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-teal-700">
                      {statistics.active > 0 ? `+${Math.round((statistics.active / 15) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-teal-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 mb-1">Active Users</p>
                  <p className="text-lg font-bold text-teal-800">{statistics.active}</p>
                </div>
              </div>
            </div>

            {/* HR Users */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-amber-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-amber-700">
                      {statistics.hr > 0 ? `+${Math.round((statistics.hr / 2) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-amber-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">HR Users</p>
                  <p className="text-lg font-bold text-amber-800">{statistics.hr}</p>
                </div>
              </div>
            </div>

            {/* Inactive Users */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-slate-100 p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-200/50">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-gray-400/20 to-slate-500/20 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <AlertCircle className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">
                      {statistics.inactive > 0 ? `-${Math.round((statistics.inactive / 3) * 100) / 100}%` : '0%'}
                    </p>
                    <p className="text-xs text-gray-600">this month</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Inactive Users</p>
                  <p className="text-lg font-bold text-gray-800">{statistics.inactive}</p>
                </div>
              </div>
            </div>
          </motion.div>


          {/* Main Content Card */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  User Management
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
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
                  </select>
                  {activeTab === 'employees' && (
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Departments</option>
                      <option value="full-stack">Full Stack</option>
                      <option value="nodejs">Node.js</option>
                      <option value="web">Web</option>
                      <option value="app">App</option>
                      <option value="sales">Sales</option>
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-6 px-6 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.key

                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center space-x-1.5 py-3 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs">{tab.label}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full min-w-[20px] text-center ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {tab.count}
                        </span>
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Users List */}
              <div className="p-6">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-gray-600">Loading users...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Developer Team Leads Section */}
                    {activeTab === 'developer-team-leads' ? (
                      <>
                        {/* Header Actions */}
                        <div className="flex items-center justify-end space-x-3 mb-4">
                          <Button
                            onClick={async () => {
                              if (usersLoading) return
                              setUsersLoading(true)
                              try {
                                await Promise.all([
                                  loadUsersOnly(),
                                  loadDeveloperTeam()
                                ])
                              } finally {
                                setUsersLoading(false)
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={usersLoading || assigningDevMembers || deletingTeamLead}
                          >
                            <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                            {usersLoading ? 'Refreshing...' : 'Refresh'}
                          </Button>
                          <Button
                            onClick={() => {
                              if (assigningDevMembers || deletingTeamLead) return
                              setSelectedDeveloperForLead(null)
                              setDevLeadCreationStep(1)
                              setDevLeadToggle(false)
                              setSelectedDevTeamMembers([])
                              setAlreadyAssignedDevMembers([])
                              setShowCreateDevLeadModal(true)
                              if (developerTeam.length === 0) {
                                loadDeveloperTeam()
                              }
                            }}
                            disabled={assigningDevMembers || deletingTeamLead}
                            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserPlus className="h-4 w-4" />
                            Create Team Lead
                          </Button>
                        </div>

                        {getCurrentUsers().length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Developer Team Leads</h3>
                            <p className="text-gray-600 mb-4">No developers have been assigned as team leads yet.</p>
                            <Button
                              onClick={() => {
                                if (assigningDevMembers || deletingTeamLead) return
                                setSelectedDeveloperForLead(null)
                                setDevLeadCreationStep(1)
                                setDevLeadToggle(false)
                                setSelectedDevTeamMembers([])
                                setAlreadyAssignedDevMembers([])
                                setShowCreateDevLeadModal(true)
                                if (developerTeam.length === 0) {
                                  loadDeveloperTeam()
                                }
                              }}
                              disabled={assigningDevMembers || deletingTeamLead}
                              className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserPlus className="h-4 w-4" />
                              Create Your First Team Lead
                            </Button>
                          </div>
                        ) : (
                          <>
                            {/* Table Layout */}
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1000px] border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[180px]">Name</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[180px]">Email</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px] hidden md:table-cell">Department</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px] hidden md:table-cell">Phone</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Team Members</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Status</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[110px] hidden lg:table-cell">Joining Date</th>
                                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getPaginatedUsers().map((teamLead, index) => {
                                    const teamLeadId = teamLead.id || teamLead._id
                                    const teamMembers = teamLead.teamMembers || []
                                    const teamMemberCount = Array.isArray(teamMembers) ? teamMembers.length : 0
                                    const teamMemberNames = teamMembers.slice(0, 3).map(memberId => {
                                      const member = developerTeam.find(m => {
                                        const mId = m.id || m._id
                                        const compareId = typeof memberId === 'object' ? (memberId._id || memberId.id) : memberId
                                        return mId && compareId && String(mId) === String(compareId)
                                      })
                                      return member?.name
                                    }).filter(Boolean)

                                    return (
                                      <tr key={teamLeadId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="py-2 px-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                              {teamLead.avatar}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-gray-900 truncate">{teamLead.name}</p>
                                              <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 mt-0.5">
                                                Team Lead
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-2 px-2">
                                          <div className="text-xs text-gray-600 truncate max-w-[180px]">
                                            {teamLead.email}
                                          </div>
                                        </td>
                                        <td className="py-2 px-2 hidden md:table-cell">
                                          {teamLead.department ? (
                                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
                                              {teamLead.department}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2 hidden md:table-cell">
                                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                                            <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
                                            <span className="truncate max-w-[100px]">{teamLead.phone || 'N/A'}</span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-2">
                                          <button
                                            onClick={() => {
                                              setSelectedTeamLeadForMembers(teamLead)
                                              setShowTeamMembersModal(true)
                                            }}
                                            className="flex items-center space-x-2 hover:text-indigo-600 transition-colors group"
                                          >
                                            <Users className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 group-hover:text-indigo-700" />
                                            <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 underline cursor-pointer">
                                              {teamMemberCount}
                                            </span>
                                          </button>
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(teamLead.status)}`}>
                                            {teamLead.status === 'active' ? 'Active' : 'Inactive'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 hidden lg:table-cell">
                                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                                            <Calendar className="h-3 w-3 flex-shrink-0 text-gray-400" />
                                            <span className="truncate">{formatDate(teamLead.joiningDate)}</span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-2">
                                          <div className="flex items-center justify-end space-x-1">
                                            <button
                                              onClick={() => handleViewUser(teamLead)}
                                              disabled={assigningDevMembers || deletingTeamLead}
                                              className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                              title="View"
                                            >
                                              <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!assigningDevMembers && !deletingTeamLead) {
                                                  handleAssignDevTeam(teamLead)
                                                }
                                              }}
                                              disabled={assigningDevMembers || deletingTeamLead}
                                              className="text-gray-400 hover:text-purple-600 p-1 rounded hover:bg-purple-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                              title="Manage Team"
                                            >
                                              <Users className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!assigningDevMembers && !deletingTeamLead) {
                                                  handleRemoveTeamLead(teamLead)
                                                }
                                              }}
                                              disabled={assigningDevMembers || deletingTeamLead}
                                              className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                              title="Remove as Team Lead"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
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
                              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                                {/* Results Info */}
                                <div className="text-sm text-gray-600">
                                  Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, getCurrentUsers().length)}</span> of <span className="font-semibold">{getCurrentUsers().length}</span> team leads
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

                                {/* Pagination Controls */}
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
                                          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${currentPage === i
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
                          </>
                        )}
                      </>
                    ) : getCurrentUsers().length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                      </div>
                    ) : (
                      <>
                        {/* Table Layout */}
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1000px] border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[180px]">Name</th>
                                {activeTab !== 'clients' && (
                                  <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[180px]">Email</th>
                                )}
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px] hidden md:table-cell">Phone</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px]">Role</th>
                                {activeTab !== 'clients' && activeTab !== 'admin-hr' && activeTab !== 'project-managers' && activeTab !== 'accountant' && activeTab !== 'pem' && activeTab !== 'developer-team-leads' && (
                                  <>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[100px] hidden md:table-cell">Team</th>
                                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px] hidden lg:table-cell">Department</th>
                                  </>
                                )}
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[90px]">Status</th>
                                <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[110px] hidden lg:table-cell">Joining Date</th>
                                <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-700 min-w-[120px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getPaginatedUsers().map((user, index) => {
                                const userKey = user.id || user._id || `user-${index}`
                                return (
                                  <tr key={userKey} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-2 px-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                                          {user.avatar}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                                        </div>
                                      </div>
                                    </td>
                                    {activeTab !== 'clients' && (
                                      <td className="py-2 px-2">
                                        <div className="text-xs text-gray-600 truncate max-w-[180px]">
                                          {user.email}
                                        </div>
                                      </td>
                                    )}
                                    <td className="py-2 px-2 hidden md:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
                                        <span className="truncate max-w-[100px]">{user.phone || 'N/A'}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
                                        {user.role === 'admin' ? 'Admin' :
                                          user.role === 'hr' ? 'HR' :
                                            user.role === 'accountant' ? 'Accountant' :
                                              user.role === 'pem' ? 'PEM' :
                                                user.role === 'project-manager' ? 'PM' :
                                                  user.role === 'employee' ? 'Emp' : 'Client'}
                                      </span>
                                    </td>
                                    {activeTab !== 'clients' && activeTab !== 'admin-hr' && activeTab !== 'project-managers' && activeTab !== 'accountant' && activeTab !== 'pem' && activeTab !== 'developer-team-leads' && (
                                      <>
                                        <td className="py-2 px-2 hidden md:table-cell">
                                          {user.team ? (
                                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getTeamColor(user.team)}`}>
                                              {user.team === 'developer' ? 'Dev' : 'Sales'}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2 hidden lg:table-cell">
                                          {user.department && user.role === 'employee' ? (
                                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
                                              {user.department}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                          )}
                                        </td>
                                      </>
                                    )}
                                    <td className="py-2 px-2">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(user.status)}`}>
                                        {user.status === 'active' ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 hidden lg:table-cell">
                                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                                        <Calendar className="h-3 w-3 flex-shrink-0 text-gray-400" />
                                        <span className="truncate">{formatDate(user.joiningDate)}</span>
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
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
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

                            {/* Pagination Controls */}
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
                                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${currentPage === i
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
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
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
                      {showCreateModal ? 'Create New User' : 'Edit User'}
                    </h3>
                    <p className="text-blue-100">
                      {showCreateModal
                        ? 'Fill in the user details below. Fields marked with * are required.'
                        : 'Update the user details below. Fields marked with * are required.'
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

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!isSubmitting) {
                  handleSaveUser();
                }
              }} className="p-6 space-y-6 max-h-[calc(95vh-140px)] overflow-y-auto">
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full h-12 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="+91 9876543210 or 9876543210"
                    maxLength={13}
                  />
                  <p className="text-xs text-gray-500">Enter 10-digit mobile number (with or without +91)</p>
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
                      onChange={(value) => setFormData({ ...formData, role: value, team: '' })}
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
                        onChange={(value) => setFormData({ ...formData, team: value, department: '' })}
                        placeholder="Select team"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </motion.div>
                  )}

                  {formData.role === 'client' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        Linked Sales Employee
                      </label>
                      <Combobox
                        options={salesTeam.map(s => ({ value: s.id || s._id, label: s.name }))}
                        value={formData.linkedSalesEmployee}
                        onChange={(value) => setFormData({ ...formData, linkedSalesEmployee: value })}
                        placeholder="Select sales employee"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Department Field - Only for Employees */}
                {formData.role === 'employee' && formData.team && (
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
                      placeholder="Enter department name (e.g., Full Stack, Node.js, Web, App, Sales)"
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500">Enter any department name</p>
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
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
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
                      setFormData({ ...formData, document: uploadData });
                    }}
                    onUploadError={(error) => {
                      console.error('Upload error:', error);
                    }}
                    onRemoveExisting={() => {
                      setFormData({ ...formData, document: null });
                    }}
                    folder="Revra/users/documents"
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
                    onChange={(value) => setFormData({ ...formData, status: value })}
                    placeholder="Select status"
                    className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </motion.div>

                {/* Password Fields Grid - Only for non-client users */}
                {formData.role !== 'client' && (
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
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                )}

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
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {showCreateModal ? 'Creating...' : 'Updating...'}
                      </span>
                    ) : (
                      showCreateModal ? 'Create User' : 'Update User'
                    )}
                  </Button>
                </motion.div>
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
                {/* User Avatar and Basic Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
                    {selectedUser.avatar}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedUser.name}</h4>
                    <p className="text-gray-600 mb-2">{selectedUser.email}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role === 'admin' ? 'Admin' :
                          selectedUser.role === 'hr' ? 'HR' :
                            selectedUser.role === 'accountant' ? 'Accountant' :
                              selectedUser.role === 'pem' ? 'Project Expense Manager (PEM)' :
                                selectedUser.role === 'project-manager' ? 'Project Manager' :
                                  selectedUser.role === 'employee' ? 'Employee' : 'Client'}
                      </span>
                      {selectedUser.team && (
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTeamColor(selectedUser.team)}`}>
                          {selectedUser.team === 'developer' ? 'Developer' : 'Sales Team'}
                        </span>
                      )}
                      {selectedUser.department && selectedUser.role === 'employee' && (
                        <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-cyan-100 text-cyan-800">
                          {selectedUser.department}
                        </span>
                      )}
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status}
                      </span>
                    </div>
                    {selectedUser.role === 'client' && selectedUser.linkedSalesEmployee && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Linked Sales Employee</p>
                          <p className="text-sm font-semibold text-blue-900">
                            {typeof selectedUser.linkedSalesEmployee === 'object'
                              ? selectedUser.linkedSalesEmployee.name
                              : salesTeam.find(s => (s.id || s._id) === selectedUser.linkedSalesEmployee)?.name || 'Assigned'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-blue-600" />
                    Contact Information
                  </h5>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone Number</p>
                        <p className="text-gray-900">{selectedUser.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Joined Date</p>
                        <p className="text-gray-900">{formatDate(selectedUser.joiningDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Last Active</p>
                        <p className="text-gray-900">{selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Never'}</p>
                      </div>
                    </div>
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
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200"
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
                      setShowViewModal(false)
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

        {/* Delete Team Lead Confirmation Modal */}
        {showDeleteTeamLeadModal && selectedTeamLeadForDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowDeleteTeamLeadModal(false)
              setSelectedTeamLeadForDelete(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Remove Team Lead</h3>
                    <p className="text-orange-100 text-sm">Remove team lead status and unassign team members</p>
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
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {selectedTeamLeadForDelete.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedTeamLeadForDelete.name}</p>
                      <p className="text-sm text-gray-600">{selectedTeamLeadForDelete.email}</p>
                    </div>
                  </div>

                  {(() => {
                    const teamMembers = selectedTeamLeadForDelete.teamMembers || []
                    const teamMemberCount = Array.isArray(teamMembers) ? teamMembers.length : 0

                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">Remove Team Lead Status</p>
                            <p className="text-sm text-blue-700">
                              Are you sure you want to remove <strong>{selectedTeamLeadForDelete.name}</strong> as a team lead?
                              {teamMemberCount > 0 && (
                                <span className="block mt-1">
                                  This will automatically unassign <strong>{teamMemberCount} team member{teamMemberCount > 1 ? 's' : ''}</strong> from this team lead.
                                </span>
                              )}
                              <span className="block mt-2 text-xs">
                                Note: The user will remain in the system but will no longer be a team lead.
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-3 pt-6"
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!deletingTeamLead) {
                        setShowDeleteTeamLeadModal(false)
                        setSelectedTeamLeadForDelete(null)
                      }
                    }}
                    disabled={deletingTeamLead}
                    className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmRemoveTeamLead}
                    disabled={deletingTeamLead}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {deletingTeamLead ? (
                      <span className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Removing...
                      </span>
                    ) : (
                      'Remove as Team Lead'
                    )}
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
                      {selectedUser.avatar}
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

        {/* Create Developer Team Lead Modal */}
        {showCreateDevLeadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateDevLeadModal(false)
              setSelectedDeveloperForLead(null)
              setSelectedDevTeamMembers([])
              setAlreadyAssignedDevMembers([])
              setDevLeadToggle(false)
              setDevLeadCreationStep(1)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">
                      Create Developer Team Lead
                    </h3>
                    <p className="text-indigo-100 text-sm mt-1">
                      {devLeadCreationStep === 1
                        ? 'Step 1: Select a developer to make team lead'
                        : 'Step 2: Assign team members'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateDevLeadModal(false)
                      setSelectedDeveloperForLead(null)
                      setSelectedDevTeamMembers([])
                      setAlreadyAssignedDevMembers([])
                      setDevLeadToggle(false)
                      setDevLeadCreationStep(1)
                    }}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {devLeadCreationStep === 1 ? (
                  /* Step 1: Select Developer */
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Developer
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Choose a developer to make a team lead. Team leads and developers assigned to any team lead cannot be selected.
                      </p>
                    </div>
                    <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                      {developerTeam.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {developerTeam
                            .filter((member) => {
                              const memberId = String(member.id || member._id)
                              const isTeamLead = member.isTeamLead === true
                              // Get all team lead IDs and assigned members
                              const teamLeadIds = getAllTeamLeadIds()
                              const assignedToLeads = getAssignedToOtherLeads()
                              // Exclude if: is team lead OR assigned to any team lead
                              const isAssignedToAnyLead = assignedToLeads.includes(memberId)
                              return !isTeamLead && !isAssignedToAnyLead
                            })
                            .map((member) => {
                              const memberId = member.id || member._id
                              const isSelected = selectedDeveloperForLead && (selectedDeveloperForLead.id || selectedDeveloperForLead._id) === memberId
                              const memberIdStr = String(memberId)
                              const assignedToLeads = getAssignedToOtherLeads()
                              const isAssignedToAnyLead = assignedToLeads.includes(memberIdStr)
                              const isTeamLead = member.isTeamLead === true

                              return (
                                <div
                                  key={memberId}
                                  className={`p-4 transition-colors ${isAssignedToAnyLead || isTeamLead
                                    ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                    : isSelected
                                      ? 'bg-indigo-50 border-l-4 border-indigo-500 cursor-pointer hover:bg-indigo-100'
                                      : 'cursor-pointer hover:bg-gray-50'
                                    }`}
                                  onClick={() => {
                                    if (!isAssignedToAnyLead && !isTeamLead) {
                                      handleSelectDeveloperForLead(member)
                                    } else {
                                      const reason = isTeamLead ? 'already a team lead' : 'assigned to another team lead'
                                      addToast({
                                        type: 'error',
                                        message: `${member?.name || 'This developer'} is ${reason}. Please remove them first.`
                                      })
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${isSelected ? 'bg-indigo-600' : isAssignedToAnyLead || isTeamLead ? 'bg-gray-300' : 'bg-gray-400'
                                        }`}>
                                        {member?.avatar || member?.name?.charAt(0) || 'D'}
                                      </div>
                                      <div>
                                        <p className={`text-sm font-semibold ${isAssignedToAnyLead || isTeamLead ? 'text-gray-500' : 'text-gray-900'}`}>
                                          {member?.name || 'Unknown Developer'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {member?.department || member?.email || 'Developer'}
                                        </p>
                                        {(isAssignedToAnyLead || isTeamLead) && (
                                          <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 mt-1">
                                            {isTeamLead ? 'Team Lead' : 'Assigned to team'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                                      ? 'bg-indigo-600 border-indigo-600'
                                      : 'border-gray-300'
                                      }`}>
                                      {isSelected && (
                                        <CheckCircle className="h-4 w-4 text-white" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No developers available
                        </div>
                      )}
                    </div>
                  </div>
                ) : devLeadCreationStep === 2 && selectedDeveloperForLead ? (
                  /* Step 2: Assign Team Members */
                  <div>
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {selectedDeveloperForLead?.avatar || selectedDeveloperForLead?.name?.charAt(0) || 'TL'}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-purple-900">Selected Team Lead</p>
                          <p className="text-xs text-purple-700">{selectedDeveloperForLead?.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Developer Lead Toggle Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Developer Team Lead
                        </label>
                        <button
                          type="button"
                          onClick={() => setDevLeadToggle(!devLeadToggle)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${devLeadToggle ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${devLeadToggle ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Team Members Dropdown - Only show when Developer Lead toggle is ON */}
                    {devLeadToggle && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Assign Team Members
                          </label>
                          <span className="text-xs text-gray-500 italic">
                            Team leads excluded
                          </span>
                        </div>
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span>Team leads and developers assigned to any team lead cannot be selected. Remove them from their current team first.</span>
                          </p>
                        </div>
                        <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                          {developerTeam.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                              {developerTeam
                                .filter((member) => {
                                  const memberId = member.id || member._id
                                  const selectedUserId = selectedDeveloperForLead?.id || selectedDeveloperForLead?._id
                                  const isTeamLead = member.isTeamLead === true
                                  // Check if member is assigned to another team lead
                                  const assignedToOtherLeads = getAssignedToOtherLeads(selectedUserId)
                                  const isAssignedToOtherLead = assignedToOtherLeads.includes(String(memberId))
                                  return String(memberId) !== String(selectedUserId) && !isTeamLead && !isAssignedToOtherLead
                                })
                                .map((member) => {
                                  const memberId = member.id || member._id
                                  const isSelected = selectedDevTeamMembers.includes(memberId)
                                  // Check if assigned to another team lead
                                  const selectedUserId = selectedDeveloperForLead?.id || selectedDeveloperForLead?._id
                                  const assignedToOtherLeads = getAssignedToOtherLeads(selectedUserId)
                                  const isAssignedToOtherLead = assignedToOtherLeads.includes(String(memberId))

                                  return (
                                    <div
                                      key={memberId}
                                      className={`p-3 transition-colors ${isAssignedToOtherLead
                                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                        : isSelected
                                          ? 'bg-indigo-50 border-l-4 border-indigo-500 cursor-pointer hover:bg-indigo-100'
                                          : 'cursor-pointer hover:bg-gray-50'
                                        }`}
                                      onClick={() => !isAssignedToOtherLead && handleDevTeamMemberToggle(memberId)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isSelected ? 'bg-indigo-600' : isAssignedToOtherLead ? 'bg-gray-300' : 'bg-gray-400'
                                            }`}>
                                            {member?.avatar || member?.name?.charAt(0) || 'D'}
                                          </div>
                                          <div>
                                            <p className={`text-sm font-semibold ${isAssignedToOtherLead ? 'text-gray-500' : 'text-gray-900'}`}>
                                              {member?.name || 'Unknown Member'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {member?.department || member?.email || 'Developer'}
                                            </p>
                                            {isAssignedToOtherLead && (
                                              <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 mt-1">
                                                Assigned to another lead
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                                          ? 'bg-indigo-600 border-indigo-600'
                                          : 'border-gray-300'
                                          }`}>
                                          {isSelected && (
                                            <CheckCircle className="h-4 w-4 text-white" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No team members available
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between space-x-3 border-t border-gray-200">
                {devLeadCreationStep === 2 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDevLeadCreationStep(1)
                      setSelectedDevTeamMembers([])
                    }}
                    disabled={assigningDevMembers}
                    className="px-4 py-2"
                  >
                    Back
                  </Button>
                )}
                <div className="flex space-x-3 ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!assigningDevMembers && !deletingTeamLead) {
                        setShowCreateDevLeadModal(false)
                        setSelectedDeveloperForLead(null)
                        setSelectedDevTeamMembers([])
                        setAlreadyAssignedDevMembers([])
                        setDevLeadToggle(false)
                        setDevLeadCreationStep(1)
                      }
                    }}
                    disabled={assigningDevMembers || deletingTeamLead}
                    className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                  {devLeadCreationStep === 1 ? (
                    <Button
                      onClick={() => {
                        if (assigningDevMembers || deletingTeamLead) return
                        if (selectedDeveloperForLead) {
                          setDevLeadCreationStep(2)
                        } else {
                          addToast({ type: 'error', message: 'Please select a developer first' })
                        }
                      }}
                      disabled={!selectedDeveloperForLead || assigningDevMembers || deletingTeamLead}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConfirmDevAssignment}
                      disabled={assigningDevMembers || deletingTeamLead || !devLeadToggle}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assigningDevMembers ? (
                        <span className="flex items-center">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </span>
                      ) : (
                        'Create Team Lead'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* View Team Members Modal */}
        {showTeamMembersModal && selectedTeamLeadForMembers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowTeamMembersModal(false)
              setSelectedTeamLeadForMembers(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Team Members</h3>
                    <p className="text-indigo-100 text-sm mt-1">
                      {selectedTeamLeadForMembers.name}'s team
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTeamMembersModal(false)
                      setSelectedTeamLeadForMembers(null)
                    }}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {(() => {
                  const teamMembers = selectedTeamLeadForMembers.teamMembers || []
                  const teamMemberCount = Array.isArray(teamMembers) ? teamMembers.length : 0

                  if (teamMemberCount === 0) {
                    return (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
                        <p className="text-gray-600">This team lead doesn't have any team members assigned yet.</p>
                        <Button
                          onClick={() => {
                            if (!assigningDevMembers && !deletingTeamLead) {
                              setShowTeamMembersModal(false)
                              handleAssignDevTeam(selectedTeamLeadForMembers)
                            }
                          }}
                          disabled={assigningDevMembers || deletingTeamLead}
                          className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Assign Team Members
                        </Button>
                      </div>
                    )
                  }

                  const teamMemberList = teamMembers.map(memberId => {
                    const member = developerTeam.find(m => {
                      const mId = m.id || m._id
                      const compareId = typeof memberId === 'object' ? (memberId._id || memberId.id) : memberId
                      return mId && compareId && String(mId) === String(compareId)
                    })
                    return member
                  }).filter(Boolean)

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-indigo-600" />
                          <span className="text-sm font-semibold text-indigo-900">Total Team Members</span>
                        </div>
                        <span className="text-lg font-bold text-indigo-600">{teamMemberCount}</span>
                      </div>

                      <div className="space-y-2">
                        {teamMemberList.map((member, index) => {
                          const memberId = member.id || member._id
                          return (
                            <div
                              key={memberId || index}
                              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                {member.avatar || member.name?.charAt(0) || 'M'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                                <p className="text-xs text-gray-600 truncate">{member.email}</p>
                                {member.department && (
                                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800 mt-1">
                                    {member.department}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {member.phone && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Phone className="h-3 w-3" />
                                    <span>{member.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!assigningDevMembers && !deletingTeamLead) {
                      setShowTeamMembersModal(false)
                      setSelectedTeamLeadForMembers(null)
                    }
                  }}
                  disabled={assigningDevMembers || deletingTeamLead}
                  className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </Button>
                {selectedTeamLeadForMembers && (selectedTeamLeadForMembers.teamMembers || []).length > 0 && (
                  <Button
                    onClick={() => {
                      if (!assigningDevMembers && !deletingTeamLead) {
                        setShowTeamMembersModal(false)
                        handleAssignDevTeam(selectedTeamLeadForMembers)
                      }
                    }}
                    disabled={assigningDevMembers || deletingTeamLead}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Team
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Assign Developer Team Modal */}
        {showAssignDevTeamModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAssignDevTeamModal(false)
              setSelectedUser(null)
              setSelectedDevTeamMembers([])
              setAlreadyAssignedDevMembers([])
              setDevLeadToggle(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">
                      Manage Developer Team Lead
                    </h3>
                    <p className="text-indigo-100 text-sm mt-1">
                      Update team lead and assigned members
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAssignDevTeamModal(false)
                      setSelectedUser(null)
                      setSelectedDevTeamMembers([])
                      setAlreadyAssignedDevMembers([])
                      setDevLeadToggle(false)
                    }}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Developer Lead Toggle Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Developer Team Lead
                    </label>
                    <button
                      type="button"
                      onClick={() => setDevLeadToggle(!devLeadToggle)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${devLeadToggle ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${devLeadToggle ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Team Members Dropdown - Only show when Developer Lead toggle is ON */}
                {devLeadToggle && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Assign Team Members
                      </label>
                      <span className="text-xs text-gray-500 italic">
                        Team leads excluded
                      </span>
                    </div>
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>Team leads cannot be added as team members.</span>
                      </p>
                    </div>
                    <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                      {developerTeam.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {developerTeam
                            .filter((member) => {
                              const memberId = member.id || member._id
                              const selectedUserId = selectedUser?.id || selectedUser?._id
                              const isTeamLead = member.isTeamLead === true
                              const isAlreadyAssigned = alreadyAssignedDevMembers.some(assignedId => {
                                const assignedIdStr = typeof assignedId === 'object' ? String(assignedId._id || assignedId.id) : String(assignedId)
                                return String(memberId) === assignedIdStr
                              })
                              // Check if member is assigned to another team lead
                              const assignedToOtherLeads = getAssignedToOtherLeads(selectedUserId)
                              const isAssignedToOtherLead = assignedToOtherLeads.includes(String(memberId))
                              return String(memberId) !== String(selectedUserId) && !isAlreadyAssigned && !isTeamLead && !isAssignedToOtherLead
                            })
                            .map((member) => {
                              const memberId = member.id || member._id
                              const isSelected = selectedDevTeamMembers.includes(memberId)
                              // Check if assigned to another team lead
                              const selectedUserId = selectedUser?.id || selectedUser?._id
                              const assignedToOtherLeads = getAssignedToOtherLeads(selectedUserId)
                              const isAssignedToOtherLead = assignedToOtherLeads.includes(String(memberId))

                              return (
                                <div
                                  key={memberId}
                                  className={`p-3 transition-colors ${isAssignedToOtherLead
                                    ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                    : isSelected
                                      ? 'bg-indigo-50 border-l-4 border-indigo-500 cursor-pointer hover:bg-indigo-100'
                                      : 'cursor-pointer hover:bg-gray-50'
                                    }`}
                                  onClick={() => !isAssignedToOtherLead && handleDevTeamMemberToggle(memberId)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isSelected ? 'bg-indigo-600' : isAssignedToOtherLead ? 'bg-gray-300' : 'bg-gray-400'
                                        }`}>
                                        {member?.avatar || member?.name?.charAt(0) || 'D'}
                                      </div>
                                      <div>
                                        <p className={`text-sm font-semibold ${isAssignedToOtherLead ? 'text-gray-500' : 'text-gray-900'}`}>
                                          {member?.name || 'Unknown Member'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {member?.department || member?.email || 'Developer'}
                                        </p>
                                        {isAssignedToOtherLead && (
                                          <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 mt-1">
                                            Assigned to another lead
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                                      ? 'bg-indigo-600 border-indigo-600'
                                      : 'border-gray-300'
                                      }`}>
                                      {isSelected && (
                                        <CheckCircle className="h-4 w-4 text-white" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No team members available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Already Assigned Members Display */}
                {alreadyAssignedDevMembers.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Already Assigned
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {alreadyAssignedDevMembers.map((memberId, index) => {
                        const member = developerTeam.find(m => {
                          const mId = m.id || m._id
                          const compareId = typeof memberId === 'object' ? (memberId._id || memberId.id) : memberId
                          return mId && compareId && String(mId) === String(compareId)
                        })
                        const memberName = member?.name || (typeof memberId === 'object' ? memberId.name : null) || `Member ${index + 1}`
                        const actualMemberId = typeof memberId === 'object' ? (memberId._id || memberId.id) : memberId
                        return (
                          <div
                            key={actualMemberId}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                          >
                            <span>{memberName}</span>
                            <button
                              onClick={() => {
                                setAlreadyAssignedDevMembers(prev => prev.filter(id => {
                                  const idStr = typeof id === 'object' ? String(id._id || id.id) : String(id)
                                  return idStr !== String(actualMemberId)
                                }))
                              }}
                              className="text-green-700 hover:text-green-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!assigningDevMembers && !deletingTeamLead) {
                      setShowAssignDevTeamModal(false)
                      setSelectedUser(null)
                      setSelectedDevTeamMembers([])
                      setAlreadyAssignedDevMembers([])
                      setDevLeadToggle(false)
                    }
                  }}
                  disabled={assigningDevMembers || deletingTeamLead}
                  className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDevAssignment}
                  disabled={assigningDevMembers || deletingTeamLead}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningDevMembers ? (
                    <span className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Admin_user_management
