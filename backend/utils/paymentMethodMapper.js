/**
 * Payment Method Mapper Utility
 * Maps payment methods from different models to AdminFinance payment method enum
 */

/**
 * Map payment method from Payment model to AdminFinance enum
 * Payment model: 'bank_transfer', 'credit_card', 'debit_card', 'paypal', 'stripe', 'check', 'cash', 'other'
 * AdminFinance: 'Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash', 'Cheque', 'Other'
 */
const mapPaymentMethodToFinance = (paymentMethod) => {
  const mapping = {
    'bank_transfer': 'Bank Transfer',
    'credit_card': 'Credit Card',
    'debit_card': 'Debit Card',
    'paypal': 'Other', // PayPal not in AdminFinance enum
    'stripe': 'Other', // Stripe not in AdminFinance enum
    'check': 'Cheque',
    'cheque': 'Cheque',
    'cash': 'Cash',
    'upi': 'UPI',
    'other': 'Other',
    'auto_debit': 'Bank Transfer'
  };

  return mapping[paymentMethod?.toLowerCase()] || 'Bank Transfer';
};

/**
 * Map payment method from Salary model to AdminFinance enum
 * Salary model: 'bank_transfer', 'cash', 'upi', 'cheque', 'other'
 */
const mapSalaryPaymentMethodToFinance = (paymentMethod) => {
  const mapping = {
    'bank_transfer': 'Bank Transfer',
    'cash': 'Cash',
    'upi': 'UPI',
    'cheque': 'Cheque',
    'other': 'Other'
  };

  return mapping[paymentMethod?.toLowerCase()] || 'Bank Transfer';
};

/**
 * Map payment method from PaymentReceipt model to AdminFinance enum
 * PaymentReceipt model: 'bank_transfer', 'upi', 'cash', 'other'
 */
const mapPaymentReceiptMethodToFinance = (method) => {
  const mapping = {
    'bank_transfer': 'Bank Transfer',
    'upi': 'UPI',
    'cash': 'Cash',
    'other': 'Other'
  };

  return mapping[method?.toLowerCase()] || 'Bank Transfer';
};

/**
 * Map payment type from Payment model to Finance category
 */
const mapPaymentTypeToCategory = (paymentType) => {
  const mapping = {
    'advance': 'Advance Payment',
    'milestone': 'Milestone Payment',
    'final': 'Final Payment',
    'additional': 'Additional Payment'
  };

  return mapping[paymentType?.toLowerCase()] || 'Project Payment';
};

module.exports = {
  mapPaymentMethodToFinance,
  mapSalaryPaymentMethodToFinance,
  mapPaymentReceiptMethodToFinance,
  mapPaymentTypeToCategory
};

