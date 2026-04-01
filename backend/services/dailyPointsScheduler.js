const Task = require('../models/Task');
const Employee = require('../models/Employee');

/**
 * Daily scheduler to deduct points for overdue tasks
 * This should run once per day (preferably at midnight)
 */
const deductPointsForOverdueTasks = async () => {
  try {
    console.log('[Daily Points Scheduler] Starting daily points deduction for overdue tasks...');
    
    // Find all overdue tasks that are not completed
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const overdueTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $lt: today }
    }).populate('assignedTo');
    
    console.log(`[Daily Points Scheduler] Found ${overdueTasks.length} overdue tasks`);
    
    let totalDeducted = 0;
    let employeesUpdated = new Set();
    
    for (const task of overdueTasks) {
      try {
        const result = await task.deductDailyPoints();
        
        if (result.deducted > 0) {
          // Deduct points from all assigned employees
          if (task.assignedTo && task.assignedTo.length > 0) {
            for (const employeeId of task.assignedTo) {
              try {
                const employee = await Employee.findById(employeeId);
                if (employee) {
                  const reason = `daily_overdue_deduction_day_${result.daysOverdue}`;
                  await employee.deductPoints(
                    task._id, 
                    result.deducted, 
                    reason
                  );
                  employeesUpdated.add(employeeId.toString());
                  
                  // Update employee statistics
                  await employee.updateStatistics();
                }
              } catch (error) {
                console.error(`[Daily Points Scheduler] Error deducting points from employee ${employeeId}:`, error);
              }
            }
          }
          
          totalDeducted += result.deducted;
        }
      } catch (error) {
        console.error(`[Daily Points Scheduler] Error processing task ${task._id}:`, error);
      }
    }
    
    console.log(`[Daily Points Scheduler] Completed. Deducted points from ${employeesUpdated.size} employees. Total deductions: ${totalDeducted}`);
    
    return {
      success: true,
      tasksProcessed: overdueTasks.length,
      employeesAffected: employeesUpdated.size,
      totalPointsDeducted: totalDeducted
    };
  } catch (error) {
    console.error('[Daily Points Scheduler] Error in daily points deduction:', error);
    throw error;
  }
};

/**
 * Setup daily scheduler using setInterval
 * Runs every 24 hours (86400000 ms)
 */
const startDailyScheduler = () => {
  console.log('[Daily Points Scheduler] Starting daily scheduler...');
  
  // Calculate milliseconds until next midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  // Run at midnight, then every 24 hours
  setTimeout(() => {
    deductPointsForOverdueTasks();
    setInterval(deductPointsForOverdueTasks, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntilMidnight);
  
  console.log('[Daily Points Scheduler] Scheduler started. Next run at midnight.');
};

module.exports = {
  deductPointsForOverdueTasks,
  startDailyScheduler
};

