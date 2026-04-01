import { apiRequest } from './baseApiService'

const getWalletSummary = async () => {
  const res = await apiRequest('/sales/wallet/summary', { method: 'GET' })
  // Backend sends { success, data: { salary: { fixedSalary }, incentive, rewardEarned, reward, ... } }
  const payload = res?.data || res || {}

  const salary = payload.salary && typeof payload.salary === 'object'
    ? payload.salary
    : { fixedSalary: 0 }

  const incentive = payload.incentive || {
    perClient: 0,
    current: 0,
    pending: 0,
    monthly: 0,
    allTime: 0,
    breakdown: []
  }

  const rewardEarned = Number(payload.rewardEarned ?? (payload.reward?.earned ?? 0))
  const reward = payload.reward || {
    earned: rewardEarned,
    currentReward: rewardEarned,
    status: rewardEarned > 0 ? 'pending' : 'pending'
  }

  return {
    salary,
    incentive,
    rewardEarned,
    reward,
    isTeamLead: payload.isTeamLead,
    teamLeadIncentive: payload.teamLeadIncentive || null,
    teamTargetReward: payload.teamTargetReward || null,
    transactions: Array.isArray(payload.transactions) ? payload.transactions : []
  }
}

export default {
  getWalletSummary
}


