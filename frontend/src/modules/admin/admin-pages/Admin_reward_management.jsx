import React, { useState, useEffect, useCallback, useRef } from 'react'
import Admin_navbar from '../admin-components/Admin_navbar'
import Admin_sidebar from '../admin-components/Admin_sidebar'
import Loading from '../../../components/ui/loading'
import { useToast } from '../../../contexts/ToastContext'
import { adminRewardService } from '../admin-services/adminRewardService'
import {
  FiGift,
  FiDollarSign,
  FiCheckCircle,
  FiTrendingUp,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiCode,
  FiUsers,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiCalendar,
  FiAward,
  FiClock,
  FiActivity,
  FiPlay,
  FiInfo
} from 'react-icons/fi'

const initialFilters = {
  team: 'all',
  status: 'all',
  search: ''
}

const initialRewardForm = {
  name: '',
  description: '',
  amount: '',
  team: 'dev',
  criteriaType: 'completionRatio',
  criteriaValue: '90',
  criteriaDescription: '',
  startsOn: '',
  endsOn: ''
}

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0
  return `₹${amount.toLocaleString('en-IN')}`
}

const formatDate = (value) => {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    return null
  }
}

const getTeamInfo = (team) => {
  if (team === 'pm') {
    return {
      label: 'PM Team',
      icon: FiUsers,
      badgeClasses: 'bg-violet-100 text-violet-700'
    }
  }
  return {
    label: 'Development Team',
    icon: FiCode,
    badgeClasses: 'bg-blue-100 text-blue-700'
  }
}

const describeCriteria = (reward) => {
  if (!reward?.criteria) {
    return 'No criteria configured'
  }
  const { type, value } = reward.criteria
  if (type === 'completionRatio') {
    return `Award when task completion ratio ≥ ${value}% at month end`
  }
  if (type === 'points') {
    return `Award when developer reaches ${value} points`
  }
  return 'Award criteria not specified'
}

