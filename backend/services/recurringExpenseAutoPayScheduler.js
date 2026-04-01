const RecurringExpense = require('../models/RecurringExpense');
const ExpenseEntry = require('../models/ExpenseEntry');
const Admin = require('../models/Admin');
const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
const { mapPaymentMethodToFinance } = require('../utils/paymentMethodMapper');

// Import the helper function from the controller
const generateExpenseEntriesHelper = async (recurringExpense, upToDate = null) => {
  if (recurringExpense.status !== 'active') {
    return { created: 0, skipped: 0 };
  }

  const endDate = upToDate || new Date();
  const startDate = new Date(recurringExpense.startDate);
  const expenseEndDate = recurringExpense.endDate ? new Date(recurringExpense.endDate) : null;

  if (expenseEndDate && expenseEndDate < startDate) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;
  let currentDate = new Date(startDate);

  // Get existing entries for this recurring expense
  const existingEntries = await ExpenseEntry.find({
    recurringExpenseId: recurringExpense._id
  }).select('period');

  const existingPeriods = new Set(existingEntries.map(e => e.period));

  while (currentDate <= endDate) {
    // Check if we've passed the end date (use <= to include entries on endDate)
    if (expenseEndDate) {
      const currentDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const expenseEndDateStart = new Date(expenseEndDate.getFullYear(), expenseEndDate.getMonth(), expenseEndDate.getDate());
      if (currentDateStart > expenseEndDateStart) {
        break;
      }
    }

    // Calculate period string based on frequency
    let period;
    let periodStartDate = new Date(currentDate);
    
    switch (recurringExpense.frequency) {
      case 'monthly':
        period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        // For quarterly, use the first month of the quarter for period calculation
        const quarterStartMonth = Math.floor(currentDate.getMonth() / 3) * 3;
        periodStartDate = new Date(currentDate.getFullYear(), quarterStartMonth, 1);
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        period = `${currentDate.getFullYear()}-Q${quarter}`;
        break;
      case 'yearly':
        // For yearly, use January 1st of the year for period calculation
        periodStartDate = new Date(currentDate.getFullYear(), 0, 1);
        period = `${currentDate.getFullYear()}`;
        break;
    }

    // Skip if entry already exists
    if (existingPeriods.has(period)) {
      skipped++;
    } else {
      // Calculate due date based on frequency
      // Use periodStartDate for quarterly/yearly to ensure consistency
      let dueDate = new Date(periodStartDate);
      const dayOfMonth = recurringExpense.dayOfMonth || new Date(recurringExpense.startDate).getDate();
      
      switch (recurringExpense.frequency) {
        case 'monthly':
          // For monthly, use the dayOfMonth in the current month
          // Ensure period matches the month of the due date
          const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
          // Update period to match due date month (in case dayOfMonth was adjusted)
          period = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
          // Re-check if this period already exists after adjustment
          if (existingPeriods.has(period)) {
            skipped++;
            break;
          }
          break;
        case 'quarterly':
          // For quarterly, use the first month of the quarter and the dayOfMonth
          // periodStartDate is already set to the first month of the quarter
          const lastDayOfQuarterMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate.setDate(Math.min(dayOfMonth, lastDayOfQuarterMonth));
          break;
        case 'yearly':
          // For yearly, use the same month and day as start date
          const startDate = new Date(recurringExpense.startDate);
          dueDate = new Date(periodStartDate.getFullYear(), startDate.getMonth(), 1);
          const lastDayOfYearMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate.setDate(Math.min(startDate.getDate(), lastDayOfYearMonth));
          break;
      }

      // Skip if period was adjusted and already exists (monthly case)
      if (existingPeriods.has(period)) {
        skipped++;
      } else {
        // Check if due date is after end date
        if (expenseEndDate && dueDate > expenseEndDate) {
          skipped++;
        } else {
          // Determine status based on due date
          let status = 'pending';
          const now = new Date();
          // Set time to start of day for accurate comparison
          const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (dueDateStart < nowStart) {
            status = 'overdue';
          }

          try {
            await ExpenseEntry.create({
              recurringExpenseId: recurringExpense._id,
              period,
              amount: recurringExpense.amount,
              dueDate,
              status,
              createdBy: recurringExpense.createdBy
            });
            // Add to existing periods to prevent duplicates in same batch
            existingPeriods.add(period);
            created++;
          } catch (error) {
            // Handle race condition: if entry was created by another process
            if (error.code === 11000 || error.name === 'MongoServerError') {
              // Duplicate key error - entry already exists
              skipped++;
              console.log(`Entry for period ${period} already exists, skipping`);
            } else {
              // Re-throw other errors
              throw error;
            }
          }
        }
      }
    }

    // Move to next period
    // Use safe date manipulation to avoid month overflow issues
    switch (recurringExpense.frequency) {
      case 'monthly':
        // Safe month increment: set to first day of next month to avoid overflow
        const nextMonth = currentDate.getMonth() + 1;
        if (nextMonth > 11) {
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          currentDate.setMonth(0, 1);
        } else {
          currentDate.setMonth(nextMonth, 1);
        }
        break;
      case 'quarterly':
        // Safe quarter increment: add 3 months, set to first day
        const nextQuarterMonth = currentDate.getMonth() + 3;
        if (nextQuarterMonth > 11) {
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          currentDate.setMonth(nextQuarterMonth - 12, 1);
        } else {
          currentDate.setMonth(nextQuarterMonth, 1);
        }
        break;
      case 'yearly':
        // Safe year increment
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        currentDate.setMonth(0, 1); // Set to January 1st
        break;
    }
  }

  // Update next due date
  if (recurringExpense.status === 'active') {
    // Find the first unpaid/pending entry (next due)
    const nextDueEntry = await ExpenseEntry.findOne({
      recurringExpenseId: recurringExpense._id,
      status: { $in: ['pending', 'overdue'] }
    }).sort({ dueDate: 1 }); // Sort ascending to get the earliest unpaid entry

    if (nextDueEntry) {
      // Use the due date of the first unpaid entry
      recurringExpense.nextDueDate = nextDueEntry.dueDate;
    } else {
      // If all entries are paid, calculate next due from the last entry
      const lastEntry = await ExpenseEntry.findOne({
        recurringExpenseId: recurringExpense._id
      }).sort({ dueDate: -1 });

      if (lastEntry) {
        // Calculate next due from last entry
        let nextDue = new Date(lastEntry.dueDate);
        const dayOfMonth = recurringExpense.dayOfMonth || new Date(recurringExpense.startDate).getDate();
        
        switch (recurringExpense.frequency) {
          case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            const lastDayOfNextMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
            nextDue.setDate(Math.min(dayOfMonth, lastDayOfNextMonth));
            break;
          case 'quarterly':
            nextDue.setMonth(nextDue.getMonth() + 3);
            // Ensure it's the first month of the quarter
            const quarterStartMonth = Math.floor(nextDue.getMonth() / 3) * 3;
            nextDue = new Date(nextDue.getFullYear(), quarterStartMonth, 1);
            const lastDayOfQuarterMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
            nextDue.setDate(Math.min(dayOfMonth, lastDayOfQuarterMonth));
            break;
          case 'yearly':
            nextDue.setFullYear(nextDue.getFullYear() + 1);
            // Use the same month and day as start date
            const startDate = new Date(recurringExpense.startDate);
            nextDue = new Date(nextDue.getFullYear(), startDate.getMonth(), 1);
            const lastDayOfYearMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
            nextDue.setDate(Math.min(startDate.getDate(), lastDayOfYearMonth));
            break;
        }
        
        recurringExpense.nextDueDate = nextDue;
      } else {
        // No entries yet, calculate from start date
        let nextDue = new Date(recurringExpense.startDate);
        const dayOfMonth = recurringExpense.dayOfMonth || new Date(recurringExpense.startDate).getDate();
        
        switch (recurringExpense.frequency) {
          case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            const lastDayOfNextMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
            nextDue.setDate(Math.min(dayOfMonth, lastDayOfNextMonth));
            break;
          case 'quarterly':
            nextDue.setMonth(nextDue.getMonth() + 3);
            // Ensure it's the first month of the quarter
            const quarterStartMonth = Math.floor(nextDue.getMonth() / 3) * 3;
            nextDue = new Date(nextDue.getFullYear(), quarterStartMonth, 1);
            const lastDayOfQuarterMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
            nextDue.setDate(Math.min(dayOfMonth, lastDayOfQuarterMonth));
            break;
          case 'yearly':
            nextDue.setFullYear(nextDue.getFullYear() + 1);
            const lastDayOfYearMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
            nextDue.setDate(Math.min(dayOfMonth, lastDayOfYearMonth));
            break;
        }
        
        recurringExpense.nextDueDate = nextDue;
      }
    }
    
    await recurringExpense.save();
  }

  return { created, skipped };
};

