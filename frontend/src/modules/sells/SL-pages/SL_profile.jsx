import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SL_navbar from '../SL-components/SL_navbar'
import { FiUser as User, FiMail as Mail, FiCamera as Camera, FiSave as Save, FiX as X, FiCalendar as Calendar, FiAward as Award, FiBriefcase as Briefcase, FiLogOut as LogOut, FiLoader as Loader, FiTrendingUp, FiUsers, FiTarget } from 'react-icons/fi'
import { logoutSales, clearSalesData, getSalesProfile, getStoredSalesData } from '../SL-services/salesAuthService'
import { useToast } from '../../../contexts/ToastContext'
import { salesAnalyticsService } from '../SL-services'
import { salesPaymentsService } from '../SL-services'

const SL_profile = () => {
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
  const [performanceStats, setPerformanceStats] = useState({
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalClients: 0,
    pendingPayments: 0,
    activeLeads: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const formatJoinDate = (value) => {
    if (!value) return 'N/A'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    }).format(d)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await new Promise(r => setTimeout(r, 400))
      
      // Load profile data from stored Sales data
      let storedSalesData = getStoredSalesData()

      // Ensure we have joiningDate from backend (loginTime is last login, not join date)
      if (storedSalesData && !storedSalesData.joiningDate) {
        try {
          const prof = await getSalesProfile()
          const sales = prof?.data?.sales || {}
          const joiningDate = sales.joiningDate || sales.createdAt
          if (joiningDate) {
            storedSalesData = { ...storedSalesData, joiningDate }
            localStorage.setItem('salesUser', JSON.stringify(storedSalesData))
          }
        } catch (e) {
          // ignore; we'll fall back below
        }
      }

      if (storedSalesData) {
        // Use joiningDate first; createdAt as fallback. Never use loginTime (that's last login, not join date)
        const joinDate =
          storedSalesData.joiningDate ||
          storedSalesData.createdAt ||
          new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
        setProfileData({
          fullName: storedSalesData.name || 'Sales User',
          email: storedSalesData.email || 'sales@example.com',
          role: storedSalesData.role || 'sales',
          department: storedSalesData.department || 'Sales',
          jobTitle: storedSalesData.position || 'Sales Representative',
          workTitle: storedSalesData.position || 'Sales Representative',
          joinDate,
          avatar: 'SL',
          phone: storedSalesData.phone || '+91 90000 00000',
          location: 'Indore, IN',
          skills: storedSalesData.skills || ['Sales', 'Communication']
        })
      } else {
        // Fallback data if no stored data
        setProfileData({
          fullName: 'Sales User',
          email: 'sales@example.com',
          role: 'sales',
          department: 'Sales',
          jobTitle: 'Sales Representative',
          workTitle: 'Sales Representative',
          joinDate: new Date(Date.now()-200*24*60*60*1000).toISOString(),
          avatar: 'SL',
          phone: '+91 90000 00000',
          location: 'Indore, IN',
          skills: ['Sales', 'Communication']
        })
      }
      setLoading(false)
    }
    load()
    
    // Load performance stats
    const loadStats = async () => {
      try {
        setStatsLoading(true)
        const [dashboardStats, tileStats, paymentStats] = await Promise.all([
          salesAnalyticsService.getDashboardStats().catch(() => ({ data: { statusCounts: {}, totalLeads: 0 } })),
          salesAnalyticsService.getTileCardStats().catch(() => ({ data: {} })),
          salesPaymentsService.getReceivableStats().catch(() => ({ totalDue: 0 }))
        ])
        
        const statusCounts = dashboardStats?.data?.statusCounts || {}
        const totalLeads = dashboardStats?.data?.totalLeads || 0
        const converted = statusCounts.converted || 0
        const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0
        
        // Calculate active leads (connected + followup + hot + quotation_sent + demo_sent + web + app_client)
        const activeLeads = (statusCounts.connected || 0) + 
                           (statusCounts.followup || 0) + 
                           (statusCounts.hot || 0) + 
                           (statusCounts.quotation_sent || 0) + 
                           (statusCounts.demo_sent || 0) + 
                           (statusCounts.web || 0) + 
                           (statusCounts.app_client || 0)
        
        setPerformanceStats({
          totalLeads,
          convertedLeads: converted,
          conversionRate,
          totalClients: converted, // Same as converted leads
          pendingPayments: paymentStats?.totalDue || 0,
          activeLeads
        })
      } catch (error) {
        console.error('Failed to load performance stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [])

  const handleProfileUpdate = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Persist editable fields locally (no backend update endpoint for Sales profile)
      const stored = getStoredSalesData() || {}
      const updated = {
        ...stored,
        name: profileData.fullName,
        // Store as joiningDate so it's consistent across app
        joiningDate: profileData.joinDate,
        // Keep a backup in case older code reads createdAt/loginTime
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem('salesUser', JSON.stringify(updated))
      await new Promise(r => setTimeout(r, 300))
      toast.success('Profile updated')
    } catch (e) {
      console.error('Failed to save profile locally:', e)
      toast.error('Failed to save profile')
    }
    setSaving(false)
    setIsEditing(false)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logoutSales()
      clearSalesData()
      toast.logout('You have been successfully logged out', {
        title: 'Logged Out',
        duration: 2000
      })
      setTimeout(() => {
        navigate('/sales-login')
      }, 800)
    } catch (error) {
      console.error('Logout error:', error)
      clearSalesData()
      toast.error('Logout failed, but you have been logged out locally', {
        title: 'Logout Error',
        duration: 2000
      })
      setTimeout(() => {
        navigate('/sales-login')
      }, 1000)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <SL_navbar />
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
      <SL_navbar />
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
                      {isEditing ? (
                        <input
                          type="date"
                          value={(() => {
                            const d = new Date(profileData.joinDate)
                            if (Number.isNaN(d.getTime())) return ''
                            return d.toISOString().split('T')[0]
                          })()}
                          onChange={(e) => handleProfileUpdate('joinDate', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm font-medium"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">Joined {formatJoinDate(profileData.joinDate)}</span>
                      )}
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

            {/* Performance Statistics */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg">
                  <FiTrendingUp className="h-4 w-4 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Performance Overview</h2>
              </div>
              
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Leads */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <FiUsers className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">Total Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{performanceStats.totalLeads.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 mt-1">All time leads</p>
                  </div>

                  {/* Active Leads */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <FiTrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700">Active Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{performanceStats.activeLeads.toLocaleString()}</p>
                    <p className="text-xs text-purple-600 mt-1">In pipeline</p>
                  </div>

                  {/* Converted & Clients */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <Award className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Converted & Clients</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{performanceStats.convertedLeads.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">{performanceStats.conversionRate}% conversion rate</p>
                  </div>

                  {/* Pending Payments */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg font-bold text-orange-600">₹</span>
                      <span className="text-xs font-medium text-orange-700">Pending Payments</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">₹{performanceStats.pendingPayments.toLocaleString()}</p>
                    <p className="text-xs text-orange-600 mt-1">Recovery amount</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SL_profile