const Admin_reward_management = () => {
  const { toast } = useToast()
  const hasLoadedOnce = useRef(false)

  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [submittingReward, setSubmittingReward] = useState(false)
  const [awardingRewardId, setAwardingRewardId] = useState(null)

  const [rewards, setRewards] = useState([])
  const [totals, setTotals] = useState({
    count: 0,
    active: 0,
    inactive: 0,
    budget: 0
  })

  const [filters, setFilters] = useState(initialFilters)
  const [rewardForm, setRewardForm] = useState(initialRewardForm)

  const [activeTab, setActiveTab] = useState('rewards')
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyFilters, setHistoryFilters] = useState({
    month: '',
    team: 'all'
  })
  const [triggerMonth, setTriggerMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [processingManual, setProcessingManual] = useState(false)

  const fetchRewards = useCallback(async (currentFilters, showLoader = true) => {
    if (showLoader) {
      setLoadingRewards(true)
    }

    try {
      const normalizedFilters = {
        ...currentFilters,
        search: currentFilters.search?.trim() || ''
      }

      const response = await adminRewardService.getRewards(normalizedFilters)
      setRewards(response.data || [])
      setTotals(response.totals || {
        count: 0,
        active: 0,
        inactive: 0,
        budget: 0
      })
    } catch (error) {
      const message = error.message || 'Failed to load rewards'
      toast.error(message)
    } finally {
      if (showLoader) {
        setLoadingRewards(false)
      }
    }
  }, [toast])

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true)
      try {
        await fetchRewards(initialFilters, false)
      } finally {
        setInitialLoading(false)
        hasLoadedOnce.current = true
      }
    }

    loadInitialData()
  }, [fetchRewards])

  useEffect(() => {
    if (!hasLoadedOnce.current) {
      return
    }
    fetchRewards(filters)
  }, [filters, fetchRewards])

  const handleRefresh = () => {
    if (activeTab === 'rewards') {
      fetchRewards(filters)
    } else {
      fetchHistory()
    }
  }

  const fetchHistory = useCallback(async (currentFilters = {}) => {
    setLoadingHistory(true)
    try {
      const response = await adminRewardService.getRewardHistory(currentFilters)
      if (response.success) {
        setHistory(response.data || [])
      }
    } catch (error) {
      toast.error('Failed to load reward history')
    } finally {
      setLoadingHistory(false)
    }
  }, [toast])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyFilters)
    }
  }, [activeTab, historyFilters, fetchHistory])

  const handleHistoryFilterChange = (e) => {
    const { name, value } = e.target
    setHistoryFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleManualTrigger = async () => {
    if (!triggerMonth) {
      toast.error('Please select a month')
      return
    }

    if (!window.confirm(`Manually process rewards for ${triggerMonth}? This will create pending rewards for all qualifiers.`)) {
      return
    }

    setProcessingManual(true)
    try {
      const response = await adminRewardService.triggerMonthlyProcess(triggerMonth)
      if (response.success) {
        toast.success(`Rewards processed for ${triggerMonth}! ${response.data?.totalWinners || 0} winners found.`)
        fetchHistory()
      }
    } catch (error) {
      toast.error(error.message || 'Failed to trigger process')
    } finally {
      setProcessingManual(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(triggerMonth)
    }
  }, [activeTab, triggerMonth, fetchHistory])

  const handleRewardFormChange = (event) => {
    const { name, value } = event.target
    setRewardForm((prev) => {
      if (name === 'team') {
        return {
          ...prev,
          team: value,
          criteriaType: 'completionRatio',
          criteriaValue: prev.criteriaValue || '90'
        }
      }
      if (name === 'criteriaType') {
        return { ...prev, criteriaType: value, criteriaValue: value === 'completionRatio' ? '90' : prev.criteriaValue }
      }
      return { ...prev, [name]: value }
    })
  }

  const handleCreateReward = async (event) => {
    event.preventDefault()

    const trimmedName = rewardForm.name.trim()
    if (!trimmedName) {
      toast.error('Reward name is required')
      return
    }

    const amount = Number(rewardForm.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Reward amount must be a positive number')
      return
    }

    const criteriaValue = Number(rewardForm.criteriaValue)
    if (rewardForm.criteriaType === 'completionRatio') {
      if (Number.isNaN(criteriaValue) || criteriaValue < 0 || criteriaValue > 100) {
        toast.error('Completion ratio must be between 0 and 100 (e.g. 90 for 90%)')
        return
      }
    } else if (Number.isNaN(criteriaValue) || criteriaValue <= 0) {
      toast.error('Please enter a valid criteria value')
      return
    }

    const payload = {
      name: trimmedName,
      description: rewardForm.description.trim() || undefined,
      amount,
      team: rewardForm.team,
      criteriaType: rewardForm.criteriaType || 'completionRatio',
      criteriaValue: criteriaValue,
      criteriaDescription: rewardForm.criteriaDescription.trim() || undefined,
      startsOn: rewardForm.startsOn || undefined,
      endsOn: rewardForm.endsOn || undefined
    }

    setSubmittingReward(true)
    try {
      await adminRewardService.createReward(payload)
      toast.success('Reward created successfully')
      setRewardForm({ ...initialRewardForm, team: rewardForm.team })
      fetchRewards(filters)
    } catch (error) {
      const message = error.message || 'Failed to create reward'
      toast.error(message)
    } finally {
      setSubmittingReward(false)
    }
  }

  const handleAwardForMonth = async (rewardId) => {
    setAwardingRewardId(rewardId)
    try {
      const response = await adminRewardService.awardRewardForMonth(rewardId)
      toast.success(response.message || 'Reward awarded for this month. Qualifying devs/PMs will see it in their wallet.')
      fetchRewards(filters)
    } catch (error) {
      toast.error(error.message || 'Failed to award reward')
    } finally {
      setAwardingRewardId(null)
    }
  }

  const handleToggleStatus = async (rewardId) => {
    try {
      const response = await adminRewardService.toggleRewardStatus(rewardId)
      setRewards((prev) =>
        prev.map((reward) =>
          reward._id === rewardId ? response.data || reward : reward
        )
      )
      toast.success('Reward status updated')
      fetchRewards(filters, false)
    } catch (error) {
      const message = error.message || 'Failed to update reward status'
      toast.error(message)
    }
  }

  const handleDeleteReward = async (rewardId) => {
    const confirmed = window.confirm('Delete this reward permanently?')
    if (!confirmed) {
      return
    }

    try {
      await adminRewardService.deleteReward(rewardId)
      toast.success('Reward deleted')
      fetchRewards(filters)
    } catch (error) {
      const message = error.message || 'Failed to delete reward'
      toast.error(message)
    }
  }

  const handleSearchChange = (event) => {
    const { value } = event.target
    setFilters((prev) => ({
      ...prev,
      search: value
    }))
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_navbar />
        <Admin_sidebar />
        <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Loading size="large" className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_navbar />
      <Admin_sidebar />

      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reward Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Create rewards for Development team and PMs. Rewards are based on task completion ratio (e.g. 90% at month end). Awarded rewards appear in employee and PM wallets.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                type="button"
              >
                <FiRefreshCw className="text-base" />
                Refresh
              </button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <FiGift />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total Rewards</p>
                  <p className="text-xl font-bold text-blue-900">{totals.count}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <FiCheckCircle />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-green-600">Active Rewards</p>
                  <p className="text-xl font-bold text-green-900">{totals.active}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <FiDollarSign />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Total Budget</p>
                  <p className="text-xl font-bold text-purple-900">{formatCurrency(totals.budget)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tab Navigation */}
          <div className="flex space-x-1 rounded-xl bg-gray-200/50 p-1 mb-8 w-fit">
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${activeTab === 'rewards'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
            >
              <FiGift className={activeTab === 'rewards' ? 'text-blue-500' : ''} />
              Manage Rewards
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
            >
              <FiClock className={activeTab === 'history' ? 'text-blue-500' : ''} />
              Distribution History
            </button>
          </div>

          {activeTab === 'rewards' ? (
            <>
              <section>
                <form
                  onSubmit={handleCreateReward}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-lg bg-blue-100 p-2 text-blue-600">
                      <FiDollarSign />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Create Reward</h2>
                      <p className="text-sm text-gray-500">Rewards are always monetary. Set the amount and criteria.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reward name</span>
                      <input
                        type="text"
                        name="name"
                        value={rewardForm.name}
                        onChange={handleRewardFormChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Eg. Sprint Performance Bonus"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reward amount (₹)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        name="amount"
                        value={rewardForm.amount}
                        onChange={handleRewardFormChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Enter amount"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Team</span>
                      <select
                        name="team"
                        value={rewardForm.team}
                        onChange={handleRewardFormChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="dev">Development (task completion %)</option>
                        <option value="pm">PM (task completion %)</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Task completion ratio (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        name="criteriaValue"
                        value={rewardForm.criteriaValue}
                        onChange={handleRewardFormChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="90"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description (optional)</span>
                      <textarea
                        name="description"
                        value={rewardForm.description}
                        onChange={handleRewardFormChange}
                        rows={3}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Add additional details or guidelines"
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Criteria notes (optional)</span>
                      <textarea
                        name="criteriaDescription"
                        value={rewardForm.criteriaDescription}
                        onChange={handleRewardFormChange}
                        rows={2}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Outline how the reward is tracked"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Starts on</span>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                          <FiCalendar className="text-gray-400" />
                          <input
                            type="date"
                            name="startsOn"
                            value={rewardForm.startsOn}
                            onChange={handleRewardFormChange}
                            className="w-full border-none bg-transparent text-sm focus:outline-none"
                          />
                        </div>
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ends on</span>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                          <FiCalendar className="text-gray-400" />
                          <input
                            type="date"
                            name="endsOn"
                            value={rewardForm.endsOn}
                            onChange={handleRewardFormChange}
                            className="w-full border-none bg-transparent text-sm focus:outline-none"
                          />
                        </div>
                      </label>
                    </div>

                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReward}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      <FiPlus />
                      {submittingReward ? 'Creating...' : 'Create reward'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Rewards</h2>
                    <p className="text-sm text-gray-500">Development & PM rewards. Award for this month to credit qualifying devs/PMs (visible in their wallets).</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-56">
                      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={handleSearchChange}
                        placeholder="Search rewards"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <FiFilter className="text-gray-400" />
                        <select
                          name="team"
                          value={filters.team}
                          onChange={handleFilterChange}
                          className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="all">All teams</option>
                          <option value="dev">Development</option>
                          <option value="pm">PM</option>
                        </select>
                      </label>
                      <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="all">All statuses</option>
                        <option value="active">Active only</option>
                        <option value="inactive">Inactive only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loadingRewards ? (
                  <div className="mt-10 flex justify-center">
                    <Loading size="medium" />
                  </div>
                ) : rewards.length === 0 ? (
                  <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <FiTrendingUp className="text-2xl" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">No rewards found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Adjust your filters or create a reward to get started.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {rewards.map((reward) => {
                      const teamInfo = getTeamInfo(reward.team)
                      const TeamIcon = teamInfo.icon
                      const canAward = reward.team === 'dev' || reward.team === 'pm'

                      return (
                        <article
                          key={reward._id}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${teamInfo.badgeClasses}`}>
                                  <TeamIcon className="text-sm" />
                                  {teamInfo.label}
                                </span>
                                <h3 className="text-lg font-semibold text-gray-900">{reward.name}</h3>
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                  {formatCurrency(reward.amount)}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reward.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {reward.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              {reward.description && (
                                <p className="text-sm text-gray-600">{reward.description}</p>
                              )}
                              <p className="text-sm font-medium text-gray-800">{describeCriteria(reward)}</p>
                              {reward.criteria?.description && (
                                <p className="text-xs text-gray-500">{reward.criteria.description}</p>
                              )}
                              {(reward.startsOn || reward.endsOn) && (
                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                  {reward.startsOn && (
                                    <div className="flex items-center gap-1">
                                      <FiCalendar />
                                      <span>Starts {formatDate(reward.startsOn)}</span>
                                    </div>
                                  )}
                                  {reward.endsOn && (
                                    <div className="flex items-center gap-1">
                                      <FiCalendar />
                                      <span>Ends {formatDate(reward.endsOn)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
                              {canAward && reward.isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleAwardForMonth(reward._id)}
                                  disabled={awardingRewardId === reward._id}
                                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <FiAward className="text-lg" />
                                  {awardingRewardId === reward._id ? 'Awarding...' : 'Award for this month'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(reward._id)}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${reward.isActive
                                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                                  }`}
                              >
                                {reward.isActive ? <FiToggleRight className="text-lg" /> : <FiToggleLeft className="text-lg" />}
                                {reward.isActive ? 'Mark inactive' : 'Mark active'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReward(reward._id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                              >
                                <FiTrash2 />
                                Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* History Tab Content */
            <div className="space-y-6">
              {/* Manual Trigger Section */}
              <section className="rounded-xl border border-orange-100 bg-orange-50 p-6 shadow-sm border-l-4 border-l-orange-500">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                      <FiActivity className="text-xl" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-orange-900">Manual Reward Processing</h2>
                      <p className="text-sm text-orange-700/80">
                        Manually trigger the monthly reward calculation and distribution.
                        This will generate <span className="font-bold">pending rewards</span> in qualifying Dev/PM wallets.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-auto">
                      <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                      <input
                        type="month"
                        value={triggerMonth}
                        onChange={(e) => setTriggerMonth(e.target.value)}
                        className="w-full sm:w-auto rounded-lg border border-orange-200 bg-white px-3 py-2 pl-10 text-sm font-bold text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <button
                      onClick={handleManualTrigger}
                      disabled={processingManual}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-2 text-sm font-black text-white shadow-lg transition hover:bg-orange-700 disabled:opacity-50"
                    >
                      {processingManual ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FiPlay className="text-xs" />
                          Trigger Distribution
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-orange-700/60 bg-white/50 p-2 rounded-lg">
                  <FiInfo className="flex-shrink-0" />
                  <span>Note: Distribution syncs with salary records. Rewards will be marked as 'paid' once the respective salaries are paid by HR.</span>
                </div>
              </section>

              {/* History Table/List */}
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Distribution Logs</h2>
                    <p className="text-sm text-gray-500 italic">Tracking automated and manual reward executions</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <FiFilter className="text-gray-400" />
                      <select
                        name="team"
                        value={historyFilters.team}
                        onChange={handleHistoryFilterChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="all">All teams</option>
                        <option value="dev">Development</option>
                        <option value="pm">PM Team</option>
                      </select>
                    </div>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="month"
                        name="month"
                        value={historyFilters.month}
                        onChange={handleHistoryFilterChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    {(historyFilters.month !== '' || historyFilters.team !== 'all') && (
                      <button
                        onClick={() => setHistoryFilters({ month: '', team: 'all' })}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="flex justify-center py-20">
                    <Loading size="medium" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-20 text-center">
                    <FiClock className="text-4xl text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No history found</h3>
                    <p className="text-sm text-gray-500">Processing logs will appear here after reward distribution.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-4 text-xs font-black uppercase tracking-widest text-gray-400">Month</th>
                          <th className="pb-4 text-xs font-black uppercase tracking-widest text-gray-400">Team</th>
                          <th className="pb-4 text-xs font-black uppercase tracking-widest text-gray-400">Winners</th>
                          <th className="pb-4 text-xs font-black uppercase tracking-widest text-gray-400">Total Cost</th>
                          <th className="pb-4 text-xs font-black uppercase tracking-widest text-gray-400">Processed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((log) => (
                          <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4">
                              <span className="font-bold text-gray-900">{log.month}</span>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter ${log.team === 'dev' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {log.team === 'dev' ? 'Development' : 'PM Team'}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className="text-sm font-bold text-gray-700">{log.totalWinners} 人</span>
                            </td>
                            <td className="py-4">
                              <span className="text-sm font-black text-gray-900">{formatCurrency(log.totalCost)}</span>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-600">{formatDate(log.processedAt)}</span>
                                <span className="text-[10px] text-gray-400">{new Date(log.processedAt).toLocaleTimeString()}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin_reward_management

