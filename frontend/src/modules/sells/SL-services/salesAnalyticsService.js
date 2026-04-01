import { apiRequest } from './baseApiService';

// Sales Analytics Service
// Provides dashboard stats, monthly conversions, and leaderboard data

const getDashboardStats = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/sales/dashboard/stats${query ? `?${query}` : ''}`;
  return apiRequest(url, { method: 'GET' });
};

const getMonthlyConversions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/sales/analytics/conversions/monthly${query ? `?${query}` : ''}`;
  return apiRequest(url, { method: 'GET' });
};

const getMonthlySalesHistory = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/sales/analytics/monthly-sales-history${query ? `?${query}` : ''}`;
  return apiRequest(url, { method: 'GET' });
};

const getMonthlyIncentiveHistory = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/sales/analytics/incentives/history${query ? `?${query}` : ''}`;
  return apiRequest(url, { method: 'GET' });
};

const getTileCardStats = async () => {
  const url = `/sales/dashboard/tile-stats`;
  return apiRequest(url, { method: 'GET' });
};

const getDashboardHeroStats = async () => {
  const url = `/sales/dashboard/hero-stats`;
  return apiRequest(url, { method: 'GET' });
};

// Get sales leaderboard for sales module
const getLeaderboard = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/sales/analytics/leaderboard${query ? `?${query}` : ''}`;
  const response = await apiRequest(url, { method: 'GET' });
  return response.data;
};

export default {
  getDashboardStats,
  getMonthlyConversions,
  getMonthlySalesHistory,
  getMonthlyIncentiveHistory,
  getTileCardStats,
  getDashboardHeroStats,
  getLeaderboard
};


