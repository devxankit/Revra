const Employee = require('../models/Employee');
const PM = require('../models/PM');
const Reward = require('../models/Reward');
const EmployeeReward = require('../models/EmployeeReward');
const PMReward = require('../models/PMReward');
const RewardSystemLog = require('../models/RewardSystemLog');
const Salary = require('../models/Salary');
const Task = require('../models/Task');
const mongoose = require('mongoose');

/**
 * Service to handle Dev and PM Reward Automation
 */
const rewardService = {
    /**
     * Process rewards for all qualifying Devs and PMs for a specific month
     * @param {String} month - Format YYYY-MM (e.g., "2024-03")
     * @param {String} adminId - ID of the admin triggering or system ID
     */
    processMonthlyRewards: async (month, adminId) => {
        const startTime = Date.now();
        const [year, monthNum] = month.split('-').map(Number);

        // Date ranges for the performance month
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        console.log(`[Reward Service] Processing rewards for ${month}...`);

        const results = {
            totalWinners: 0,
            totalCost: 0,
            winners: []
        };

        try {
            // 1. Get all potentially active rewards for Dev and PM teams
            // We filter rewards that overlap with the performance month:
            // - Starts before or during the month (startsOn <= endOfMonth)
            // - Ends after or during the month (endsOn >= startOfMonth)
            const activeRewards = await Reward.find({
                isActive: true,
                team: { $in: ['dev', 'pm'] },
                $and: [
                    { $or: [{ startsOn: { $exists: false } }, { startsOn: null }, { startsOn: { $lte: endOfMonth } }] },
                    { $or: [{ endsOn: { $exists: false } }, { endsOn: null }, { endsOn: { $gte: startOfMonth } }] }
                ]
            });

            if (activeRewards.length === 0) {
                console.log(`[Reward Service] No valid rewards found for Dev/PM teams in the period ${month}.`);
            }

            for (const reward of activeRewards) {
                const criteria = reward.criteria;

                if (reward.team === 'dev') {
                    // Process Developers
                    const devs = await Employee.find({ team: 'developer', isActive: true });

                    for (const dev of devs) {
                        // Check if reward already awarded for this month and this specific reward definition
                        const existing = await EmployeeReward.findOne({
                            employeeId: dev._id,
                            month: month,
                            rewardId: reward._id
                        });

                        if (existing) continue;

                        let qualified = false;
                        let currentMetricValue = 0;

                        if (criteria.type === 'completionRatio') {
                            // Calculate completion ratio for THIS month
                            const tasks = await Task.find({
                                assignedTo: dev._id,
                                createdAt: { $lte: endOfMonth } // Tasks created before end of month
                                // Note: Filter for tasks that were ACTIVE during this month
                            });

                            const relevantTasks = tasks.filter(t => {
                                const created = new Date(t.createdAt);
                                // Task must cover some part of the month
                                return created <= endOfMonth;
                            });

                            const completedInMonth = relevantTasks.filter(t =>
                                t.status === 'completed' &&
                                t.completedDate >= startOfMonth &&
                                t.completedDate <= endOfMonth
                            ).length;

                            const totalCount = relevantTasks.length;
                            const ratio = totalCount > 0 ? (completedInMonth / totalCount) * 100 : 0;
                            currentMetricValue = ratio;

                            if (ratio >= criteria.value) qualified = true;
                        } else if (criteria.type === 'points') {
                            // Calculate points earned in THIS month
                            const monthlyPoints = dev.pointsHistory
                                .filter(h => h.timestamp >= startOfMonth && h.timestamp <= endOfMonth)
                                .reduce((sum, h) => sum + (h.points || 0), 0);

                            currentMetricValue = monthlyPoints;
                            if (monthlyPoints >= criteria.value) qualified = true;
                        }

                        if (qualified) {
                            const newReward = await EmployeeReward.create({
                                employeeId: dev._id,
                                amount: reward.amount,
                                reason: `${reward.name} - ${month}`,
                                description: `Auto-awarded for ${criteria.type} performance (${Math.round(currentMetricValue)}%)`,
                                category: 'Performance Reward',
                                month: month,
                                status: 'pending',
                                rewardId: reward._id,
                                createdBy: adminId
                            });

                            // Sync with Salary
                            await syncRewardToSalary(dev._id, 'Employee', month, reward.amount, adminId);

                            results.totalWinners++;
                            results.totalCost += reward.amount;
                            results.winners.push({
                                id: dev._id,
                                model: 'Employee',
                                name: dev.name,
                                rewardName: reward.name,
                                amount: reward.amount
                            });
                        }
                    }
                } else if (reward.team === 'pm') {
                    // Process PMs
                    const pms = await PM.find({ isActive: true });

                    for (const pm of pms) {
                        const existing = await PMReward.findOne({
                            pmId: pm._id,
                            month: month,
                            rewardId: reward._id
                        });

                        if (existing) continue;

                        let qualified = false;
                        let currentMetricValue = 0;

                        if (criteria.type === 'completionRatio') {
                            // PM completion ratio is usually project-based or sum of team tasks
                            // For simplicity, using same logic as dev but for tasks they supervise or specific PM tasks
                            const tasks = await Task.find({
                                $or: [{ assignedTo: pm._id }, { project: { $in: pm.projectsManaged || [] } }],
                                createdAt: { $lte: endOfMonth }
                            });

                            const completedInMonth = tasks.filter(t =>
                                t.status === 'completed' &&
                                t.completedDate >= startOfMonth &&
                                t.completedDate <= endOfMonth
                            ).length;

                            const totalCount = tasks.length;
                            const ratio = totalCount > 0 ? (completedInMonth / totalCount) * 100 : 0;
                            currentMetricValue = ratio;

                            if (ratio >= criteria.value) qualified = true;
                        }

                        if (qualified) {
                            const newReward = await PMReward.create({
                                pmId: pm._id,
                                amount: reward.amount,
                                reason: `${reward.name} - ${month}`,
                                description: `Auto-awarded for ${criteria.type} performance (${Math.round(currentMetricValue)}%)`,
                                category: 'Performance Reward',
                                month: month,
                                status: 'pending',
                                rewardId: reward._id,
                                createdBy: adminId
                            });

                            // Sync with Salary
                            await syncRewardToSalary(pm._id, 'PM', month, reward.amount, adminId);

                            results.totalWinners++;
                            results.totalCost += reward.amount;
                            results.winners.push({
                                id: pm._id,
                                model: 'PM',
                                name: pm.name,
                                rewardName: reward.name,
                                amount: reward.amount
                            });
                        }
                    }
                }
            }

            // 3. Log the execution
            await RewardSystemLog.create({
                month,
                year,
                team: 'all',
                totalWinners: results.totalWinners,
                totalCost: results.totalCost,
                winners: results.winners,
                status: 'success',
                executionTime: Date.now() - startTime
            });

            return { success: true, ...results };

        } catch (error) {
            console.error('[Reward Service] Error processing monthly rewards:', error);

            await RewardSystemLog.create({
                month,
                year,
                team: 'all',
                status: 'failed',
                error: error.message,
                executionTime: Date.now() - startTime
            });

            return { success: false, error: error.message };
        }
    }
};

/**
 * Helper to sync reward amount to Salary record
 */
async function syncRewardToSalary(employeeId, modelType, month, amount, adminId) {
    try {
        let salary = await Salary.findOne({ employeeId, employeeModel: modelType, month });

        if (salary) {
            // Add to existing pending rewards
            salary.rewardAmount = (salary.rewardAmount || 0) + amount;
            salary.rewardStatus = 'pending';
            await salary.save();
        } else {
            // Record will be created when Salary page is opened or during payout flow
            // But we can proactively create it if needed. The salary controller usually handles this.
            console.log(`[Reward Service] Salary record not found for ${employeeId} in ${month}. Reward cached in pending state.`);
        }
    } catch (err) {
        console.error(`[Reward Service] Error syncing salary for ${employeeId}:`, err);
    }
}

module.exports = rewardService;
