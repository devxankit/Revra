import React, { useRef, useState, useEffect, memo, useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  FaRupeeSign,
  FaVideo,
  FaCheckCircle,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaStar,
  FaChartLine,
  FaFire,
  FaGem,
  FaCrown,
  FaRocket,
  FaUser,
  FaExclamationCircle
} from 'react-icons/fa'
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Award,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  DollarSign,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Star
} from 'lucide-react'
import SL_navbar from '../SL-components/SL_navbar'
import { Link } from 'react-router-dom'
import { colors, gradients } from '../../../lib/colors'
import { salesAnalyticsService } from '../SL-services'
import { getStoredSalesData } from '../SL-services/salesAuthService'

const SL_dashboard = () => {
  // Unique component ID to track renders
  const componentId = useRef(Math.random().toString(36).substr(2, 9))

  // Refs for scroll-triggered animations
  const tileCardsRef = useRef(null)
  const chartRef = useRef(null)

  // Check if elements are in view
  const tileCardsInView = useInView(tileCardsRef, { once: true, margin: "-100px" })
  const chartInView = useInView(chartRef, { once: true, margin: "-100px" })

  // Calculate danger zone IMMEDIATELY from cache on mount (before API call)
  const calculateDangerZoneFromCache = () => {
    try {
      // Try to get cached data from localStorage
      const cachedData = localStorage.getItem('sales_dashboard_lastConversion')
      let cacheValid = false

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData)
          // Check if cache is still valid (less than 24 hours old for better accuracy)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
            // If cache has pre-calculated danger zone status, use it directly
            if (parsed.isInDangerZone !== undefined && parsed.daysSinceLastConversion !== undefined) {
              return {
                isInDangerZone: parsed.isInDangerZone,
                daysSinceLastConversion: parsed.daysSinceLastConversion,
                calculated: true
              }
            }
            // Otherwise, calculate from lastConversionDate
            if (parsed.lastConversionDate) {
              const lastConversion = new Date(parsed.lastConversionDate)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              lastConversion.setHours(0, 0, 0, 0)
              const daysCount = Math.floor((today - lastConversion) / (1000 * 60 * 60 * 24))

              return {
                isInDangerZone: daysCount >= 7,
                daysSinceLastConversion: daysCount,
                calculated: true
              }
            }
            cacheValid = true
          }
        } catch (e) {
          console.warn('Failed to parse cached conversion date:', e)
        }
      }

      // If no valid cache, check stored sales data for joining date
      const storedSalesData = getStoredSalesData()
      if (storedSalesData?.joiningDate) {
        const joiningDate = new Date(storedSalesData.joiningDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        joiningDate.setHours(0, 0, 0, 0)
        const daysSinceJoining = Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24))

        // Only show danger zone if employee has been active for 7+ days with no conversions
        if (daysSinceJoining >= 7) {
          return {
            isInDangerZone: true,
            daysSinceLastConversion: daysSinceJoining,
            calculated: true
          }
        }
      }

      // Default: NOT in danger zone (optimistic default - better UX)
      // This prevents showing red colors initially for employees who are doing well
      return {
        isInDangerZone: false,
        daysSinceLastConversion: 0,
        calculated: true
      }
    } catch (error) {
      console.error('Error calculating danger zone from cache:', error)
      // Default to NOT in danger zone on error (optimistic)
      return {
        isInDangerZone: false,
        daysSinceLastConversion: 0,
        calculated: true
      }
    }
  }

  // Initialize danger zone state immediately from cache (no API wait)
  // Default to NOT in danger zone for better UX (prevents red flash)
  const [dangerZoneState, setDangerZoneState] = useState(() => calculateDangerZoneFromCache())

  // Destructure for easier use
  const { isInDangerZone, daysSinceLastConversion, calculated: dangerZoneCalculated } = dangerZoneState

  // Live stats state
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)
  const [totalLeads, setTotalLeads] = useState(0)
  const [funnelData, setFunnelData] = useState([
    { name: 'Connected', key: 'connected', value: 0, color: '#06B6D4', amount: '0 leads' },
    { name: 'Converted', key: 'converted', value: 0, color: '#10B981', amount: '0 leads' },
    { name: 'Lost', key: 'lost', value: 0, color: '#EF4444', amount: '0 leads' },
    { name: 'Not Interested', key: 'not_interested', value: 0, color: '#F59E0B', amount: '0 leads' },
    { name: 'Not Picked', key: 'not_picked', value: 0, color: '#8B5CF6', amount: '0 leads' }
  ])

  // Danger Zone tooltip open (for tap-to-show on mobile)
  const [dangerTooltipOpen, setDangerTooltipOpen] = useState(false)

  // Tile card stats state
  const [tileStats, setTileStats] = useState({
    paymentRecovery: { pending: 0, changeThisWeek: 0 },
    demoRequests: { new: 0, today: 0 },
    tasks: { pending: 0, change: 0 },
    meetings: { today: 0, upcoming: 0 }
  })
  const [tileStatsLoading, setTileStatsLoading] = useState(true)

  // Monthly conversions state
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [monthlyError, setMonthlyError] = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [bestMonth, setBestMonth] = useState({ label: '-', converted: 0 })
  const [avgRate, setAvgRate] = useState(0)
  const [totalConverted, setTotalConverted] = useState(0)

  // Hero card stats state
  const [heroStats, setHeroStats] = useState({
    employeeName: 'Employee',
    monthlySales: 0,
    target: 0,
    targetNumber: null,
    progressToTarget: 0,
    allTargets: [],
    reward: 0,
    todaysSales: 0,
    todaysIncentive: 0,
    monthlyIncentive: 0,
    totalLeads: 0,
    totalClients: 0,
    isTeamLead: false,
    teamLeadTarget: 0,
    teamLeadTargetReward: 0,
    teamMonthlySales: 0,
    teamLeadProgress: 0,
    lastConversionDate: null
  })
  const [heroStatsLoading, setHeroStatsLoading] = useState(true)
  const [showAllTargetsModal, setShowAllTargetsModal] = useState(false)
  const [showMonthlySalesHistoryModal, setShowMonthlySalesHistoryModal] = useState(false)
  const [monthlySalesHistory, setMonthlySalesHistory] = useState({ items: [], totalSales: 0, bestMonth: null })
  const [monthlySalesHistoryLoading, setMonthlySalesHistoryLoading] = useState(false)
  const [monthlySalesHistoryMonths, setMonthlySalesHistoryMonths] = useState(12) // 0 = all (120 months)
  const [showMonthlyIncentiveHistoryModal, setShowMonthlyIncentiveHistoryModal] = useState(false)
  const [monthlyIncentiveHistory, setMonthlyIncentiveHistory] = useState({ periods: [], totalAmount: 0 })
  const [monthlyIncentiveHistoryLoading, setMonthlyIncentiveHistoryLoading] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      // Load all API calls in PARALLEL for faster loading
      try {
        setStatsLoading(true)
        setMonthlyLoading(true)
        setTileStatsLoading(true)
        setHeroStatsLoading(true)

        // Fetch all data in parallel
        const [dashboardStats, monthlyData, tileData, heroData] = await Promise.allSettled([
          salesAnalyticsService.getDashboardStats(),
          salesAnalyticsService.getMonthlyConversions({ months: 12 }),
          salesAnalyticsService.getTileCardStats(),
          salesAnalyticsService.getDashboardHeroStats()
        ])

        if (!active) return

        // Process dashboard stats
        if (dashboardStats.status === 'fulfilled') {
          const s = dashboardStats.value
          const statusCounts = s?.data?.statusCounts || {}
          const total = s?.data?.totalLeads ?? Object.values(statusCounts).reduce((a, b) => a + b, 0)
          setTotalLeads(total)
          setFunnelData(prev => prev.map(row => {
            const val = Number(statusCounts[row.key] || 0)
            return { ...row, value: total ? Math.round((val / total) * 100) : 0, amount: `${val} leads` }
          }))
          setStatsError(null)
        } else {
          setStatsError(dashboardStats.reason?.message || 'Failed to load dashboard stats')
        }
        setStatsLoading(false)

        // Process monthly conversions
        if (monthlyData.status === 'fulfilled') {
          const m = monthlyData.value
          const items = m?.data?.items || []
          setMonthlyData(items)
          setBestMonth(m?.data?.best || { label: '-', converted: 0 })
          setAvgRate(m?.data?.avgRate || 0)
          setTotalConverted(m?.data?.totalConverted || 0)
          setMonthlyError(null)
        } else {
          setMonthlyError(monthlyData.reason?.message || 'Failed to load monthly conversions')
        }
        setMonthlyLoading(false)

        // Process tile card stats
        if (tileData.status === 'fulfilled') {
          const tile = tileData.value
          setTileStats(tile?.data || {
            paymentRecovery: { pending: 0, changeThisWeek: 0 },
            demoRequests: { new: 0, today: 0 },
            tasks: { pending: 0, change: 0 },
            meetings: { today: 0, upcoming: 0 }
          })
        } else {
          console.error('Failed to load tile card stats:', tileData.reason)
          setTileStats({
            paymentRecovery: { pending: 0, changeThisWeek: 0 },
            demoRequests: { new: 0, today: 0 },
            tasks: { pending: 0, change: 0 },
            meetings: { today: 0, upcoming: 0 }
          })
        }
        setTileStatsLoading(false)

        // Process hero card stats (non-blocking - danger zone already calculated from cache)
        if (heroData.status === 'fulfilled') {
          const hero = heroData.value
          const stats = hero?.data || {
            employeeName: 'Employee',
            monthlySales: 0,
            target: 0,
            targetNumber: null,
            progressToTarget: 0,
            allTargets: [],
            reward: 0,
            todaysSales: 0,
            todaysIncentive: 0,
            monthlyIncentive: 0,
            totalLeads: 0,
            totalClients: 0,
            isTeamLead: false,
            teamLeadTarget: 0,
            teamLeadTargetReward: 0,
            teamMonthlySales: 0,
            teamLeadProgress: 0,
            lastConversionDate: null
          }

          // Recalculate danger zone with fresh data
          let dangerZoneStatus = false
          let daysCount = 0

          if (stats.lastConversionDate) {
            const lastConversion = new Date(stats.lastConversionDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            lastConversion.setHours(0, 0, 0, 0)
            daysCount = Math.floor((today - lastConversion) / (1000 * 60 * 60 * 24))
            dangerZoneStatus = daysCount >= 7

            // Cache lastConversionDate AND danger zone status for instant calculation on next load
            try {
              localStorage.setItem('sales_dashboard_lastConversion', JSON.stringify({
                lastConversionDate: stats.lastConversionDate,
                isInDangerZone: dangerZoneStatus,
                daysSinceLastConversion: daysCount,
                timestamp: Date.now()
              }))
            } catch (e) {
              console.warn('Failed to cache lastConversionDate:', e)
            }
          } else {
            // No conversions yet - check joining date
            const storedSalesData = getStoredSalesData()
            if (storedSalesData?.joiningDate) {
              const joiningDate = new Date(storedSalesData.joiningDate)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              joiningDate.setHours(0, 0, 0, 0)
              daysCount = Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24))
              dangerZoneStatus = daysCount >= 7
            }
          }

          // Update stats and danger zone atomically
          // Use a single state update to prevent flash
          setHeroStats(stats)
          setDangerZoneState({
            isInDangerZone: dangerZoneStatus,
            daysSinceLastConversion: daysCount,
            calculated: true
          })
        } else {
          console.error('Failed to load hero stats:', heroData.reason)
          // Don't reset danger zone on error - keep cached value
        }
        setHeroStatsLoading(false)
      } catch (e) {
        console.error('Error loading dashboard data:', e)
        setStatsLoading(false)
        setMonthlyLoading(false)
        setTileStatsLoading(false)
        setHeroStatsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  // Load monthly sales history when modal opens or months filter changes
  useEffect(() => {
    if (!showMonthlySalesHistoryModal) return
    let cancelled = false
    const load = async () => {
      setMonthlySalesHistoryLoading(true)
      try {
        const res = await salesAnalyticsService.getMonthlySalesHistory({ months: monthlySalesHistoryMonths })
        if (cancelled) return
        if (res?.success && res?.data) {
          setMonthlySalesHistory({
            items: res.data.items || [],
            totalSales: res.data.totalSales || 0,
            bestMonth: res.data.bestMonth || null
          })
        } else {
          setMonthlySalesHistory({ items: [], totalSales: 0, bestMonth: null })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load monthly sales history:', err)
          setMonthlySalesHistory({ items: [], totalSales: 0, bestMonth: null })
        }
      } finally {
        if (!cancelled) setMonthlySalesHistoryLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [showMonthlySalesHistoryModal, monthlySalesHistoryMonths])

  // Load monthly incentive history when incentive modal opens
  useEffect(() => {
    if (!showMonthlyIncentiveHistoryModal) return
    let cancelled = false
    const load = async () => {
      setMonthlyIncentiveHistoryLoading(true)
      try {
        const res = await salesAnalyticsService.getMonthlyIncentiveHistory({ periods: 12 })
        if (cancelled) return
        if (res?.success && res?.data) {
          setMonthlyIncentiveHistory({
            periods: res.data.periods || [],
            totalAmount: res.data.totalAmount || 0
          })
        } else {
          setMonthlyIncentiveHistory({ periods: [], totalAmount: 0 })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load monthly incentive history:', err)
          setMonthlyIncentiveHistory({ periods: [], totalAmount: 0 })
        }
      } finally {
        if (!cancelled) setMonthlyIncentiveHistoryLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [showMonthlyIncentiveHistoryModal])

  // Sparkline data for sales trends
  const salesTrendData = [2.1, 2.3, 2.5, 2.2, 2.8, 2.6, 2.9, 2.7, 2.85]
  const targetTrendData = [7.2, 7.1, 7.3, 7.0, 7.4, 7.2, 7.5, 7.3, 7.5]
  const incentiveTrendData = [0.8, 0.9, 1.0, 0.7, 1.1, 0.9, 1.2, 1.0, 1.0]

  return (
    <div
      id={`sl-dashboard-${componentId.current}`}
      className="min-h-screen bg-gray-50"
      data-component-id={componentId.current}
    >
      <SL_navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20 lg:pb-4">
        <div className="space-y-6">
          {/* Hero Dashboard Card */}
          {dangerZoneCalculated && !heroStatsLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`relative rounded-2xl p-5 lg:p-6 text-gray-900 shadow-2xl overflow-hidden ${isInDangerZone
                  ? 'bg-gradient-to-br from-red-50 via-red-100 to-red-200 border border-red-300/40'
                  : 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 border border-teal-300/40'
                }`}
              style={{
                boxShadow: isInDangerZone
                  ? '0 25px 50px -12px rgba(239, 68, 68, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                  : '0 25px 50px -12px rgba(20, 184, 166, 0.2), 0 0 0 1px rgba(20, 184, 166, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              }}
            >
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {isInDangerZone ? (
                  <>
                    <div className="absolute top-4 right-8 w-2 h-2 bg-red-200/30 rounded-full animate-pulse"></div>
                    <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-red-300/25 rounded-full animate-pulse delay-1000"></div>
                    <div className="absolute top-20 right-10 w-1 h-1 bg-red-400/20 rounded-full animate-pulse delay-2000"></div>
                    <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-red-200/25 rounded-full animate-pulse delay-500"></div>
                    <div className="absolute bottom-8 left-16 w-2 h-2 bg-red-300/15 rounded-full animate-pulse delay-1500"></div>
                    <div className="absolute top-32 right-24 w-1 h-1 bg-red-400/15 rounded-full animate-pulse delay-3000"></div>
                    <div className="absolute bottom-24 left-24 w-1.5 h-1.5 bg-red-200/20 rounded-full animate-pulse delay-4000"></div>
                    <div className="absolute inset-0 opacity-3">
                      <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(239, 68, 68, 0.08) 1px, transparent 0)',
                        backgroundSize: '20px 20px'
                      }}></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-4 right-8 w-2 h-2 bg-teal-200/30 rounded-full animate-pulse"></div>
                    <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-teal-300/25 rounded-full animate-pulse delay-1000"></div>
                    <div className="absolute top-20 right-10 w-1 h-1 bg-teal-400/20 rounded-full animate-pulse delay-2000"></div>
                    <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-teal-200/25 rounded-full animate-pulse delay-500"></div>
                    <div className="absolute bottom-8 left-16 w-2 h-2 bg-teal-300/15 rounded-full animate-pulse delay-1500"></div>
                    <div className="absolute top-32 right-24 w-1 h-1 bg-teal-400/15 rounded-full animate-pulse delay-3000"></div>
                    <div className="absolute bottom-24 left-24 w-1.5 h-1.5 bg-teal-200/20 rounded-full animate-pulse delay-4000"></div>
                    <div className="absolute inset-0 opacity-3">
                      <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(20, 184, 166, 0.08) 1px, transparent 0)',
                        backgroundSize: '20px 20px'
                      }}></div>
                    </div>
                  </>
                )}
              </div>

              {/* Enhanced Header Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex items-center justify-between mb-4 relative z-10"
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`relative w-11 h-11 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl ${isInDangerZone
                        ? 'border border-red-300/40'
                        : 'border border-teal-300/40'
                      }`}
                    style={{
                      boxShadow: isInDangerZone
                        ? '0 12px 35px -8px rgba(239, 68, 68, 0.25), 0 6px 15px -4px rgba(0, 0, 0, 0.1), 0 3px 8px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                        : '0 12px 35px -8px rgba(20, 184, 166, 0.25), 0 6px 15px -4px rgba(0, 0, 0, 0.1), 0 3px 8px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <FaUser className={`text-lg ${isInDangerZone ? 'text-red-700' : 'text-teal-700'}`} />
                  </motion.div>
                  <div>
                    <h1 className="text-lg font-bold mb-0.5 text-gray-900">Hi, {heroStats.employeeName}</h1>
                    <p className={`text-xs font-medium ${isInDangerZone ? 'text-red-700' : 'text-teal-700'}`}>
                      {isInDangerZone ? 'Action Required!' : 'Welcome back!'}
                    </p>
                  </div>
                </div>

                {/* Danger Zone Badge - Compact; hover on desktop, tap to show on mobile */}
                {isInDangerZone && (
                  <div className="relative group">
                    <motion.div
                      role="button"
                      tabIndex={0}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setDangerTooltipOpen(prev => !prev)}
                      onBlur={() => setDangerTooltipOpen(false)}
                      className="flex items-center space-x-1 sm:space-x-1.5 bg-red-500/90 backdrop-blur-sm rounded-md px-1.5 py-1 sm:px-2 sm:py-1.5 border-2 border-red-600 shadow-lg cursor-pointer touch-manipulation select-none"
                      style={{
                        boxShadow: '0 6px 20px -4px rgba(239, 68, 68, 0.4), 0 3px 10px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <FaExclamationCircle className="text-white text-[10px] sm:text-xs animate-pulse flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-[9px] sm:text-[10px] font-bold leading-tight">Danger Zone</p>
                        <p className="text-red-100 text-[8px] sm:text-[9px] font-medium leading-tight">
                          {daysSinceLastConversion}d
                        </p>
                      </div>
                    </motion.div>

                    {/* Tooltip: hover on desktop, tap to show on mobile; responsive width & position */}
                    <div
                      className={`absolute top-full mt-2 z-50 bg-red-100/95 backdrop-blur-sm border-2 border-red-300 rounded-lg p-2.5 sm:p-3 shadow-2xl transition-all duration-200
                      right-0 w-[calc(100vw-2rem)] max-w-[20rem]
                      opacity-0 invisible
                      ${dangerTooltipOpen ? '!opacity-100 !visible' : ''}
                      md:group-hover:opacity-100 md:group-hover:visible`}
                      style={{ pointerEvents: dangerTooltipOpen ? 'auto' : 'none' }}
                    >
                      <div className="flex items-start gap-2">
                        <FaExclamationCircle className="text-red-600 text-xs sm:text-sm mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-red-900 text-[11px] sm:text-xs font-bold mb-0.5 sm:mb-1">⚠️ Conversion Alert</p>
                          <p className="text-red-800 text-[10px] sm:text-[11px] leading-relaxed">
                            You haven&apos;t converted a lead to client in the last {daysSinceLastConversion} days.{' '}
                            <span className="font-semibold">Convert a lead immediately to return to normal status.</span>
                          </p>
                        </div>
                      </div>
                      {/* Arrow pointing up */}
                      <div className="absolute -top-2 right-3 sm:right-4 w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border-l-2 border-t-2 border-red-300 transform rotate-45" aria-hidden></div>
                    </div>
                    {/* Tap outside to close (mobile) */}
                    {dangerTooltipOpen && (
                      <button
                        type="button"
                        aria-label="Close warning"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setDangerTooltipOpen(false)}
                      />
                    )}
                  </div>
                )}
              </motion.div>


              {/* Enhanced Sales Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="grid grid-cols-2 gap-3 mb-1"
              >
                <motion.div
                  whileHover={{ scale: 1.01, y: -1 }}
                  onClick={() => setShowMonthlySalesHistoryModal(true)}
                  className={`bg-white/60 backdrop-blur-sm rounded-lg p-3 border transition-all duration-300 shadow-md cursor-pointer ${isInDangerZone
                      ? 'border-red-300/50 hover:border-red-400/70'
                      : 'border-teal-300/50 hover:border-teal-400/70'
                    }`}
                  title="Click to view monthly sales history"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={`text-xs font-semibold ${isInDangerZone ? 'text-red-800' : 'text-teal-800'}`}>Monthly Sales</p>
                    <div className={`w-5 h-5 bg-gradient-to-br rounded-md flex items-center justify-center shadow-sm ${isInDangerZone
                        ? 'from-red-500 to-red-600'
                        : 'from-teal-500 to-teal-600'
                      }`}>
                      <FaChartLine className="text-white text-[10px]" />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">₹{heroStats.monthlySales.toLocaleString()}</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01, y: -1 }}
                  onClick={() => {
                    if (heroStats.allTargets && heroStats.allTargets.length > 0) {
                      setShowAllTargetsModal(true);
                    }
                  }}
                  className={`bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/50 hover:border-emerald-400/70 transition-all duration-300 shadow-md relative ${heroStats.allTargets && heroStats.allTargets.length > 0 ? 'cursor-pointer' : ''
                    }`}
                  title={heroStats.allTargets && heroStats.allTargets.length > 0 ? "Click to view all targets" : ""}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                      <p className="text-emerald-800 text-xs font-semibold truncate">
                        {heroStats.targetNumber ? `Target ${heroStats.targetNumber}` : 'Target'}
                      </p>
                      {heroStats.allTargets && heroStats.allTargets.length > 1 && (
                        <span className="text-[10px] text-emerald-600 flex-shrink-0">
                          ({heroStats.allTargets.length})
                        </span>
                      )}
                    </div>
                    <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-md flex items-center justify-center shadow-sm flex-shrink-0 ml-1">
                      <FaStar className="text-white text-[10px]" />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">₹{heroStats.target.toLocaleString()}</p>
                </motion.div>
              </motion.div>

              {/* Sales-month window info moved into Monthly Sales History modal for clarity */}

              {/* Enhanced Progress Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mb-5"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-sm font-semibold ${isInDangerZone ? 'text-red-800' : 'text-teal-800'}`}>Progress to Target</span>
                  <span className="text-gray-900 font-bold text-lg">{heroStats.progressToTarget}%</span>
                </div>
                <div className="relative w-full bg-white/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${heroStats.progressToTarget}%` }}
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                    className={`h-2.5 rounded-full relative shadow-sm ${isInDangerZone
                        ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700'
                        : 'bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700'
                      }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    <div className="absolute right-0 top-0 w-1 h-2.5 bg-white/90 rounded-full"></div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Team Lead Target Progress Section - Only for Team Leads */}
              {heroStats.isTeamLead && heroStats.teamLeadTarget > 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="mb-5"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-sm font-semibold ${isInDangerZone ? 'text-red-800' : 'text-teal-800'}`}>Team Target Progress</span>
                    <span className="text-gray-900 font-bold text-lg">{Math.round(heroStats.teamLeadProgress)}%</span>
                  </div>
                  <div className="relative w-full bg-white/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(heroStats.teamLeadProgress, 100)}%` }}
                      transition={{ duration: 1.5, delay: 1.0, ease: "easeOut" }}
                      className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 h-2.5 rounded-full relative shadow-sm"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      <div className="absolute right-0 top-0 w-1 h-2.5 bg-white/90 rounded-full"></div>
                    </motion.div>
                  </div>
                  <div className={`flex justify-between items-center mt-2 text-xs ${isInDangerZone ? 'text-red-700' : 'text-teal-700'}`}>
                    <span className="font-bold">Team Sales: ₹{heroStats.teamMonthlySales.toLocaleString()}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">Target: ₹{heroStats.teamLeadTarget.toLocaleString()}</span>
                      {heroStats.teamLeadTargetReward > 0 && (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Reward: ₹{heroStats.teamLeadTargetReward.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {/* Enhanced Sub-cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="grid grid-cols-2 gap-4 mb-5"
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-cyan-300/50 hover:border-cyan-400/70 transition-all duration-300 shadow-xl"
                  style={{
                    boxShadow: '0 10px 30px -6px rgba(6, 182, 212, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.1), 0 3px 8px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-cyan-800 text-sm font-semibold">Today's Sales</p>
                    <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg"
                      style={{
                        boxShadow: '0 6px 18px -3px rgba(6, 182, 212, 0.4), 0 3px 8px -2px rgba(0, 0, 0, 0.15), 0 1px 4px -1px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      <FaArrowUp className="text-white text-sm" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">₹{heroStats.todaysSales >= 1000 ? `${(heroStats.todaysSales / 1000).toFixed(heroStats.todaysSales % 1000 === 0 ? 0 : 1)}k` : heroStats.todaysSales.toLocaleString()}</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-300/50 hover:border-indigo-400/70 transition-all duration-300 shadow-xl"
                  style={{
                    boxShadow: '0 10px 30px -6px rgba(99, 102, 241, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.1), 0 3px 8px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-indigo-800 text-sm font-semibold">Today's Incentive</p>
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg"
                      style={{
                        boxShadow: '0 6px 18px -3px rgba(99, 102, 241, 0.4), 0 3px 8px -2px rgba(0, 0, 0, 0.15), 0 1px 4px -1px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      <FaChartLine className="text-white text-sm" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">₹{heroStats.todaysIncentive.toLocaleString()}</p>
                </motion.div>
              </motion.div>

              {/* Enhanced Bottom Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="grid grid-cols-3 gap-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-sky-300/50 text-center hover:border-sky-400/70 transition-all duration-300 shadow-xl"
                  style={{
                    boxShadow: '0 8px 25px -5px rgba(14, 165, 233, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                >
                  <p className="text-sky-800 text-sm mb-1.5 font-semibold">Total Clients</p>
                  <p className="text-gray-900 text-lg font-bold">{heroStats.totalClients}</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-300/50 text-center hover:border-emerald-400/70 transition-all duration-300 shadow-xl"
                  style={{
                    boxShadow: '0 8px 25px -5px rgba(16, 185, 129, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                >
                  <p className="text-emerald-800 text-sm mb-1.5 font-semibold">Total Leads</p>
                  <p className="text-gray-900 text-lg font-bold">
                    {typeof totalLeads === 'number' ? totalLeads.toLocaleString('en-IN') : totalLeads}
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowMonthlyIncentiveHistoryModal(true)}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-violet-300/50 text-center hover:border-violet-400/70 transition-all duration-300 shadow-xl cursor-pointer"
                  style={{
                    boxShadow: '0 8px 25px -5px rgba(139, 92, 246, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                  title="Click to view monthly incentive history"
                >
                  <p className="text-violet-800 text-sm mb-1.5 font-semibold">Monthly Incentive</p>
                  <p className="text-gray-900 text-lg font-bold">₹{heroStats.monthlyIncentive.toLocaleString()}</p>
                </motion.div>
              </motion.div>

            </motion.div>
          ) : (
            // Loading skeleton - matches the actual card structure with normal colors
            <div className="relative rounded-2xl p-5 lg:p-6 shadow-2xl overflow-hidden bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 border border-teal-300/40"
              style={{
                boxShadow: '0 25px 50px -12px rgba(20, 184, 166, 0.2), 0 0 0 1px rgba(20, 184, 166, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              }}
            >
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-4 right-8 w-2 h-2 bg-teal-200/30 rounded-full animate-pulse"></div>
                <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-teal-300/25 rounded-full animate-pulse delay-1000"></div>
                <div className="absolute top-20 right-10 w-1 h-1 bg-teal-400/20 rounded-full animate-pulse delay-2000"></div>
                <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-teal-200/25 rounded-full animate-pulse delay-500"></div>
                <div className="absolute bottom-8 left-16 w-2 h-2 bg-teal-300/15 rounded-full animate-pulse delay-1500"></div>
              </div>

              <div className="relative z-10 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-white/60 backdrop-blur-sm rounded-xl border border-teal-300/40"></div>
                    <div>
                      <div className="h-5 bg-white/60 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-white/60 rounded w-28"></div>
                    </div>
                  </div>
                </div>

                {/* Sales Metrics Skeleton */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-teal-300/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-3 bg-white/80 rounded w-24"></div>
                      <div className="w-5 h-5 bg-white/80 rounded-md"></div>
                    </div>
                    <div className="h-6 bg-white/80 rounded w-20"></div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-3 bg-white/80 rounded w-20"></div>
                      <div className="w-5 h-5 bg-white/80 rounded-md"></div>
                    </div>
                    <div className="h-6 bg-white/80 rounded w-24"></div>
                    <div className="h-2.5 bg-white/60 rounded w-32 mt-1"></div>
                  </div>
                </div>

                {/* Progress Bar Skeleton */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-4 bg-white/60 rounded w-32"></div>
                    <div className="h-5 bg-white/60 rounded w-12"></div>
                  </div>
                  <div className="relative w-full bg-white/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="h-2.5 bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 rounded-full w-1/3"></div>
                  </div>
                </div>

                {/* Sub-cards Skeleton */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-cyan-300/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 bg-white/80 rounded w-20"></div>
                      <div className="w-6 h-6 bg-white/80 rounded-lg"></div>
                    </div>
                    <div className="h-7 bg-white/80 rounded w-20"></div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-300/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 bg-white/80 rounded w-24"></div>
                      <div className="w-6 h-6 bg-white/80 rounded-lg"></div>
                    </div>
                    <div className="h-7 bg-white/80 rounded w-24"></div>
                  </div>
                </div>

                {/* Bottom Metrics Skeleton */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-sky-300/50">
                    <div className="h-3 bg-white/80 rounded w-20 mx-auto mb-1.5"></div>
                    <div className="h-5 bg-white/80 rounded w-8 mx-auto"></div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-emerald-300/50">
                    <div className="h-3 bg-white/80 rounded w-20 mx-auto mb-1.5"></div>
                    <div className="h-5 bg-white/80 rounded w-8 mx-auto"></div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-violet-300/50">
                    <div className="h-3 bg-white/80 rounded w-24 mx-auto mb-1.5"></div>
                    <div className="h-5 bg-white/80 rounded w-16 mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Tile Cards Grid */}
          <motion.div
            ref={tileCardsRef}
            initial={{ opacity: 0, y: 50 }}
            animate={tileCardsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Payment Recovery */}
            <Link to="/payments-recovery">
              <div
                className="bg-emerald-50 rounded-xl p-4 text-emerald-800 transition-all duration-300 cursor-pointer border border-emerald-200/30"
                style={{
                  boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
              >
                <div className="flex flex-col h-full">
                  {/* Enhanced Icon Section */}
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-emerald-100 backdrop-blur-sm rounded-xl flex items-center justify-center border border-emerald-200/30"
                      style={{
                        boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.15), 0 3px 10px -2px rgba(0, 0, 0, 0.08), 0 1px 5px -1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      }}
                    >
                      <FaRupeeSign className="text-xl text-emerald-600" />
                    </div>
                  </div>

                  {/* Enhanced Content Section */}
                  <div className="flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h3 className="font-bold text-sm mb-1.5 leading-tight text-emerald-800">Payment Recovery</h3>
                      <div className="flex items-center justify-center space-x-2 mb-2.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-xs font-semibold opacity-95 text-emerald-700">{tileStats.paymentRecovery.pending} Pendings</p>
                      </div>
                    </div>

                    {/* Enhanced Trend Section */}
                    <div className="flex items-center justify-center space-x-1.5 mt-auto bg-emerald-100 rounded-lg px-2.5 py-1.5">
                      {tileStats.paymentRecovery.changeThisWeek >= 0 ? (
                        <FaArrowUp className="text-xs text-emerald-600" />
                      ) : (
                        <FaArrowDown className="text-xs text-emerald-600" />
                      )}
                      <span className="text-xs font-semibold text-emerald-600">
                        {tileStats.paymentRecovery.changeThisWeek >= 0 ? '+' : ''}{tileStats.paymentRecovery.changeThisWeek} this week
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Demo Requests */}
            <Link to="/demo-requests">
              <div
                className="bg-blue-50 rounded-xl p-4 text-blue-800 transition-all duration-300 cursor-pointer border border-blue-200/30"
                style={{
                  boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
              >
                <div className="flex flex-col h-full">
                  {/* Enhanced Icon Section */}
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-200/30"
                      style={{
                        boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.15), 0 3px 10px -2px rgba(0, 0, 0, 0.08), 0 1px 5px -1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      }}
                    >
                      <FaVideo className="text-xl text-blue-600" />
                    </div>
                  </div>

                  {/* Enhanced Content Section */}
                  <div className="flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h3 className="font-bold text-sm mb-1.5 leading-tight text-blue-800">Demo Requests</h3>
                      <div className="flex items-center justify-center space-x-2 mb-2.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm"></div>
                        <p className="text-xs font-semibold opacity-95 text-blue-700">{tileStats.demoRequests.new} New</p>
                      </div>
                    </div>

                    {/* Enhanced Trend Section */}
                    <div className="flex items-center justify-center space-x-1.5 mt-auto bg-blue-100 rounded-lg px-2.5 py-1.5">
                      {tileStats.demoRequests.today > 0 ? (
                        <FaArrowUp className="text-xs text-blue-600" />
                      ) : null}
                      <span className="text-xs font-semibold text-blue-600">
                        {tileStats.demoRequests.today > 0 ? '+' : ''}{tileStats.demoRequests.today} today
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Tasks */}
            <Link to="/tasks">
              <div
                className="bg-purple-50 rounded-xl p-4 text-purple-800 transition-all duration-300 cursor-pointer border border-purple-200/30"
                style={{
                  boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
              >
                <div className="flex flex-col h-full">
                  {/* Enhanced Icon Section */}
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-purple-100 backdrop-blur-sm rounded-xl flex items-center justify-center border border-purple-200/30"
                      style={{
                        boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.15), 0 3px 10px -2px rgba(0, 0, 0, 0.08), 0 1px 5px -1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      }}
                    >
                      <FaCheckCircle className="text-xl text-purple-600" />
                    </div>
                  </div>

                  {/* Enhanced Content Section */}
                  <div className="flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h3 className="font-bold text-sm mb-1.5 leading-tight text-purple-800">Tasks</h3>
                      <div className="flex items-center justify-center space-x-2 mb-2.5">
                        <div className="w-2 h-2 bg-purple-500 rounded-full shadow-sm"></div>
                        <p className="text-xs font-semibold opacity-95 text-purple-700">{tileStats.tasks.pending} Pending</p>
                      </div>
                    </div>

                    {/* Enhanced Trend Section */}
                    <div className="flex items-center justify-center space-x-1.5 mt-auto bg-purple-100 rounded-lg px-2.5 py-1.5">
                      {tileStats.tasks.change >= 0 ? (
                        <FaArrowUp className="text-xs text-purple-600" />
                      ) : (
                        <FaArrowDown className="text-xs text-purple-600" />
                      )}
                      <span className="text-xs font-semibold text-purple-600">
                        {tileStats.tasks.change >= 0 ? '+' : ''}{tileStats.tasks.change} completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Meetings */}
            <Link to="/meetings">
              <div
                className="bg-orange-50 rounded-xl p-4 text-orange-800 transition-all duration-300 cursor-pointer border border-orange-200/30"
                style={{
                  boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.2), 0 6px 16px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
              >
                <div className="flex flex-col h-full">
                  {/* Enhanced Icon Section */}
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-orange-100 backdrop-blur-sm rounded-xl flex items-center justify-center border border-orange-200/30"
                      style={{
                        boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.15), 0 3px 10px -2px rgba(0, 0, 0, 0.08), 0 1px 5px -1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      }}
                    >
                      <FaUsers className="text-xl text-orange-600" />
                    </div>
                  </div>

                  {/* Enhanced Content Section */}
                  <div className="flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h3 className="font-bold text-sm mb-1.5 leading-tight text-orange-800">Meetings</h3>
                      <div className="flex items-center justify-center space-x-2 mb-2.5">
                        <div className="w-2 h-2 bg-orange-500 rounded-full shadow-sm"></div>
                        <p className="text-xs font-semibold opacity-95 text-orange-700">{tileStats.meetings.today} Today</p>
                      </div>
                    </div>

                    {/* Enhanced Trend Section */}
                    <div className="flex items-center justify-center space-x-1.5 mt-auto bg-orange-100 rounded-lg px-2.5 py-1.5">
                      <FaClock className="text-xs text-orange-600" />
                      <span className="text-xs font-semibold text-orange-600">{tileStats.meetings.upcoming} upcoming</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Enhanced Sales Analytics Section */}
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={chartInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 lg:p-8 shadow-xl border border-gray-200/50"
            style={{
              boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Header Section */}
            <div className="text-center mb-6">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Lead Conversion</h3>
              <p className="text-gray-600 text-sm lg:text-base">Conversion funnel from connected to converted leads</p>
            </div>

            {/* Modern Chart Container */}
            <div className="relative">
              {/* Chart - larger circle, center number scales for big values */}
              <div className="flex justify-center mb-6">
                <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={funnelData}
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="55%"
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Text - responsive size so large numbers fit */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center px-2 min-w-0 max-w-full">
                      <p className={`font-bold text-gray-900 leading-tight truncate max-w-full ${totalLeads >= 10000 ? 'text-base sm:text-lg lg:text-xl' :
                          totalLeads >= 1000 ? 'text-lg sm:text-xl lg:text-2xl' :
                            'text-xl sm:text-2xl lg:text-3xl'
                        }`}>
                        {typeof totalLeads === 'number' ? totalLeads.toLocaleString('en-IN') : totalLeads}
                      </p>
                      <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5">Total Leads</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Legend */}
              <div className="space-y-3">
                {funnelData.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    animate={chartInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                    transition={{ duration: 0.6, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200/50 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 lg:w-5 lg:h-5 rounded-full shadow-sm"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div>
                        <p className="text-sm lg:text-base font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs lg:text-sm text-gray-600">{item.amount}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg lg:text-xl font-bold text-gray-900">{item.value}%</p>
                      <div className="w-16 lg:w-20 h-1.5 lg:h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={chartInView ? { width: `${item.value}%` } : { width: 0 }}
                          transition={{ duration: 1.2, delay: 0.5 + (index * 0.1), ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={chartInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="mt-6 grid grid-cols-2 gap-4"
              >
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200/50">
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <p className="text-xs font-semibold text-emerald-700">Conversion Rate</p>
                  </div>
                  <p className="text-base font-bold text-emerald-900">{(funnelData.find(f => f.key === 'converted')?.value ?? 0)}%</p>
                  <p className="text-xs text-emerald-600">{(funnelData.find(f => f.key === 'converted')?.amount) || '0 leads'} converted</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200/50">
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <p className="text-xs font-semibold text-blue-700">Connected Rate</p>
                  </div>
                  <p className="text-base font-bold text-blue-900">{(funnelData.find(f => f.key === 'connected')?.value ?? 0)}%</p>
                  <p className="text-xs text-blue-600">{(funnelData.find(f => f.key === 'connected')?.amount) || '0 leads'} connected</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Monthly Conversion Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={chartInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 lg:p-8 shadow-xl border border-gray-200/50"
            style={{
              boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Header Section */}
            <div className="text-center mb-4">
              <h3 className="text-lg lg:text-xl font-bold text-gray-900">Monthly Conversions</h3>
              <p className="text-gray-600 text-xs lg:text-sm">Swipe to see past months</p>
            </div>

            {/* Scrollable Bar Chart Container */}
            <div className="h-64 lg:h-80 overflow-x-auto">
              <div className="min-w-[600px] lg:min-w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [`${value} clients`, 'Converted']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar
                      dataKey="converted"
                      fill="#10B981"
                      radius={[2, 2, 0, 0]}
                      name="converted"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart Summary - Compact Rectangle Cards */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 rounded-md p-2 border border-emerald-200/50">
                <p className="text-xs font-semibold text-emerald-700 mb-0.5">Best Month</p>
                <p className="text-xs font-bold text-emerald-900">{bestMonth.label}</p>
                <p className="text-xs text-emerald-600">{bestMonth.converted} converted</p>
              </div>
              <div className="bg-blue-50 rounded-md p-2 border border-blue-200/50">
                <p className="text-xs font-semibold text-blue-700 mb-0.5">Avg Conversion</p>
                <p className="text-xs font-bold text-blue-900">{avgRate}</p>
                <p className="text-xs text-blue-600">per month</p>
              </div>
              <div className="bg-purple-50 rounded-md p-2 border border-purple-200/50">
                <p className="text-xs font-semibold text-purple-700 mb-0.5">Total Converted</p>
                <p className="text-xs font-bold text-purple-900">{totalConverted}</p>
                <p className="text-xs text-purple-600">12 months</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* All Targets Modal - responsive for mobile */}
      <AnimatePresence>
        {showAllTargetsModal && heroStats.allTargets && heroStats.allTargets.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowAllTargetsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-4 sm:p-5 md:p-6 max-w-2xl w-full max-h-[88vh] sm:max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">All Targets</h3>
                  <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1">View all your sales targets with deadlines and progress</p>
                </div>
                <button
                  onClick={() => setShowAllTargetsModal(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {heroStats.reward > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg mb-6 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider mb-1">Total Rewards Earned</p>
                      <h4 className="text-2xl font-bold">₹{heroStats.reward.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                      <FaGem className="text-2xl text-white animate-bounce-slow" />
                    </div>
                  </motion.div>
                )}
                {heroStats.allTargets.map((target, index) => {
                  const deadline = new Date(target.deadline);
                  const now = new Date();
                  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                  const isActive = target.targetNumber === heroStats.targetNumber;
                  const isAchieved = target.isAchieved;
                  const isDeadlinePassed = target.isDeadlinePassed;

                  const statusAccent = isActive
                    ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-white'
                    : isAchieved
                      ? 'border-l-gray-400 bg-gradient-to-r from-gray-50/80 to-white'
                      : isDeadlinePassed
                        ? 'border-l-red-400 bg-gradient-to-r from-red-50/50 to-white'
                        : 'border-l-emerald-300/70 bg-white';

                  return (
                    <motion.div
                      key={target.targetNumber}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.35 }}
                      className={`relative rounded-xl sm:rounded-2xl border-l-4 border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${statusAccent}`}
                    >
                      <div className="p-3.5 sm:p-4">
                        {/* Row 1: Number + Title + Badge */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shadow-sm ${isActive
                              ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
                              : isAchieved
                                ? 'bg-gray-400 text-white ring-2 ring-gray-200'
                                : isDeadlinePassed
                                  ? 'bg-red-400 text-white ring-2 ring-red-100'
                                  : 'bg-gray-200 text-gray-700 ring-2 ring-gray-100'
                            }`}>
                            {target.targetNumber}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                              Target {target.targetNumber}
                            </h4>
                            {isActive && (
                              <span className="inline-flex items-center text-[10px] sm:text-xs font-medium bg-emerald-500 text-white px-2 py-0.5 rounded-md shadow-sm">Active</span>
                            )}
                            {isAchieved && (
                              <span className="inline-flex items-center text-[10px] sm:text-xs font-medium bg-green-500 text-white px-2 py-0.5 rounded-md shadow-sm"><FaCheckCircle className="mr-1 text-[8px] sm:text-[10px]" /> Achieved</span>
                            )}
                            {!isAchieved && isDeadlinePassed && (
                              <span className="inline-flex items-center text-[10px] sm:text-xs font-medium bg-red-500 text-white px-2 py-0.5 rounded-md shadow-sm">Deadline Passed</span>
                            )}
                          </div>
                        </div>

                        {/* Compact details: amount, reward, deadline, progress */}
                        <div className="space-y-2">
                          {/* Amount + reward in one row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-baseline gap-1.5">
                              <FaRupeeSign className="text-emerald-600 text-base sm:text-lg mt-0.5 flex-shrink-0" />
                              <span className="text-xl sm:text-2xl font-bold text-emerald-800 tracking-tight">
                                {target.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {target.reward > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                <FaStar className="text-emerald-500 text-[10px]" />
                                Reward: ₹{target.reward.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          {/* Deadline row */}
                          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-600">
                            <FaClock className="text-[10px] sm:text-xs flex-shrink-0 opacity-80" />
                            <span>
                              {deadline.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            {!isAchieved && daysLeft >= 0 && (
                              <span className={daysLeft <= 7 ? 'font-semibold text-red-600' : 'text-gray-500'}>
                                · {daysLeft}d left
                              </span>
                            )}
                          </div>

                          {/* Progress mini section */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Progress</span>
                              <span className="text-[10px] sm:text-xs font-bold text-gray-800">{target.progress}%</span>
                            </div>
                            <div className="relative w-full bg-gray-200/80 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${target.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className={`h-1.5 rounded-full ${isActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gray-400'}`}
                              />
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              ₹{heroStats.monthlySales.toLocaleString('en-IN')} of ₹{target.amount.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end">
                <button
                  onClick={() => setShowAllTargetsModal(false)}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold touch-manipulation"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Sales History Modal */}
      <AnimatePresence>
        {showMonthlySalesHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowMonthlySalesHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-4 sm:p-5 md:p-6 max-w-2xl w-full max-h-[88vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6 flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FaChartLine className="text-teal-600" />
                    Monthly Sales History
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    View your sales across previous months. Only approved first payments are counted, based on the current sales-month window (e.g. 10th–10th set in Sales Month settings).
                  </p>
                </div>
                <button
                  onClick={() => setShowMonthlySalesHistoryModal(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                >
                  ✕
                </button>
              </div>

              {/* Filter */}
              <div className="flex flex-wrap items-center gap-3 mb-4 flex-shrink-0">
                <label className="text-sm font-medium text-gray-700">Show last</label>
                <select
                  value={monthlySalesHistoryMonths}
                  onChange={(e) => setMonthlySalesHistoryMonths(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                >
                  <option value={0}>All months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                  <option value={18}>18 months</option>
                  <option value={24}>24 months</option>
                </select>
              </div>

              {/* Summary cards */}
              {(monthlySalesHistory.totalSales > 0 || monthlySalesHistory.bestMonth) && (
                <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0 text-xs sm:text-sm">
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg px-3 py-2 text-white shadow-md">
                    <p className="text-teal-100 text-[10px] font-medium uppercase tracking-wider mb-0.5">
                      Total (selected period)
                    </p>
                    <p className="text-base sm:text-lg font-bold">
                      ₹{monthlySalesHistory.totalSales.toLocaleString('en-IN')}
                    </p>
                  </div>
                  {monthlySalesHistory.bestMonth && monthlySalesHistory.bestMonth.sales > 0 && (
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg px-3 py-2 text-white shadow-md">
                      <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-wider mb-0.5">
                        Best Month
                      </p>
                      <p className="text-xs sm:text-sm font-semibold">
                        {monthlySalesHistory.bestMonth.monthLabel}
                      </p>
                      <p className="text-xs sm:text-sm text-emerald-100">
                        ₹{monthlySalesHistory.bestMonth.sales.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Table */}
              <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-lg">
                {monthlySalesHistoryLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm">Loading sales history...</p>
                  </div>
                ) : monthlySalesHistory.items.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                    <FaChartLine className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No sales data for this period</p>
                    <p className="text-xs mt-1">Sales will appear here once you convert clients with approved projects</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Month</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[...monthlySalesHistory.items].reverse().map((item) => (
                        <tr key={item.key} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900 font-medium">{item.monthLabel}</td>
                          <td className="px-4 py-3 text-right font-semibold text-teal-700">₹{item.sales.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowMonthlySalesHistoryModal(false)}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold touch-manipulation"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Incentive History Modal */}
      <AnimatePresence>
        {showMonthlyIncentiveHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowMonthlyIncentiveHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-4 sm:p-5 md:p-6 max-w-2xl w-full max-h-[88vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6 flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FaChartLine className="text-violet-600" />
                    Monthly Incentive History
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    Incentives grouped by your custom sales-month window. Shows awarded date, amount, and status (paid or unpaid).
                  </p>
                </div>
                <button
                  onClick={() => setShowMonthlyIncentiveHistoryModal(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-lg">
                {monthlyIncentiveHistoryLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm">Loading incentive history...</p>
                  </div>
                ) : monthlyIncentiveHistory.periods.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                    <FaChartLine className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No incentive data yet</p>
                    <p className="text-xs mt-1">Incentives will appear once you earn conversion-based incentives.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {[...monthlyIncentiveHistory.periods].reverse().map((period) => (
                      <div key={period.key} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              {period.label}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Total incentive: ₹{period.totalAmount.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                        {period.incentives.length === 0 ? (
                          <p className="text-[11px] text-gray-500 mt-1">
                            No incentives in this period.
                          </p>
                        ) : (
                          <table className="w-full text-[11px] sm:text-xs mt-2">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Client / Project</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {period.incentives.map((inc) => {
                                const date = inc.dateAwarded ? new Date(inc.dateAwarded) : null
                                const paid = inc.status === 'paid'
                                const statusLabel = paid ? 'Paid' : inc.status === 'approved' ? 'Approved' : 'Pending'
                                const statusClass =
                                  paid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : inc.status === 'approved'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                return (
                                  <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-2 text-gray-800">
                                      {date
                                        ? date.toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        })
                                        : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {inc.clientName || 'Client'}
                                        </span>
                                        {inc.projectName && (
                                          <span className="text-[10px] text-gray-500">
                                            {inc.projectName}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-violet-700">
                                      ₹{Number(inc.amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass}`}>
                                        {statusLabel}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowMonthlyIncentiveHistoryModal(false)}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold touch-manipulation"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(SL_dashboard) 
