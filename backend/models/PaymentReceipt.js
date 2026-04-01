const mongoose = require('mongoose');

const paymentReceiptSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  amount: { type: Number, required: true, min: 0 },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  method: { type: String, enum: ['bank_transfer', 'upi', 'cash', 'other'], default: 'upi' },
  referenceId: { type: String, trim: true },
  notes: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales', required: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  verifiedAt: { type: Date }
}, { timestamps: true });

paymentReceiptSchema.index({ status: 1, createdAt: -1 });

// Post-save hook to update project financials and create finance transaction when PaymentReceipt is approved
// Also handles rejection by restoring remainingAmount
paymentReceiptSchema.post('save', async function(doc) {
    try {
      const Project = require('./Project');
      const project = await Project.findById(doc.project);
      
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
        
    // Handle rejection: recalculate financials (this will restore remainingAmount since receipt is not approved)
    if (doc.status === 'rejected') {
      // Use shared utility to recalculate financials for consistency
      // This will exclude the rejected receipt from calculations
      const { recalculateProjectFinancials } = require('../utils/projectFinancialHelper');
      await recalculateProjectFinancials(project);
      await project.save();
      console.log(`Recalculated project ${project._id} financials after payment receipt rejection: remainingAmount=${project.financialDetails.remainingAmount}`);
      return;
    }

    // Handle approval: update project financials, create incentive (if applicable) and finance transaction
    if (doc.status === 'approved') {
      // Use shared utility to recalculate financials for consistency
      const { recalculateProjectFinancials } = require('../utils/projectFinancialHelper');
      await recalculateProjectFinancials(project);
        
      // Save project (this may trigger other hooks e.g. for no-dues handling)
      await project.save();
      console.log(`Updated project ${project._id} financials after payment receipt approval: advanceReceived=${project.financialDetails.advanceReceived}, remainingAmount=${project.financialDetails.remainingAmount}`);
      
      // On FIRST approved payment for this project, create conversion-based incentives,
      // then move HALF of each incentive amount to current balance.
      // Remaining half stays in pending until project becomes "no dues" (handled in Project model).
      try {
        const Incentive = require('./Incentive');
        const Sales = require('./Sales');

        const salesEmployeeId = doc.createdBy;

        // If an incentive already exists for this project + sales employee,
        // we have already processed the "first payment" – do not create again.
        const existingIncentive = await Incentive.findOne({
          isConversionBased: true,
          projectId: project._id,
          salesEmployee: salesEmployeeId
        });

        if (!existingIncentive) {
          const salesEmployee = await Sales.findById(salesEmployeeId).select('name incentivePerClient isActive');
          const incentivePerClient = Number(salesEmployee?.incentivePerClient || 0);

          if (salesEmployee && salesEmployee.isActive && incentivePerClient > 0) {
            const totalAmount = incentivePerClient;

            // Create team member incentive as FULLY pending first
            const teamMemberIncentive = await Incentive.create({
              salesEmployee: salesEmployeeId,
              amount: totalAmount,
              currentBalance: 0,
              pendingBalance: totalAmount,
              reason: 'Lead conversion to client',
              description: `Automatic incentive for project "${project.name || 'Project'}" after first approved payment`,
              dateAwarded: new Date(),
              status: 'conversion-pending',
              isConversionBased: true,
              projectId: project._id,
              clientId: doc.client,
              leadId: project.originLead || null,
              isTeamMemberIncentive: false
            });

            // Check if this sales employee has a team lead and create team-lead incentive (50% share),
            // also as FULLY pending initially
            const teamLead = await Sales.findOne({
              teamMembers: salesEmployeeId,
              isTeamLead: true,
              isActive: true
            }).select('name');

            if (teamLead) {
              const teamMemberIncentiveAmount = Number(teamMemberIncentive.amount || totalAmount || 0);
              const teamLeadIncentiveAmount = Math.round(teamMemberIncentiveAmount * 0.5); // 50% of team member's incentive

              if (teamLeadIncentiveAmount > 0) {
                await Incentive.create({
                  salesEmployee: teamLead._id,
                  amount: teamLeadIncentiveAmount,
                  currentBalance: 0,
                  pendingBalance: teamLeadIncentiveAmount,
                  reason: 'Team member lead conversion',
                  description: `Team lead incentive for ${salesEmployee.name || 'Team Member'} on project "${project.name || 'Project'}"`,
                  dateAwarded: new Date(),
                  status: 'conversion-pending',
                  isConversionBased: true,
                  projectId: project._id,
                  clientId: doc.client,
                  leadId: project.originLead || null,
                  isTeamLeadIncentive: true,
                  isTeamMemberIncentive: false,
                  teamLeadId: teamLead._id,
                  teamMemberId: salesEmployeeId,
                  originalIncentiveId: teamMemberIncentive._id
                });

                // Mark original incentive as "team member incentive"
                teamMemberIncentive.isTeamMemberIncentive = true;
                teamMemberIncentive.teamLeadId = teamLead._id;
                await teamMemberIncentive.save();
              }
            }
          }
        }

        // Now move HALF of the incentive amount from pending to current
        // for all conversion-based incentives on this project that are still fully pending.
        const incentives = await Incentive.find({
          isConversionBased: true,
          projectId: project._id,
          pendingBalance: { $gt: 0 }
        });

        for (const incentive of incentives) {
          // Only move initial portion once, on first approval (currentBalance === 0)
          if (incentive.currentBalance === 0) {
            const totalAmount = Number(incentive.amount || 0);
            let amountToMove = Math.round(totalAmount * 0.5);
            if (amountToMove <= 0) continue;
            if (amountToMove > incentive.pendingBalance) {
              amountToMove = incentive.pendingBalance;
            }
            try {
              await incentive.movePendingToCurrent(amountToMove);
              console.log(`Moved initial ${amountToMove} from pending to current for incentive ${incentive._id} on payment receipt approval ${doc._id}`);
            } catch (moveErr) {
              console.error(`Error moving initial pending to current for incentive ${incentive._id}:`, moveErr);
            }
          }
        }
      } catch (incentiveHookError) {
        console.error('Error creating/moving conversion incentives on payment receipt approval:', incentiveHookError);
      }
      
      // Create finance transaction
      try {
        const { createIncomingTransaction } = require('../utils/financeTransactionHelper');
        const { mapPaymentReceiptMethodToFinance } = require('../utils/paymentMethodMapper');
        const AdminFinance = require('./AdminFinance');
        
        // Check if transaction already exists
        const existing = await AdminFinance.findOne({
          recordType: 'transaction',
          'metadata.sourceType': 'paymentReceipt',
          'metadata.sourceId': doc._id.toString()
        });
        
        if (!existing) {
          // Get project name for description
          const projectName = project ? project.name : 'Unknown Project';
          
          // Get Admin ID - use verifiedBy if available, otherwise find first admin
          const Admin = require('./Admin');
          let adminId = doc.verifiedBy;
          if (!adminId) {
            const admin = await Admin.findOne({ isActive: true }).select('_id');
            adminId = admin ? admin._id : null;
          }
          
          if (adminId) {
            await createIncomingTransaction({
              amount: doc.amount,
              category: 'Payment Receipt',
              transactionDate: doc.verifiedAt || new Date(),
              createdBy: adminId,
              client: doc.client,
              project: doc.project,
              account: doc.account,
              paymentMethod: mapPaymentReceiptMethodToFinance(doc.method),
              description: `Payment receipt approved for project "${projectName}" - ${doc.referenceId || 'N/A'}`,
              metadata: {
                sourceType: 'paymentReceipt',
                sourceId: doc._id.toString(),
                referenceId: doc.referenceId || null
              },
              checkDuplicate: true
            });
          }
        }
      } catch (error) {
        // Log error but don't fail the save
        console.error('Error creating finance transaction for payment receipt:', error);
      }
      }
    } catch (error) {
      // Log error but don't fail the save
      console.error('Error updating project financials for payment receipt:', error);
  }
});

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);