/**
 * Generate future expense entries for active recurring expenses
 * Ensures entries are always available for the next 12 months
 */
const generateFutureExpenseEntries = async () => {
  try {
    console.log('[Recurring Expense Auto-Pay] Generating future expense entries...');
    
    const now = new Date();
    const generateUntil = new Date(now);
    generateUntil.setMonth(generateUntil.getMonth() + 12);
    
    // Find all active recurring expenses
    const recurringExpenses = await RecurringExpense.find({
      status: 'active'
    });
    
    console.log(`[Recurring Expense Auto-Pay] Found ${recurringExpenses.length} active recurring expenses`);
    
    let totalCreated = 0;
    let totalSkipped = 0;
    
    for (const recurringExpense of recurringExpenses) {
      try {
        const { created, skipped } = await generateExpenseEntriesHelper(recurringExpense, generateUntil);
        totalCreated += created;
        totalSkipped += skipped;
        
        if (created > 0) {
          console.log(`[Recurring Expense Auto-Pay] Generated ${created} new entries for "${recurringExpense.name}"`);
        }
      } catch (error) {
        console.error(`[Recurring Expense Auto-Pay] Error generating entries for ${recurringExpense._id}:`, error);
      }
    }
    
    console.log(`[Recurring Expense Auto-Pay] Entry generation completed. Created: ${totalCreated}, Skipped: ${totalSkipped}`);
    
    return {
      success: true,
      created: totalCreated,
      skipped: totalSkipped
    };
  } catch (error) {
    console.error('[Recurring Expense Auto-Pay] Error generating future entries:', error);
    throw error;
  }
};

