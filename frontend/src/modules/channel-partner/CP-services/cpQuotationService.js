import { apiRequest } from './baseApiService';

export const cpQuotationService = {
  // Get all active quotations
  getQuotations: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const url = `/cp/quotations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get single quotation by ID
  getQuotationById: async (id) => {
    return await apiRequest(`/cp/quotations/${id}`, { method: 'GET' });
  },

  // Track quotation sharing
  shareQuotation: async (id) => {
    return await apiRequest(`/cp/quotations/${id}/share`, { method: 'POST' });
  },

  // Get quotation categories
  getQuotationCategories: async () => {
    return await apiRequest('/cp/quotations/categories', { method: 'GET' });
  },

  // Format price with currency
  formatPrice: (price, currency = 'INR') => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    });
    return formatter.format(price);
  },

  // Format quotation for display
  formatQuotationForDisplay: (quotation) => {
    return {
      id: quotation._id || quotation.id,
      title: quotation.title,
      category: quotation.category,
      description: quotation.description,
      price: quotation.price,
      currency: quotation.currency || 'INR',
      formattedPrice: cpQuotationService.formatPrice(quotation.price, quotation.currency || 'INR'),
      pdfDocument: quotation.pdfDocument,
      status: quotation.status,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt
    };
  }
};
