import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import { useToast } from '../../../contexts/ToastContext'
import { getAdminProfile, changePassword } from '../admin-services/adminAuthService'
import { Button } from '../../../components/ui/button'

const Admin_profile = () => {
  const { toast } = useToast()

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [formValues, setFormValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true)
        const response = await getAdminProfile()
        if (response && response.success && response.data?.admin) {
          setProfile(response.data.admin)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Error loading admin profile:', err)
        toast.error(err.message || 'Failed to load profile')
        setProfile(null)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [toast])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const errors = {}
    if (!formValues.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }
    if (!formValues.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (formValues.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters'
    }
    if (!formValues.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (formValues.newPassword !== formValues.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsUpdating(true)
      const response = await changePassword(
        formValues.currentPassword,
        formValues.newPassword
      )
      if (response && response.success) {
        toast.success(response.message || 'Password updated successfully')
        setFormValues({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        toast.error(response?.message || 'Failed to update password')
      }
    } catch (err) {
      console.error('Error updating password:', err)
      toast.error(err.message || 'Failed to update password')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (value) => {
    if (!value) return '-'
    try {
      return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    } catch {
      return value
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_navbar />
      <Admin_sidebar />

      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              Admin Profile
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              View your account details and update your password.
            </p>
          </motion.div>

          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              Account Details
            </h2>
            {loadingProfile ? (
              <div className="py-6 text-sm text-gray-500">Loading profile...</div>
            ) : !profile ? (
              <div className="py-6 text-sm text-gray-500">
                Unable to load profile details.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{profile.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {profile.role?.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        profile.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          profile.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {profile.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(profile.lastLogin)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Account Created</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(profile.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Change password card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <h2 className="text-sm font-semibold text-gray-800 mb-1">
              Change Password
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Use a strong password that you don&apos;t reuse on other sites.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formValues.currentPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter current password"
                />
                {formErrors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={formValues.newPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter new password"
                />
                {formErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formValues.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Confirm new password"
                />
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium"
                >
                  {isUpdating ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Admin_profile

