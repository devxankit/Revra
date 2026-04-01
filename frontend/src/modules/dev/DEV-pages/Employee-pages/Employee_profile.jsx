import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import { FiUser as User, FiMail as Mail, FiCamera as Camera, FiSave as Save, FiX as X, FiCalendar as Calendar, FiAward as Award, FiBriefcase as Briefcase, FiLogOut as LogOut, FiLoader as Loader } from 'react-icons/fi'
import { logoutEmployee, clearEmployeeData, getStoredEmployeeData } from '../../DEV-services/employeeAuthService'
import { useToast } from '../../../../contexts/ToastContext'

const Employee_profile = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    role: '',
    department: '',
    jobTitle: '',
    workTitle: '',
    joinDate: '',
    avatar: '',
    phone: '',
    location: '',
    skills: []
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await new Promise(r => setTimeout(r, 400))
      
      // Load profile data from stored Employee data
      const storedEmployeeData = getStoredEmployeeData()
      if (storedEmployeeData) {
        setProfileData({
          fullName: storedEmployeeData.name || 'Employee Name',
          email: storedEmployeeData.email || 'employee@example.com',
          role: storedEmployeeData.role || 'employee',
          department: storedEmployeeData.department || 'Development',
          jobTitle: storedEmployeeData.position || 'Software Developer',
          workTitle: storedEmployeeData.position || 'Software Developer',
          joinDate: storedEmployeeData.joiningDate || new Date(Date.now()-200*24*60*60*1000).toISOString(),
          avatar: 'EM',
          phone: storedEmployeeData.phone || '+91 90000 00000',
          location: 'Indore, IN',
          skills: storedEmployeeData.skills || ['React', 'Tailwind']
        })
      } else {
        // Fallback data if no stored data
        setProfileData({
          fullName: 'Employee Name',
          email: 'employee@example.com',
          role: 'employee',
          department: 'Development',
          jobTitle: 'Software Developer',
          workTitle: 'Software Developer',
          joinDate: new Date(Date.now()-200*24*60*60*1000).toISOString(),
          avatar: 'EM',
          phone: '+91 90000 00000',
          location: 'Indore, IN',
          skills: ['React', 'Tailwind']
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleProfileUpdate = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setIsEditing(false)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logoutEmployee()
      clearEmployeeData()
      toast.logout('You have been successfully logged out', {
        title: 'Logged Out',
        duration: 2000
      })
      setTimeout(() => {
        navigate('/employee-login')
      }, 800)
    } catch (error) {
      console.error('Logout error:', error)
      clearEmployeeData()
      toast.error('Logout failed, but you have been logged out locally', {
        title: 'Logout Error',
        duration: 2000
      })
      setTimeout(() => {
        navigate('/employee-login')
      }, 1000)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <Employee_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64 text-gray-600">Loading profile...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
      <Employee_navbar />
      <main className="pt-16 pb-24 md:pt-20 md:pb-8">
        <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition-all duration-200 ${isEditing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-primary text-white hover:bg-primary-dark'}`}>
                    {isEditing ? <X className="h-4 w-4" /> : 'Edit'}
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Logout"
                  >
                    {isLoggingOut ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-18 md:h-18 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center">
                      <span className="text-lg md:text-xl font-bold text-primary">{profileData.avatar}</span>
                    </div>
                    {isEditing && (
                      <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors duration-200 shadow-lg">
                        <Camera className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{profileData.fullName}</h3>
                    <p className="text-xs text-gray-500">{profileData.role}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                    {isEditing ? (
                      <input type="text" value={profileData.fullName} onChange={(e)=>handleProfileUpdate('fullName', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm font-medium" placeholder="Enter your full name" />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{profileData.fullName}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">{profileData.email}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{profileData.role}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Role assigned by admin</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                    <div className="flex items-center space-x-2">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{profileData.department}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Department assigned by admin</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Join Date</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">Joined {new Date(profileData.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Start date</p>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <button onClick={handleSaveProfile} disabled={saving} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-all duration-200 shadow-lg hover:shadow-xl mx-auto disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    <span className="text-sm font-medium">{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Account Information</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600">Account Type</span>
                  <span className="text-xs font-semibold text-gray-900">Employee</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600">Role</span>
                  <span className="text-xs font-semibold text-gray-900">{profileData.role}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600">Department</span>
                  <span className="text-xs font-semibold text-gray-900">{profileData.department}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600">Member Since</span>
                  <span className="text-xs font-semibold text-gray-900">{new Date(profileData.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Employee_profile

