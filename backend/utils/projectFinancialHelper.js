const calculateInstallmentTotals = (installments = []) => {
  return installments.reduce(
    (acc, installment) => {
      if (!installment) return acc;
      const amount = Number(installment.amount) || 0;
      acc.total += amount;
      if (installment.status === 'paid') {
        acc.paid += amount;
      } else {
        acc.pending += amount;
      }
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );
};

/**
 * Recalculates project financials from actual data sources
 * This ensures consistency across all places that display financial data
 * 
 * @param {Object} project - Mongoose project document
 * @param {Object} totals - Optional pre-calculated installment totals
 * @returns {Promise<void>}
 */
const recalculateProjectFinancials = async (project, totals) => {
  if (!project) return;

  // Initialize financialDetails if not present
  if (!project.financialDetails) {
    project.financialDetails = {
      totalCost: project.budget || 0,
      advanceReceived: 0,
      includeGST: false,
      remainingAmount: project.budget || 0
    };
  }

  const totalCost = Math.round(Number(project.financialDetails.totalCost || project.budget || 0));
  
  // Calculate paid installments
  const installmentTotals = totals || calculateInstallmentTotals(project.installmentPlan);
  const collectedFromInstallments = Math.round(Number(installmentTotals.paid || 0));
  
  // Calculate approved PaymentReceipts
  const PaymentReceipt = require('../models/PaymentReceipt');
  const approvedReceipts = await PaymentReceipt.find({
    project: project._id,
    status: 'approved'
  }).select('amount');
  const totalApprovedPayments = approvedReceipts.reduce(
    (sum, receipt) => sum + Math.round(Number(receipt.amount || 0)),
    0
  );

  // Include admin-recorded manual recoveries from AdminFinance
  const AdminFinance = require('../models/AdminFinance');
  const manualRecoveries = await AdminFinance.aggregate([
    {
      $match: {
        recordType: 'transaction',
        transactionType: 'incoming',
        status: { $ne: 'cancelled' },
        project: project._id,
        'metadata.sourceType': 'adminManualRecovery'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  const totalManualRecoveries = manualRecoveries[0]?.totalAmount || 0;

  // Include client-paid project expenses as recoveries (client reimbursed company for expense)
  const clientPaidExpenseRecoveries = await AdminFinance.aggregate([
    {
      $match: {
        recordType: 'transaction',
        transactionType: 'incoming',
        status: { $ne: 'cancelled' },
        project: project._id,
        'metadata.sourceType': 'projectExpenseClientPaid'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  const totalClientPaidExpenseRecoveries = clientPaidExpenseRecoveries[0]?.totalAmount || 0;

  // Calculate total received from all sources:
  // 1. Approved PaymentReceipts (from PaymentReceipt model)
  // 2. Paid installments (from installmentPlan with status 'paid')
  // 3. Admin manual recoveries (from AdminFinance with metadata.sourceType = 'adminManualRecovery')
  //
  // Strategy: recompute from actual data sources only, so values don't drift or double-count
  // when recalculations run multiple times.

  const totalReceived =
    totalApprovedPayments +
    collectedFromInstallments +
    totalManualRecoveries +
    totalClientPaidExpenseRecoveries;

  // Update advanceReceived to reflect current total received
  project.financialDetails.advanceReceived = Math.round(totalReceived);
  
  // Calculate remaining amount
  const remainingRaw = totalCost - totalReceived;
  const remainingAmount = Number.isFinite(remainingRaw)
    ? Math.max(Math.round(remainingRaw), 0)
    : 0;

  project.financialDetails.remainingAmount = remainingAmount;
};

const refreshInstallmentStatuses = (project) => {
  if (!project?.installmentPlan?.length) return;
  const now = new Date();
  project.installmentPlan.forEach((installment) => {
    if (!installment) return;
    const dueDate = installment.dueDate ? new Date(installment.dueDate) : null;

    if (installment.status === 'paid') {
      if (!installment.paidDate) {
        installment.paidDate = new Date();
      }
      return;
    }

    if (dueDate) {
      if (dueDate < now) {
        if (installment.status !== 'overdue') {
          installment.status = 'overdue';
          installment.updatedAt = new Date();
        }
      } else if (installment.status === 'overdue') {
        installment.status = 'pending';
        installment.updatedAt = new Date();
      } else if (installment.status !== 'pending') {
        installment.status = 'pending';
        installment.updatedAt = new Date();
      }
    }
  });
};

module.exports = {
  calculateInstallmentTotals,
  recalculateProjectFinancials,
  refreshInstallmentStatuses
};
