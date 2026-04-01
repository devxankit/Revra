import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCalendar, FiClock, FiFlag, FiFileText } from 'react-icons/fi'

const FollowUpDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  title = "Schedule Follow-up",
  submitText = "Schedule Follow-up"
}) => {
  const [formData, setFormData] = useState({
    followupDate: '',
    followupTime: '',
    priority: 'medium',
    notes: ''
  })

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      // Handle both 'date' and 'followupDate', 'time' and 'followupTime'
      const date = initialData.date || initialData.followupDate || ''
      const time = initialData.time || initialData.followupTime || ''
      
      // Format date if it's a Date object or ISO string
      let formattedDate = date
      if (date && (date instanceof Date || typeof date === 'string')) {
        const dateObj = new Date(date)
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0]
        }
      }
      
      setFormData({
        followupDate: formattedDate,
        followupTime: time,
        priority: initialData.priority || 'medium',
        notes: initialData.notes || ''
      })
    } else {
      setFormData({
        followupDate: '',
        followupTime: '',
        priority: 'medium',
        notes: ''
      })
    }
  }, [initialData, isOpen])

  const [errors, setErrors] = useState({})

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.followupDate) {
      newErrors.followupDate = 'Follow-up date is required'
    } else {
      const selectedDate = new Date(formData.followupDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.followupDate = 'Follow-up date cannot be in the past'
      }
    }
    
    if (!formData.followupTime) {
      newErrors.followupTime = 'Follow-up time is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
      // Reset form
      setFormData({
        followupDate: '',
        followupTime: '',
        priority: 'medium',
        notes: ''
      })
      setErrors({})
    }
  }

  const handleClose = () => {
    setFormData({
      followupDate: '',
      followupTime: '',
      priority: 'medium',
      notes: ''
    })
    setErrors({})
    onClose()
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityBgColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-200'
      case 'high': return 'bg-orange-50 border-orange-200'
      case 'medium': return 'bg-yellow-50 border-yellow-200'
      case 'low': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <FiCalendar className="text-white text-lg" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiCalendar className="inline w-4 h-4 mr-2" />
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  value={formData.followupDate}
                  onChange={(e) => handleInputChange('followupDate', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.followupDate 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300 focus:border-amber-500'
                  }`}
                  min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
                />
                {errors.followupDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.followupDate}</p>
                )}
              </div>

              {/* Follow-up Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiClock className="inline w-4 h-4 mr-2" />
                  Follow-up Time *
                </label>
                <input
                  type="time"
                  value={formData.followupTime}
                  onChange={(e) => handleInputChange('followupTime', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.followupTime 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300 focus:border-amber-500'
                  }`}
                />
                {errors.followupTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.followupTime}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiFlag className="inline w-4 h-4 mr-2" />
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['low', 'medium', 'high', 'urgent'].map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => handleInputChange('priority', priority)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium capitalize ${
                        formData.priority === priority
                          ? `${getPriorityBgColor(priority)} ${getPriorityColor(priority)} border-current`
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiFileText className="inline w-4 h-4 mr-2" />
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                  placeholder="Add any notes about this follow-up..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all font-medium shadow-lg hover:shadow-xl"
                >
                  {submitText}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FollowUpDialog
