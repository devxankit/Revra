import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaPhoneAlt, FaShieldAlt, FaArrowRight, FaClock, FaSpinner } from 'react-icons/fa'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import logo from '../../../../assets/images/logo.png'
import { sendOTP, verifyOTP, resendOTP, isClientAuthenticated } from '../../DEV-services/clientAuthService'
import { useToast } from '../../../../contexts/ToastContext'

const Client_login = () => {
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

  // Check if user is already authenticated
  useEffect(() => {
    if (isClientAuthenticated()) {
      navigate('/client-dashboard')
    }
  }, [navigate])

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
        if (process.env.NODE_ENV === 'development' && response.otp) {
          setFormData(prev => ({
            ...prev,
            otp: response.otp
          }))
        }
        
        // Start countdown timer
        const timer = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
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
        localStorage.setItem('clientUser', JSON.stringify({ 
          ...response?.data, 
          loginTime: new Date().toISOString() 
        }))
        
        toast.login(`Welcome back, ${response?.data?.name || 'Client'}!`, {
          title: 'Login Successful',
          duration: 3000
        })
        
        setTimeout(() => {
          navigate('/client-dashboard')
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
        if (process.env.NODE_ENV === 'development' && response.otp) {
          setFormData(prev => ({
            ...prev,
            otp: response.otp
          }))
        }
        
        // Start countdown timer
        const timer = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-teal-200/20 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-16 w-16 h-16 bg-blue-200/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-indigo-200/20 rounded-full animate-pulse delay-2000"></div>
        <div className="absolute bottom-32 right-10 w-12 h-12 bg-teal-300/20 rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-blue-300/20 rounded-full animate-pulse delay-1500"></div>
        <div className="absolute top-1/3 right-1/3 w-14 h-14 bg-indigo-300/20 rounded-full animate-pulse delay-3000"></div>
      </div>

      {/* Main Login Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          {/* Card Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(20, 184, 166, 0.3) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-8 relative z-10"
          >
            {/* Appzeto Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src={logo} 
                alt="Appzeto Logo" 
                className="h-16 w-auto"
              />
            </div>
            
            <p className="text-gray-600 text-sm">
              {isOtpSent ? 'Enter the OTP sent to your phone' : 'Sign in to your client account'}
            </p>
          </motion.div>

          {/* Error Message */}
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-sm text-center">{errors.general}</p>
            </motion.div>
          )}

          {/* Success Message */}
          {isOtpSent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <p className="text-green-600 text-sm text-center">
                OTP sent to {formData.phoneNumber}
              </p>
            </motion.div>
          )}

          {/* Login Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-6 relative z-10"
          >
            {/* Phone Number Field */}
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhoneAlt className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  maxLength={10}
                  className={`pl-10 h-12 text-base border-2 transition-all duration-200 ${
                    errors.phoneNumber 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-teal-500 focus:ring-teal-200'
                  }`}
                  disabled={isLoading || isOtpSent}
                />
              </div>
              {errors.phoneNumber && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs"
                >
                  {errors.phoneNumber}
                </motion.p>
              )}
            </div>

            {/* OTP Field - Only show after phone number is sent */}
            {isOtpSent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <label htmlFor="otp" className="text-sm font-semibold text-gray-700">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaShieldAlt className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    value={formData.otp}
                    onChange={handleInputChange}
                    placeholder="000000"
                    maxLength={6}
                    className={`pl-10 h-12 border-2 transition-all duration-200 text-center text-lg tracking-widest ${
                      errors.otp 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.otp && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs"
                  >
                    {errors.otp}
                  </motion.p>
                )}
                
                {/* Resend OTP */}
                <div className="text-center">
                  {otpTimer > 0 ? (
                    <p className="text-sm text-gray-500 flex items-center justify-center">
                      <FaClock className="mr-1" />
                      Resend OTP in {otpTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={resendOtp}
                      className="text-teal-600 hover:text-teal-700 font-medium text-sm transition-colors"
                      disabled={isLoading}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold text-base rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isOtpSent ? 'Verifying...' : 'Sending OTP...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>{isOtpSent ? 'Verify OTP' : 'Send OTP'}</span>
                  <FaArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 text-center relative z-10"
          >
            <p className="text-gray-500 text-sm">
              Need help? Contact your{' '}
              <button className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
                project manager
              </button>
            </p>
          </motion.div>
        </div>

      </motion.div>
    </div>
  )
}

export default Client_login
