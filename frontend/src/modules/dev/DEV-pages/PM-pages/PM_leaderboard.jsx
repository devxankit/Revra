import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  FiLoader
} from 'react-icons/fi'
import PM_navbar from '../../DEV-components/PM_navbar'
import { teamService } from '../../DEV-services/teamService'

const PM_leaderboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employees, setEmployees] = useState([])
  const [teamStats, setTeamStats] = useState({
    totalEmployees: 0,
    avgCompletionRate: 0,
    totalTasksCompleted: 0,
    totalOverdue: 0,
    topPerformer: null,
    avgProjectProgress: 0,
    totalProjects: 0
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

  // Load leaderboard data
  const loadLeaderboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await teamService.getTeamLeaderboard({
        period: selectedPeriod
      })

      // Transform API response to match component format
      const transformedEmployees = (response.leaderboard || []).map((emp) => ({
        id: emp._id,
        name: emp.name,
        avatar: emp.avatar || emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        score: emp.score || 0,
        rank: emp.rank || 0,
        completed: emp.completed || 0,
        overdue: emp.overdue || 0,
        missed: emp.missed || 0,
        onTime: emp.onTime || 0,
        rate: emp.rate || 0,
        trend: emp.trend || 'stable',
        trendValue: emp.trendValue || '0%',
        department: emp.department || 'Development',
        avgTime: emp.avgTime || '2.0 days',
        lastActive: formatLastActive(emp.lastActive),
        projects: emp.projects || 0,
        role: emp.role || 'Developer'
      }))

      setEmployees(transformedEmployees)
      
      // Set team statistics
      if (response.teamStats) {
        setTeamStats({
          totalEmployees: response.teamStats.totalEmployees || 0,
          avgCompletionRate: response.teamStats.avgCompletionRate || 0,
          totalTasksCompleted: response.teamStats.totalTasksCompleted || 0,
          totalOverdue: response.teamStats.totalOverdue || 0,
          topPerformer: response.teamStats.topPerformer || null,
          avgProjectProgress: response.teamStats.avgProjectProgress || 0,
          totalProjects: response.teamStats.totalProjects || 0
        })
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error)
      setError('Failed to load leaderboard data. Please try again.')
      setEmployees([])
      setTeamStats({
        totalEmployees: 0,
        avgCompletionRate: 0,
        totalTasksCompleted: 0,
        totalOverdue: 0,
        topPerformer: null,
        avgProjectProgress: 0,
        totalProjects: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboardData()
  }, [selectedPeriod])

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate performance distribution from real data
  const performanceDistribution = React.useMemo(() => {
    const excellent = employees.filter(e => e.rate >= 95).length
    const good = employees.filter(e => e.rate >= 85 && e.rate < 95).length
    const needsSupport = employees.filter(e => e.rate < 85).length
    const total = employees.length

    return {
      excellent: { count: excellent, percentage: total > 0 ? (excellent / total) * 100 : 0 },
      good: { count: good, percentage: total > 0 ? (good / total) * 100 : 0 },
      needsSupport: { count: needsSupport, percentage: total > 0 ? (needsSupport / total) * 100 : 0 }
    }
  }, [employees])

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

  const EmployeeCard = ({ employee, isExpanded }) => {
    const [expanded, setExpanded] = useState(false)

  return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-sm overflow-hidden mb-3 border border-gray-100"
      >
         <div 
           className="p-3 cursor-pointer hover:bg-gray-50 transition-all duration-200"
           onClick={() => setExpanded(!expanded)}
         >
           <div className="flex items-center justify-between">
             {/* Left Section - Rank & Avatar */}
             <div className="flex items-center gap-2 min-w-0 flex-1">
               {/* Rank Badge */}
               <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                 employee.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                 employee.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                 employee.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                 'bg-gray-100 text-gray-600'
               }`}>
                 {employee.rank}
               </div>

               {/* Avatar */}
               <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0">
                 {employee.avatar}
               </div>

               {/* User Info */}
               <div className="min-w-0 flex-1">
                 <div className="flex items-center gap-1">
                   <h3 className="font-semibold text-gray-900 text-sm truncate">{employee.name}</h3>
                   {employee.trend === 'up' && <FiTrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />}
                   {employee.trend === 'down' && <FiTrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />}
                 </div>
                 <p className="text-xs text-gray-500 truncate">{employee.role}</p>
               </div>
             </div>

             {/* Right Section - Metrics & Score */}
             <div className="flex items-center gap-2 shrink-0">
               {/* Performance Metrics */}
               <div className="text-right">
                 <div className="flex items-center gap-1">
                   <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                     employee.rate >= 95 ? 'bg-green-100 text-green-700' :
                     employee.rate >= 85 ? 'bg-teal-100 text-teal-700' :
                     'bg-orange-100 text-orange-700'
                   }`}>
                     {employee.rate}%
                   </span>
                 </div>
               </div>

               {/* Score */}
               <div className="text-right">
                 <div className="text-sm font-bold text-gray-900">{employee.score}</div>
               </div>

               {/* Expand Icon */}
               <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
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
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-gray-600">Completed</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">{employee.completed}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiTarget className="w-3 h-3 text-teal-600" />
                    <span className="text-xs text-gray-600">On Time</span>
                  </div>
                  <p className="text-lg font-bold text-teal-600">{employee.onTime}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiClock className="w-3 h-3 text-orange-600" />
                    <span className="text-xs text-gray-600">Overdue</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600">{employee.overdue}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiAlertTriangle className="w-3 h-3 text-red-600" />
                    <span className="text-xs text-gray-600">Missed</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">{employee.missed}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Projects</span>
                  <span className="font-semibold text-gray-800">{employee.projects}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">{employee.rate}%</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full"
                    style={{ width: `${employee.rate}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 pb-20">
        <PM_navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FiLoader className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading leaderboard data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 pb-20">
      <PM_navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 sm:px-6 lg:px-8 pt-16 pb-6 rounded-b-2xl shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Team Performance</h1>
              <p className="text-teal-100 text-sm mt-1">Monitor your team's progress and achievements</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <FiUsers className="w-5 h-5" />
            </div>
          </div>

          {/* Team Overview Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg md:text-xl font-bold">{teamStats.totalEmployees}</p>
                <p className="text-teal-100 text-xs mt-1">Team Members</p>
              </div>
              <div className="text-center border-l border-r border-white/20">
                <p className="text-lg md:text-xl font-bold">{teamStats.avgCompletionRate}%</p>
                <p className="text-teal-100 text-xs mt-1">Avg Rate</p>
              </div>
              <div className="text-center border-r border-white/20">
                <p className="text-lg md:text-xl font-bold">{teamStats.totalTasksCompleted}</p>
                <p className="text-teal-100 text-xs mt-1">Tasks Done</p>
              </div>
              <div className="text-center">
                <p className="text-lg md:text-xl font-bold">{teamStats.totalProjects}</p>
                <p className="text-teal-100 text-xs mt-1">Active Projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 relative z-10">
        {/* Period Selector */}
        <div className="mb-4">
          <div className="bg-white rounded-xl p-1 shadow-sm flex gap-1">
            {['week', 'month', 'quarter'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`flex-1 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                  selectedPeriod === period
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="bg-white rounded-xl p-1 shadow-sm flex gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'overview'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'detailed'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Detailed View
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* Team Stats Grid */}
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-3">Team Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={FiCheckCircle}
                  label="Tasks Done"
                  value={teamStats.totalTasksCompleted}
                  subtext="This month"
                  color="text-green-600"
                  bgColor="bg-green-50"
                />
                <StatCard
                  icon={FiBarChart}
                  label="Avg Success"
                  value={`${teamStats.avgCompletionRate}%`}
                  subtext="Team average"
                  color="text-teal-600"
                  bgColor="bg-teal-50"
                />
                <StatCard
                  icon={FiClock}
                  label="Overdue"
                  value={teamStats.totalOverdue}
                  subtext="Needs attention"
                  color="text-orange-600"
                  bgColor="bg-orange-50"
                />
                <StatCard
                  icon={FiAward}
                  label="Top Performer"
                  value={teamStats.topPerformer ? teamStats.topPerformer.split(' ')[0] : 'N/A'}
                  subtext={teamStats.topPerformer || 'No data'}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiStar className="w-4 h-4 text-yellow-600" />
                Top 3 Performers
              </h3>
              <div className="space-y-2">
                {employees.slice(0, 3).map((emp, idx) => (
                  <motion.div 
                    key={emp.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-100"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-md' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md' :
                      'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.completed} tasks • {emp.rate}% • {emp.projects} projects</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 text-sm">{emp.score}</p>
                      <p className="text-xs text-green-600 font-medium">{emp.trendValue}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-4 shadow-sm border border-teal-100">
              <h3 className="font-bold text-gray-800 mb-3">Performance Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Excellent (95-100%)</span>
                    <span className="font-semibold text-green-600">{performanceDistribution.excellent.count} members</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${performanceDistribution.excellent.percentage}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Good (85-94%)</span>
                    <span className="font-semibold text-teal-600">{performanceDistribution.good.count} members</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${performanceDistribution.good.percentage}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Needs Support (&lt;85%)</span>
                    <span className="font-semibold text-orange-600">{performanceDistribution.needsSupport.count} members</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${performanceDistribution.needsSupport.percentage}%` }} />
                  </div>
                </div>
        </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 border border-gray-100">
              <FiSearch className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, role, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-sm text-gray-800"
              />
              <button className="bg-teal-50 p-2 rounded-lg">
                <FiFilter className="w-4 h-4 text-teal-600" />
              </button>
            </div>

            {/* Employee Cards */}
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <FiAlertTriangle className="inline w-4 h-4 mr-2" />
                  {error}
                </div>
              )}
              <p className="text-sm text-gray-600 mb-3">
                Showing {filteredEmployees.length} of {employees.length} team members
              </p>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'No team members assigned to your projects'}
                  </p>
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PM_leaderboard