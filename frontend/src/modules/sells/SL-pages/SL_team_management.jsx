import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiUsers, 
  FiTrendingUp,
  FiCheckCircle,
  FiTarget,
  FiBarChart,
  FiLoader,
  FiSearch,
  FiMail,
  FiPhone
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'
import { salesLeadService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_team_management = () => {
  const { toast } = useToast()
  
  // State
  const [teamData, setTeamData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch team data
  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    setIsLoading(true)
    try {
      const data = await salesLeadService.getMyTeam()
      setTeamData(data)
    } catch (error) {
      console.error('Error fetching team data:', error)
      toast.error('Failed to load team data')
      setTeamData(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter team members by search term
  const filteredMembers = teamData?.teamMembers?.filter(member => {
    const searchLower = searchTerm.toLowerCase()
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.employeeId?.toLowerCase().includes(searchLower)
    )
  }) || []

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const teamStats = teamData?.teamStats || {}
  const teamLead = teamData?.teamLead || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-md border border-purple-200/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiUsers className="text-white text-lg" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-purple-900 leading-tight">
                    My Team
                  </h1>
                  <p className="text-purple-700 text-xs font-medium mt-0.5">
                    Manage and monitor your team's performance
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-medium mb-0.5">Team Size</p>
                  <p className="text-2xl font-bold text-purple-900 leading-none">{teamStats.memberCount || 0}</p>
                  <p className="text-xs text-purple-600 font-medium mt-0.5">Members</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <FiLoader className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : !teamData ? (
          <div className="text-center py-12">
            <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Data Available</h3>
            <p className="text-gray-600">Unable to load team information. Please try again later.</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-4"
            >
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-600" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </motion.div>

            {/* Team Stats Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
              {/* Total Leads */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <FiBarChart className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600 mb-1">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalLeads || 0}</p>
              </div>

              {/* Converted Leads */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600 mb-1">Converted</p>
                <p className="text-2xl font-bold text-green-600">{teamStats.convertedLeads || 0}</p>
              </div>

              {/* Conversion Rate */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <FiTrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600 mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{teamStats.conversionRate || 0}%</p>
              </div>

              {/* Total Value */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <FiTarget className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-xs text-gray-600 mb-1">Total Value</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(teamStats.convertedValue || 0)}</p>
              </div>
            </motion.div>

            {/* Team Members List */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-3"
            >
              {filteredMembers.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiUsers className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? 'No Members Found' : 'No Team Members'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {searchTerm ? 'Try adjusting your search term.' : 'You don\'t have any team members assigned yet.'}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member, index) => {
                  const avatar = member.name?.charAt(0).toUpperCase() || 'M'
                  const performance = member.performance || {}
                  
                  // Ensure targetAchievement is a number for calculations
                  const targetAchievement = parseFloat(performance.targetAchievement || 0)
                  const salesTarget = parseFloat(member.salesTarget || 0)
                  const currentSales = parseFloat(member.currentSales || 0)
                  
                  return (
                    <motion.div
                      key={member._id || member.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-white rounded-xl p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-4">
                        {/* Member Info */}
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-purple-200">
                            <span className="text-white font-bold text-lg">{avatar}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
                              {member.name || 'Unknown Member'}
                            </h3>
                            <div className="flex flex-col space-y-1 text-xs text-gray-600">
                              {member.email && (
                                <div className="flex items-center space-x-1.5">
                                  <FiMail className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              )}
                              {member.employeeId && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-gray-400">ID:</span>
                                  <span className="font-medium">{member.employeeId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {/* Total Leads */}
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiBarChart className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-medium text-blue-700">Total Leads</p>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">{performance.totalLeads || 0}</p>
                        </div>

                        {/* Converted Leads */}
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiCheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-xs font-medium text-green-700">Converted</p>
                          </div>
                          <p className="text-2xl font-bold text-green-900">{performance.convertedLeads || 0}</p>
                        </div>

                        {/* Conversion Rate */}
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiTrendingUp className="w-4 h-4 text-purple-600" />
                            <p className="text-xs font-medium text-purple-700">Rate</p>
                          </div>
                          <p className="text-2xl font-bold text-purple-900">{performance.conversionRate || 0}%</p>
                        </div>

                        {/* Total Value */}
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiTarget className="w-4 h-4 text-orange-600" />
                            <p className="text-xs font-medium text-orange-700">Value</p>
                          </div>
                          <p className="text-lg font-bold text-orange-900 leading-tight">{formatCurrency(performance.convertedValue || 0)}</p>
                        </div>
                      </div>

                      {/* Target Achievement */}
                      {salesTarget > 0 && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Target Achievement</span>
                            <span className="text-sm font-bold text-gray-900">
                              {targetAchievement.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ 
                                width: `${Math.min(targetAchievement, 100)}%` 
                              }}
                            >
                              {targetAchievement > 10 && (
                                <span className="text-xs font-bold text-white">
                                  {Math.round(targetAchievement)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                            <span>Target: {formatCurrency(salesTarget)}</span>
                            <span>Current: {formatCurrency(currentSales)}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}

export default SL_team_management
