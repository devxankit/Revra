import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FiX,
  FiUser,
  FiPhone,
  FiFolder,
  FiCalendar,
  FiFileText,
  FiImage,
  FiUpload,
  FiCheck
} from 'react-icons/fi'
import { FaRupeeSign } from 'react-icons/fa'
import { useToast } from '../../../contexts/ToastContext'
import { salesLeadService, salesPaymentsService, salesClientService } from '../SL-services'

const SalesProjectConversionDialog = ({
  isOpen,
  mode = 'fromLead', // 'fromLead' | 'fromClient'
  leadId,
  clientId,
  clientName,
  clientPhone,
  businessName,
  initialCategoryId,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast()

  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showGSTConfirmModal, setShowGSTConfirmModal] = useState(false)
  const [conversionData, setConversionData] = useState({
    projectName: '',
    categoryId: initialCategoryId || '',
    totalCost: '',
    finishedDays: '',
    advanceReceived: '',
    advanceAccount: '',
    includeGST: false,
    clientDateOfBirth: '',
    conversionDate: '', // Added for custom conversion date
    description: '',
    screenshot: null,
    includeProjectExpenses: false,
    projectExpenseReservedAmount: '',
    projectExpenseRequirements: ''
  })

  useEffect(() => {
    if (!isOpen) return

    // Prefill form when opened
    setConversionData(prev => ({
      ...prev,
      projectName: prev.projectName || businessName || '',
      categoryId: initialCategoryId || '',
      description: prev.description || '',
      conversionDate: prev.conversionDate || new Date().toISOString().split('T')[0]
    }))

    const loadAux = async () => {
      try {
        const cats = await salesLeadService.getLeadCategories()
        setCategories(cats || [])
        const accs = await salesPaymentsService.getAccounts()
        setAccounts(accs || [])
      } catch (err) {
        // Non-blocking errors
        console.error('Error loading categories/accounts for conversion dialog:', err)
      }
    }

    loadAux()
  }, [isOpen, businessName, initialCategoryId])

  if (!isOpen) {
    return null
  }

  const handleClose = () => {
    if (isLoading) return
    if (onClose) onClose()
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!conversionData.projectName.trim()) {
      toast.error('Please enter project name')
      return
    }

    const parseAmount = (val) => Math.round(Number(String(val || '').replace(/,/g, '')) || 0)
    const baseCost = parseAmount(conversionData.totalCost)

    if (!conversionData.totalCost.toString().trim() || baseCost <= 0) {
      toast.error('Total cost must be greater than 0')
      return
    }

    if (!conversionData.categoryId || !conversionData.categoryId.toString().trim()) {
      toast.error('Please select a project category')
      return
    }

    const advanceValue = parseAmount(conversionData.advanceReceived)
    if (!advanceValue || advanceValue <= 0) {
      toast.error('Advance amount is required and must be greater than 0')
      return
    }

    if (!conversionData.advanceAccount || !conversionData.advanceAccount.toString().trim()) {
      toast.error('Please select a payment account for the advance amount')
      return
    }

    // Validate project expense reserved amount when expenses are included
    if (conversionData.includeProjectExpenses) {
      const reserved = parseAmount(conversionData.projectExpenseReservedAmount)
      if (reserved < 0) {
        toast.error('Reserved amount for project expenses cannot be negative')
        return
      }
      if (reserved > baseCost) {
        toast.error('Reserved amount for project expenses cannot be greater than total project cost')
        return
      }
    }

    if (mode === 'fromLead' && !leadId) {
      toast.error('Lead information is missing for conversion')
      return
    }

    if (mode === 'fromClient' && !clientId) {
      toast.error('Client information is missing for new project')
      return
    }

    setIsLoading(true)
    try {
      // When includeGST: project total = base + 18%; otherwise use base as entered
      const totalCostValue = conversionData.includeGST ? Math.round(baseCost * 1.18) : baseCost

      const projectData = {
        projectName: conversionData.projectName.trim(),
        categoryId: conversionData.categoryId,
        totalCost: totalCostValue,
        finishedDays: conversionData.finishedDays ? parseInt(conversionData.finishedDays, 10) : undefined,
        advanceReceived: advanceValue,
        advanceAccount: conversionData.advanceAccount || '',
        includeGST: conversionData.includeGST || false,
        clientDateOfBirth: mode === 'fromLead' ? (conversionData.clientDateOfBirth || undefined) : undefined,
        conversionDate: conversionData.conversionDate || undefined,
        description: conversionData.description.trim() || '',
        screenshot: conversionData.screenshot || null,
        includeProjectExpenses: conversionData.includeProjectExpenses || false,
        projectExpenseReservedAmount: conversionData.projectExpenseReservedAmount || '',
        projectExpenseRequirements: conversionData.projectExpenseRequirements.trim() || ''
      }

      let result
      if (mode === 'fromLead') {
        result = await salesLeadService.convertLeadToClient(leadId, projectData)
        toast.success('Lead converted to client successfully')
      } else {
        result = await salesClientService.createProjectForClient(clientId, projectData)
        toast.success('Project created successfully for existing client')
      }

      setConversionData({
        projectName: '',
        categoryId: initialCategoryId || '',
        totalCost: '',
        finishedDays: '',
        advanceReceived: '',
        advanceAccount: '',
        includeGST: false,
        clientDateOfBirth: '',
        conversionDate: new Date().toISOString().split('T')[0],
        description: '',
        screenshot: null,
        includeProjectExpenses: false,
        projectExpenseReservedAmount: '',
        projectExpenseRequirements: ''
      })

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      console.error('Error submitting conversion/project form:', err)
      toast.error(err?.message || 'Failed to submit project details')
    } finally {
      setIsLoading(false)
    }
  }

  const baseAmount = Math.round(Number(String(conversionData.totalCost || '0').replace(/,/g, '')) || 0)
  const gstAmount = Math.round(baseAmount * 0.18)
  const withGST = Math.round(baseAmount * 1.18)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Dialog Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'fromLead' ? 'Convert Client' : 'Add New Project'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <FiX className="text-xl text-gray-600" />
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Client Name - Pre-filled, Read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FiUser className="text-lg" />
                </div>
                <input
                  type="text"
                  value={clientName || ''}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FiFolder className="text-lg" />
                </div>
                <input
                  type="text"
                  value={conversionData.projectName}
                  onChange={(e) =>
                    setConversionData(prev => ({ ...prev, projectName: e.target.value }))
                  }
                  placeholder="Project name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Phone Number - Pre-filled, Read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FiPhone className="text-lg" />
                </div>
                <input
                  type="text"
                  value={clientPhone || ''}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Finished Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Finished Days</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FiCalendar className="text-lg" />
                </div>
                <input
                  type="number"
                  min="0"
                  value={conversionData.finishedDays}
                  onChange={(e) =>
                    setConversionData(prev => ({ ...prev, finishedDays: e.target.value }))
                  }
                  placeholder="Finished days"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={conversionData.categoryId}
                onChange={(e) =>
                  setConversionData(prev => ({ ...prev, categoryId: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-teal-600">
                  <FiFileText className="text-lg" />
                </div>
                <textarea
                  value={conversionData.description}
                  onChange={(e) =>
                    setConversionData(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Description"
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                />
              </div>
            </div>

            {/* Total Cost - base amount; when GST enabled, +18% applied on submit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Cost <span className="text-red-500">*</span>
                {conversionData.includeGST && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-800 rounded">
                    GST +18% will be applied
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FaRupeeSign className="text-lg" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={conversionData.totalCost}
                  onChange={(e) =>
                    setConversionData(prev => ({ ...prev, totalCost: e.target.value }))
                  }
                  placeholder={
                    conversionData.includeGST ? 'Base cost (before GST)' : 'Total cost'
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  required
                />
              </div>
              {conversionData.includeGST && conversionData.totalCost && (
                <p className="mt-1 text-xs text-teal-600">
                  Project total: ₹
                  {withGST.toLocaleString('en-IN')} (incl. GST)
                </p>
              )}
            </div>

            {/* Advance Received */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance Received <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FiCheck className="text-lg" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={conversionData.advanceReceived}
                  onChange={(e) =>
                    setConversionData(prev => ({ ...prev, advanceReceived: e.target.value }))
                  }
                  placeholder="Advance received"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                />
              </div>

              {/* Advance Account - use actual finance accounts */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={conversionData.advanceAccount}
                  onChange={(e) =>
                    setConversionData(prev => ({ ...prev, advanceAccount: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select account</option>
                  {accounts.map(account => (
                    <option key={account._id || account.id} value={account._id || account.id}>
                      {account.accountName || account.name || 'Account'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  This should match an Admin finance account. Money is only credited after finance
                  approves the request.
                </p>
              </div>
            </div>

            {/* Upload Screenshot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Screenshot
              </label>
              <div
                onClick={() => document.getElementById('screenshot-upload').click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-500 transition-colors duration-200"
              >
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      setConversionData(prev => ({ ...prev, screenshot: file }))
                    }
                  }}
                  className="hidden"
                />
                {conversionData.screenshot ? (
                  <div className="space-y-2">
                    <FiImage className="text-4xl text-teal-600 mx-auto" />
                    <p className="text-sm text-gray-700">
                      {conversionData.screenshot.name}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConversionData(prev => ({ ...prev, screenshot: null }))
                        const input = document.getElementById('screenshot-upload')
                        if (input) {
                          input.value = ''
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FiUpload className="text-4xl text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      Drop image here or click to upload
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Client DOB (optional) - only for lead conversion, not for existing client */}
            {mode === 'fromLead' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth (optional)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                    <FiCalendar className="text-lg" />
                  </div>
                  <input
                    type="date"
                    value={conversionData.clientDateOfBirth}
                    onChange={(e) =>
                      setConversionData(prev => ({
                        ...prev,
                        clientDateOfBirth: e.target.value
                      }))
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Used for showing client birthdays in Client Management
                </p>
              </div>
            )}

            {/* Conversion Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversion Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                  <FiCalendar className="text-lg" />
                </div>
                <input
                  type="date"
                  value={conversionData.conversionDate}
                  onChange={(e) =>
                    setConversionData(prev => ({
                      ...prev,
                      conversionDate: e.target.value
                    }))
                  }
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Default is today. You can select a past date if the actual conversion happened earlier.
              </p>
            </div>

            {/* Include GST */}
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={conversionData.includeGST}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowGSTConfirmModal(true)
                    } else {
                      setConversionData(prev => ({ ...prev, includeGST: false }))
                    }
                  }}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include GST (18%)</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiCheck className="text-lg" />
                )}
                <span>{isLoading ? 'Saving...' : mode === 'fromLead' ? 'Converted' : 'Create Project'}</span>
              </button>
            </div>
          </div>

          {/* Project Expenses Configuration */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Project Expenses</h3>
            <p className="text-xs text-gray-500">
              Choose whether project expenses (e.g. domain, hosting, server) are included inside this project amount
              or paid directly by the client.
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense handling</label>
              <select
                value={conversionData.includeProjectExpenses ? 'included' : 'excluded'}
                onChange={(e) =>
                  setConversionData(prev => ({
                    ...prev,
                    includeProjectExpenses: e.target.value === 'included'
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              >
                <option value="included">Included in project (company will purchase)</option>
                <option value="excluded">Excluded – client will purchase directly</option>
              </select>
            </div>

            {conversionData.includeProjectExpenses && (
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reserved amount for project expenses
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600">
                      <FaRupeeSign className="text-sm" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={conversionData.projectExpenseReservedAmount}
                      onChange={(e) =>
                        setConversionData(prev => ({
                          ...prev,
                          projectExpenseReservedAmount: e.target.value
                        }))
                      }
                      placeholder="Amount from total cost reserved for expenses"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This amount is part of the total project cost, not extra. PEM will see this as the purchasing budget.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense requirements (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={conversionData.projectExpenseRequirements}
                    onChange={(e) =>
                      setConversionData(prev => ({
                        ...prev,
                        projectExpenseRequirements: e.target.value
                      }))
                    }
                    placeholder="List expected expenses, e.g. domain, hosting, server, email, SSL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This note will be visible to the Project Expense Manager for planning purchases.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* GST Confirmation Modal */}
      {showGSTConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3">Enable GST (18%)</h3>
            <p className="text-sm text-gray-600 mb-4">
              While enabling GST for this project, it will increase 18% of the cost.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cost without GST:</span>
                <span className="font-semibold">
                  ₹{baseAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%):</span>
                <span className="font-semibold text-teal-600">
                  + ₹{gstAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-800">Project total with GST:</span>
                <span className="font-bold text-green-700">
                  ₹{withGST.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                On confirmation, the project total cost will be set to the GST-inclusive amount.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGSTConfirmModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConversionData(prev => ({ ...prev, includeGST: true }))
                  setShowGSTConfirmModal(false)
                }}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

export default SalesProjectConversionDialog

