import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  FiPhone,
  FiPlus,
  FiUser,
  FiSave,
  FiMessageCircle,
  FiEdit3,
  FiPlay,
  FiX,
  FiArrowLeft,
  FiCheck,
  FiRefreshCw,
  FiFolder,
  FiCalendar,
  FiFileText,
  FiImage,
  FiUpload,
  FiClock,
  FiSend,
  FiMapPin,
  FiVideo
} from 'react-icons/fi'
import { FaRupeeSign } from 'react-icons/fa'
import SL_navbar from '../SL-components/SL_navbar'
import FollowUpDialog from '../SL-components/FollowUpDialog'
import { salesLeadService } from '../SL-services'
import { salesMeetingsService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'
import { salesPaymentsService } from '../SL-services'
import SalesProjectConversionDialog from '../SL-components/SalesProjectConversionDialog'

const SL_leadProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // State management
  const [lead, setLead] = useState(null)
  const [leadProfile, setLeadProfile] = useState(null)
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState({
    quotationSent: false,
    web: false,
    hotLead: false,
    demoSent: false,
    app: false,
    taxi: false
  })
  const [showConvertedDialog, setShowConvertedDialog] = useState(false)
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [showRequestDemoDialog, setShowRequestDemoDialog] = useState(false)
  const [showLostDialog, setShowLostDialog] = useState(false)
  // Form states
  const [convertedForm, setConvertedForm] = useState({
    projectName: '',
    projectType: { web: false, app: false, taxi: false },
    estimatedBudget: '',
    startDate: '',
    description: ''
  })
  const [requestDemoForm, setRequestDemoForm] = useState({
    clientName: '',
    description: '',
    reference: '',
    mobileNumber: ''
  })
  const [demoData, setDemoData] = useState({
    clientName: '',
    mobileNumber: '',
    description: '',
    reference: ''
  })
  const [conversionData, setConversionData] = useState({
    projectName: '',
    projectType: { web: false, app: false, taxi: false },
    totalCost: '',
    finishedDays: '',
    advanceReceived: '',
    advanceAccount: '',
    includeGST: false,
    clientDateOfBirth: '',
    description: '',
    screenshot: null
  })
  const [showGSTConfirmModal, setShowGSTConfirmModal] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [selectedTransferPerson, setSelectedTransferPerson] = useState('')
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [showMeetingTypeDropdown, setShowMeetingTypeDropdown] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [projectCategoryId, setProjectCategoryId] = useState('')
  const [meetingForm, setMeetingForm] = useState({
    clientName: '',
    meetingDate: '',
    meetingTime: '',
    meetingType: 'in-person',
    location: '',
    notes: '',
    assignee: ''
  })

  // Additional state for new features
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState([])
  const [salesTeam, setSalesTeam] = useState([])
  const [myClients, setMyClients] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [accounts, setAccounts] = useState([])
  const [showConnectedForm, setShowConnectedForm] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    businessName: '',
    categoryId: '',
    estimatedPrice: '50000',
    description: '',
    quotationSent: false,
    demoSent: false
  })

  // Fetch lead data on component mount
  useEffect(() => {
    if (id) {
      fetchLeadData()
    }
  }, [id])

  useEffect(() => {
    const loadAux = async () => {
      try {
        const team = await salesLeadService.getSalesTeam()
        setSalesTeam(team || [])
        const cl = await salesMeetingsService.getMyConvertedClients()
        setMyClients(cl || [])
        const cats = await salesLeadService.getLeadCategories()
        setCategories(cats || [])
        const accs = await salesPaymentsService.getAccounts()
        setAccounts(accs || [])
      } catch (e) {
        // ignore
      }
    }
    loadAux()
  }, [])

  const fetchLeadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await salesLeadService.getLeadDetail(id)
      if (response) {
        setLead(response)
        setLeadProfile(response.leadProfile)
        setSelectedStatus(response.status)

        // Update form data with lead information
        const lp = response.leadProfile

        // Update status checkboxes based on lead status and profile data
        updateStatusFromLeadStatus(response.status, lp)
        // Project Type = Category (preferred)
        const leadCategoryId = (response.category?._id ?? response.category ?? lp?.category?._id ?? lp?.category)
        const leadCategoryIdStr = leadCategoryId ? String(leadCategoryId) : ''
        setProjectCategoryId(leadCategoryIdStr)
        setDemoData({
          clientName: lp?.name || response.name || '',
          mobileNumber: response.phone || '',
          description: '',
          reference: ''
        })

        setConversionData({
          projectName: lp?.businessName || '',
          categoryId: leadCategoryIdStr,
          projectType: (lp?.projectType && typeof lp.projectType === 'object')
            ? { web: !!lp.projectType.web, app: !!lp.projectType.app, taxi: !!lp.projectType.taxi }
            : { web: false, app: false, taxi: false },
          totalCost: lp?.estimatedCost?.toString() || '',
          finishedDays: '',
          clientDateOfBirth: '',
          advanceReceived: '',
          advanceAccount: '',
          includeGST: false,
          description: lp?.description || '',
          screenshot: null
        })

        setMeetingForm(prev => ({
          ...prev,
          clientName: lp?.name || response.name || ''
        }))

        // Set notes if available
        if (lp?.notes) {
          setNotes(lp.notes)
        }
      } else {
        setError('Lead not found')
      }
    } catch (err) {
      console.error('Error fetching lead data:', err)
      setError('Failed to fetch lead data')
      toast.error('Failed to load lead profile')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatusFromLeadStatus = (leadStatus, leadProfileData) => {
    // Initialize with all false
    const newStatus = {
      quotationSent: false,
      web: false,
      hotLead: false,
      demoSent: false,
      app: false,
      taxi: false
    }

    // Set status flags from leadProfile (can be multiple)
    if (leadProfileData) {
      newStatus.quotationSent = leadProfileData.quotationSent || false
      newStatus.demoSent = leadProfileData.demoSent || false

      // Set project type from leadProfile (only one at a time)
      if (leadProfileData.projectType) {
        newStatus.web = leadProfileData.projectType.web || false
        newStatus.app = leadProfileData.projectType.app || false
        newStatus.taxi = leadProfileData.projectType.taxi || false
      }
    }

    // Set status flags based on lead status
    // Hot Lead: if status is 'hot', always set hotLead to true
    if (leadStatus === 'hot') {
      newStatus.hotLead = true
    }
    // Quotation Sent: if status is 'quotation_sent', set quotationSent flag
    if (leadStatus === 'quotation_sent') {
      newStatus.quotationSent = true
    }
    // Demo Sent: if status is 'demo_requested', set demoSent flag
    if (leadStatus === 'demo_requested') {
      newStatus.demoSent = true
    }

    // Set project type based on lead status (if not already set from profile)
    if (leadStatus === 'web' && !newStatus.web && !newStatus.app && !newStatus.taxi) {
      newStatus.web = true
    } else if (leadStatus === 'app_client' && !newStatus.app && !newStatus.web && !newStatus.taxi) {
      newStatus.app = true
    } else if (leadStatus === 'taxi' && !newStatus.taxi && !newStatus.web && !newStatus.app) {
      newStatus.taxi = true
    }

    setStatus(newStatus)
  }

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const handleWhatsApp = (phone) => {
    const clientName = leadProfile?.name || lead?.name || 'there'
    const message = encodeURIComponent(`Hello ${clientName}! I'm following up on our previous conversation. How can I help you today?`)
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank')
  }

  const handleStatusChange = (statusKey) => {
    setStatus(prev => {
      const newStatus = { ...prev }

      // Status flags (quotationSent, demoSent, hotLead) can be multiple - checkbox behavior
      newStatus[statusKey] = !prev[statusKey] // Toggle

      return newStatus
    })
  }

  const handleSave = async () => {
    if (!lead) return

    setIsLoading(true)
    try {
      // Determine primary lead status based on priority:
      // 1. Hot Lead takes highest priority (it's a status, not just a flag)
      // 2. Then project type = category (App/Web mapping where applicable)
      // 3. Then status flags (quotation_sent, demo_requested)
      // 4. Default to 'connected'
      // Note: quotationSent and demoSent are stored as flags in leadProfile, allowing leads to appear in multiple pages
      let newLeadStatus = 'connected'

      if (status.hotLead) {
        // Hot lead is a status - takes priority over everything else
        newLeadStatus = 'hot'
      } else {
        // Map category name -> legacy status pages (keeps existing Sales tabs working)
        const selectedCat = categories.find(cat => String(cat._id) === String(projectCategoryId))
        const catName = (selectedCat?.name || '').toLowerCase()
        if (catName.includes('web')) {
          newLeadStatus = 'web'
        } else if (catName.includes('app')) {
          newLeadStatus = 'app_client'
        } else if (status.quotationSent) {
          newLeadStatus = 'quotation_sent'
        } else if (status.demoSent) {
          newLeadStatus = 'demo_requested'
        }
      }

      // Update lead status (this determines which status-specific page the lead appears on)
      // But quotationSent and demoSent flags allow leads to appear in multiple pages
      // Always update status to ensure Hot Lead and other statuses are properly saved
      if (newLeadStatus !== lead.status) {
        await salesLeadService.updateLeadStatus(id, newLeadStatus)
        setSelectedStatus(newLeadStatus)

        // Update the lead object locally
        setLead(prev => ({ ...prev, status: newLeadStatus }))
      }

      // Always update leadProfile with status flags and project type
      // This allows leads to appear in multiple pages (quotation_sent, demo_sent) based on flags
      if (leadProfile) {
        const selectedCat = categories.find(cat => String(cat._id) === String(projectCategoryId))
        const catName = (selectedCat?.name || '').toLowerCase()
        const legacyProjectType = {
          web: catName.includes('web'),
          app: catName.includes('app'),
          taxi: catName.includes('taxi')
        }
        const profileUpdateData = {
          quotationSent: status.quotationSent,
          demoSent: status.demoSent,
          // Project Type = Category (preferred)
          categoryId: projectCategoryId || undefined,
          // Keep legacy field updated for older logic
          projectType: legacyProjectType
        }
        await salesLeadService.updateLeadProfile(id, profileUpdateData)
      } else {
        // If no profile exists, we need to create one or at least update the lead
        // For now, just update the status flags if possible
        toast.error('Lead profile is required to set status flags. Please create a profile first.')
      }

      toast.success('Status updated successfully')

      // Refresh dashboard stats if available
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Failed to update status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFollow = () => {
    setShowFollowUpDialog(true)
  }

  const handleFollowUpSubmit = async (followUpData) => {
    setIsLoading(true)
    try {
      // Convert FollowUpDialog format (followupDate/followupTime) to API format (date/time)
      const followUpPayload = {
        date: followUpData.followupDate,
        time: followUpData.followupTime,
        notes: followUpData.notes || '',
        priority: followUpData.priority || 'medium'
      }

      // Use addFollowUp instead of updateLeadStatus to avoid changing lead status
      const updatedLead = await salesLeadService.addFollowUp(id, followUpPayload)

      // Update local state with the response data instead of full refresh
      if (updatedLead) {
        setLead(updatedLead)
        if (updatedLead.leadProfile) {
          setLeadProfile(updatedLead.leadProfile)
        }
      }

      toast.success('Follow-up scheduled successfully')
      setShowFollowUpDialog(false)

      // Refresh dashboard stats if available (non-blocking)
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }
    } catch (err) {
      console.error('Error scheduling follow-up:', err)
      toast.error('Failed to schedule follow-up')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = () => {
    setShowNotesDialog(true)
  }

  const handleAddNoteSubmit = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note')
      return
    }

    setIsLoading(true)
    try {
      await salesLeadService.addNoteToLead(id, { content: newNote.trim() })

      toast.success('Note added successfully')
      setShowNotesDialog(false)
      setNewNote('')

      // Refresh data to get updated notes
      fetchLeadData()
    } catch (err) {
      console.error('Error adding note:', err)
      toast.error('Failed to add note')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestDemo = () => {
    setShowRequestDemoDialog(true)
  }

  const handleRequestDemoFormChange = (field, value) => {
    setRequestDemoForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleRequestDemoSubmit = async () => {
    if (!demoData.clientName || !demoData.mobileNumber) {
      toast.error('Please fill in client name and mobile number')
      return
    }

    setIsLoading(true)
    try {
      const demoRequestData = {
        clientName: demoData.clientName,
        description: demoData.description,
        reference: demoData.reference,
        mobileNumber: demoData.mobileNumber
      }

      await salesLeadService.requestDemo(id, demoRequestData)

      toast.success('Demo request submitted successfully')
      setShowRequestDemoDialog(false)

      // Reset form
      setDemoData({
        clientName: leadProfile?.name || lead?.name || '',
        mobileNumber: lead?.phone || '',
        description: '',
        reference: ''
      })

      // Refresh data
      fetchLeadData()
    } catch (err) {
      console.error('Error submitting demo request:', err)
      toast.error('Failed to submit demo request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseRequestDemoDialog = () => {
    setShowRequestDemoDialog(false)
  }

  const handleLost = () => {
    // Pre-fill lost reason if lead is already lost
    if (lead && lead.status === 'lost' && lead.lostReason) {
      setLostReason(lead.lostReason)
    }
    setShowLostDialog(true)
  }

  const handleLostSubmit = async () => {
    setIsLoading(true)
    try {
      // Check if lead is already lost
      if (lead && lead.status === 'lost') {
        // Lead is already lost, just update the reason if needed
        toast.info('Lead is already marked as lost')
        setShowLostDialog(false)
        setLostReason('')
        setIsLoading(false)
        return
      }

      const lostData = {
        lostReason: lostReason.trim() || 'No reason provided'
      }

      await salesLeadService.updateLeadStatus(id, 'lost', lostData)

      toast.success('Lead marked as lost')
      setShowLostDialog(false)
      setLostReason('')

      // Refresh data
      fetchLeadData()
    } catch (err) {
      console.error('Error marking lead as lost:', err)
      toast.error('Failed to mark lead as lost')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseLostDialog = () => {
    setShowLostDialog(false)
    setLostReason('')
  }

  // Fetch sales team when transfer dialog opens
  const handleTransferClient = async () => {
    try {
      const team = await salesLeadService.getSalesTeam()
      setSalesTeam(team)
      setShowTransferDialog(true)
    } catch (err) {
      console.error('Error fetching sales team:', err)
      toast.error('Failed to load sales team')
    }
  }

  const handleTransferSubmit = async () => {
    if (!selectedTransferPerson) {
      toast.error('Please select a person to transfer to')
      return
    }

    setIsLoading(true)
    try {
      const transferData = {
        toSalesId: selectedTransferPerson,
        reason: 'Transferred from lead profile'
      }

      await salesLeadService.transferLead(id, transferData)

      toast.success('Lead transferred successfully')
      setShowTransferDialog(false)
      setSelectedTransferPerson('')

      // Navigate back to leads list
      navigate('/leads')
    } catch (err) {
      console.error('Error transferring lead:', err)
      toast.error('Failed to transfer lead')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseTransferDialog = () => {
    setShowTransferDialog(false)
    setSelectedTransferPerson('')
  }

  // Mock list of people to transfer to
  const transferPeople = [
    { id: 1, name: 'John Smith', role: 'Sales Manager' },
    { id: 2, name: 'Sarah Johnson', role: 'Senior Sales Rep' },
    { id: 3, name: 'Mike Wilson', role: 'Sales Rep' },
    { id: 4, name: 'Emily Davis', role: 'Sales Rep' },
    { id: 5, name: 'David Brown', role: 'Sales Rep' }
  ]

  const meetingTypes = [
    { id: 'in-person', label: 'In-Person', icon: FiMapPin },
    { id: 'video', label: 'Video Call', icon: FiVideo },
    { id: 'phone', label: 'Phone Call', icon: FiPhone }
  ]

  const handleAddMeeting = () => {
    // Prefer the sales person who owns this lead, otherwise first team member
    let defaultAssigneeName = ''
    if (lead?.assignedTo && salesTeam.length > 0) {
      const matchById = salesTeam.find(m => m._id === (lead.assignedTo._id || lead.assignedTo.id))
      if (matchById) {
        defaultAssigneeName = matchById.name
      }
    }
    if (!defaultAssigneeName && salesTeam.length > 0) {
      defaultAssigneeName = salesTeam[0].name
    }

    setMeetingForm({
      clientName: leadProfile?.name || lead?.name || '',
      meetingDate: '',
      meetingTime: '',
      meetingType: 'in-person',
      location: '',
      notes: '',
      assignee: defaultAssigneeName
    })
    setShowMeetingDialog(true)
  }

  const handleMeetingFormChange = (field, value) => {
    setMeetingForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveMeeting = () => {
    if (!meetingForm.meetingDate || !meetingForm.meetingTime) {
      toast.error('Please fill in meeting date and time')
      return
    }

    // Try to find linked client (if lead is already converted), but allow meetings even without a client.
    let clientId = null
    const leadPhone = (lead?.phone || '').toString().trim()
    if (leadPhone) {
      const byPhone = myClients.find(c => (c.phoneNumber || '').toString().trim() === leadPhone)
      if (byPhone?._id) {
        clientId = byPhone._id
      }
    }
    if (!clientId) {
      const targetName = (meetingForm.clientName || '').trim().toLowerCase()
      const byName = myClients.find(c => (c.name || '').trim().toLowerCase() === targetName)
      if (byName?._id) {
        clientId = byName._id
      }
    }

    const assigneeId = salesTeam.find(m => m.name === meetingForm.assignee)?._id
    if (!assigneeId) {
      toast.error('Please select an assignee')
      return
    }

    setIsLoading(true)
    salesMeetingsService.create({
      client: clientId || undefined,
      lead: lead?._id || id,
      meetingDate: meetingForm.meetingDate,
      meetingTime: meetingForm.meetingTime,
      meetingType: meetingForm.meetingType,
      location: meetingForm.location,
      notes: meetingForm.notes,
      assignee: assigneeId
    }).then(() => {
      toast.success('Meeting scheduled successfully')
      setShowMeetingDialog(false)
    }).catch((err) => {
      console.error('Error scheduling meeting:', err)
      toast.error('Failed to schedule meeting')
    }).finally(() => setIsLoading(false))
  }

  const handleCloseMeetingDialog = () => {
    setShowMeetingDialog(false)
    setShowMeetingTypeDropdown(false)
    setShowAssigneeDropdown(false)
  }

  const handleMeetingTypeSelect = (type) => {
    setMeetingForm(prev => ({ ...prev, meetingType: type }))
    setShowMeetingTypeDropdown(false)
  }

  const handleAssigneeSelect = (assignee) => {
    setMeetingForm(prev => ({ ...prev, assignee: assignee }))
    setShowAssigneeDropdown(false)
  }

  const handleConverted = () => {
    setShowConvertedDialog(true)
  }

  const handleConvertedFormChange = (field, value) => {
    setConvertedForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Show loading state
  if (isLoading && !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead profile...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/leads')}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
          >
            Back to Leads
          </button>
        </div>
      </div>
    )
  }

  const handleProfileFormSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // First update lead status to connected
      await salesLeadService.updateLeadStatus(id, 'connected')

      // Then create lead profile
      const profileData = {
        name: profileFormData.name || lead?.name || '',
        businessName: profileFormData.businessName || lead?.company || profileFormData.name || '',
        email: lead?.email || '',
        categoryId: profileFormData.categoryId || projectCategoryId,
        estimatedCost: Math.round(Number(String(profileFormData.estimatedPrice || '').replace(/,/g, '')) || 0),
        description: profileFormData.description,
        quotationSent: profileFormData.quotationSent,
        demoSent: profileFormData.demoSent
      }

      await salesLeadService.createLeadProfile(id, profileData)

      toast.success('Lead profile created successfully')

      // Refresh dashboard stats if available
      if (window.refreshDashboardStats) {
        window.refreshDashboardStats()
      }

      // Reset form and refresh data
      setShowConnectedForm(false)
      fetchLeadData()
    } catch (error) {
      console.error('Error creating lead profile:', error)
      toast.error('Failed to create lead profile')
    } finally {
      setIsLoading(false)
    }
  }

  // Show create profile CTA if no profile exists
  if (lead && !leadProfile) {
    const isLostLead = lead.status === 'lost'
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SL_navbar />
        <main className="flex-1 max-w-md mx-auto px-4 pt-16 pb-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isLostLead ? 'Recover Lead' : 'Create Lead Profile'}
              </h2>
              <p className="text-gray-600">
                {isLostLead
                  ? 'This lost lead doesn\'t have a profile. Recover it to create a profile and move it back to active leads.'
                  : 'This lead doesn\'t have a profile yet. Create one to manage all lead information.'}
              </p>
            </div>

            {/* Basic Info Display */}
            <div className="bg-teal-50 rounded-xl p-4 mb-6 border border-teal-100">
              <h3 className="font-semibold text-teal-900 mb-2 flex items-center">
                <FiUser className="mr-2" /> Lead Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600"><strong>Name:</strong> {lead.name || 'N/A'}</p>
                <p className="text-gray-600"><strong>Phone:</strong> {lead.phone || 'N/A'}</p>
                <p className="text-gray-600"><strong>Company:</strong> {lead.company || 'N/A'}</p>
                <p className="text-gray-600"><strong>Status:</strong> <span className="capitalize">{lead.status || 'N/A'}</span></p>
              </div>
            </div>

            {!showConnectedForm ? (
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setProfileFormData({
                      name: lead.name || '',
                      businessName: lead.company || '',
                      categoryId: projectCategoryId || '',
                      estimatedPrice: '50000',
                      description: '',
                      quotationSent: false,
                      demoSent: false
                    })
                    setShowConnectedForm(true)
                  }}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center space-x-2"
                >
                  <FiPlus className="text-xl" />
                  <span>Connect & Create Profile</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate(isLostLead ? '/lost' : '/new-leads')}
                    className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    {isLostLead ? 'Go to Lost' : 'Go to New Leads'}
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileFormSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-teal-800 uppercase mb-1 ml-1">Client Name *</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.name}
                      onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                      placeholder="Enter client name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-teal-800 uppercase mb-1 ml-1">Business Name</label>
                    <input
                      type="text"
                      value={profileFormData.businessName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, businessName: e.target.value })}
                      placeholder="Enter company/business name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-teal-800 uppercase mb-1 ml-1">Category</label>
                      <select
                        value={profileFormData.categoryId}
                        onChange={(e) => setProfileFormData({ ...profileFormData, categoryId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-teal-800 uppercase mb-1 ml-1">Est. Price (k)</label>
                      <input
                        type="number"
                        value={profileFormData.estimatedPrice}
                        onChange={(e) => setProfileFormData({ ...profileFormData, estimatedPrice: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-teal-800 uppercase mb-1 ml-1">Description</label>
                    <textarea
                      value={profileFormData.description}
                      onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                      rows="2"
                      placeholder="Add any notes about the client..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none resize-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={profileFormData.quotationSent}
                        onChange={(e) => setProfileFormData({ ...profileFormData, quotationSent: e.target.checked })}
                        className="w-5 h-5 text-teal-500 rounded border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Quotation Sent</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={profileFormData.demoSent}
                        onChange={(e) => setProfileFormData({ ...profileFormData, demoSent: e.target.checked })}
                        className="w-5 h-5 text-teal-500 rounded border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Demo Sent</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConnectedForm(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-3 px-4 bg-teal-500 text-white rounded-xl font-bold shadow-md hover:bg-teal-600 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiCheck className="text-lg" />
                    )}
                    <span>{isLoading ? 'Processing...' : 'Save & Connect'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </main>
      </div>
    )
  }


  // Get display data
  const displayName = leadProfile?.name || lead?.name || 'Unknown'
  const displayPhone = lead?.phone || ''
  const displayBusiness = leadProfile?.businessName || lead?.company || 'No business info'
  const displayCost = leadProfile?.estimatedCost ? `${leadProfile.estimatedCost}k` : 'Not specified'
  const avatar = displayName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />

      <main className="max-w-md mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">

        {/* Layout - Same for mobile and desktop */}
        <div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6"
          >
            {/* Avatar and Basic Info */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                  <span className="text-2xl font-bold text-white">{avatar}</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
              <p className="text-lg text-teal-600 mb-1 font-medium">{displayPhone}</p>
              <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block">{displayBusiness}</p>
            </div>

            {/* Contact Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleCall(displayPhone)}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FiPhone className="text-lg" />
                <span>Call</span>
              </button>
              <button
                onClick={() => handleWhatsApp(displayPhone)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FiMessageCircle className="text-lg" />
                <span>WhatsApp</span>
              </button>
            </div>
          </motion.div>

          {/* Action Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                E-cost: {displayCost}
              </div>
              <button
                onClick={handleAddMeeting}
                className="flex items-center space-x-2 p-2 hover:bg-teal-50 rounded-full transition-colors duration-200"
              >
                <FiPlus className="text-xl text-teal-600" />
                <span className="text-sm font-medium text-teal-600">Add Meeting</span>
              </button>
            </div>
          </motion.div>

          {/* Status Checkboxes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-br from-white to-teal-50 rounded-2xl p-6 shadow-lg border border-teal-200 mb-6"
          >
            <h3 className="text-lg font-semibold text-teal-900 mb-4 flex items-center">
              <div className="w-2 h-2 bg-teal-500 rounded-full mr-2"></div>
              Lead Status
            </h3>
            {/* Status Flags - Can be multiple */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-teal-800 mb-3">Status</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-teal-50 transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={status.quotationSent}
                    onChange={() => handleStatusChange('quotationSent')}
                    className="w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-teal-800">Quotation Sent</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-teal-50 transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={status.demoSent}
                    onChange={() => handleStatusChange('demoSent')}
                    className="w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-teal-800">Demo Sent</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-teal-50 transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={status.hotLead}
                    onChange={() => handleStatusChange('hotLead')}
                    className="w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-teal-800">Hot Lead</span>
                </label>
              </div>
            </div>

            {/* Project Type = Category */}
            <div>
              <h4 className="text-sm font-semibold text-teal-800 mb-3">Project Type</h4>
              <select
                value={projectCategoryId}
                onChange={(e) => setProjectCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-teal-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-teal-700 mt-2">
                Project type is based on the lead category (e.g. Apps, Web, Taxi).
              </p>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6"
          >
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSave className="text-lg" />
              )}
              <span>{isLoading ? 'Saving...' : 'Save'}</span>
            </button>
          </motion.div>

          {/* Action Buttons Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            <button
              onClick={handleAddFollow}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-teal-600 hover:to-teal-700 transition-all duration-200"
            >
              Add Follow Up
            </button>

            <button
              onClick={handleAddNote}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
            >
              Add Note
            </button>

            <button
              onClick={handleRequestDemo}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
            >
              Request Demo
            </button>

            <button
              onClick={handleLost}
              disabled={lead?.status === 'lost'}
              className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${lead?.status === 'lost'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                }`}
            >
              {lead?.status === 'lost' ? 'Already Lost' : 'Lost'}
            </button>
          </motion.div>

          {/* Transfer Client Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-6"
          >
            <button
              onClick={handleTransferClient}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200"
            >
              <FiRefreshCw className="text-lg" />
              <span>Transfer Client</span>
            </button>
          </motion.div>

          {/* Converted Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <button
              onClick={handleConverted}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FiCheck className="text-lg" />
              <span>Converted</span>
            </button>
          </motion.div>
        </div>

        {/* Converted Dialog */}
        {showConvertedDialog && (
          <SalesProjectConversionDialog
            isOpen={showConvertedDialog}
            mode="fromLead"
            leadId={id}
            clientId={null}
            clientName={displayName}
            clientPhone={displayPhone}
            businessName={displayBusiness}
            initialCategoryId={projectCategoryId}
            onClose={() => setShowConvertedDialog(false)}
            onSuccess={() => {
              setShowConvertedDialog(false)
              navigate('/leads')
              if (window.refreshDashboardStats) {
                window.refreshDashboardStats()
              }
            }}
          />
        )}

        {/* Follow-up Dialog */}
        <FollowUpDialog
          isOpen={showFollowUpDialog}
          onClose={() => setShowFollowUpDialog(false)}
          onSubmit={handleFollowUpSubmit}
          title="Schedule Follow-up"
          submitText="Schedule Follow-up"
        />

        {/* Request Demo Dialog */}
        {showRequestDemoDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Request Demo</h2>
                <button
                  onClick={handleCloseRequestDemoDialog}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Client Name Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiUser className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={demoData.clientName}
                      onChange={(e) => setDemoData({ ...demoData, clientName: e.target.value })}
                      placeholder="Enter client name"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiFileText className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={demoData.description}
                      onChange={(e) => setDemoData({ ...demoData, description: e.target.value })}
                      placeholder="Enter description"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Reference Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiFolder className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={demoData.reference}
                      onChange={(e) => setDemoData({ ...demoData, reference: e.target.value })}
                      placeholder="Reference"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Mobile Number Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiPhone className="text-lg" />
                    </div>
                    <input
                      type="tel"
                      value={demoData.mobileNumber}
                      onChange={(e) => setDemoData({ ...demoData, mobileNumber: e.target.value })}
                      placeholder="Enter client mobile number"
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                      {demoData.mobileNumber.length}/10
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <button
                  onClick={handleRequestDemoSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiSend className="text-lg" />
                  )}
                  <span>{isLoading ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Lost Dialog */}
        {showLostDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Reason</h2>
                <button
                  onClick={handleCloseLostDialog}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Reason Input Field */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                    <FiUser className="text-lg" />
                  </div>
                  <input
                    type="text"
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder="Enter reason here"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseLostDialog}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLostSubmit}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>{isLoading ? 'Marking...' : 'Ok'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Transfer Dialog */}
        {showTransferDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Transfer Client</h2>
                <button
                  onClick={handleCloseTransferDialog}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Client Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{displayName}</h3>
                    <p className="text-sm text-gray-500">{displayBusiness}</p>
                  </div>
                </div>
              </div>

              {/* Transfer To List */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-medium text-gray-700">Transfer to:</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {salesTeam.map((person) => (
                    <label
                      key={person._id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedTransferPerson === person._id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="transferPerson"
                        value={person._id}
                        checked={selectedTransferPerson === person._id}
                        onChange={(e) => setSelectedTransferPerson(e.target.value)}
                        className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{person.name}</div>
                        <div className="text-sm text-gray-500">{person.department || 'Sales'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleCloseTransferDialog}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferSubmit}
                  disabled={isLoading || !selectedTransferPerson}
                  className="px-6 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiRefreshCw className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Transferring...' : 'Transfer'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Notes Dialog */}
        {showNotesDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Note</h2>
                <button
                  onClick={() => setShowNotesDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Notes List */}
              {notes.length > 0 && (
                <div className="mb-4 max-h-40 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Previous Notes:</h3>
                  <div className="space-y-2">
                    {notes.map((note, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-800">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.addedBy?.name || 'Unknown'} • {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Note Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Note</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter your note here..."
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNotesDialog(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNoteSubmit}
                  disabled={isLoading || !newNote.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>{isLoading ? 'Adding...' : 'Add Note'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Meeting Dialog */}
        {showMeetingDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Meeting</h2>
                <button
                  onClick={handleCloseMeetingDialog}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Client Name (Pre-filled) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Client Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiUser className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={meetingForm.clientName}
                      readOnly
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Meeting Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date *</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                        <FiCalendar className="text-lg" />
                      </div>
                      <input
                        type="date"
                        value={meetingForm.meetingDate}
                        onChange={(e) => handleMeetingFormChange('meetingDate', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Meeting Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Time *</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                        <FiClock className="text-lg" />
                      </div>
                      <input
                        type="time"
                        value={meetingForm.meetingTime}
                        onChange={(e) => handleMeetingFormChange('meetingTime', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Meeting Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Meeting Type</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMeetingTypeDropdown(!showMeetingTypeDropdown)
                        setShowAssigneeDropdown(false)
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const selectedType = meetingTypes.find(t => t.id === meetingForm.meetingType)
                          const Icon = selectedType ? selectedType.icon : FiMapPin
                          return (
                            <>
                              <Icon className="text-sm text-gray-600" />
                              <span>{selectedType ? selectedType.label : 'Select Type'}</span>
                            </>
                          )
                        })()}
                      </div>
                      <FiArrowLeft className={`text-gray-400 transition-transform duration-200 ${showMeetingTypeDropdown ? 'rotate-90' : '-rotate-90'}`} />
                    </button>

                    {showMeetingTypeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                      >
                        {meetingTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => handleMeetingTypeSelect(type.id)}
                              className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors duration-200 flex items-center space-x-3 ${meetingForm.meetingType === type.id ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                                }`}
                            >
                              <Icon className="text-sm" />
                              <span>{type.label}</span>
                              {meetingForm.meetingType === type.id && (
                                <FiCheck className="ml-auto text-teal-600" />
                              )}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Assignee</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssigneeDropdown(!showAssigneeDropdown)
                        setShowMeetingTypeDropdown(false)
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <FiUser className="text-sm text-gray-600" />
                        <span>{meetingForm.assignee || 'Select Assignee'}</span>
                      </div>
                      <FiArrowLeft className={`text-gray-400 transition-transform duration-200 ${showAssigneeDropdown ? 'rotate-90' : '-rotate-90'}`} />
                    </button>

                    {showAssigneeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                      >
                        {salesTeam.map((member) => (
                          <button
                            key={member._id || member.name}
                            type="button"
                            onClick={() => handleAssigneeSelect(member.name)}
                            className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors duration-200 flex items-center space-x-3 ${meetingForm.assignee === member.name ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                              }`}
                          >
                            <FiUser className="text-sm" />
                            <span>{member.name}</span>
                            {meetingForm.assignee === member.name && (
                              <FiCheck className="ml-auto text-teal-600" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FiMapPin className="text-lg" />
                    </div>
                    <input
                      type="text"
                      value={meetingForm.location}
                      onChange={(e) => handleMeetingFormChange('location', e.target.value)}
                      placeholder="Enter meeting location or link"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={meetingForm.notes}
                    onChange={(e) => handleMeetingFormChange('notes', e.target.value)}
                    placeholder="Add meeting notes or agenda..."
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <button
                  onClick={handleSaveMeeting}
                  disabled={isLoading || !meetingForm.meetingDate || !meetingForm.meetingTime}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiCalendar className="text-lg" />
                  )}
                  <span>{isLoading ? 'Scheduling...' : 'Schedule Meeting'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SL_leadProfile