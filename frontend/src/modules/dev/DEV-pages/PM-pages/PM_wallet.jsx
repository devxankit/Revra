// Professional PM Wallet Dashboard component with enhanced UI
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiCreditCard,
  FiCalendar,
  FiTrendingUp,
  FiDollarSign,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAward,
  FiUser
} from 'react-icons/fi'
import PM_navbar from '../../DEV-components/PM_navbar'
import { pmWalletService } from '../../DEV-services'
import { useToast } from '../../../../contexts/ToastContext'

const PM_wallet = () => {
  const { toast } = useToast();
  const [walletData, setWalletData] = useState({
    monthlySalary: 0,
    monthlyRewards: 0,
    totalPaidRewards: 0,
    totalPendingRewards: 0,
    totalEarnings: 0,
    salaryStatus: 'unpaid',
    transactions: [],
    rewardProgress: {
      completionRate: 0,
      totalProjects: 0,
      rewardTarget: 90
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load wallet data
  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);

      // Fetch wallet summary and transactions in parallel
      const [summaryResponse, transactionsResponse] = await Promise.all([
        pmWalletService.getWalletSummary(),
        pmWalletService.getWalletTransactions(50)
      ]);

      if (summaryResponse.success && transactionsResponse.success) {
        setWalletData({
          monthlySalary: summaryResponse.data.monthlySalary || 0,
          monthlyRewards: summaryResponse.data.monthlyRewards || 0,
          totalPaidRewards: summaryResponse.data.totalPaidRewards || 0,
          totalPendingRewards: summaryResponse.data.totalPendingRewards || 0,
          totalEarnings: summaryResponse.data.totalEarnings || 0,
          salaryStatus: summaryResponse.data.salaryStatus || 'unpaid',
          transactions: transactionsResponse.data || [],
          rewardProgress: summaryResponse.data.rewardProgress || {
            completionRate: 0,
            totalProjects: 0,
            rewardTarget: 90
          }
        });
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load wallet data. Please try again later.');

      // Set fallback data
      setWalletData({
        monthlySalary: 0,
        monthlyRewards: 0,
        totalEarnings: 0,
        salaryStatus: 'unpaid',
        transactions: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString()}`
  }

  const getTransactionIcon = (category) => {
    switch (category) {
      case 'Fixed Salary': return FiCreditCard
      case 'Performance Reward': return FiAward
      case 'Team Management': return FiUser
      case 'Client Satisfaction': return FiCheckCircle
      default: return FiActivity
    }
  }

  const getTransactionColor = (type) => {
    return type === 'salary' ? 'text-blue-600' : 'text-green-600'
  }

  const getTransactionBg = (type) => {
    return type === 'salary' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
  }

  const getStatusColor = (status) => {
    return status === 'Paid' ? 'text-green-600' : 'text-orange-600'
  }

  const getStatusIcon = (status) => {
    return status === 'Paid' ? FiCheckCircle : FiClock
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <PM_navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20 lg:pb-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading wallet data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <PM_navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20 lg:pb-4">

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">

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
                  <h2 className="text-sm font-bold text-gray-900">PM Wallet Overview</h2>
                  <p className="text-teal-700 text-xs">Salary & Rewards</p>
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

            {/* Reward Progress Integration - Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-white/40 backdrop-blur-md rounded-xl p-3 border border-white/50 mb-3 shadow-inner"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <FiAward className="text-teal-600 text-sm" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Project Quality Reward</span>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                  {walletData.rewardProgress.completionRate}%
                </span>
              </div>

              <div className="relative h-2.5 bg-gray-200/50 rounded-full overflow-hidden border border-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(walletData.rewardProgress.completionRate, 100)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full rounded-full ${walletData.rewardProgress.completionRate >= walletData.rewardProgress.rewardTarget
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                    : 'bg-gradient-to-r from-teal-400 to-teal-600'
                    }`}
                />
                <div
                  className="absolute top-0 h-full border-r-2 border-white/60 z-10"
                  style={{ left: `${walletData.rewardProgress.rewardTarget}%` }}
                >
                  <div className="absolute -top-1 -right-[4px] w-1 h-1 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] font-medium text-gray-600">
                  {walletData.rewardProgress.totalProjects} Projects Managed
                </p>
                <p className="text-[10px] font-bold text-teal-600 italic">
                  {walletData.rewardProgress.completionRate >= walletData.rewardProgress.rewardTarget
                    ? "Target Reached! 🏆"
                    : `Reach ${walletData.rewardProgress.rewardTarget}% Avg to win reward`}
                </p>
              </div>
            </motion.div>


            {/* Salary & Rewards Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 gap-3 mb-3"
            >
              {/* Fixed Salary */}
              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-teal-300/50 hover:border-teal-400/70 transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-teal-800 text-xs font-semibold">Fixed Salary</span>
                  <FiCreditCard className="text-teal-600 text-xs" />
                </div>
                <p className="text-gray-900 text-sm font-bold">{formatCurrency(walletData.monthlySalary)}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {walletData.salaryStatus === 'paid' ? (
                    <>
                      <FiCheckCircle className="text-green-500 text-xs" />
                      <p className="text-green-600 text-xs">Paid</p>
                    </>
                  ) : (
                    <>
                      <FiClock className="text-orange-500 text-xs" />
                      <p className="text-orange-600 text-xs">Pending</p>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Monthly Rewards */}
              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                className="bg-gradient-to-br from-emerald-50 to-green-50 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/50 hover:border-emerald-400/70 transition-all duration-300 shadow-sm relative group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-800 text-xs font-semibold">Monthly Rewards</span>
                  <FiAward className="text-emerald-600 text-xs" />
                </div>
                <p className="text-gray-900 text-sm font-bold">{formatCurrency(walletData.monthlyRewards)}</p>
                <p className="text-emerald-600 text-xs">Performance Based</p>

                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Rewards earned through project performance and team management
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                </div>
              </motion.div>
            </motion.div>

            {/* Monthly Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 gap-2 mb-3"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-emerald-300/50 text-center hover:border-emerald-400/70 transition-all duration-300 shadow-sm"
              >
                <p className="text-emerald-800 text-[10px] font-semibold mb-0.5">Total Paid Rewards</p>
                <p className="text-gray-900 text-xs font-bold">{formatCurrency(walletData.totalPaidRewards)}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-orange-300/50 text-center hover:border-orange-400/70 transition-all duration-300 shadow-sm"
              >
                <p className="text-orange-800 text-[10px] font-semibold mb-0.5">Pending Rewards</p>
                <p className="text-gray-900 text-xs font-bold">{formatCurrency(walletData.totalPendingRewards)}</p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="grid grid-cols-2 gap-2"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-teal-300/50 text-center hover:border-teal-400/70 transition-all duration-300 shadow-sm"
              >
                <p className="text-teal-800 text-[10px] font-semibold mb-0.5">This Month</p>
                <p className="text-gray-900 text-xs font-bold">{formatCurrency(walletData.monthlySalary + walletData.monthlyRewards)}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-purple-300/50 text-center hover:border-purple-400/70 transition-all duration-300 shadow-sm"
              >
                <p className="text-purple-800 text-[10px] font-semibold mb-0.5">All Time Total</p>
                <p className="text-gray-900 text-xs font-bold">{formatCurrency(walletData.totalEarnings)}</p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Transaction Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Earnings History</h3>
              <p className="text-sm text-gray-600 mt-1">{walletData.transactions.length} recent earnings</p>
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-3">
            {walletData.transactions.length === 0 ? (
              <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                <FiActivity className="text-gray-400 text-3xl mx-auto mb-2" />
                <p className="text-gray-600">No transactions found</p>
              </div>
            ) : (
              walletData.transactions.map((transaction, index) => {
                const IconComponent = getTransactionIcon(transaction.category)
                const StatusIcon = getStatusIcon(transaction.status)

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
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs text-gray-500">{transaction.date}</p>
                            <div className="flex items-center space-x-1">
                              <StatusIcon className={`text-xs ${getStatusColor(transaction.status)}`} />
                              <span className={`text-xs ${getStatusColor(transaction.status)}`}>{transaction.status}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-semibold text-sm ${getTransactionColor(transaction.type)}`}>
                          +{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              }))}
          </div>

        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-12 gap-8">

            {/* Main Content - 9 columns */}
            <div className="col-span-9 space-y-6">

              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                {/* Monthly Earnings - Full Width Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0 }}
                  className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-2xl p-8 shadow-2xl"
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(20, 184, 166, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 p-4 rounded-xl">
                        <FiAward className="text-white text-2xl" />
                      </div>
                      <div>
                        <h3 className="text-white text-2xl font-bold">Monthly Earnings</h3>
                        <p className="text-white/80 text-sm">Salary & Performance Rewards</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-white text-4xl font-bold">{formatCurrency(walletData.monthlySalary + walletData.monthlyRewards)}</p>
                        <div className="flex items-center mt-1">
                          <FiTrendingUp className="text-white/60 text-sm mr-1" />
                          <span className="text-white/80 text-xs">This month total</span>
                        </div>
                      </div>
                      <button className="bg-white/20 p-3 rounded-lg hover:bg-white/30 transition-colors duration-200">
                        <FiActivity className="text-white text-xl" />
                      </button>
                    </div>
                  </div>

                  {/* Reward Progress Integration - Desktop */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <FiAward className="text-white/80 text-lg" />
                          <h4 className="text-white font-bold text-lg tracking-wide uppercase">Project Delivery Reward Progress</h4>
                        </div>
                        <p className="text-white/60 text-sm">
                          Maintain an average project progress of at least <span className="text-white font-bold">{walletData.rewardProgress.rewardTarget}%</span> to qualify for monthly rewards!
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline justify-end space-x-2">
                          <span className="text-white text-3xl font-black">{walletData.rewardProgress.completionRate}%</span>
                          <span className="text-white/40 text-lg font-bold">/ 100%</span>
                        </div>
                        <p className="text-white/60 text-[10px] font-medium uppercase tracking-widest mt-1">Avg Progress Ratio</p>
                      </div>
                    </div>

                    <div className="relative h-4 bg-black/20 rounded-full p-1 shadow-inner overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(walletData.rewardProgress.completionRate, 100)}%` }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className={`h-full rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] ${walletData.rewardProgress.completionRate >= walletData.rewardProgress.rewardTarget
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400'
                          : 'bg-gradient-to-r from-teal-400 via-blue-400 to-teal-500'
                          }`}
                      >
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                      </motion.div>

                      {/* 90% Target Marker */}
                      <div
                        className="absolute top-0 h-full w-1 bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20"
                        style={{ left: `${walletData.rewardProgress.rewardTarget}%` }}
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black text-white bg-teal-600 px-1.5 py-0.5 rounded-sm shadow-lg whitespace-nowrap">
                          TARGET 90%
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between mt-4">
                      <div className="flex space-x-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-white/30"></div>
                          <span className="text-white/70 text-sm font-medium">Projects: <span className="text-white">{walletData.rewardProgress.totalProjects} Active</span></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${walletData.rewardProgress.completionRate >= walletData.rewardProgress.rewardTarget ? 'bg-emerald-400 animate-ping' : 'bg-blue-400'}`}></div>
                          <span className="text-white/70 text-sm font-medium">Status: <span className="text-white">{walletData.rewardProgress.completionRate >= walletData.rewardProgress.rewardTarget ? 'Qualified for Reward' : 'Working Towards Reward'}</span></span>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-lg flex items-center space-x-2 cursor-default group"
                      >
                        <FiActivity className="text-white/80 text-sm group-hover:animate-spin" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-widest leading-none">
                          {walletData.rewardProgress.completionRate >= 90 ? "Goal achieved!" : `${90 - walletData.rewardProgress.completionRate}% More to Go`}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Summary Cards Row */}
              <div className="grid grid-cols-4 gap-6 mb-6">
                {/* Fixed Salary */}
                <motion.div
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <FiCreditCard className="text-teal-600 text-xl" />
                    {walletData.salaryStatus === 'paid' ? (
                      <FiCheckCircle className="text-green-500 text-lg" />
                    ) : (
                      <FiClock className="text-orange-500 text-lg" />
                    )}
                  </div>
                  <h4 className="text-gray-600 text-sm font-medium mb-1">Fixed Salary</h4>
                  <p className="text-gray-900 text-2xl font-bold">{formatCurrency(walletData.monthlySalary)}</p>
                  <p className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${walletData.salaryStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                    {walletData.salaryStatus === 'paid' ? 'Paid this month' : 'Pending payment'}
                  </p>
                </motion.div>

                {/* Total Paid Rewards */}
                <motion.div
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <FiAward className="text-emerald-600 text-xl" />
                    <FiTrendingUp className="text-emerald-500 text-lg" />
                  </div>
                  <h4 className="text-gray-600 text-sm font-medium mb-1">Total Paid Rewards</h4>
                  <p className="text-gray-900 text-2xl font-bold">{formatCurrency(walletData.totalPaidRewards)}</p>
                  <p className="text-emerald-600 text-[10px] font-semibold mt-1 uppercase tracking-wider">All time paid</p>
                </motion.div>

                {/* All Time Pending Rewards */}
                <motion.div
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
                  className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <FiClock className="text-orange-600 text-xl" />
                    <FiActivity className="text-orange-500 text-lg" />
                  </div>
                  <h4 className="text-gray-600 text-sm font-medium mb-1">Pending Rewards</h4>
                  <p className="text-gray-900 text-2xl font-bold">{formatCurrency(walletData.totalPendingRewards)}</p>
                  <p className="text-orange-600 text-[10px] font-semibold mt-1 uppercase tracking-wider">Awaiting Payout</p>
                </motion.div>

                {/* Monthly Rewards (Current) */}
                <motion.div
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
                  className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <FiAward className="text-blue-600 text-xl" />
                    <FiCalendar className="text-blue-500 text-lg" />
                  </div>
                  <h4 className="text-gray-600 text-sm font-medium mb-1">Monthly Rewards</h4>
                  <p className="text-gray-900 text-2xl font-bold">{formatCurrency(walletData.monthlyRewards)}</p>
                  <p className="text-blue-600 text-[10px] font-semibold mt-1 uppercase tracking-wider">This Month Performance</p>
                </motion.div>
              </div>

              {/* Transactions Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Recent Earnings</h3>
                    <p className="text-sm text-gray-600 mt-1">Latest {walletData.transactions.length} earnings</p>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <div className="space-y-3">
                    {walletData.transactions.length === 0 ? (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                        <FiActivity className="text-gray-400 text-3xl mx-auto mb-2" />
                        <p className="text-gray-600">No transactions found</p>
                      </div>
                    ) : (
                      walletData.transactions.slice(0, 8).map((transaction, index) => {
                        const IconComponent = getTransactionIcon(transaction.category)
                        const StatusIcon = getStatusIcon(transaction.status)

                        return (
                          <motion.div
                            key={transaction.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.8 + (index * 0.1) }}
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="bg-gray-50 p-2 rounded-lg">
                                  <IconComponent className={`text-sm ${getTransactionColor(transaction.type)}`} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">{transaction.description}</h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <p className="text-xs text-gray-500">{transaction.date}</p>
                                    <div className="flex items-center space-x-1">
                                      <StatusIcon className={`text-xs ${getStatusColor(transaction.status)}`} />
                                      <span className={`text-xs ${getStatusColor(transaction.status)}`}>{transaction.status}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className={`font-semibold text-sm ${getTransactionColor(transaction.type)}`}>
                                  +{formatCurrency(transaction.amount)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      }))}
                  </div>
                </div>
              </motion.div>


            </div>

            {/* Sidebar - 3 columns */}
            <div className="col-span-3 space-y-6">


              {/* Earnings Summary */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 1.0 }}
                className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Earnings Summary</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fixed Salary</span>
                    <span className="font-semibold text-teal-600">{formatCurrency(walletData.monthlySalary)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Rewards</span>
                    <span className="font-semibold text-green-600">{formatCurrency(walletData.monthlyRewards)}</span>
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                    <span className="text-gray-600">Paid Rewards (All)</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(walletData.totalPaidRewards)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pending Rewards</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(walletData.totalPendingRewards)}</span>
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                    <span className="text-gray-700 font-bold">Total Earnings</span>
                    <span className="font-bold text-indigo-600 text-lg">{formatCurrency(walletData.totalEarnings)}</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>

      </main>

    </div>
  )
}

export default PM_wallet
