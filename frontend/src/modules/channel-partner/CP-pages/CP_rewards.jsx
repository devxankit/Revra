import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiAward, FiStar, FiTrendingUp, FiLock, FiUnlock,
  FiGift, FiCheckCircle
} from 'react-icons/fi';
import CP_navbar from '../CP-components/CP_navbar';
import { cpRewardService } from '../CP-services/cpRewardService';
import { cpWalletService } from '../CP-services/cpWalletService';
import { useToast } from '../../../contexts/ToastContext';

const CP_rewards = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rewardsData, setRewardsData] = useState({
    rewards: [],
    performance: {
      totalConversions: 0,
      currentLevel: 'Bronze Partner',
      nextLevel: 'Silver Partner'
    }
  });
  const [rewardsHistory, setRewardsHistory] = useState([]);

  useEffect(() => {
    const fetchRewardsData = async () => {
      try {
        setLoading(true);
        
        const [rewardsResponse, performanceResponse] = await Promise.all([
          cpRewardService.getRewards(),
          cpRewardService.getPerformanceMetrics()
        ]);

        if (rewardsResponse.success && rewardsResponse.data) {
          setRewardsData(prev => ({
            ...prev,
            rewards: rewardsResponse.data || []
          }));
        }

        if (performanceResponse.success && performanceResponse.data) {
          setRewardsData(prev => ({
            ...prev,
            performance: {
              totalConversions: performanceResponse.data.convertedLeads || 0,
              currentLevel: performanceResponse.data.currentLevel || 'Bronze Partner',
              nextLevel: performanceResponse.data.nextLevel || 'Silver Partner',
              progress: performanceResponse.data.progress || 0
            }
          }));
        }

        // Get reward transactions from wallet
        try {
          const walletResponse = await cpWalletService.getTransactions({ 
            transactionType: 'reward',
            limit: 10 
          });
          if (walletResponse.success && walletResponse.data) {
            setRewardsHistory(walletResponse.data.map(t => ({
              id: t._id,
              title: t.description || 'Reward',
              date: new Date(t.createdAt).toLocaleDateString(),
              amount: `+₹${t.amount.toLocaleString('en-IN')}`
            })));
          }
        } catch (err) {
          console.error('Error fetching reward history:', err);
        }
      } catch (error) {
        console.error('Error fetching rewards data:', error);
        addToast('Failed to load rewards data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchRewardsData();
  }, [addToast]);

  // Calculate progress
  const progress = rewardsData.performance.progress || 0;
  const totalConversions = rewardsData.performance.totalConversions || 0;
  const currentLevel = rewardsData.performance.currentLevel || 'Bronze Partner';
  const nextLevel = rewardsData.performance.nextLevel || 'Silver Partner';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
        <CP_navbar />
        <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-48 bg-gray-200 rounded-[24px]"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
      <CP_navbar />

      <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Rewards & Achievements</h1>
          <p className="text-gray-500 text-sm">Unlock bonuses as you grow.</p>
        </div>

        {/* Level Progress Card */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <FiAward className="w-64 h-64 text-yellow-500" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
            {/* Badge */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-200">
              <FiStar className="w-10 h-10 text-white fill-white" />
            </div>

            {/* Stats */}
            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentLevel}</h2>
                  <p className="text-sm text-gray-500">
                    Continue converting leads to reach <span className="text-indigo-600 font-bold">{nextLevel}</span>
                  </p>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones Grid */}
        <h3 className="font-bold text-lg text-gray-800 mb-4">Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {rewardsData.rewards.length > 0 ? (
            rewardsData.rewards.map((milestone) => {
              // Use status from backend if available, otherwise calculate
              const status = milestone.status || 'locked';
              const requirementValue = milestone.requirementValue || milestone.requirement?.value || 0;
              const currentProgress = milestone.currentProgress || totalConversions;

              return (
                <div
                  key={milestone._id || milestone.id}
                  className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${status === 'unlocked' ? 'bg-white border-green-200 shadow-sm' :
                      status === 'in-progress' ? 'bg-white border-indigo-200 ring-4 ring-indigo-50/50' :
                        'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                >
                  {status === 'unlocked' && (
                    <div className="absolute top-4 right-4 text-green-500 bg-green-50 p-1.5 rounded-full">
                      <FiCheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  {status === 'locked' && (
                    <div className="absolute top-4 right-4 text-gray-400">
                      <FiLock className="w-5 h-5" />
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${status === 'unlocked' ? 'bg-green-100 text-green-600' :
                      status === 'in-progress' ? 'bg-indigo-100 text-indigo-600' :
                        'bg-gray-200 text-gray-400'
                    }`}>
                    <FiGift className="w-6 h-6" />
                  </div>

                  <h4 className="font-bold text-gray-900">{milestone.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">
                    {milestone.description || milestone.requirement?.description || `${requirementValue} conversions required`}
                  </p>
                  
                  {status === 'in-progress' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold text-indigo-600">{currentProgress} / {requirementValue}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentProgress / requirementValue) * 100)}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  <div className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${status === 'unlocked' ? 'bg-green-50 text-green-700' :
                      status === 'in-progress' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-gray-200 text-gray-500'
                    }`}>
                    {status === 'unlocked' ? `Earned ₹${milestone.rewardAmount || 0}` : `Reward: ₹${milestone.rewardAmount || 0}`}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-12">
              <p className="text-gray-500">No rewards available. Admin will set up rewards soon.</p>
            </div>
          )}
        </div>

        {/* Recent History */}
        <h3 className="font-bold text-lg text-gray-900 mb-4">Reward History</h3>
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
          {rewardsHistory.length > 0 ? (
            rewardsHistory.map((item, index) => (
              <div key={item.id} className={`flex items-center justify-between p-4 ${index !== rewardsHistory.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                    <FiAward />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">{item.amount}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No reward history yet</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default CP_rewards;
