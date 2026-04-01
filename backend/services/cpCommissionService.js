const CPCommissionSettings = require('../models/CPCommissionSettings');
const { CPWallet, CPWalletTransaction } = require('../models/CPWallet');
const ChannelPartner = require('../models/ChannelPartner');

/**
 * Calculate commission amount based on scenario and total cost
 * @param {String} scenario - 'own' or 'shared'
 * @param {Number} totalCost - Total project cost
 * @param {Object} settings - Commission settings (optional, will fetch if not provided)
 * @returns {Promise<Object>} - { amount, percentage, scenario }
 */
const calculateCommission = async (scenario, totalCost, settings = null) => {
  try {
    // Get settings if not provided
    if (!settings) {
      settings = await CPCommissionSettings.getSettings();
    }
    
    // Validate totalCost
    if (!totalCost || totalCost <= 0) {
      return {
        amount: 0,
        percentage: 0,
        scenario: scenario
      };
    }
    
    // Determine commission percentage based on scenario
    let commissionPercentage = 0;
    if (scenario === 'own') {
      commissionPercentage = settings.ownConversionCommission || 30;
    } else if (scenario === 'shared') {
      commissionPercentage = settings.sharedConversionCommission || 10;
    }
    
    // Calculate commission amount
    const commissionAmount = (totalCost * commissionPercentage) / 100;
    
    return {
      amount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimal places
      percentage: commissionPercentage,
      scenario: scenario
    };
  } catch (error) {
    console.error('Error calculating commission:', error);
    throw error;
  }
};

/**
 * Distribute commission to channel partner wallet
 * @param {String} channelPartnerId - Channel Partner ID
 * @param {Number} amount - Commission amount to distribute
 * @param {String} description - Transaction description
 * @param {Object} reference - Reference object with type and id
 * @param {Number} commissionPercentage - Commission percentage used (for record keeping)
 * @returns {Promise<Object>} - Transaction record
 */
const distributeCommission = async (channelPartnerId, amount, description, reference, commissionPercentage) => {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Commission amount must be greater than 0');
    }
    
    // Get or create wallet for channel partner
    let wallet = await CPWallet.findOne({ channelPartner: channelPartnerId });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await CPWallet.create({
        channelPartner: channelPartnerId,
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0
      });
    }
    
    // Calculate balance after transaction
    const balanceAfter = wallet.balance + amount;
    
    // Update wallet balance
    await wallet.updateBalance(amount, 'credit');
    
    // Create transaction record
    const transaction = await CPWalletTransaction.create({
      wallet: wallet._id,
      channelPartner: channelPartnerId,
      type: 'credit',
      amount: amount,
      transactionType: 'commission',
      description: description || `Commission: ${commissionPercentage}% of project cost`,
      reference: reference || {
        type: 'lead_conversion',
        id: null
      },
      status: 'completed',
      balanceAfter: balanceAfter
    });
    
    return transaction;
  } catch (error) {
    console.error('Error distributing commission:', error);
    throw error;
  }
};

/**
 * Determine commission scenario for CP lead conversion
 * @param {Object} cpLead - CPLead document
 * @returns {String} - 'own' or 'shared'
 */
const determineCPCommissionScenario = (cpLead) => {
  // If lead was shared from Sales, it's a shared conversion scenario
  if (cpLead.sharedFromSales && cpLead.sharedFromSales.length > 0) {
    return 'shared';
  }
  
  // If lead was shared with Sales but CP converted it themselves, it's still own conversion
  // (CP gets own commission even if they shared it, as long as they converted it)
  // Actually, based on requirements: if CP shares with Sales and Sales converts, CP gets shared commission
  // But if CP shares with Sales and CP converts, it's still own conversion
  // So we only check sharedFromSales here
  
  return 'own';
};

/**
 * Check if a Sales Lead corresponds to a CPLead that was shared
 * @param {String} phoneNumber - Lead phone number
 * @param {String} salesId - Sales employee ID who converted
 * @returns {Promise<Object|null>} - CPLead and CP info if found, null otherwise
 */
const findSharedCPLead = async (phoneNumber, salesId) => {
  try {
    const CPLead = require('../models/CPLead');
    
    // Find CPLead with matching phone number that was shared with this Sales employee
    const cpLead = await CPLead.findOne({
      phone: phoneNumber,
      'sharedWithSales.salesId': salesId,
      status: { $ne: 'converted' } // Not already converted by CP
    }).populate('assignedTo', 'name email phoneNumber');
    
    if (!cpLead) {
      return null;
    }
    
    return {
      cpLead: cpLead,
      channelPartnerId: cpLead.assignedTo._id,
      channelPartnerName: cpLead.assignedTo.name
    };
  } catch (error) {
    console.error('Error finding shared CP lead:', error);
    return null;
  }
};

module.exports = {
  calculateCommission,
  distributeCommission,
  determineCPCommissionScenario,
  findSharedCPLead
};
