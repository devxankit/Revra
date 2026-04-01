import React, { useState, useEffect, useMemo } from 'react'
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
  FiRefreshCw,
  FiActivity,
  FiPieChart,
  FiShoppingCart,
  FiDollarSign
} from 'react-icons/fi'
import { salesAnalyticsService } from '../SL-services'

const SalesLeaderboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [salesData, setSalesData] = useState([])
  const [overallStats, setOverallStats] = useState({
    totalMembers: 0,
    avgScore: 0,
    totalCompleted: 0,
    totalProjects: 0,
    avgCompletionRate: 0,
    topPerformer: null,
    totalRevenue: 0
  })

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
    } catch {
      return 'Recently'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const transformMember = (member) => {
    const salesMetrics = member.salesMetrics || {}
    const leads = salesMetrics.leads || 0
    const conversions = salesMetrics.conversions || 0
    const revenue = salesMetrics.revenue || 0
    const conversionRate =
      member.conversionRate ||
      (leads > 0 ? Math.round((conversions / leads) * 100) : 0)

    return {
      id: member._id,
      name: member.name,
      avatar:
        member.avatar ||
        (member.name || '?')
          .toString()
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      rank: member.rank || 0,
      salesMetrics: {
        leads,
        conversions,
        revenue,
        deals: salesMetrics.deals || conversions
      },
      conversionRate,
      lastActive: member.lastActive ? formatLastActive(member.lastActive) : 'Recently',
      role: member.role || 'Sales Executive'
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await salesAnalyticsService.getLeaderboard({
        period: selectedPeriod
      })

      const sales = (response.sales || []).map(transformMember)
      setSalesData(sales)

      if (response.overallStats) {
        setOverallStats({
          totalMembers: response.overallStats.totalMembers || 0,
          avgScore: response.overallStats.avgScore || 0,
          totalCompleted: response.overallStats.totalCompleted || 0,
          totalProjects: response.overallStats.totalProjects || 0,
          avgCompletionRate: response.overallStats.avgCompletionRate || 0,
          topPerformer: response.overallStats.topPerformer
            ? transformMember(response.overallStats.topPerformer)
            : null,
          totalRevenue: response.overallStats.totalRevenue || 0
        })
      }
    } catch (err) {
      console.error('Error loading sales leaderboard:', err)
      setError('Failed to load sales leaderboard data. Please try again.')
      setSalesData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedPeriod])

  const filteredData = useMemo(() => {
    let data = [...salesData]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
      )
    }

    // Already sorted by backend, but recompute ranks after any filtering
    return data.map((m, index) => ({
      ...m,
      rank: index + 1
    }))
  }, [salesData, searchQuery])

  const StatCard = ({ icon: Icon, label, value, subtext, color, bgColor }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
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
    const RankIcon =
      member.rank === 1 ? FiStar : member.rank === 2 ? FiAward : member.rank === 3 ? FiTarget : null

    const rankClass =
      member.rank === 1
        ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white'
        : member.rank === 2
        ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
        : member.rank === 3
        ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
        : 'bg-gray-100 text-gray-600'

    const conversionColor =
      member.conversionRate >= 60
        ? 'bg-green-100 text-green-700'
        : member.conversionRate >= 50
        ? 'bg-teal-100 text-teal-700'
        : 'bg-orange-100 text-orange-700'

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200"
      >
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left: rank, avatar, info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rankClass}`}
              >
                {RankIcon ? <RankIcon className="w-4 h-4" /> : member.rank}
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {member.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {member.name}
                  </h3>
                  {member.conversionRate >= 70 && (
                    <FiTrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{member.role}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                    <FiShoppingCart className="w-3 h-3 mr-1" />
                    Sales
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Last active: {member.lastActive}
                </p>
              </div>
            </div>

            {/* Right: metrics */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${conversionColor}`}
                  >
                    {member.conversionRate}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {member.salesMetrics.conversions} conversions
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {member.salesMetrics.conversions}
                </div>
                <p className="text-xs text-gray-500">deals</p>
              </div>
              <FiChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="px-4 pb-4 border-t border-gray-100 pt-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-gray-600">Conversions</span>
                  </div>
                  <p className="text-lg font-bold text-green-700">
                    {member.salesMetrics.conversions}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiBarChart className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-gray-600">Leads</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    {member.salesMetrics.leads}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiTarget className="w-3 h-3 text-orange-600" />
                    <span className="text-xs text-gray-600">Deals</span>
                  </div>
                  <p className="text-lg font-bold text-orange-700">
                    {member.salesMetrics.deals}
                  </p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FiDollarSign className="w-3 h-3 text-teal-600" />
                    <span className="text-xs text-gray-600">Revenue</span>
                  </div>
                  <p className="text-lg font-bold text-teal-700">
                    {formatCurrency(member.salesMetrics.revenue)}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="font-semibold text-gray-800">
                    {member.conversionRate}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${member.conversionRate}%` }}
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <FiRefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          <span>Loading sales leaderboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Sales Leader Board
          </h2>
          <p className="text-sm text-gray-600">
            Rankings based on revenue and conversions from converted clients
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="bg-white rounded-lg p-1 shadow-sm flex gap-1">
            {['week', 'month', 'quarter', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium capitalize transition-all ${
                  selectedPeriod === period
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FiUsers}
          label="Sales Members"
          value={overallStats.totalMembers}
          subtext="Active in leaderboard"
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={FiBarChart}
          label="Average Score"
          value={overallStats.avgScore}
          subtext="Avg revenue score"
          color="text-teal-600"
          bgColor="bg-teal-50"
        />
        <StatCard
          icon={FiCheckCircle}
          label="Total Conversions"
          value={overallStats.totalCompleted}
          subtext="Converted leads"
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={FiDollarSign}
          label="Total Revenue"
          value={formatCurrency(overallStats.totalRevenue)}
          subtext="From converted clients"
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 text-sm ${
            showFilters ? 'bg-purple-50 text-purple-700 border-purple-200' : 'hover:bg-gray-50'
          }`}
        >
          <FiFilter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <FiAlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Top performer preview */}
      {overallStats.topPerformer && (
        <div className="bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl p-4 border border-purple-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FiActivity className="w-4 h-4 text-purple-600" />
            Top Performer
          </h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {overallStats.topPerformer.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {overallStats.topPerformer.name}
                </p>
                <p className="text-xs text-gray-500">
                  {overallStats.topPerformer.salesMetrics?.conversions || 0} conversions ·{' '}
                  {formatCurrency(
                    overallStats.topPerformer.salesMetrics?.revenue || 0
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <p className="text-xs text-gray-500">Conversion Rate</p>
                <p className="text-base font-bold text-purple-700">
                  {overallStats.topPerformer.conversionRate}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Rank</p>
                <p className="text-base font-bold text-gray-900">
                  #{overallStats.topPerformer.rank}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed rankings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            Sales Team Rankings
          </h3>
          <span className="text-xs sm:text-sm text-gray-500">
            {filteredData.length} members
          </span>
        </div>

        {filteredData.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <FiUsers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">No members found</p>
            <p className="text-xs text-gray-500">
              {searchQuery
                ? 'Try changing your search query.'
                : 'No sales members are available for leaderboard yet.'}
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
    </div>
  )
}

export default SalesLeaderboard

