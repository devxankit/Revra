import { apiRequest } from './baseApiService';

class AdminQuotationService {
  // Get all quotations with filtering and pagination
  async getAllQuotations(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/quotations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching quotations:', error);
      throw error;
    }
  }

  // Get single quotation by ID
  async getQuotationById(id) {
    try {
      const response = await apiRequest(`/admin/quotations/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching quotation:', error);
      throw error;
    }
  }

  // Create new quotation
  async createQuotation(quotationData) {
    try {
      console.log('Service: Creating quotation with data:', quotationData);
      
      // Prepare form data for multipart/form-data if PDF is a file
      let requestData;
      let headers = {};

      if (quotationData.pdfDocument instanceof File) {
        // If PDF is a File, use FormData and let backend handle upload
        const formData = new FormData();
        formData.append('title', quotationData.title);
        formData.append('category', quotationData.category);
        formData.append('description', quotationData.description || '');
        formData.append('price', String(quotationData.price));
        formData.append('currency', quotationData.currency || 'INR');
        formData.append('status', quotationData.status || 'active');
        formData.append('pdfDocument', quotationData.pdfDocument);
        
        requestData = formData;
        // Don't set any headers - baseApiService will handle FormData correctly
        headers = {};
      } else {
        // If PDF is already uploaded object or null, send as JSON
        const jsonData = { ...quotationData };
        // Remove pdfDocument if it's null
        if (!jsonData.pdfDocument) {
          delete jsonData.pdfDocument;
        }
        requestData = JSON.stringify(jsonData);
        // baseApiService will set Content-Type for JSON
        headers = {};
      }

      console.log('Service: Sending request with:', { 
        isFormData: requestData instanceof FormData,
        hasHeaders: Object.keys(headers).length > 0 
      });

      const response = await apiRequest(`/admin/quotations`, {
        method: 'POST',
        body: requestData,
        headers: headers
      });
      
      console.log('Service: Received response:', response);
      return response;
    } catch (error) {
      console.error('Error creating quotation:', error);
      throw error;
    }
  }

  // Update quotation
  async updateQuotation(id, quotationData) {
    try {
      console.log('Service: Updating quotation with data:', quotationData);
      
      // Prepare form data for multipart/form-data if PDF is a file
      let requestData;
      let headers = {};

      if (quotationData.pdfDocument instanceof File) {
        // If PDF is a File, use FormData and let backend handle upload
        const formData = new FormData();
        formData.append('title', quotationData.title);
        formData.append('category', quotationData.category);
        formData.append('description', quotationData.description || '');
        formData.append('price', String(quotationData.price));
        formData.append('currency', quotationData.currency || 'INR');
        formData.append('status', quotationData.status || 'active');
        formData.append('pdfDocument', quotationData.pdfDocument);
        
        requestData = formData;
        // Don't set any headers - baseApiService will handle FormData correctly
        headers = {};
      } else {
        // If PDF is already uploaded object or null, send as JSON
        const jsonData = { ...quotationData };
        // If pdfDocument is null, don't send it (to keep existing PDF)
        if (!jsonData.pdfDocument) {
          delete jsonData.pdfDocument;
        }
        requestData = JSON.stringify(jsonData);
        // baseApiService will set Content-Type for JSON
        headers = {};
      }

      console.log('Service: Sending update request with:', { 
        isFormData: requestData instanceof FormData,
        hasHeaders: Object.keys(headers).length > 0 
      });

      const response = await apiRequest(`/admin/quotations/${id}`, {
        method: 'PUT',
        body: requestData,
        headers: headers
      });
      
      console.log('Service: Received update response:', response);
      return response;
    } catch (error) {
      console.error('Error updating quotation:', error);
      throw error;
    }
  }

  // Delete quotation
  async deleteQuotation(id) {
    try {
      const response = await apiRequest(`/admin/quotations/${id}`, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error('Error deleting quotation:', error);
      throw error;
    }
  }

  // Get quotation statistics
  async getQuotationStatistics() {
    try {
      const response = await apiRequest(`/admin/quotations/statistics`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching quotation statistics:', error);
      throw error;
    }
  }

  // Format quotation for display
  formatQuotationForDisplay(quotation) {
    return {
      id: quotation._id || quotation.id,
      title: quotation.title,
      category: quotation.category,
      description: quotation.description,
      price: quotation.price,
      currency: quotation.currency || 'INR',
      formattedPrice: this.formatPrice(quotation.price, quotation.currency),
      pdfDocument: quotation.pdfDocument,
      status: quotation.status,
      timesShared: quotation.timesShared || 0,
      lastShared: quotation.lastShared,
      sharedBy: quotation.sharedBy || [],
      createdBy: quotation.createdBy,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt
    };
  }

  // Format price with currency
  formatPrice(price, currency = 'INR') {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    });
    return formatter.format(price);
  }
}

export const adminQuotationService = new AdminQuotationService();
