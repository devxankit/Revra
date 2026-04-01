import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import HR_sidebar from '../admin-components/HR_sidebar'
import Loading from '../../../components/ui/loading'
import adminDashboardService from '../admin-services/adminDashboardService'
import { adminStorage } from '../admin-services/baseApiService'
import { 
  FiUsers, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiChevronDown, 
  FiFilter, 
  FiSearch, 
  FiAward, 
  FiTarget, 
  FiClock, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiBarChart, 
  FiCalendar,
  FiStar,
  FiRefreshCw,
  FiUser,
  FiShield,
  FiShoppingCart,
  FiCode,
  FiDollarSign,
  FiTrendingUp as FiTrendingUpIcon,
  FiActivity,
  FiPieChart
} from 'react-icons/fi'

const Admin_leaderboard = () => {
  // Get admin data to determine if current user is HR
  const adminData = adminStorage.get()
  const isHR = adminData?.role === 'hr'

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedModule, setSelectedModule] = useState('dev')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [allLeaderboardData, setAllLeaderboardData] = useState({
    dev: [],
    sales: [],
    pm: []
  })
  const [overallStats, setOverallStats] = useState({
    totalMembers: 0,
    avgScore: 0,
    totalCompleted: 0,
    totalProjects: 0,
    avgCompletionRate: 0,
    topPerformer: null,
    totalRevenue: 0
  })
  const [pmStats, setPmStats] = useState({
    totalPMs: 0,
    avgPerformanceScore: 0,
    avgProjectCompletionRate: 0,
    totalProjects: 0,
    totalCompletedProjects: 0,
    totalOverdueProjects: 0,
    topPM: null
  })

  // Helper to format last active time
  const formatLastActive = (date) => {
    if (!date) return 'Recently'
    try {
      const now = new Date()
      const lastActive = new Date(date)
      const diffMs = now - lastActive
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 60) return `${diffMins} mins ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      return lastActive.toLocaleDateString()
    } catch (error) {
      return 'Recently'
    }
  }

  // Transform API data to match component format
  const transformMemberData = (member) => {
    return {
      id: member._id,
      name: member.name,
      avatar: member.avatar || member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      score: member.score || member.performanceScore || 0,
      rank: member.rank || 0,
      completed: member.completed || member.completedProjects || member.completedTasks || 0,
      overdue: member.overdue || member.overdueProjects || 0,
      missed: member.missed || 0,
      onTime: member.onTime || 0,
      rate: member.rate || member.projectCompletionRate || 0,
      trend: member.trend || 'stable',
      trendValue: member.trendValue || '0%',
      department: member.department || 'Project Management',
      avgTime: member.avgTime || '2.0 days',
      lastActive: member.lastActive ? formatLastActive(member.lastActive) : 'Recently',
      projects: member.projects || member.totalProjects || 0,
      role: member.role || 'Developer',
      module: member.module || 'dev',
      earnings: member.earnings || 0,
      achievements: member.achievements || [],
      salesMetrics: member.salesMetrics || null,
      conversionRate: member.conversionRate || (member.salesMetrics && member.salesMetrics.leads > 0 
        ? Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100) 
        : 0),
      // PM-specific fields
      performanceScore: member.performanceScore,
      totalProjects: member.totalProjects,
      completedProjects: member.completedProjects,
      activeProjects: member.activeProjects,
      overdueProjects: member.overdueProjects,
      projectCompletionRate: member.projectCompletionRate,
      totalTasks: member.totalTasks,
      completedTasks: member.completedTasks
    }
  }

  // Load data from API
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await adminDashboardService.getLeaderboard({
        period: selectedPeriod
      })

      // Transform dev data (employees only, no PMs)
      const devData = (response.dev || []).map(transformMemberData)
      
      // Transform sales data
      const salesData = (response.sales || []).map(transformMemberData)
      
      // Transform PM data
      const pmData = (response.pm || []).map(transformMemberData)
      
      setAllLeaderboardData({
        dev: devData,
        sales: salesData,
        pm: pmData
      })

      // Set overall stats from API response
      if (response.overallStats) {
        setOverallStats({
          totalMembers: response.overallStats.totalMembers || 0,
          avgScore: response.overallStats.avgScore || 0,
          totalCompleted: response.overallStats.totalCompleted || 0,
          totalProjects: response.overallStats.totalProjects || 0,
          avgCompletionRate: response.overallStats.avgCompletionRate || 0,
          topPerformer: response.overallStats.topPerformer 
            ? transformMemberData(response.overallStats.topPerformer)
            : null,
          totalRevenue: response.overallStats.totalRevenue || 0
        })
      }

      // Set PM stats from API response
      if (response.pmStats) {
        setPmStats({
          totalPMs: response.pmStats.totalPMs || 0,
          avgPerformanceScore: response.pmStats.avgPerformanceScore || 0,
          avgProjectCompletionRate: response.pmStats.avgProjectCompletionRate || 0,
          totalProjects: response.pmStats.totalProjects || 0,
          totalCompletedProjects: response.pmStats.totalCompletedProjects || 0,
          totalOverdueProjects: response.pmStats.totalOverdueProjects || 0,
          topPM: response.pmStats.topPM 
            ? transformMemberData(response.pmStats.topPM)
            : null
        })
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error)
      setError('Failed to load leaderboard data. Please try again.')
      // Set default empty data on error
      setAllLeaderboardData({ dev: [], sales: [], pm: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedPeriod])

  // Filter data based on selected module
  const filteredData = useMemo(() => {
    let data = [...(allLeaderboardData[selectedModule] || [])]

    // Apply search filter
    if (searchQuery) {
      data = data.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort based on module type
    if (selectedModule === 'sales') {
      // Sort sales team by conversion rate (conversions/leads)
      return data.sort((a, b) => {
        const aConversionRate = a.conversionRate || (a.salesMetrics?.leads > 0 
          ? (a.salesMetrics.conversions / a.salesMetrics.leads) 
          : 0)
        const bConversionRate = b.conversionRate || (b.salesMetrics?.leads > 0 
          ? (b.salesMetrics.conversions / b.salesMetrics.leads) 
          : 0)
        
        // If conversion rates are equal, sort by number of conversions
        if (Math.abs(aConversionRate - bConversionRate) < 0.001) {
          return (b.salesMetrics?.conversions || 0) - (a.salesMetrics?.conversions || 0)
        }
        return bConversionRate - aConversionRate
      }).map((member, index) => ({
        ...member,
        rank: index + 1,
        conversionRate: member.conversionRate || (member.salesMetrics?.leads > 0 
          ? Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100) 
          : 0)
      }))
    } else if (selectedModule === 'pm') {
      // Sort PMs by performance score
      return data.sort((a, b) => {
        // Primary: Performance score
        if (b.performanceScore !== a.performanceScore) {
          return b.performanceScore - a.performanceScore
        }
        // Secondary: Project completion rate
        if (b.projectCompletionRate !== a.projectCompletionRate) {
          return b.projectCompletionRate - a.projectCompletionRate
        }
        // Tertiary: Fewer overdue projects
        return (a.overdueProjects || 0) - (b.overdueProjects || 0)
      }).map((member, index) => ({
        ...member,
        rank: index + 1
      }))
    } else {
      // Sort dev module by score (points)
      return data.sort((a, b) => b.score - a.score).map((member, index) => ({
        ...member,
        rank: index + 1
      }))
    }
  }, [selectedModule, searchQuery, allLeaderboardData])

  // Helper functions
  const getModuleColor = (module) => {
    switch (module) {
      case 'dev': return 'bg-blue-100 text-blue-800'
      case 'sales': return 'bg-teal-100 text-teal-800'
      case 'pm': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getModuleIcon = (module) => {
    switch (module) {
      case 'dev': return FiCode
      case 'sales': return FiShoppingCart
      case 'pm': return FiShield
      default: return FiUser
    }
  }

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return FiStar
      case 2: return FiAward
      case 3: return FiTarget
      default: return null
    }
  }

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white'
      case 2: return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
      case 3: return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const StatCard = ({ icon: Icon, label, value, subtext, color, bgColor }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${bgColor} rounded-xl p-4 shadow-sm border border-gray-100`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`${color} w-4 h-4`} />
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </motion.div>
  )

  const MemberCard = ({ member }) => {
    const [expanded, setExpanded] = useState(false)
    const ModuleIcon = getModuleIcon(member.module)
    const RankIcon = getRankIcon(member.rank)

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-sm overflow-hidden mb-3 border border-gray-100 hover:shadow-md transition-shadow duration-200"
      >
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            {/* Left Section - Rank & Avatar */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Rank Badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 relative ${getRankColor(member.rank)}`}>
                {RankIcon ? <RankIcon className="w-4 h-4" /> : member.rank}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {member.avatar}
              </div>

              {/* User Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{member.name}</h3>
                  {member.trend === 'up' && <FiTrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />}
                  {member.trend === 'down' && <FiTrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500 truncate">{member.role}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getModuleColor(member.module)}`}>
                    <ModuleIcon className="inline w-3 h-3 mr-1" />
                    {member.module.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section - Metrics & Score */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Performance Metrics */}
              <div className="text-right">
                {member.module === 'sales' && member.salesMetrics ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        member.conversionRate >= 60 ? 'bg-green-100 text-green-700' :
                        member.conversionRate >= 50 ? 'bg-teal-100 text-teal-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {member.conversionRate || Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{member.salesMetrics.conversions} conversions</p>
                  </>
                ) : member.module === 'pm' ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        member.projectCompletionRate >= 90 ? 'bg-green-100 text-green-700' :
                        member.projectCompletionRate >= 75 ? 'bg-teal-100 text-teal-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {member.projectCompletionRate}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{member.completedProjects} completed</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        member.rate >= 95 ? 'bg-green-100 text-green-700' :
                        member.rate >= 85 ? 'bg-teal-100 text-teal-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {member.rate}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{member.completed} tasks</p>
                  </>
                )}
              </div>

              {/* Score or Conversions */}
              <div className="text-right">
                {member.module === 'sales' && member.salesMetrics ? (
                  <>
                    <div className="text-lg font-bold text-gray-900">{member.salesMetrics.conversions}</div>
                    <p className="text-xs text-gray-500">conversions</p>
                  </>
                ) : member.module === 'pm' ? (
                  <>
                    <div className="text-lg font-bold text-gray-900">{member.performanceScore}</div>
                    <p className="text-xs text-gray-500">performance</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-gray-900">{member.score}</div>
                    <p className="text-xs text-gray-500">points</p>
                  </>
                )}
              </div>

              {/* Expand Icon */}
              <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 pb-4 border-t border-gray-100 pt-4"
            >
              {member.module === 'pm' ? (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiCheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-gray-600">Completed Projects</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">{member.completedProjects || 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiBarChart className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-gray-600">Total Projects</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{member.totalProjects || 0}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiClock className="w-3 h-3 text-orange-600" />
                      <span className="text-xs text-gray-600">Overdue Projects</span>
                    </div>
                    <p className="text-lg font-bold text-orange-600">{member.overdueProjects || 0}</p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiTarget className="w-3 h-3 text-teal-600" />
                      <span className="text-xs text-gray-600">Active Projects</span>
                    </div>
                    <p className="text-lg font-bold text-teal-600">{member.activeProjects || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiCheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-gray-600">Completed</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">{member.completed}</p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiTarget className="w-3 h-3 text-teal-600" />
                      <span className="text-xs text-gray-600">On Time</span>
                    </div>
                    <p className="text-lg font-bold text-teal-600">{member.onTime}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiClock className="w-3 h-3 text-orange-600" />
                      <span className="text-xs text-gray-600">Overdue</span>
                    </div>
                    <p className="text-lg font-bold text-orange-600">{member.overdue}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiBarChart className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-gray-600">Projects</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{member.projects}</p>
                  </div>
                </div>
              )}

              {/* Module-specific metrics */}
              {member.module === 'pm' && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="text-sm font-semibold text-purple-800 mb-2">Project Manager Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Projects:</span>
                      <span className="font-semibold text-purple-700">{member.totalProjects || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-semibold text-purple-700">{member.completedProjects || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active:</span>
                      <span className="font-semibold text-purple-700">{member.activeProjects || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overdue:</span>
                      <span className="font-semibold text-red-600">{member.overdueProjects || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completion Rate:</span>
                      <span className="font-semibold text-purple-700">{member.projectCompletionRate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Tasks:</span>
                      <span className="font-semibold text-purple-700">{member.totalTasks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed Tasks:</span>
                      <span className="font-semibold text-purple-700">{member.completedTasks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Performance Score:</span>
                      <span className="font-semibold text-purple-700">{member.performanceScore || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {member.module === 'sales' && member.salesMetrics && (
                <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
                  <h4 className="text-sm font-semibold text-teal-800 mb-2">Sales Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Leads:</span>
                      <span className="font-semibold text-teal-700">{member.salesMetrics.leads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversions:</span>
                      <span className="font-semibold text-teal-700">{member.salesMetrics.conversions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversion Rate:</span>
                      <span className="font-semibold text-teal-700">
                        {member.conversionRate || Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-semibold text-teal-700">₹{member.salesMetrics.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deals:</span>
                      <span className="font-semibold text-teal-700">{member.salesMetrics.deals}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Achievements */}
              {member.achievements.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Achievements</h4>
                  <div className="flex flex-wrap gap-1">
                    {member.achievements.map((achievement, index) => (
                      <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        <FiAward className="inline w-3 h-3 mr-1" />
                        {achievement}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Progress */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {member.module === 'sales' && member.salesMetrics ? 'Conversion Rate' : 
                     member.module === 'pm' ? 'Performance Score' : 'Performance'}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {member.module === 'sales' && member.salesMetrics 
                      ? `${member.conversionRate || Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100)}%` 
                      : member.module === 'pm'
                      ? `${member.performanceScore || 0}%`
                      : `${member.rate}%`}
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      member.module === 'pm' 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                    }`}
                    style={{ 
                      width: `${member.module === 'sales' && member.salesMetrics 
                        ? (member.conversionRate || Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100)) 
                        : member.module === 'pm'
                        ? (member.performanceScore || 0)
                        : member.rate}%` 
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_navbar />
        {isHR ? <HR_sidebar /> : <Admin_sidebar />}
        <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Loading size="large" className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Admin_navbar />
      
      {/* Sidebar */}
      {isHR ? <HR_sidebar /> : <Admin_sidebar />}
      
      {/* Main Content */}
      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Leaderboard
            </h1>
            <p className="text-gray-600">
                  Comprehensive performance rankings across all teams and modules
                </p>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <FiAlertTriangle className="inline w-4 h-4 mr-2" />
                {error}
              </div>
            )}
          </div>

          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={FiUsers}
              label="Total Members"
              value={overallStats.totalMembers}
              subtext="Across all modules"
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={FiBarChart}
              label="Average Score"
              value={overallStats.avgScore}
              subtext="Overall performance"
              color="text-teal-600"
              bgColor="bg-teal-50"
            />
            <StatCard
              icon={FiCheckCircle}
              label="Tasks Completed"
              value={overallStats.totalCompleted}
              subtext="This month"
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatCard
              icon={FiDollarSign}
              label="Total Revenue"
              value={`₹${overallStats.totalRevenue.toLocaleString()}`}
              subtext="Generated"
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
          </div>

          {/* Module Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Development Team</p>
                  <p className="text-2xl font-bold text-blue-600">{allLeaderboardData.dev.length}</p>
                </div>
                <FiCode className="text-blue-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sales Team</p>
                  <p className="text-2xl font-bold text-teal-600">{allLeaderboardData.sales.length}</p>
                </div>
                <FiShoppingCart className="text-teal-600 text-xl" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Project Managers</p>
                  <p className="text-2xl font-bold text-purple-600">{allLeaderboardData.pm.length}</p>
                </div>
                <FiShield className="text-purple-600 text-xl" />
              </div>
            </motion.div>
          </div>

          {/* Module Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'dev', label: 'Development', icon: FiCode },
                  { id: 'sales', label: 'Sales Team', icon: FiShoppingCart },
                  { id: 'pm', label: 'Project Managers', icon: FiShield }
                ].map((tab) => {
                  const Icon = tab.icon
                  const moduleColors = {
                    dev: 'border-blue-500 text-blue-600',
                    sales: 'border-teal-500 text-teal-600',
                    pm: 'border-purple-500 text-purple-600'
                  }
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedModule(tab.id)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                        selectedModule === tab.id
                          ? moduleColors[tab.id] || 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="text-sm" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Period Selector */}
          <div className="mb-6">
            <div className="bg-white rounded-lg p-1 shadow-sm flex gap-1 max-w-md">
              {['week', 'month', 'quarter', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`flex-1 py-2 rounded-md font-medium text-sm capitalize transition-all ${
                    selectedPeriod === period
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, role, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 ${
                showFilters ? 'bg-blue-50 text-blue-600 border-blue-300' : 'hover:bg-gray-50'
              }`}
            >
              <FiFilter className="text-sm" />
              <span>Filters</span>
            </button>
          </div>

          {/* Top Performers Preview */}
          {activeTab === 'overview' && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredData.slice(0, 3).map((member, index) => {
                  const ModuleIcon = getModuleIcon(member.module)
                  const RankIcon = getRankIcon(member.rank)
                  
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankColor(member.rank)}`}>
                          {RankIcon ? <RankIcon className="w-4 h-4" /> : member.rank}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{member.name}</h3>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {member.module === 'sales' && member.salesMetrics ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Conversions:</span>
                              <span className="font-semibold text-gray-900">{member.salesMetrics.conversions}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Conversion Rate:</span>
                              <span className="font-semibold text-green-600">
                                {member.conversionRate || Math.round((member.salesMetrics.conversions / member.salesMetrics.leads) * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Leads:</span>
                              <span className="font-semibold text-teal-600">{member.salesMetrics.leads}</span>
                            </div>
                          </>
                        ) : member.module === 'pm' ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Performance:</span>
                              <span className="font-semibold text-gray-900">{member.performanceScore || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Completion Rate:</span>
                              <span className="font-semibold text-green-600">{member.projectCompletionRate || 0}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Projects:</span>
                              <span className="font-semibold text-purple-600">{member.totalProjects || 0}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Score:</span>
                              <span className="font-semibold text-gray-900">{member.score}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Completion:</span>
                              <span className="font-semibold text-green-600">{member.rate}%</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Module:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getModuleColor(member.module)}`}>
                            <ModuleIcon className="inline w-3 h-3 mr-1" />
                            {member.module.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detailed Rankings */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedModule.toUpperCase()} Team Rankings
              </h2>
              <span className="text-sm text-gray-500">
                {filteredData.length} members
              </span>
            </div>
            
            {filteredData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'No members in this category'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredData.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </div>

          {/* Performance Insights */}
          {selectedModule === 'pm' ? (
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FiShield className="w-5 h-5 text-purple-600 mr-2" />
                PM Performance Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Top PM</h4>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      <FiStar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pmStats.topPM?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{pmStats.topPM?.performanceScore || 0} performance score</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Team Average</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Performance Score:</span>
                      <span className="font-semibold text-gray-900">{pmStats.avgPerformanceScore}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Completion Rate:</span>
                      <span className="font-semibold text-gray-900">{pmStats.avgProjectCompletionRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Overdue Projects:</span>
                      <span className="font-semibold text-red-600">{pmStats.totalOverdueProjects}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FiActivity className="w-5 h-5 text-blue-600 mr-2" />
                Performance Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Top Performer</h4>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      <FiStar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{overallStats.topPerformer?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">
                        {selectedModule === 'sales' 
                          ? `${overallStats.topPerformer?.salesMetrics?.conversions || 0} conversions`
                          : `${overallStats.topPerformer?.score || 0} points`}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Team Average</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completion Rate:</span>
                      <span className="font-semibold text-gray-900">{overallStats.avgCompletionRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Average Score:</span>
                      <span className="font-semibold text-gray-900">{overallStats.avgScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin_leaderboard
