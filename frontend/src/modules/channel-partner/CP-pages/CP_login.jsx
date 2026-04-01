import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaPhoneAlt, FaShieldAlt, FaArrowRight, FaClock, FaSpinner } from 'react-icons/fa'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import logo from '../../../assets/images/logo.png'
import { sendOTP, verifyOTP, resendOTP, isCPAuthenticated } from '../CP-services/cpAuthService'
import { useToast } from '../../../contexts/ToastContext'

const CP_login = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    phoneNumber: '',
    otp: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [errors, setErrors] = useState({})
  const otpIntervalRef = useRef(null)

  // Check if user is already authenticated
  useEffect(() => {
    if (isCPAuthenticated()) {
      navigate('/cp-dashboard')
    }
  }, [navigate])

  // Cleanup OTP timer interval on unmount
  useEffect(() => {
    return () => {
      if (otpIntervalRef.current) {
        clearInterval(otpIntervalRef.current)
        otpIntervalRef.current = null
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validatePhoneNumber = () => {
    const newErrors = {}
    
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!/^[0-9]{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateOtp = () => {
    const newErrors = {}
    
    if (!formData.otp) {
      newErrors.otp = 'OTP is required'
    } else if (formData.otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits'
    } else if (!/^\d{6}$/.test(formData.otp)) {
      newErrors.otp = 'OTP must contain only numbers'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const sendOtp = async () => {
    if (!validatePhoneNumber()) {
      return
    }
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const response = await sendOTP(formData.phoneNumber)
      
      if (response.success) {
        setIsOtpSent(true)
        setOtpTimer(60) // 60 seconds timer
        
        // Auto-fill OTP if available in response (development mode)
        if (response.otp) {
          setFormData(prev => ({
            ...prev,
            otp: response.otp
          }))
        }
        
        // Start countdown timer
        if (otpIntervalRef.current) {
          clearInterval(otpIntervalRef.current)
          otpIntervalRef.current = null
        }
        const timerId = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerId)
              if (otpIntervalRef.current === timerId) otpIntervalRef.current = null
              return 0
            }
            return prev - 1
          })
        }, 1000)
        otpIntervalRef.current = timerId
        
        toast.success('OTP sent successfully to your phone number', {
          title: 'OTP Sent',
          duration: 3000
        })
      }
      
    } catch (error) {
      const errorMessage = error.message || 'Failed to send OTP. Please try again.'
      toast.error(errorMessage, { title: 'OTP Send Failed', duration: 4000 })
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isOtpSent) {
      await sendOtp()
      return
    }
    
    if (!validateOtp()) {
      return
    }
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const response = await verifyOTP(formData.phoneNumber, formData.otp)
      
      if (response.success) {
        toast.login(`Welcome back, ${response?.data?.name || 'Channel Partner'}!`, {
          title: 'Login Successful',
          duration: 3000
        })
        
        setTimeout(() => {
          navigate('/cp-dashboard')
        }, 1000)
      }
    } catch (error) {
      const errorMessage = error.message || 'OTP verification failed. Please try again.'
      toast.error(errorMessage, { title: 'Verification Failed', duration: 4000 })
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const resendOtp = async () => {
    if (otpTimer > 0) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const response = await resendOTP(formData.phoneNumber)
      
      if (response.success) {
        setOtpTimer(60) // Reset timer
        
        // Auto-fill OTP if available in response (development mode)
        if (response.otp) {
          setFormData(prev => ({
            ...prev,
            otp: response.otp
          }))
        }
        
        // Start countdown timer
        if (otpIntervalRef.current) {
          clearInterval(otpIntervalRef.current)
          otpIntervalRef.current = null
        }
        const timerId = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerId)
              if (otpIntervalRef.current === timerId) otpIntervalRef.current = null
              return 0
            }
            return prev - 1
          })
        }, 1000)
        otpIntervalRef.current = timerId
        
        toast.success('OTP resent successfully', {
          title: 'OTP Resent',
          duration: 3000
        })
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to resend OTP. Please try again.'
      toast.error(errorMessage, { title: 'Resend Failed', duration: 4000 })
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logo} alt="Appzeto" className="h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Channel Partner Login</h1>
            <p className="text-gray-600">Enter your phone number to receive OTP</p>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhoneAlt className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`pl-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                  disabled={isOtpSent}
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
              )}
            </div>

            {/* OTP Input */}
            {isOtpSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaShieldAlt className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleInputChange}
                    placeholder="000000"
                    maxLength={6}
                    className={`pl-10 ${errors.otp ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.otp && (
                  <p className="mt-1 text-sm text-red-600">{errors.otp}</p>
                )}
                
                {/* Resend OTP */}
                <div className="mt-2 flex items-center justify-between">
                  {otpTimer > 0 ? (
                    <p className="text-sm text-gray-500 flex items-center">
                      <FaClock className="h-3 w-3 mr-1" />
                      Resend OTP in {otpTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={isLoading}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="h-4 w-4 animate-spin" />
                  <span>{isOtpSent ? 'Verifying...' : 'Sending OTP...'}</span>
                </>
              ) : (
                <>
                  <span>{isOtpSent ? 'Verify OTP' : 'Send OTP'}</span>
                  <FaArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Secure login with OTP verification</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CP_login
