// Professional Wallet Dashboard component with enhanced UI
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  FiCreditCard,
  FiCalendar,
  FiTrendingUp,
  FiActivity,
  FiUsers,
  FiLoader,
  FiAlertCircle,
  FiTarget,
  FiArrowUp
} from 'react-icons/fi'
import { FaRupeeSign } from 'react-icons/fa'
import SL_navbar from '../SL-components/SL_navbar'
import { salesWalletService } from '../SL-services'
import { useToast } from '../../../contexts/ToastContext'

const SL_wallet = () => {
  const { toast } = useToast()
  const isLoadingRef = useRef(false)
  const hasErrorShownRef = useRef(false)
  
  // Live state - initialize as null to show skeleton loaders
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wallet, setWallet] = useState(null)

  const loadWallet = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      setError(null)
      hasErrorShownRef.current = false

      const data = await salesWalletService.getWalletSummary()
      
      // Regular incentives (from own conversions) - separated from team lead incentives
      const current = Number(data?.incentive?.current || 0)
      const pending = Number(data?.incentive?.pending || 0)
      const monthly = Number(data?.incentive?.monthly || 0)
      const allTime = Number(data?.incentive?.allTime || 0)
      const fixedSalary = Number(data?.salary?.fixedSalary || 0)
      
      // Team lead incentives (from team member conversions) - separate field
      const teamLeadIncentiveTotal = Number(data?.teamLeadIncentive?.total || 0)
      const teamLeadIncentiveCurrent = Number(data?.teamLeadIncentive?.current || 0)
      const teamLeadIncentivePending = Number(data?.teamLeadIncentive?.pending || 0)

      // Team target reward (for team leads only) - currentReward is 0 when paid, status: 'paid' | 'pending'
      const teamTargetReward = data?.teamTargetReward || null
      const teamTargetRewardAmount = teamTargetReward ? Number(teamTargetReward.currentReward ?? teamTargetReward.reward ?? 0) : 0
      const teamTarget = teamTargetReward ? Number(teamTargetReward.target || 0) : 0
      const teamTargetRewardStatus = teamTargetReward?.status || 'pending'

      // Check if user is a team lead
      const isTeamLead = data?.isTeamLead || false

      // Reward earned from achieving sales targets
      const rewardEarned = Number(data?.rewardEarned ?? 0)
      const reward = data?.reward || { earned: rewardEarned, currentReward: rewardEarned, status: rewardEarned > 0 ? 'pending' : 'pending' }

      // Use backend values directly (backend separates regular and team lead incentives)
      const currentBalance = current // Only regular incentives
      const pendingIncentive = pending // Only regular incentives

      setWallet({
        currentBalance: currentBalance, // Regular incentives only
        pendingIncentive: pendingIncentive, // Regular incentives only
        monthlyEarning: monthly, // Regular incentives only
        totalEarning: allTime, // Regular incentives only
        monthlySalary: fixedSalary,
        rewardEarned: rewardEarned, // Backward compatibility
        reward: {
          earned: Number(reward?.earned ?? rewardEarned),
          currentReward: Number(reward?.currentReward ?? rewardEarned),
          status: reward?.status || 'pending'
        },
        isTeamLead: isTeamLead, // Store team lead status
        teamLeadIncentive: {
          total: teamLeadIncentiveTotal || 0,
          current: teamLeadIncentiveCurrent || 0,
          pending: teamLeadIncentivePending || 0
        },
        teamTargetReward: teamTargetReward ? {
          target: teamTarget,
          reward: teamTargetRewardAmount, // Current display value (0 when paid)
          status: teamTargetRewardStatus
        } : null,
        transactions: (data?.transactions || []).map(t => ({
          id: t.id || `${t.type}-${t.date}`,
          amount: Number(t.amount || 0),
          type: 'income',
          date: new Date(t.date).toLocaleDateString(),
          category: t.type === 'salary' ? 'Salary' : t.type === 'incentive_payment' ? 'Incentive Payment' : t.type === 'reward_payment' ? 'Reward Payment' : 'Reward',
          description: t.type === 'salary' ? 'Monthly Salary' : t.type === 'incentive_payment' ? 'Incentive Paid' : t.type === 'reward_payment' ? 'Reward Paid' : (t.clientName ? `Incentive - ${t.clientName}` : 'Incentive'),
          isTeamLeadIncentive: t.isTeamLeadIncentive || false,
          teamMemberName: t.teamMemberName || null
        }))
      })
    } catch (e) {
      // Only show error once
      if (!hasErrorShownRef.current) {
        hasErrorShownRef.current = true
        const errorMessage = e?.message || 'Failed to load wallet data'
        
        // Handle 401 (Unauthorized) errors gracefully
        if (errorMessage.includes('token') || errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          setError('Session expired. Please log in again.')
        } else {
          setError(errorMessage)
          toast.error(errorMessage)
        }
      }
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadWallet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Filter out withdrawals from visible history
  const visibleTransactions = wallet?.transactions || []

  // Reward metrics
  const rewardEarned = !loading ? Number(wallet?.reward?.earned ?? wallet?.rewardEarned ?? 0) : 0
  const pendingReward = !loading ? Number(wallet?.reward?.currentReward ?? 0) : 0
  const rewardStatus = wallet?.reward?.status || 'pending'
  const paidRewardTotal = !loading
    ? visibleTransactions.reduce((sum, t) => {
        return t.category === 'Reward Payment' ? sum + (Number(t.amount) || 0) : sum
      }, 0)
    : 0
  const allTimeReward = paidRewardTotal + (rewardStatus === 'paid' ? 0 : pendingReward)

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0'
    return `₹${Number(amount).toLocaleString()}`
  }

  // Skeleton loader component
  const SkeletonLoader = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  )

  const getTransactionIcon = (category) => {
    switch(category) {
      case 'Salary': return FiCreditCard
      case 'Reward': return FiTrendingUp
      case 'Incentive Payment': return FiTrendingUp
      case 'Reward Payment': return FiTarget
      case 'Withdrawal': return FiArrowUp
      default: return FiActivity
    }
  }

  const getTransactionColor = (type) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionBg = (type) => {
    return type === 'income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <SL_navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20 lg:pb-4">
        
        {/* Responsive Layout */}
        <div className="space-y-6">
          
          {/* Error State */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-center">
                <FiAlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-sm text-red-600 flex-1">{error}</p>
                <button 
                  onClick={loadWallet}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <FiLoader className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Financial Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 rounded-xl p-4 text-gray-900 shadow-lg border border-teal-300/40 overflow-hidden"
            style={{
              boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(20, 184, 166, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            }}
          >
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-2 right-4 w-1 h-1 bg-teal-200/30 rounded-full animate-pulse"></div>
              <div className="absolute top-6 right-8 w-0.5 h-0.5 bg-teal-300/25 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-8 left-4 w-0.5 h-0.5 bg-teal-200/25 rounded-full animate-pulse delay-500"></div>
              
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-2">
                <div className="w-full h-full" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(20, 184, 166, 0.05) 1px, transparent 0)',
                  backgroundSize: '15px 15px'
                }}></div>
              </div>
            </div>

            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center justify-between mb-3 relative z-10"
            >
              <div className="flex items-center space-x-2">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="relative w-8 h-8 bg-white/60 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-md border border-teal-300/40"
                >
                  <FiCreditCard className="text-teal-700 text-sm" />
                </motion.div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Wallet Overview</h2>
                  <p className="text-teal-700 text-xs">Financial summary</p>
                </div>
              </div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-1 bg-white/70 backdrop-blur-sm rounded-md px-2 py-1 border border-teal-400/50 shadow-sm"
              >
                <FiActivity className="text-teal-700 text-xs" />
                <span className="text-teal-800 font-bold text-xs">Active</span>
              </motion.div>
            </motion.div>

            {/* Current Balance Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-3"
            >
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-teal-300/50 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-teal-800 text-xs font-semibold">Current Balance</span>
                  <FaRupeeSign className="text-teal-600 text-sm" />
                </div>
                {loading ? (
                  <SkeletonLoader className="h-6 w-24" />
                ) : (
                  <p className="text-gray-900 text-lg font-bold">{formatCurrency(wallet?.currentBalance)}</p>
                )}
              </div>
            </motion.div>

            {/* Monthly Fixed Salary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mb-3"
            >
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-teal-300/50 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-teal-800 text-xs font-semibold">Monthly Salary</span>
                  <FaRupeeSign className="text-teal-600 text-sm" />
                </div>
                {loading ? (
                  <SkeletonLoader className="h-6 w-24" />
                ) : (
                  <p className="text-gray-900 text-lg font-bold">{formatCurrency(wallet?.monthlySalary)}</p>
                )}
              </div>
            </motion.div>

            {/* Reward Overview (from achieving sales targets) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.52 }}
              className="mb-3"
            >
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-amber-300/50 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-800 text-xs font-semibold">Reward Overview</span>
                  <div className="flex items-center gap-1">
                    {!loading && allTimeReward > 0 && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        rewardStatus === 'paid'
                          ? 'text-emerald-800 bg-emerald-100'
                          : 'text-amber-800 bg-amber-100'
                      }`}>
                        {rewardStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    )}
                    <FiTarget className="text-amber-600 text-sm" />
                  </div>
                </div>
                {loading ? (
                  <SkeletonLoader className="h-6 w-24" />
                ) : (
                  <div>
                    {/* Highlight CURRENT pending reward balance */}
                    <p className="text-gray-900 text-xl font-extrabold">
                      {formatCurrency(pendingReward)}
                    </p>
                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                      Current pending reward
                    </p>
                  </div>
                )}
                {!loading && (rewardEarned > 0 || paidRewardTotal > 0) ? (
                  <div className="mt-2 text-xs text-amber-700 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total earned:</span>
                      <span className="font-semibold">{formatCurrency(allTimeReward)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Already paid:</span>
                      <span className="font-semibold">{formatCurrency(paidRewardTotal)}</span>
                    </div>
                    <p className="text-[11px] text-amber-600 pt-0.5">
                      Rewards are based on achieving your sales targets. Paid rewards appear in your transaction history.
                    </p>
                  </div>
                ) : (
                  <p className="text-amber-600 text-xs mt-0.5">
                    No rewards yet. Achieve your sales targets to earn rewards.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Incentive Metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 gap-3 mb-3"
            >
              {/* Total Incentive */}
              <motion.div 
                whileHover={{ scale: 1.02, y: -1 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/50 hover:border-emerald-400/70 transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-800 text-xs font-semibold">Total Incentive</span>
                  <FiTrendingUp className="text-emerald-600 text-xs" />
                </div>
                {loading ? (
                  <>
                    <SkeletonLoader className="h-4 w-20 mb-1" />
                    <SkeletonLoader className="h-3 w-16" />
                  </>
                ) : (
                  <>
                    <p className="text-gray-900 text-sm font-bold">{formatCurrency(wallet?.totalEarning)}</p>
                    <p className="text-emerald-600 text-xs">All Time</p>
                  </>
                )}
              </motion.div>
              
              {/* Pending Incentive */}
              <motion.div 
                whileHover={{ scale: 1.02, y: -1 }}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 backdrop-blur-sm rounded-lg p-3 border border-yellow-300/50 hover:border-yellow-400/70 transition-all duration-300 shadow-sm relative group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-800 text-xs font-semibold">Pending Incentive</span>
                  <FiCalendar className="text-yellow-600 text-xs" />
                </div>
                {loading ? (
                  <>
                    <SkeletonLoader className="h-4 w-20 mb-1" />
                    <SkeletonLoader className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <p className="text-gray-900 text-sm font-bold">{formatCurrency(wallet?.pendingIncentive)}</p>
                    <p className="text-yellow-600 text-xs">Awaiting Recovery</p>
                  </>
                )}
                
                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                  You can withdraw this amount after full payment recovery of client
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                </div>
              </motion.div>
            </motion.div>

            {/* Team Lead Incentive Metrics - Separate boxes with custom layout - Only for Team Leads */}
            {!loading && wallet?.isTeamLead && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="space-y-3 mb-3"
              >
                {/* Team Lead Total Incentive - Full width */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -1 }}
                  className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-300/50 hover:border-purple-400/70 transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-purple-800 text-xs font-semibold">Team Lead Total Incentive</span>
                    <FiUsers className="text-purple-600 text-xs" />
                  </div>
                  {loading ? (
                    <>
                      <SkeletonLoader className="h-4 w-20 mb-1" />
                      <SkeletonLoader className="h-3 w-16" />
                    </>
                  ) : (
                    <>
                      <p className="text-gray-900 text-sm font-bold">{formatCurrency(wallet?.teamLeadIncentive?.total || 0)}</p>
                      <p className="text-purple-600 text-xs">All Time</p>
                    </>
                  )}
                </motion.div>

                {/* Team Lead Current and Pending - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Team Lead Current Incentive */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -1 }}
                    className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/50 hover:border-emerald-400/70 transition-all duration-300 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-emerald-800 text-xs font-semibold">Team Lead Current Incentive</span>
                      <FiTrendingUp className="text-emerald-600 text-xs" />
                    </div>
                    {loading ? (
                      <>
                        <SkeletonLoader className="h-4 w-20 mb-1" />
                        <SkeletonLoader className="h-3 w-16" />
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 text-sm font-bold">{formatCurrency(wallet?.teamLeadIncentive?.current || 0)}</p>
                        <p className="text-emerald-600 text-xs">Available</p>
                      </>
                    )}
                  </motion.div>

                  {/* Team Lead Pending Incentive */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -1 }}
                    className="bg-gradient-to-br from-yellow-50 to-amber-50 backdrop-blur-sm rounded-lg p-3 border border-yellow-300/50 hover:border-yellow-400/70 transition-all duration-300 shadow-sm relative group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-yellow-800 text-xs font-semibold">Team Lead Pending Incentive</span>
                      <FiCalendar className="text-yellow-600 text-xs" />
                    </div>
                    {loading ? (
                      <>
                        <SkeletonLoader className="h-4 w-20 mb-1" />
                        <SkeletonLoader className="h-3 w-24" />
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 text-sm font-bold">{formatCurrency(wallet?.teamLeadIncentive?.pending || 0)}</p>
                        <p className="text-yellow-600 text-xs">Awaiting Recovery</p>
                      </>
                    )}
                    
                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                      You can withdraw this amount after full payment recovery
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Team Target Reward Card - Only for Team Leads */}
            {!loading && wallet?.teamTargetReward && wallet.teamTargetReward.target > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.75 }}
                className="mb-3"
              >
                <motion.div 
                  whileHover={{ scale: 1.02, y: -1 }}
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/50 hover:border-emerald-400/70 transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-emerald-800 text-xs font-semibold">Team Target Reward</span>
                    <div className="flex items-center gap-1">
                      {wallet.teamTargetReward.status === 'paid' && (
                        <span className="text-emerald-700 text-[10px] font-medium bg-emerald-100 px-1.5 py-0.5 rounded">Paid</span>
                      )}
                      <FiTarget className="text-emerald-600 text-xs" />
                    </div>
                  </div>
                  <p className="text-gray-900 text-sm font-bold">{formatCurrency(wallet.teamTargetReward.reward)}</p>
                  <p className="text-emerald-600 text-xs mt-0.5">
                    {wallet.teamTargetReward.status === 'paid' ? 'Reward paid with salary' : 'Reward for achieving team target'}
                  </p>
                  {wallet.teamTargetReward.target > 0 && (
                    <p className="text-emerald-700 text-xs mt-1">Target: ₹{wallet.teamTargetReward.target.toLocaleString()}</p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Monthly Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 gap-2"
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-cyan-300/50 text-center hover:border-cyan-400/70 transition-all duration-300 shadow-sm"
              >
                <p className="text-cyan-800 text-xs font-semibold mb-0.5">This Month</p>
                {loading ? (
                  <SkeletonLoader className="h-3 w-16 mx-auto" />
                ) : (
                  <p className="text-gray-900 text-xs font-bold">{formatCurrency(wallet?.monthlyEarning)}</p>
                )}
              </motion.div>
              
              {/* Removed Total Balance (duplicate of Current Balance) */}
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-violet-300/50 text-center hover:border-violet-400/70 transition-all duration-300 shadow-sm"
              >
                <p className="text-violet-800 text-xs font-semibold mb-0.5">All Time</p>
                {loading ? (
                  <SkeletonLoader className="h-3 w-16 mx-auto" />
                ) : (
                  <p className="text-gray-900 text-xs font-bold">{formatCurrency(wallet?.totalEarning)}</p>
                )}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Transaction Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
              {loading ? (
                <SkeletonLoader className="h-4 w-32 mt-1" />
              ) : (
                <p className="text-sm text-gray-600 mt-1">{visibleTransactions.length} recent transactions</p>
              )}
            </div>
            <div className="flex items-center space-x-2" />
          </div>

          {/* Transaction List */}
          <div className="space-y-3">
            {loading ? (
              // Show skeleton loaders for transactions
              [...Array(3)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <SkeletonLoader className="w-10 h-10 rounded-lg" />
                      <div>
                        <SkeletonLoader className="h-4 w-32 mb-2" />
                        <SkeletonLoader className="h-3 w-20" />
                      </div>
                    </div>
                    <SkeletonLoader className="h-4 w-16" />
                  </div>
                </div>
              ))
            ) : visibleTransactions.length === 0 ? (
              <div className="text-center py-8">
                <FiActivity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No transactions yet</p>
              </div>
            ) : (
              visibleTransactions.map((transaction, index) => {
              const IconComponent = getTransactionIcon(transaction.category)
              
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <IconComponent className={`text-sm ${getTransactionColor(transaction.type)}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{transaction.description}</h4>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            }))}
          </div>

        </div>
        
      </main>

      {/* Withdrawal modal removed */}
    </div>
  )
}

export default SL_wallet
