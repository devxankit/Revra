import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCheck,
  FiMessageCircle,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSave
} from 'react-icons/fi'
import { salesLeadService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'
import SL_navbar from '../SL-components/SL_navbar'
import FollowUpDialog from '../SL-components/FollowUpDialog'

const SL_channelPartnerLeadProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [lead, setLead] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [projectCategoryId, setProjectCategoryId] = useState('')
  const [statusState, setStatusState] = useState({
    quotationSent: false,
    demoSent: false,
    hotLead: false
  })
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState('')

  const fetchCategories = async () => {
    try {
      const cats = await salesLeadService.getLeadCategories()
      setCategories(Array.isArray(cats) ? cats : [])
    } catch (e) {
      // ignore
    }
  }

  const reloadLead = async () => {
    if (!id) return
    const res = await salesLeadService.getChannelPartnerLeadDetail(id)
    setLead(res || null)
    return res
  }

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        await fetchCategories()
        const res = await reloadLead()
        const leadCategoryId = res?.category?._id ?? res?.category
        setProjectCategoryId(leadCategoryId ? String(leadCategoryId) : '')
        setStatusState({
          quotationSent: !!res?.leadProfile?.quotationSent,
          demoSent: !!res?.leadProfile?.demoSent,
          hotLead: (res?.priority || '').toLowerCase() === 'urgent'
        })
        setNoteText(res?.notes || '')
      } catch (e) {
        console.error('Failed to load channel partner lead detail:', e)
        setError(e?.message || 'Failed to load lead details')
        toast.error('Failed to load channel partner lead')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, toast])

  // Display data (match Sales Lead Profile style)
  const displayName = lead?.name || lead?.leadProfile?.name || 'Unknown'
  const displayPhone = lead?.phone || ''
  const displayBusiness =
    lead?.company ||
    lead?.leadProfile?.businessName ||
    lead?.assignedTo?.companyName ||
    lead?.assignedTo?.name ||
    'No business info'
  const avatar = (displayName || displayPhone || 'U').toString().charAt(0).toUpperCase()
  const categoryName = lead?.category?.name || 'Unknown'
  const channelPartnerName =
    lead?.assignedTo?.companyName ||
    lead?.assignedTo?.name ||
    lead?.channelPartner?.companyName ||
    lead?.channelPartner?.name ||
    'Channel Partner'
  const displayCost = lead?.leadProfile?.estimatedCost ? `${lead.leadProfile.estimatedCost}k` : 'Not specified'

  const salesLeadId = useMemo(() => {
    const entry = Array.isArray(lead?.sharedFromSales) ? lead.sharedFromSales.find(s => s?.leadId) : null
    const leadId = entry?.leadId?._id || entry?.leadId
    return leadId ? String(leadId) : ''
  }, [lead?.sharedFromSales])

  const computeLegacyProjectType = () => {
    const selectedCat = categories.find(cat => String(cat._id) === String(projectCategoryId))
    const catName = (selectedCat?.name || '').toLowerCase()
    return {
      web: catName.includes('web'),
      app: catName.includes('app'),
      taxi: catName.includes('taxi'),
      other: !catName.includes('web') && !catName.includes('app') && !catName.includes('taxi')
    }
  }

  const handleSave = async () => {
    if (!lead?._id) return
    if (!projectCategoryId) {
      toast.error('Please select a project category')
      return
    }
    setIsSaving(true)
    try {
      const legacyProjectType = computeLegacyProjectType()

      await salesLeadService.upsertChannelPartnerLeadProfile(lead._id, {
        quotationSent: !!statusState.quotationSent,
        demoSent: !!statusState.demoSent,
        categoryId: projectCategoryId,
        projectType: legacyProjectType,
        name: displayName || 'Client',
        businessName: displayBusiness || '',
        email: lead?.email || ''
      })

      await salesLeadService.updateChannelPartnerLead(lead._id, {
        categoryId: projectCategoryId,
        priority: statusState.hotLead ? 'urgent' : (lead?.priority || 'medium')
      })

      await reloadLead()
      toast.success('Saved successfully')
    } catch (e) {
      console.error('Failed to save CP lead:', e)
      toast.error(e?.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFollowUpSubmit = async (followUpData) => {
    if (!lead?._id) return
    setIsSaving(true)
    try {
      await salesLeadService.addChannelPartnerLeadFollowUp(lead._id, {
        date: followUpData.followupDate,
        time: followUpData.followupTime,
        notes: followUpData.notes || '',
        priority: followUpData.priority || 'medium'
      })
      setShowFollowUpDialog(false)
      await reloadLead()
      toast.success('Follow-up scheduled')
    } catch (e) {
      console.error('Failed to add follow-up:', e)
      toast.error(e?.message || 'Failed to schedule follow-up')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNote = async () => {
    if (!lead?._id) return
    setIsSaving(true)
    try {
      await salesLeadService.updateChannelPartnerLead(lead._id, { notes: noteText })
      setShowNoteDialog(false)
      await reloadLead()
      toast.success('Note saved')
    } catch (e) {
      console.error('Failed to save note:', e)
      toast.error(e?.message || 'Failed to save note')
    } finally {
      setIsSaving(false)
    }
  }

  const ensureSalesLead = async () => {
    if (salesLeadId) return salesLeadId
    if (!lead?._id) throw new Error('Lead not loaded')

    const createRes = await salesLeadService.createLead({
      phone: displayPhone,
      name: displayName,
      company: displayBusiness,
      email: lead?.email || '',
      category: projectCategoryId || (lead?.category?._id ?? lead?.category)
    })

    const newLeadId = createRes?.data?._id || createRes?.data?.id || createRes?.data
    if (!newLeadId) throw new Error(createRes?.message || 'Failed to create sales lead')

    await salesLeadService.createLeadProfile(newLeadId, {
      name: displayName,
      businessName: displayBusiness,
      email: lead?.email || '',
      categoryId: projectCategoryId || undefined,
      quotationSent: !!statusState.quotationSent,
      demoSent: !!statusState.demoSent
    })

    return String(newLeadId)
  }

  const handleTransferClient = async () => {
    try {
      const leadId = await ensureSalesLead()
      navigate(`/lead-profile/${leadId}`)
    } catch (e) {
      toast.error(e?.message || 'Unable to open transfer screen')
    }
  }

  const handleConverted = async () => {
    try {
      const leadId = await ensureSalesLead()
      navigate(`/lead-profile/${leadId}`)
      toast.success('Sales lead created. Convert from here.')
    } catch (e) {
      toast.error(e?.message || 'Unable to convert')
    }
  }

  const handleLost = async () => {
    if (!lead?._id) return
    setIsSaving(true)
    try {
      await salesLeadService.updateChannelPartnerLead(lead._id, { status: 'lost' })
      await reloadLead()
      toast.success('Marked as lost')
    } catch (e) {
      toast.error(e?.message || 'Failed to update status')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestDemo = async () => {
    setStatusState(prev => ({ ...prev, demoSent: true }))
    await handleSave()
  }

  const handleCall = () => {
    if (!displayPhone) return
    window.open(`tel:${displayPhone}`, '_self')
  }

  const handleWhatsApp = () => {
    if (!displayPhone) return
    const message = encodeURIComponent("Hello! I'm calling about your inquiry regarding our services. How can I help you today?")
    window.open(`https://wa.me/91${displayPhone}?text=${message}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SL_navbar />
        <div className="flex items-center justify-center pt-24">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lead...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SL_navbar />
        <main className="max-w-md mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/channel-partner-leads')}
            className="inline-flex items-center gap-2 text-teal-700 font-semibold mb-4"
          >
            <FiArrowLeft /> Back
          </button>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <p className="text-gray-900 font-semibold">Unable to open lead</p>
            <p className="text-sm text-gray-600 mt-1">{error || 'Lead not found'}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />

      <main className="max-w-md mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        {/* Back + linked lead */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/channel-partner-leads')}
            className="inline-flex items-center gap-2 text-teal-700 font-semibold"
          >
            <FiArrowLeft /> Back
          </button>
          {salesLeadId ? (
            <button
              onClick={() => navigate(`/lead-profile/${salesLeadId}`)}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold shadow-sm"
            >
              Open Lead Profile
            </button>
          ) : null}
        </div>

        {/* Profile Card (match SL_leadProfile) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6"
        >
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                <span className="text-2xl font-bold text-white">{avatar}</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
            <p className="text-lg text-teal-600 mb-1 font-medium">{displayPhone}</p>
            <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block truncate max-w-full">
              {displayBusiness}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleCall}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FiPhone className="text-lg" />
              <span>Call</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FiMessageCircle className="text-lg" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="text-xs text-gray-500 font-semibold mb-1">Category</div>
              <div className="text-sm font-bold text-gray-900 truncate">{categoryName}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="text-xs text-gray-500 font-semibold mb-1">Channel Partner</div>
              <div className="text-sm font-bold text-gray-900 truncate">{channelPartnerName}</div>
            </div>
          </div>
        </motion.div>

        {/* Action Card (match SL_leadProfile) */}
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
              onClick={() => toast.error('Meetings are not supported for CP leads yet.')}
              className="flex items-center space-x-2 p-2 hover:bg-teal-50 rounded-full transition-colors duration-200"
              type="button"
            >
              <FiPlus className="text-xl text-teal-600" />
              <span className="text-sm font-medium text-teal-600">Add Meeting</span>
            </button>
          </div>
        </motion.div>

        {/* Status Card (match SL_leadProfile; editable) */}
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

          {/* Status Flags */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-teal-800 mb-3">Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-teal-50 transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={statusState.quotationSent}
                  onChange={() => setStatusState(prev => ({ ...prev, quotationSent: !prev.quotationSent }))}
                  className="w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-teal-800">Quotation Sent</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-teal-50 transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={statusState.demoSent}
                  onChange={() => setStatusState(prev => ({ ...prev, demoSent: !prev.demoSent }))}
                  className="w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-teal-800">Demo Sent</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-teal-50 transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={statusState.hotLead}
                  onChange={() => setStatusState(prev => ({ ...prev, hotLead: !prev.hotLead }))}
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
              Project type is based on the lead category.
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
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
          >
            <FiSave className="text-lg" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
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
            onClick={() => setShowFollowUpDialog(true)}
            disabled={isSaving}
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
          >
            Add Follow Up
          </button>

          <button
            onClick={() => setShowNoteDialog(true)}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
          >
            Add Note
          </button>

          <button
            onClick={handleRequestDemo}
            disabled={isSaving}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50"
          >
            Request Demo
          </button>

          <button
            onClick={handleLost}
            disabled={isSaving || lead?.status === 'lost'}
            className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              lead?.status === 'lost'
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
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
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
          className="mb-6"
        >
          <button
            onClick={handleConverted}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <FiCheck className="text-lg" />
            <span>Converted</span>
          </button>
        </motion.div>

        {/* Details Card (extra data; similar feel) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Lead Details</h3>
          <div className="space-y-2 text-sm">
            {lead?.email ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900 font-medium truncate">{lead.email}</span>
              </div>
            ) : null}
            {lead?.company ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Company</span>
                <span className="text-gray-900 font-medium truncate">{lead.company}</span>
              </div>
            ) : null}
            {lead?.status ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Status</span>
                <span className="text-gray-900 font-medium truncate">{lead.status}</span>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* Notes */}
        {lead?.notes ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-900 whitespace-pre-wrap text-sm">
              {lead.notes}
            </div>
          </motion.div>
        ) : null}

        {/* Follow-up Dialog */}
        <FollowUpDialog
          isOpen={showFollowUpDialog}
          onClose={() => setShowFollowUpDialog(false)}
          onSubmit={handleFollowUpSubmit}
          title="Schedule Follow-up"
          submitText="Schedule Follow-up"
        />

        {/* Note Dialog */}
        {showNoteDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNoteDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Note</h2>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                placeholder="Write a note..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowNoteDialog(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold disabled:opacity-50"
                  type="button"
                >
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SL_channelPartnerLeadProfile

