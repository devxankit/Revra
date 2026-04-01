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
import Employee_navbar from '../../DEV-components/Employee_navbar'
import { employeeService, socketService } from '../../DEV-services'

const Employee_leaderboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [teamStats, setTeamStats] = useState(null)
  const [isTeamLead, setIsTeamLead] = useState(false)
  const [viewScope, setViewScope] = useState('self') // 'self' or 'team'

  useEffect(() => {
    loadLeaderboardData()
    setupWebSocket()

    return () => {
      socketService.disconnect()
    }
  }, [])

  useEffect(() => {
    if (selectedPeriod || viewScope) {
      loadLeaderboardData()
    }
  }, [selectedPeriod, viewScope])

  const setupWebSocket = () => {
    const token = localStorage.getItem('employeeToken')
    if (token) {
      socketService.connect(token)

      // Listen for real-time leaderboard updates
      socketService.on('leaderboard_updated', () => {
        loadLeaderboardData()
      })

      socketService.on('employee_points_updated', () => {
        loadLeaderboardData()
      })
    }
  }

  const loadLeaderboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await employeeService.getEmployeeLeaderboard({
        page: 1,
        limit: 50,
        period: selectedPeriod,
        viewScope: viewScope
      })

      setIsTeamLead(response.isTeamLead || false)
      setTeamStats(response.teamStats || null)

      // Transform API response to match interface
      const transformedData = response.leaderboard?.map((emp, index) => ({
        id: emp._id,
        name: emp.name,
        avatar: (emp.name || '?').toString().trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?',
        score: emp.points || 0,
        rank: emp.rank,
        completed: emp.statistics?.tasksCompleted || 0,
        overdue: emp.statistics?.tasksOverdue || 0,
        missed: emp.statistics?.tasksMissed || 0,
        onTime: emp.statistics?.tasksOnTime || 0,
        rate: emp.statistics?.completionRate || 0,
        trend: emp.trend || "stable",
        trendValue: emp.trendValue || "0%",
        department: emp.department || "Development",
        avgTime: emp.statistics?.averageCompletionTime ? `${emp.statistics.averageCompletionTime} days` : "2.0 days",
        lastActive: emp.lastActive || "Recently",
        projects: emp.projects?.length || 0,
        role: emp.position || "Developer",
        isCurrentUser: emp.isCurrentEmployee || false
      })) || []

      setLeaderboardData(transformedData)

      // Set current user data
      const currentEmp = response.currentEmployee
      if (currentEmp) {
        setCurrentUser({
          name: currentEmp.name,
          rank: currentEmp.rank || 1,
          score: currentEmp.points || 0,
          avatar: (currentEmp.name || '?').toString().trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?',
          completedTasks: currentEmp.statistics?.tasksCompleted || 0,
          overdueTasks: currentEmp.statistics?.tasksOverdue || 0,
          missedDeadlines: currentEmp.statistics?.tasksMissed || 0,
          onTimeTasks: currentEmp.statistics?.tasksOnTime || 0,
          completionRate: currentEmp.statistics?.completionRate || 0,
          avgCompletionTime: currentEmp.statistics?.averageCompletionTime ? `${currentEmp.statistics.averageCompletionTime} days` : "2.0 days",
          department: currentEmp.department || "Development",
          role: currentEmp.position || "Developer"
        })
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error)
      setError('Failed to load leaderboard data. Please try again.')
      // Set default data on error
      setLeaderboardData([])
      setCurrentUser({
        name: "Employee",
        rank: 1,
        score: 0,
        avatar: "E",
        completedTasks: 0,
        overdueTasks: 0,
        missedDeadlines: 0,
        onTimeTasks: 0,
        completionRate: 0,
        avgCompletionTime: "0 days",
        department: "Development",
        role: "Developer"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = leaderboardData.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        className={`bg-white rounded-xl shadow-sm overflow-hidden mb-3 border border-gray-100 ${employee.isCurrentUser ? 'ring-2 ring-teal-200 bg-teal-50/30' : ''
          }`}
      >
        <div
          className="p-3 cursor-pointer hover:bg-gray-50 transition-all duration-200"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            {/* Left Section - Rank & Avatar */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Rank Badge */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${employee.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
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
                  <h3 className={`font-semibold text-sm truncate ${employee.isCurrentUser ? 'text-teal-600' : 'text-gray-900'}`}>
                    {employee.name} {employee.isCurrentUser && '(You)'}
                  </h3>
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
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${employee.rate >= 95 ? 'bg-green-100 text-green-700' :
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 pb-20">
        <Employee_navbar />
        <div className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FiLoader className="animate-spin text-4xl text-primary mx-auto mb-4" />
                <p className="text-gray-600">Loading leaderboard...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 pb-20">
      <Employee_navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 sm:px-6 lg:px-8 pt-16 pb-6 rounded-b-2xl shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Leaderboard</h1>
              <p className="text-teal-100 text-sm mt-1">Track your performance and rankings</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <FiAward className="w-5 h-5" />
            </div>
          </div>

          {/* Current User Card */}
          {currentUser && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{currentUser.name}</p>
                    <p className="text-teal-100 text-xs">Your Rank: #{currentUser.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-yellow-300 text-lg font-bold">{currentUser.score}</p>
                  <p className="text-teal-100 text-xs">Points</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 relative z-10">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">{error}</div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Team Lead Scope Switch */}
        {isTeamLead && (
          <div className="mb-4">
            <div className="bg-white rounded-xl p-1 shadow-sm flex gap-1 border border-gray-100">
              <button
                onClick={() => setViewScope('self')}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${viewScope === 'self'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                My Performance
              </button>
              <button
                onClick={() => setViewScope('team')}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${viewScope === 'team'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                Team Leaderboard
              </button>
            </div>
          </div>
        )}

        {/* Period Selector */}
        <div className="mb-4">
          <div className="bg-white rounded-xl p-1 shadow-sm flex gap-1 border border-gray-100">
            {['week', 'month', 'quarter'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`flex-1 py-2 rounded-lg font-medium text-sm capitalize transition-all ${selectedPeriod === period
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
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'overview'
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('rankings')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'rankings'
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Rankings
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-3">
                {viewScope === 'team' ? 'Team Performance Overview' : 'Your Performance Overview'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={viewScope === 'team' ? FiUsers : FiCheckCircle}
                  label={viewScope === 'team' ? "Team Size" : "Completed"}
                  value={viewScope === 'team' ? teamStats?.totalEmployees || 0 : currentUser?.completedTasks || 0}
                  subtext={viewScope === 'team' ? "Active members" : "This month"}
                  color={viewScope === 'team' ? "text-blue-600" : "text-green-600"}
                  bgColor={viewScope === 'team' ? "bg-blue-50" : "bg-green-50"}
                />
                <StatCard
                  icon={FiCheckCircle}
                  label={viewScope === 'team' ? "Tasks Done" : "On Time"}
                  value={viewScope === 'team' ? teamStats?.totalTasksCompleted || 0 : currentUser?.onTimeTasks || 0}
                  subtext={viewScope === 'team' ? "By whole team" : "Tasks delivered"}
                  color="text-teal-600"
                  bgColor="bg-teal-50"
                />
                <StatCard
                  icon={FiClock}
                  label="Overdue"
                  value={viewScope === 'team' ? teamStats?.totalOverdue || 0 : currentUser?.overdueTasks || 0}
                  subtext={viewScope === 'team' ? "Team bottlenecks" : "Needs attention"}
                  color="text-orange-600"
                  bgColor="bg-orange-50"
                />
                <StatCard
                  icon={FiAward}
                  label={viewScope === 'team' ? "Avg. Rate" : "Points"}
                  value={viewScope === 'team' ? `${teamStats?.avgCompletionRate || 0}%` : currentUser?.score || 0}
                  subtext={viewScope === 'team' ? "Team Efficiency" : "Achievement score"}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
              </div>
            </div>

            {/* Performance Metrics Detail */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiBarChart className="w-4 h-4 text-teal-600" />
                {viewScope === 'team' ? 'Team Performance Accuracy' : 'Your Performance Success'}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      {viewScope === 'team' ? 'Combined Completion Rate' : 'Personal Completion Rate'}
                    </span>
                    <span className="font-bold text-gray-800">
                      {viewScope === 'team' ? teamStats?.avgCompletionRate || 0 : currentUser?.completionRate || 0}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full"
                      style={{ width: `${viewScope === 'team' ? teamStats?.avgCompletionRate || 0 : currentUser?.completionRate || 0}%` }}
                    />
                  </div>
                </div>

                {viewScope === 'team' && teamStats?.topPerformer ? (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                    <span className="text-gray-600 text-sm">Team MVP</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-600">{teamStats.topPerformer.name}</span>
                      <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[8px] font-black uppercase rounded border border-teal-100">
                        {teamStats.topPerformer.points} PTS
                      </span>
                    </div>
                  </div>
                ) : !viewScope || viewScope === 'self' ? (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                    <span className="text-gray-600 text-sm">Total Achievement Points</span>
                    <span className="font-bold text-teal-600 text-lg">{currentUser?.score || 0}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Top Performers Preview - Only show in team view or if multiple performers available */}
            {leaderboardData.length > 0 && (
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-4 shadow-sm border border-teal-100">
                <h3 className="font-bold text-gray-800 mb-3">
                  {viewScope === 'team' ? 'Team Rankings' : 'Current Standing'}
                </h3>
                <div className="space-y-2">
                  {leaderboardData.slice(0, 3).map((emp, idx) => (
                    <motion.div
                      key={emp.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border border-teal-100 ${emp.isCurrentUser ? 'bg-white shadow-md' : 'bg-white/50'
                        }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                          'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                        }`}>
                        {emp.rank}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${emp.isCurrentUser ? 'text-teal-600' : 'text-gray-800'}`}>
                          {emp.name} {emp.isCurrentUser && '(You)'}
                        </p>
                        <p className="text-xs text-gray-500">{emp.completed} tasks • {emp.rate}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 text-sm">{emp.score}</p>
                        <p className="text-xs text-green-600 font-medium">{emp.trendValue}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
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
              <p className="text-sm text-gray-600 mb-3">
                Showing {filteredEmployees.length} of {leaderboardData.length} members
              </p>
              {filteredEmployees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>

            {/* Motivational Card */}
            {currentUser && leaderboardData.length > 1 && (
              <div className="bg-gradient-to-r from-teal-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                <h3 className="font-bold text-base mb-2">Keep Going! 🚀</h3>
                <p className="text-white/90 text-sm mb-3">
                  {leaderboardData.length > 1 && leaderboardData[1] ? (
                    `You're only ${leaderboardData[1]?.score - currentUser.score} points away from rank #${currentUser.rank - 1}. Complete your pending tasks to climb up!`
                  ) : (
                    "You're doing great! Keep completing tasks to stay on top of your performance goals."
                  )}
                </p>
                <button className="bg-white text-teal-600 px-4 py-2 rounded-lg font-semibold text-sm hover:shadow-md transition-all flex items-center gap-2">
                  View Tasks
                  <FiChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Employee_leaderboard
