import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiSearch, 
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiClock,
  FiUser,
  FiX,
  FiMapPin,
  FiVideo,
  FiPhone,
  FiFilter,
  FiCheckCircle
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import { salesMeetingsService } from '../SL-services'
import { salesLeadService } from '../SL-services'

const SL_meetings = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showMeetingTypeDropdown, setShowMeetingTypeDropdown] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [meetingForm, setMeetingForm] = useState({
    clientName: '',
    meetingDate: '',
    meetingTime: '',
    meetingType: 'in-person',
    location: '',
    notes: '',
    assigneeId: ''
  })

  const [meetings, setMeetings] = useState([])
  const [stats, setStats] = useState({ total: 0, today: 0, upcoming: 0 })
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const filters = [
    { id: 'all', label: 'All Meetings' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'scheduled', label: 'Scheduled' }
  ]

  const meetingTypes = [
    { id: 'in-person', label: 'In-Person', icon: FiMapPin },
    { id: 'video', label: 'Video Call', icon: FiVideo },
    { id: 'phone', label: 'Phone Call', icon: FiPhone }
  ]

  const [salesTeam, setSalesTeam] = useState([])

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      const [res, cl, team] = await Promise.all([
        salesMeetingsService.list({ search: searchTerm, filter: selectedFilter }),
        salesMeetingsService.getMyConvertedClients(),
        salesLeadService.getSalesTeam()
      ])
      setMeetings(res?.items || [])
      setStats(res?.stats || { total: 0, today: 0, upcoming: 0 })
      setClients(Array.isArray(cl) ? cl : [])
      setSalesTeam(Array.isArray(team) ? team : [])
    } catch (e) {
      console.error('Fetch meetings failed', e)
      // Set empty arrays on error
      setMeetings([])
      setClients([])
      setSalesTeam([])
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => { fetchMeetings() }, [searchTerm, selectedFilter])

  const filteredMeetings = meetings

  const getMeetingTypeIcon = (type) => {
    const typeObj = meetingTypes.find(t => t.id === type)
    return typeObj ? typeObj.icon : FiMapPin
  }

  const getMeetingTypeColor = (type) => {
    if (type === 'video') return 'text-blue-600'
    if (type === 'phone') return 'text-purple-600'
    return 'text-green-600'
  }

  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-700 border-green-300'
    if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-300'
    return 'bg-blue-100 text-blue-700 border-blue-300'
  }

  const getStatusLabel = (status) => {
    if (status === 'completed') return 'Completed'
    if (status === 'cancelled') return 'Cancelled'
    return 'Scheduled'
  }

  const handleMarkAsCompleted = async (meetingId) => {
    try {
      await salesMeetingsService.update(meetingId, { status: 'completed' })
      fetchMeetings()
    } catch (e) {
      console.error('Mark as completed failed', e)
    }
  }

  const handleAddMeeting = async () => {
    setEditingMeeting(null)
    setMeetingForm({
      clientName: '',
      meetingDate: '',
      meetingTime: '',
      meetingType: 'in-person',
      location: '',
      notes: '',
      assigneeId: ''
    })
    // Refresh clients list when opening dialog
    try {
      const cl = await salesMeetingsService.getMyConvertedClients()
      setClients(Array.isArray(cl) ? cl : [])
    } catch (e) {
      console.error('Failed to fetch clients:', e)
      setClients([])
    }
    setShowMeetingDialog(true)
  }

  const handleEditMeeting = (meeting) => {
    setEditingMeeting(meeting)
    const meetingDateNorm = meeting.meetingDate
      ? new Date(meeting.meetingDate).toISOString().split('T')[0]
      : ''
    setMeetingForm({
      clientName: meeting.client?.name || meeting.clientName || '',
      meetingDate: meetingDateNorm,
      meetingTime: meeting.meetingTime || '',
      meetingType: meeting.meetingType || 'in-person',
      location: meeting.location || '',
      notes: meeting.notes || '',
      assigneeId: meeting.assignee?._id || meeting.assignee || ''
    })
    setShowMeetingDialog(true)
  }

  const handleMeetingFormChange = (field, value) => {
    setMeetingForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveMeeting = async () => {
    if (!meetingForm.clientName.trim() || !meetingForm.meetingDate || !meetingForm.meetingTime) return
    try {
    const payload = {
        client: clients.find(c => c.name === meetingForm.clientName)?._id,
        meetingDate: meetingForm.meetingDate,
        meetingTime: meetingForm.meetingTime,
        meetingType: meetingForm.meetingType,
        location: meetingForm.location,
        notes: meetingForm.notes,
      assignee: meetingForm.assigneeId
      }
      if (editingMeeting) {
        await salesMeetingsService.update(editingMeeting._id || editingMeeting.id, payload)
      } else {
        await salesMeetingsService.create(payload)
      }
      setShowMeetingDialog(false)
      setEditingMeeting(null)
      fetchMeetings()
    } catch (e) {
      console.error('Save meeting failed', e)
    }
  }

  const handleDeleteMeeting = async (meetingId) => {
    try {
      await salesMeetingsService.remove(meetingId)
      fetchMeetings()
    } catch (e) {
      console.error('Delete meeting failed', e)
    }
  }

  const handleCloseDialog = () => {
    setShowMeetingDialog(false)
    setEditingMeeting(null)
    setShowClientDropdown(false)
    setShowMeetingTypeDropdown(false)
    setShowAssigneeDropdown(false)
  }

  const handleClientSelect = (client) => {
    setMeetingForm(prev => ({ ...prev, clientName: client }))
    setShowClientDropdown(false)
  }

  const handleMeetingTypeSelect = (type) => {
    setMeetingForm(prev => ({ ...prev, meetingType: type }))
    setShowMeetingTypeDropdown(false)
  }

  const handleAssigneeSelect = (assignee) => {
    setMeetingForm(prev => ({ ...prev, assigneeId: assignee }))
    setShowAssigneeDropdown(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const getMeetingDateStr = (m) => m.meetingDate ? new Date(m.meetingDate).toISOString().split('T')[0] : ''
  const computedStats = {
    total: meetings.length,
    today: meetings.filter(m => getMeetingDateStr(m) === todayStr).length,
    upcoming: meetings.filter(m => getMeetingDateStr(m) >= todayStr && m.status !== 'completed').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-20">

        {/* Summary Card */}
        <div className="bg-teal-500 rounded-xl p-4 mb-4 text-white">
          <div className="flex items-center justify-between">
            {/* Left Section - Info (Smaller) */}
            <div className="flex-1">
              {/* Total Meetings */}
              <div className="mb-3">
                <h2 className="text-xs font-medium mb-1 opacity-90">Total Meetings</h2>
                <p className="text-lg font-bold">{computedStats.total}</p>
              </div>
              
              {/* Status Breakdown */}
              <div className="flex items-center space-x-4">
                {/* Today */}
                <div className="text-center">
                  <p className="text-sm font-bold mb-1">{computedStats.today}</p>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full"></div>
                    <span className="text-xs opacity-80">Today</span>
                  </div>
                </div>
                
                {/* Upcoming */}
                <div className="text-center">
                  <p className="text-sm font-bold mb-1">{computedStats.upcoming}</p>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                    <span className="text-xs opacity-80">Upcoming</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Section - Add Button (Highlighted) */}
            <div className="ml-4">
              <button
                onClick={handleAddMeeting}
                className="flex items-center space-x-2 bg-white text-teal-500 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-lg font-semibold"
              >
                <FiPlus className="text-base" />
                <span className="text-sm font-semibold">Add Meeting</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar with Filter Icon */}
        <div className="relative mb-4">
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedFilter === filter.id
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Meetings List */}
        <div className="space-y-3">
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-12">
              <FiCalendar className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No meetings found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            filteredMeetings.map((meeting, index) => {
              const TypeIcon = getMeetingTypeIcon(meeting.meetingType)
              const meetingId = meeting.id || meeting._id || `meeting-${index}`
              return (
                <div
                  key={meetingId}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    {/* Left Section - Meeting Info */}
                    <div className="flex-1 min-w-0">
                      {/* Client Name and Status */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base leading-tight">
                            {meeting.clientName || meeting.client?.name || 'Unknown Client'}
                          </h3>
                          {/* Status Badge */}
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(meeting.status || 'scheduled')}`}>
                              {meeting.status === 'completed' && <FiCheckCircle className="w-3 h-3 mr-1" />}
                              {getStatusLabel(meeting.status || 'scheduled')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {meeting.status !== 'completed' && (
                            <button
                              onClick={() => handleMarkAsCompleted(meeting.id || meeting._id)}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-200"
                              title="Mark as Completed"
                            >
                              <FiCheckCircle className="text-sm" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditMeeting(meeting)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                            title="Edit Meeting"
                          >
                            <FiEdit2 className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteMeeting(meeting.id || meeting._id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                            title="Delete Meeting"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>

                      {/* Meeting Time */}
                      <div className="flex items-center space-x-2 mb-2">
                        <FiClock className="text-gray-500 text-sm" />
                        <span className="text-sm text-gray-600 font-medium">{meeting.meetingTime}</span>
                      </div>

                      {/* Meeting Type and Location */}
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-1 ${getMeetingTypeColor(meeting.meetingType)}`}>
                          <TypeIcon className="text-sm" />
                          <span className="text-xs font-medium capitalize">{meeting.meetingType}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <FiMapPin className="text-sm" />
                          <span className="text-xs">{meeting.location}</span>
                        </div>
                      </div>

                      {/* Assignee */}
                      {meeting.assignee && (
                        <div className="flex items-center space-x-1 text-gray-600 mt-2">
                          <FiUser className="text-sm" />
                          <span className="text-xs">Assigned to: {typeof meeting.assignee === 'string' ? meeting.assignee : (meeting.assignee?.name || 'Unknown')}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {meeting.notes && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Meeting Dialog */}
        {showMeetingDialog && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseDialog()
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg mx-4 sm:mx-0 shadow-2xl max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    {editingMeeting ? 'Edit Meeting' : 'Add New Meeting'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {editingMeeting ? 'Update meeting details' : 'Schedule a new meeting with your client'}
                  </p>
                </div>
                <button
                  onClick={handleCloseDialog}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 flex-shrink-0 ml-2"
                >
                  <FiX className="text-lg sm:text-xl text-gray-600" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4 sm:space-y-5">
                {/* Client Name */}
                <div className="relative z-10">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client Name *
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowClientDropdown(!showClientDropdown)
                      setShowMeetingTypeDropdown(false)
                      setShowAssigneeDropdown(false)
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-left flex items-center justify-between bg-white text-sm sm:text-base"
                  >
                    <span className="text-gray-900 truncate">
                      {meetingForm.clientName || 'Select Client'}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                        showClientDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Client Dropdown */}
                  {showClientDropdown && (
                    <div
                      className="absolute z-[9999] w-full mt-1 bg-white border-2 border-teal-500 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                      style={{ top: '100%', left: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        {!clients || !Array.isArray(clients) || clients.length === 0 ? (
                          <div className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-500 text-center">
                            <p>No converted clients found</p>
                            <p className="text-xs mt-1">Convert a lead to client first</p>
                          </div>
                        ) : (
                          clients.map((client, index) => {
                            const clientId = client._id || client.id || `client-${index}`
                            const clientName = client.name || client.Name || 'Unknown Client'
                            return (
                              <button
                                key={clientId}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleClientSelect(clientName)
                                }}
                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 transition-colors duration-200 text-sm sm:text-base border-b border-gray-100 last:border-b-0 ${
                                  meetingForm.clientName === clientName ? 'bg-teal-50 text-teal-700' : 'text-gray-900'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <FiUser className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium truncate">{clientName}</span>
                                  {client.companyName && (
                                    <span className="text-xs text-gray-500 truncate">({client.companyName})</span>
                                  )}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Meeting Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Meeting Date *
                    </label>
                    <input
                      type="date"
                      value={meetingForm.meetingDate}
                      onChange={(e) => handleMeetingFormChange('meetingDate', e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-sm sm:text-base"
                    />
                  </div>

                  {/* Meeting Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Meeting Time *
                    </label>
                    <input
                      type="time"
                      value={meetingForm.meetingTime}
                      onChange={(e) => handleMeetingFormChange('meetingTime', e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Assignee */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assignee
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssigneeDropdown(!showAssigneeDropdown)
                      setShowClientDropdown(false)
                      setShowMeetingTypeDropdown(false)
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-left flex items-center justify-between bg-white text-sm sm:text-base"
                  >
                    <div className="flex items-center space-x-2">
                      <FiUser className="text-sm text-gray-600" />
                      <span className="text-gray-900">
                        {(salesTeam.find(u => u._id === meetingForm.assigneeId)?.name) || 'Select Assignee'}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                        showAssigneeDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Assignee Dropdown */}
                  {showAssigneeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg"
                    >
                      <div className="py-1">
                        {salesTeam.map((member) => (
                          <button
                            key={member._id}
                            type="button"
                            onClick={() => handleAssigneeSelect(member._id)}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base ${
                              meetingForm.assigneeId === member._id ? 'bg-teal-50 text-teal-700' : 'text-gray-900'
                            }`}
                          >
                            <FiUser className="text-sm flex-shrink-0" />
                            <span className="font-medium">{member.name}</span>
                            {meetingForm.assigneeId === member._id && (
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-auto text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Meeting Type */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meeting Type
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMeetingTypeDropdown(!showMeetingTypeDropdown)
                      setShowClientDropdown(false)
                      setShowAssigneeDropdown(false)
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-left flex items-center justify-between bg-white text-sm sm:text-base"
                  >
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const selectedType = meetingTypes.find(t => t.id === meetingForm.meetingType)
                        const Icon = selectedType ? selectedType.icon : FiMapPin
                        return (
                          <>
                            <Icon className="text-sm text-gray-600" />
                            <span className="text-gray-900">
                              {selectedType ? selectedType.label : 'Select Meeting Type'}
                            </span>
                          </>
                        )
                      })()}
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                        showMeetingTypeDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Meeting Type Dropdown */}
                  {showMeetingTypeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg"
                    >
                      <div className="py-1">
                        {meetingTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => handleMeetingTypeSelect(type.id)}
                              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base ${
                                meetingForm.meetingType === type.id ? 'bg-teal-50 text-teal-700' : 'text-gray-900'
                              }`}
                            >
                              <Icon className="text-sm flex-shrink-0" />
                              <span className="font-medium">{type.label}</span>
                              {meetingForm.meetingType === type.id && (
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-auto text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={meetingForm.location}
                    onChange={(e) => handleMeetingFormChange('location', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-sm sm:text-base"
                    placeholder="Enter meeting location or link"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={meetingForm.notes}
                    onChange={(e) => handleMeetingFormChange('notes', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none text-sm sm:text-base"
                    rows={3}
                    placeholder="Add meeting notes or agenda..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mt-6 sm:mt-8">
                <button
                  onClick={handleCloseDialog}
                  className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeeting}
                  disabled={!meetingForm.clientName.trim() || !meetingForm.meetingDate || !meetingForm.meetingTime}
                  className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium text-sm sm:text-base"
                >
                  {editingMeeting ? 'Update Meeting' : 'Add Meeting'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SL_meetings