/**
 * Auto-pay recurring expenses when due date matches current date
 * This should run once per day (preferably at midnight or early morning)
 */
const autoPayRecurringExpenses = async () => {
  try {
    console.log('[Recurring Expense Auto-Pay] Starting auto-pay check for recurring expenses...');
    
    // First, generate future entries to ensure we have entries for today
    await generateFutureExpenseEntries();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find all active recurring expenses with autoPay enabled
    const recurringExpenses = await RecurringExpense.find({
      status: 'active',
      autoPay: true
    });
    
    console.log(`[Recurring Expense Auto-Pay] Found ${recurringExpenses.length} active recurring expenses with auto-pay enabled`);
    
    let totalPaid = 0;
    let entriesPaid = 0;
    let errors = 0;
    
    // Get an admin ID for createdBy (use first active admin)
    const admin = await Admin.findOne({ isActive: true }).select('_id');
    const adminId = admin ? admin._id : null;
    
    if (!adminId) {
      console.error('[Recurring Expense Auto-Pay] No active admin found. Cannot process auto-pay.');
      return {
        success: false,
        message: 'No active admin found',
        entriesPaid: 0,
        totalAmount: 0
      };
    }
    
    for (const recurringExpense of recurringExpenses) {
      try {
        // Find expense entries that are due today and not yet paid
        const dueEntries = await ExpenseEntry.find({
          recurringExpenseId: recurringExpense._id,
          status: { $in: ['pending', 'overdue'] },
          dueDate: {
            $gte: today,
            $lt: tomorrow
          }
        });
        
        if (dueEntries.length === 0) {
          continue;
        }
        
        console.log(`[Recurring Expense Auto-Pay] Processing ${dueEntries.length} due entries for "${recurringExpense.name}"`);
        
        for (const entry of dueEntries) {
          try {
            // Skip if already paid (safety check)
            if (entry.status === 'paid') {
              console.log(`[Recurring Expense Auto-Pay] Entry ${entry._id} is already paid, skipping`);
              continue;
            }
            
            const previousStatus = entry.status;
            
            // Mark entry as paid
            entry.status = 'paid';
            entry.paidDate = new Date();
            entry.paymentMethod = recurringExpense.paymentMethod || 'bank_transfer';
            entry.paidBy = adminId;
            
            await entry.save();
            
            // Update recurring expense last paid date
            recurringExpense.lastPaidDate = entry.paidDate;
            
            // Update next due date to the first unpaid entry
            const nextDueEntry = await ExpenseEntry.findOne({
              recurringExpenseId: recurringExpense._id,
              status: { $in: ['pending', 'overdue'] }
            }).sort({ dueDate: 1 });

            if (nextDueEntry) {
              recurringExpense.nextDueDate = nextDueEntry.dueDate;
            } else {
              // If all entries are paid, calculate next due from this entry
              let nextDue = new Date(entry.dueDate);
              const dayOfMonth = recurringExpense.dayOfMonth || new Date(recurringExpense.startDate).getDate();
              
              switch (recurringExpense.frequency) {
                case 'monthly':
                  nextDue.setMonth(nextDue.getMonth() + 1);
                  const lastDayOfNextMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
                  nextDue.setDate(Math.min(dayOfMonth, lastDayOfNextMonth));
                  break;
                case 'quarterly':
                  nextDue.setMonth(nextDue.getMonth() + 3);
                  // Ensure it's the first month of the quarter
                  const quarterStartMonth = Math.floor(nextDue.getMonth() / 3) * 3;
                  nextDue = new Date(nextDue.getFullYear(), quarterStartMonth, 1);
                  const lastDayOfQuarterMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
                  nextDue.setDate(Math.min(dayOfMonth, lastDayOfQuarterMonth));
                  break;
                case 'yearly':
                  nextDue.setFullYear(nextDue.getFullYear() + 1);
                  // Use the same month and day as start date
                  const startDate = new Date(recurringExpense.startDate);
                  nextDue = new Date(nextDue.getFullYear(), startDate.getMonth(), 1);
                  const lastDayOfYearMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
                  nextDue.setDate(Math.min(startDate.getDate(), lastDayOfYearMonth));
                  break;
              }
              
              recurringExpense.nextDueDate = nextDue;
            }
            
            await recurringExpense.save();
            
            // Create finance transaction
            if (previousStatus !== 'paid') {
              await createOutgoingTransaction({
                amount: entry.amount,
                category: recurringExpense.category || 'Recurring Expense',
                transactionDate: entry.paidDate || new Date(),
                createdBy: adminId,
                vendor: recurringExpense.vendor,
                paymentMethod: mapPaymentMethodToFinance(entry.paymentMethod),
                description: `Auto-paid recurring expense: ${recurringExpense.name} - ${entry.period}`,
                metadata: {
                  sourceType: 'expenseEntry',
                  sourceId: entry._id.toString(),
                  recurringExpenseId: recurringExpense._id.toString(),
                  autoPaid: true
                },
                checkDuplicate: true
              });
            }
            
            totalPaid += entry.amount;
            entriesPaid++;
            
            console.log(`[Recurring Expense Auto-Pay] Auto-paid entry ${entry._id} for "${recurringExpense.name}" - Amount: ${entry.amount}`);
          } catch (entryError) {
            console.error(`[Recurring Expense Auto-Pay] Error processing entry ${entry._id}:`, entryError);
            errors++;
          }
        }
      } catch (expenseError) {
        console.error(`[Recurring Expense Auto-Pay] Error processing recurring expense ${recurringExpense._id}:`, expenseError);
        errors++;
      }
    }
    
    console.log(`[Recurring Expense Auto-Pay] Completed. Paid ${entriesPaid} entries. Total amount: ${totalPaid}. Errors: ${errors}`);
    
    return {
      success: true,
      entriesPaid,
      totalAmount: totalPaid,
      errors
    };
  } catch (error) {
    console.error('[Recurring Expense Auto-Pay] Error in auto-pay process:', error);
    throw error;
  }
};

/**
 * Setup daily scheduler using setInterval
 * Runs every 24 hours (86400000 ms)
 */
const startRecurringExpenseAutoPayScheduler = () => {
  console.log('[Recurring Expense Auto-Pay] Starting daily auto-pay scheduler...');
  
  // Calculate milliseconds until next midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  // Run at midnight, then every 24 hours
  setTimeout(() => {
    autoPayRecurringExpenses();
    setInterval(autoPayRecurringExpenses, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntilMidnight);
  
  console.log('[Recurring Expense Auto-Pay] Scheduler started. Next run at midnight.');
};

module.exports = {
  autoPayRecurringExpenses,
  generateFutureExpenseEntries,
  startRecurringExpenseAutoPayScheduler
};

