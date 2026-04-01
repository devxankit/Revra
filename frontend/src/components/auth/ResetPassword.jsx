import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaArrowRight } from 'react-icons/fa'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import logo from '../../assets/images/logo.png'
import { useToast } from '../../contexts/ToastContext'
import { resetPasswordAdmin } from '../../modules/admin/admin-services/adminAuthService'
import { resetPasswordEmployee } from '../../modules/dev/DEV-services/employeeAuthService'
import { resetPasswordPM } from '../../modules/dev/DEV-services/pmAuthService'
import { resetPasswordSales } from '../../modules/sells/SL-services/salesAuthService'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSuccess, setIsSuccess] = useState(false)

  const resetToken = searchParams.get('token')
  const userType = searchParams.get('type') || 'admin'

  useEffect(() => {
    if (!resetToken) {
      toast.error('Invalid reset link. Please request a new password reset.', {
        title: 'Invalid Link',
        duration: 4000
      })
      setTimeout(() => {
        navigate('/admin-login')
      }, 2000)
    }
  }, [resetToken, navigate, toast])

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

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getResetPasswordFunction = () => {
    switch (userType) {
      case 'admin':
        return resetPasswordAdmin
      case 'employee':
        return resetPasswordEmployee
      case 'pm':
        return resetPasswordPM
      case 'sales':
        return resetPasswordSales
      default:
        return resetPasswordAdmin
    }
  }

  const getLoginRoute = () => {
    switch (userType) {
      case 'admin':
        return '/admin-login'
      case 'employee':
        return '/employee-login'
      case 'pm':
        return '/pm-login'
      case 'sales':
        return '/sales-login'
      default:
        return '/admin-login'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    if (!resetToken) {
      toast.error('Invalid reset token', { title: 'Error' })
      return
    }
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const resetPasswordFn = getResetPasswordFunction()
      const response = await resetPasswordFn(resetToken, formData.password)
      
      if (response.success) {
        setIsSuccess(true)
        toast.success('Password reset successful! Redirecting to login...', {
          title: 'Success',
          duration: 3000
        })
        
        setTimeout(() => {
          navigate(getLoginRoute())
        }, 2000)
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to reset password. Please try again.'
      toast.error(errorMessage, {
        title: 'Reset Failed',
        duration: 4000
      })
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <FaCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
          <p className="text-gray-600 mb-6">Your password has been reset successfully. Redirecting to login...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-teal-200/20 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-16 w-16 h-16 bg-blue-200/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-indigo-200/20 rounded-full animate-pulse delay-2000"></div>
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Reset Password Card */}
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
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h2>
            <p className="text-gray-600 text-sm">Enter your new password below</p>
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

          {/* Reset Password Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-6 relative z-10"
          >
            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className={`pl-10 pr-10 h-12 text-base border-2 transition-all duration-200 ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-teal-500 focus:ring-teal-200'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs"
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className={`pl-10 pr-10 h-12 text-base border-2 transition-all duration-200 ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-teal-500 focus:ring-teal-200'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs"
                >
                  {errors.confirmPassword}
                </motion.p>
              )}
            </div>

            {/* Reset Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold text-base rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Resetting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Reset Password</span>
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
            className="mt-6 text-center relative z-10"
          >
            <button
              onClick={() => navigate(getLoginRoute())}
              className="text-teal-600 hover:text-teal-700 font-medium text-sm transition-colors"
            >
              Back to Login
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default ResetPassword
