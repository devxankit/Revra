import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { projectService } from '../../DEV-services/projectService'
import {
  FiFolder,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiUser,
  FiCheckCircle,
  FiClock,
  FiPlay,
  FiPause,
  FiTarget,
  FiTrendingUp,
  FiAlertCircle,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiArrowRight,
  FiSettings,
  FiPlus,
  FiEye,
  FiEdit
} from 'react-icons/fi'
import PM_navbar from '../../DEV-components/PM_navbar'
import PM_project_form from '../../DEV-components/PM_project_form'

const PM_new_projects = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('untouched')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false)
  const [selectedProjectForMeeting, setSelectedProjectForMeeting] = useState(null)
  const [selectedMeetingStatus, setSelectedMeetingStatus] = useState('pending')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [newProjects, setNewProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadNewProjects()
  }, [activeTab, selectedFilter, searchTerm])

  const loadNewProjects = async () => {
    setLoading(true)
    try {
      const response = await projectService.getNewProjects({
        status: activeTab !== 'all' ? activeTab : undefined,
        priority: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: searchTerm || undefined
      })

      if (response.success) {
        setNewProjects(response.data)
      }
    } catch (error) {
      console.error('Error loading new projects:', error)
      setError('Failed to load new projects')
      setNewProjects([])
    } finally {
      setLoading(false)
    }
  }

  const projectStatuses = [
    { value: 'untouched', label: 'Untouched', color: 'bg-gray-100 text-gray-800', icon: FiClock },
    { value: 'started', label: 'Acknowledged', color: 'bg-blue-100 text-blue-800', icon: FiCheckCircle },
    { value: 'in-progress', label: 'In Progress', color: 'bg-green-100 text-green-800', icon: FiTrendingUp },
    { value: 'milestone-complete', label: 'Milestone Complete', color: 'bg-purple-100 text-purple-800', icon: FiTarget },
    { value: 'project-complete', label: 'Project Complete', color: 'bg-emerald-100 text-emerald-800', icon: FiCheckCircle },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-orange-100 text-orange-800', icon: FiPause }
  ]

  const filters = [
    { id: 'all', label: 'All Projects' },
    { id: 'high', label: 'High Priority' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'normal', label: 'Normal Priority' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' }
  ]

  const filteredProjects = newProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = activeTab === 'all' || project.status === activeTab

    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'high' && project.priority === 'high') ||
      (selectedFilter === 'urgent' && project.priority === 'urgent') ||
      (selectedFilter === 'normal' && project.priority === 'normal')

    return matchesSearch && matchesStatus && matchesFilter
  })

  const getStatusInfo = (status) => {
    return projectStatuses.find(s => s.value === status) || projectStatuses[0]
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMeetingStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'done': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMeetingStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Meeting Pending'
      case 'done': return 'Meeting Done'
      default: return 'No Meeting'
    }
  }

  const meetingStatusOptions = [
    { value: 'pending', label: 'Meeting Pending', icon: FiClock },
    { value: 'done', label: 'Meeting Done', icon: FiCheckCircle }
  ]

  const handleEditProject = (projectId) => {
    const project = newProjects.find(p => (p._id || p.id) === projectId)
    if (project) {
      setEditingProject(project)
      setIsProjectFormOpen(true)
    }
  }

  const handleStartProject = async (projectId) => {
    try {
      setLoading(true)

      const response = await projectService.startProject(projectId)

      if (response.success) {
        // Update the project status in local state
        setNewProjects(prev =>
          prev.map(project =>
            (project._id || project.id) === projectId
              ? { ...project, status: 'started' }
              : project
          )
        )

        console.log('Project started successfully:', response.message)
      }
    } catch (error) {
      console.error('Error starting project:', error)
      setError('Failed to start project')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateProject = async (projectId, projectData) => {
    try {
      setLoading(true)

      const response = await projectService.activateProject(projectId, projectData)

      if (response.success) {
        // Remove from new projects (it's now active)
        setNewProjects(prev =>
          prev.filter(project => (project._id || project.id) !== projectId)
        )

        console.log('Project activated successfully:', response.message)
        setIsProjectFormOpen(false)
        setEditingProject(null)
      }
    } catch (error) {
      console.error('Error activating project:', error)
      setError('Failed to activate project')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (projectId) => {
    handleEditProject(projectId)
  }

  const handleCardClick = (project) => {
    if (project.status === 'started') {
      handleViewDetails(project._id || project.id)
    }
  }

  const handleProjectFormSubmit = async (formData) => {
    console.log('Project form submitted:', formData)

    if (editingProject) {
      // Check if project needs to be started first
      if (editingProject.status === 'untouched') {
        try {
          // First start the project
          const startResponse = await projectService.startProject(editingProject._id || editingProject.id)
          if (!startResponse.success) {
            throw new Error('Failed to start project')
          }

          // Update local state
          setNewProjects(prev =>
            prev.map(project =>
              (project._id || project.id) === (editingProject._id || editingProject.id)
                ? { ...project, status: 'started' }
                : project
            )
          )

          console.log('Project started successfully:', startResponse.message)

          // Then activate it
          await handleActivateProject(editingProject._id || editingProject.id, formData)
        } catch (error) {
          console.error('Error starting project:', error)
          setError('Failed to start project')
        }
      } else if (editingProject.status === 'started') {
        // This is project activation (started → active)
        await handleActivateProject(editingProject._id || editingProject.id, formData)
      }
    } else {
      // This is a new project creation
      console.log('Creating new project:', formData)
      setIsProjectFormOpen(false)
    }
  }

  const handleProjectFormClose = () => {
    setIsProjectFormOpen(false)
    setEditingProject(null)
  }

  const handleStartMeeting = (projectId) => {
    const project = newProjects.find(p => (p._id || p.id) === projectId)
    if (project) {
      setSelectedProjectForMeeting(project)
      setSelectedMeetingStatus('pending') // Set default to pending
      setIsDropdownOpen(false)
      setIsMeetingDialogOpen(true)
    }
  }

  const handleMeetingStatusUpdate = async () => {
    if (selectedProjectForMeeting) {
      try {
        setLoading(true)

        const response = await projectService.updateMeetingStatus(
          selectedProjectForMeeting._id || selectedProjectForMeeting.id,
          selectedMeetingStatus
        )

        if (response.success) {
          // Update the project in the local state
          setNewProjects(prev =>
            prev.map(project =>
              (project._id || project.id) === (selectedProjectForMeeting._id || selectedProjectForMeeting.id)
                ? { ...project, meetingStatus: selectedMeetingStatus }
                : project
            )
          )

          console.log('Meeting status updated successfully:', response.message)
        }
      } catch (error) {
        console.error('Error updating meeting status:', error)
        setError('Failed to update meeting status')
      } finally {
        setLoading(false)
      }
    }
    setIsMeetingDialogOpen(false)
    setSelectedProjectForMeeting(null)
    setSelectedMeetingStatus('pending')
    setIsDropdownOpen(false)
  }

  const handleMeetingDialogClose = () => {
    setIsMeetingDialogOpen(false)
    setSelectedProjectForMeeting(null)
    setSelectedMeetingStatus('pending')
    setIsDropdownOpen(false)
  }

  const handleStatusSelect = (status) => {
    setSelectedMeetingStatus(status)
    setIsDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.dropdown-container')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  // Mobile Project Card Component
  const MobileProjectCard = ({ project, ...motionProps }) => {
    const statusInfo = getStatusInfo(project.status)
    const StatusIcon = statusInfo.icon

    return (
      <motion.div
        className={`group h-full rounded-xl border border-teal-200 hover:border-teal-300 bg-white p-4 shadow-md hover:shadow-lg transition-shadow ${project.status === 'started' ? 'cursor-pointer' : ''}`}
        onClick={() => handleCardClick(project)}
        {...motionProps}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 ring-1 ring-teal-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7.5A1.5 1.5 0 014.5 6h5.379a1.5 1.5 0 011.06.44l1.621 1.62a1.5 1.5 0 001.06.44H19.5A1.5 1.5 0 0121 9v7.5A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5V7.5z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-black" title={project.name}>{project.name}</h3>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-black">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 19.5a7.5 7.5 0 0115 0" />
                </svg>
                <span className="truncate">Client: {project.client?.name || 'Unknown'}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3 text-teal-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span className="truncate">{project.client?.phoneNumber || project.client?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getMeetingStatusColor(project.meetingStatus)}`}>
              {getMeetingStatusLabel(project.meetingStatus)}
            </span>
          </div>
        </div>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-black" title={project.description}>{project.description}</p>
        )}

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-black">
            <span className="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Progress
            </span>
            <span className="font-medium">{project.progress || 0}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-teal-100">
            <div
              className="h-2 rounded-full bg-teal-500"
              style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Date Section */}
          <div className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3 text-teal-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3M3.75 8.25h16.5M5 21h14a2 2 0 002-2V8.25H3v10.75A2 2 0 005 21z" />
            </svg>
            <span className="font-medium whitespace-nowrap">Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 text-right">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStartMeeting(project._id || project.id)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-all duration-200"
              title="Meeting Status"
            >
              <FiUsers className="h-3.5 w-3.5" />
              <span>Meeting</span>
            </button>

            {project.status === 'started' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewDetails(project._id || project.id)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all duration-200"
                title="Complete Project Setup"
              >
                <span>Complete Setup</span>
                <FiArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartProject(project._id || project.id)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-all duration-200"
                  title="Acknowledge Project"
                >
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  <span>Acknowledge</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditProject(project._id || project.id)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 transition-all duration-200"
                  title="Edit/Setup Project"
                >
                  <FiEdit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // Desktop Project Card Component
  const DesktopProjectCard = ({ project, ...motionProps }) => {
    const statusInfo = getStatusInfo(project.status)
    const StatusIcon = statusInfo.icon

    return (
      <motion.div
        className={`group h-full rounded-xl border border-teal-200 hover:border-teal-300 bg-white p-6 shadow-md hover:shadow-lg transition-shadow ${project.status === 'started' ? 'cursor-pointer' : ''}`}
        onClick={() => handleCardClick(project)}
        {...motionProps}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 ring-1 ring-teal-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 text-teal-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7.5A1.5 1.5 0 014.5 6h5.379a1.5 1.5 0 011.06.44l1.621 1.62a1.5 1.5 0 001.06.44H19.5A1.5 1.5 0 0121 9v7.5A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5V7.5z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-black" title={project.name}>{project.name}</h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-black">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 19.5a7.5 7.5 0 0115 0" />
                </svg>
                <span className="truncate">Client: {project.client?.name || 'Unknown'}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span className="truncate">{project.client?.phoneNumber || project.client?.phone || 'N/A'}</span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  {project.package || 'Standard Package'}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getMeetingStatusColor(project.meetingStatus)}`}>
              {getMeetingStatusLabel(project.meetingStatus)}
            </span>
          </div>
        </div>

        {project.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-black" title={project.description}>{project.description}</p>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-black">
            <span className="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Progress
            </span>
            <span className="font-medium">{project.progress || 0}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-teal-100">
            <div
              className="h-2 rounded-full bg-teal-500"
              style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          {/* Date Section */}
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-full flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3M3.75 8.25h16.5M5 21h14a2 2 0 002-2V8.25H3v10.75A2 2 0 005 21z" />
            </svg>
            <span className="font-medium whitespace-nowrap">Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStartMeeting(project._id || project.id)
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl border border-orange-200 transition-all duration-200"
              title="Meeting Status"
            >
              <FiUsers className="h-4 w-4" />
              <span>Start Meeting</span>
            </button>

            {project.status === 'started' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewDetails(project._id || project.id)
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200 transition-all duration-200 shadow-sm hover:shadow"
                title="Complete Project Setup"
              >
                <span>Complete Setup</span>
                <FiArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartProject(project._id || project.id)
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl border border-teal-200 transition-all duration-200 shadow-sm hover:shadow"
                  title="Acknowledge Project"
                >
                  <FiCheckCircle className="h-4 w-4" />
                  <span>Acknowledge</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditProject(project._id || project.id)
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl border border-gray-200 transition-all duration-200"
                  title="Edit/Setup Project"
                >
                  <FiEdit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PM_navbar />

      <main className="max-w-7xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">

        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Simple Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="bg-teal-50 rounded-xl p-6 shadow-sm border border-teal-200/50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-teal-900 mb-2">New Projects</h1>
                <p className="text-teal-700 text-sm">Projects from sales team ready for development</p>
              </div>
            </div>
          </motion.div>

          {/* Status Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4"
          >
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('untouched')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'untouched'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Untouched
              </button>
              <button
                onClick={() => setActiveTab('started')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'started'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Acknowledged
              </button>
            </div>
          </motion.div>

          {/* Search & Filter */}
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
                placeholder="Search projects..."
                className="w-full pl-8 pr-12 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${showFilters
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
              className="flex flex-wrap gap-2 mb-4"
            >
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedFilter === filter.id
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
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
              Showing {filteredProjects.length} of {newProjects.length} projects
            </p>
          </motion.div>

          {/* Mobile Projects List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <MobileProjectCard
                  key={project._id || project.id || index}
                  project={project}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                />
              ))}
            </AnimatePresence>

            {/* Empty State */}
            {filteredProjects.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFolder className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No projects match your current filters.'}
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
                className="mb-8"
              >
                <div className="bg-teal-50 rounded-xl p-8 shadow-sm border border-teal-200/50">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-teal-900 mb-2">New Projects</h1>
                    <p className="text-teal-700">Projects from sales team ready for development</p>
                  </div>
                </div>
              </motion.div>

              {/* Desktop Status Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6"
              >
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setActiveTab('untouched')}
                    className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === 'untouched'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <FiClock className="h-4 w-4" />
                    <span>Untouched</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('started')}
                    className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === 'started'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <FiCheckCircle className="h-4 w-4" />
                    <span>Acknowledged</span>
                  </button>
                </div>
              </motion.div>

              {/* Desktop Search & Filters */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-6"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1 relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-600 text-xl" />
                    <input
                      type="text"
                      placeholder="Search by project name, client, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-16 py-4 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-lg"
                    />
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${showFilters
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-teal-200'
                        }`}
                    >
                      <FiFilter className="text-lg" />
                    </button>
                  </div>
                </div>

                {/* Filters - Conditional Display */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-wrap gap-2"
                  >
                    {filters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedFilter === filter.id
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>

              {/* Desktop Projects Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-4"
              >
                <AnimatePresence>
                  {filteredProjects.map((project, index) => (
                    <DesktopProjectCard
                      key={project._id || project.id || index}
                      project={project}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Empty State */}
              {filteredProjects.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FiFolder className="text-gray-400 text-3xl" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">No projects found</h3>
                    <p className="text-gray-600 text-lg">
                      {searchTerm ? 'Try adjusting your search criteria or filters.' : 'No projects match your current filters.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar - 4 columns */}
            <div className="col-span-4 space-y-6">

              {/* Project Status Flow */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 shadow-xl border border-teal-200/50"
              >
                <h3 className="text-lg font-bold text-teal-900 mb-4">Project Lifecycle</h3>

                <div className="space-y-3">
                  {projectStatuses.map((status, index) => {
                    const StatusIcon = status.icon
                    return (
                      <div key={status.value} className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status.color}`}>
                          <StatusIcon className="text-sm" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-teal-900">{status.label}</p>
                        </div>
                        {index < projectStatuses.length - 1 && (
                          <FiArrowRight className="text-teal-600 text-sm" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Stats Overview */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Project Statistics</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm font-medium">Total Projects</span>
                    <span className="text-gray-900 text-xl font-bold">{newProjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm font-medium">Untouched</span>
                    <span className="text-gray-900 text-xl font-bold">{newProjects.filter(p => p.status === 'untouched').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm font-medium">Acknowledged</span>
                    <span className="text-gray-900 text-xl font-bold">{newProjects.filter(p => p.status === 'started').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm font-medium">Total Value</span>
                    <span className="text-green-600 text-xl font-bold">₹{newProjects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}</span>
                  </div>
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
                    <FiPlus className="text-lg" />
                    <span>Create Project</span>
                  </button>

                  <button className="w-full bg-white text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                    <FiUsers className="text-lg" />
                    <span>Assign Team</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Project Form Dialog */}
      <PM_project_form
        isOpen={isProjectFormOpen}
        onClose={handleProjectFormClose}
        onSubmit={handleProjectFormSubmit}
        onAcknowledge={handleStartProject}
        projectData={editingProject}
      />

      {/* Meeting Dialog */}
      <AnimatePresence>
        {isMeetingDialogOpen && selectedProjectForMeeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={handleMeetingDialogClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiUsers className="text-orange-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Meeting Status</h3>
                <p className="text-gray-600 text-sm">
                  Update meeting status for <span className="font-semibold">{selectedProjectForMeeting.name}</span>
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Client:</span>
                    <span className="text-sm text-gray-900">{selectedProjectForMeeting.client?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Company:</span>
                    <span className="text-sm text-gray-900">{selectedProjectForMeeting.client?.companyName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Phone:</span>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-600">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span className="text-sm text-gray-900 font-mono">{selectedProjectForMeeting.client?.phoneNumber || selectedProjectForMeeting.client?.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Current Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMeetingStatusColor(selectedProjectForMeeting.meetingStatus)}`}>
                      {getMeetingStatusLabel(selectedProjectForMeeting.meetingStatus)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Meeting Status:</label>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-all duration-200 hover:border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    >
                      <span className="flex items-center space-x-3">
                        {selectedMeetingStatus === 'pending' ? (
                          <FiClock className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <FiCheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        <span>{getMeetingStatusLabel(selectedMeetingStatus)}</span>
                      </span>
                      <FiArrowRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                        >
                          <div className="max-h-48 overflow-y-auto">
                            {meetingStatusOptions.map((option, index) => (
                              <motion.button
                                key={option.value}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                type="button"
                                onClick={() => handleStatusSelect(option.value)}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-150 hover:bg-gray-50 ${selectedMeetingStatus === option.value ? 'bg-teal-50 text-teal-700' : ''
                                  }`}
                              >
                                <span className="flex items-center space-x-3">
                                  <option.icon className={`h-4 w-4 ${option.value === 'pending' ? 'text-yellow-600' : 'text-green-600'}`} />
                                  <span>{option.label}</span>
                                </span>
                                {selectedMeetingStatus === option.value && (
                                  <FiCheckCircle className="h-4 w-4 text-teal-600" />
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleMeetingDialogClose}
                  className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>

                <button
                  onClick={handleMeetingStatusUpdate}
                  className="w-full bg-teal-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-teal-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <FiCheckCircle className="text-lg" />
                  <span>Confirm Status</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PM_new_projects
