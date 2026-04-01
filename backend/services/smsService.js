const axios = require('axios');

class SMSService {

  constructor() {

    // Support both new *_HUB_* variables and older names from env.example
    this.apiUsername =
      process.env.SMS_INDIA_HUB_USERNAME ||
      process.env.SMS_INDIA_USERNAME ||
      '';

    this.apiPassword =
      process.env.SMS_INDIA_HUB_API_KEY ||
      process.env.SMS_INDIA_API_KEY ||
      '';

    this.senderId =
      process.env.SMS_INDIA_HUB_SENDER_ID ||
      process.env.SMS_INDIA_SENDER_ID ||
      'SMSHUB';

    this.dltTemplateId =
      process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID ||
      process.env.SMS_INDIA_DLT_TEMPLATE_ID ||
      '';

    this.baseUrl =
      process.env.SMS_INDIA_BASE_URL ||
      'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx';

    this.isEnabled = process.env.SMS_INDIA_ENABLED === 'true';

  }



  /**

   * Send OTP SMS to phone number

   * @param {string} phoneNumber - 10-digit phone number

   * @param {string} otp - 6-digit OTP

   * @param {string} templateId - SMS template ID (optional)

   * @returns {Promise<Object>} - SMS sending result

   */

  async sendOTP(phoneNumber, otp, templateId = null) {

    try {

      // For development, if SMS is not enabled, just log and return success

      if (!this.isEnabled) {

        console.log(`[SMS Service] Development Mode - OTP for ${phoneNumber}: ${otp}`);

        return {

          success: true,

          messageId: `dev_${Date.now()}`,

          message: 'OTP sent successfully (Development Mode)',

          phoneNumber: phoneNumber,

          otp: otp

        };

      }



      // Validate phone number

      if (!this.validatePhoneNumber(phoneNumber)) {

        throw new Error('Invalid phone number format');

      }



      // Ensure phone number is formatted for the API

      const apiPhoneNumber = this.formatPhoneNumber(phoneNumber);



      // Prepare SMS content

      const message = this.getTemplateMessage(templateId, otp);



      // SMS India API payload

      const payload = {

        user: this.apiUsername,

        apikey: this.apiPassword,

        msisdn: apiPhoneNumber,

        sid: this.senderId,

        msg: message,

        fl: 0, 

        dlt_template_id: this.dltTemplateId,

        gwid: 2

      };



      // Send SMS via SMS India API

      const response = await axios.get(this.baseUrl, { 

        params: payload, 

        timeout: 10000 

      });



      if (response.data && response.data.ErrorCode === '000') {

        const messageId = response.data.MessageData && response.data.MessageData.length > 0 

          ? response.data.MessageData[0].MessageId 

          : `sms_${Date.now()}`;



        return {

          success: true,

          messageId: messageId,

          message: 'OTP sent successfully',

          phoneNumber: phoneNumber,

          cost: 0 

        };

      } else {

        throw new Error(response.data.ErrorMessage || 'Failed to send SMS');

      }



    } catch (error) {

      let errorMessage = 'SMS sending failed';

      if (error.response) {

        errorMessage = `API Error: ${error.response.status} - ${error.response.data.ErrorMessage || JSON.stringify(error.response.data)}`;

      } else if (error.request) {

        errorMessage = 'Network Error: No response received';

      } else {

        errorMessage = `Request Error: ${error.message}`;

      }

      console.error('SMS Service Error:', errorMessage);

      

      // For development, return success even if SMS fails

      if (process.env.NODE_ENV === 'development') {

        console.log(`[SMS Service] Development Fallback - OTP for ${phoneNumber}: ${otp}`);

        return {

          success: true,

          messageId: `dev_fallback_${Date.now()}`,

          message: 'OTP sent successfully (Development Fallback)',

          phoneNumber: phoneNumber,

          otp: otp,

          error: errorMessage

        };

      }



      throw new Error(`SMS sending failed: ${errorMessage}`);

    }

  }



  /**

   * Send custom SMS message

   * @param {string} phoneNumber - 10-digit phone number

   * @param {string} message - SMS message content

   * @returns {Promise<Object>} - SMS sending result

   */

  async sendMessage(phoneNumber, message) {

    try {

      if (!this.isEnabled) {

        console.log(`[SMS Service] Development Mode - Message to ${phoneNumber}: ${message}`);

        return {

          success: true,

          messageId: `dev_${Date.now()}`,

          message: 'SMS sent successfully (Development Mode)',

          phoneNumber: phoneNumber

        };

      }



      if (!this.validatePhoneNumber(phoneNumber)) {

        throw new Error('Invalid phone number format');

      }



      // Ensure phone number is formatted for the API

      const apiPhoneNumber = this.formatPhoneNumber(phoneNumber);



      const payload = {

        user: this.apiUsername,

        apikey: this.apiPassword,

        msisdn: apiPhoneNumber,

        sid: this.senderId,

        msg: message,

        fl: 0, // Normal message

        type: 'text'

      };



      const response = await axios.get(this.baseUrl, { 

        params: payload,

        timeout: 10000

      });



      if (response.data && response.data.ErrorCode === '000') {

        const messageId = response.data.MessageData && response.data.MessageData.length > 0 

          ? response.data.MessageData[0].MessageId 

          : `sms_${Date.now()}`;



        return {

          success: true,

          messageId: messageId,

          message: 'SMS sent successfully',

          phoneNumber: phoneNumber,

          cost: 0

        };

      }



    } catch (error) {

      let errorMessage = 'SMS sending failed';

      if (error.response) {

        errorMessage = `API Error: ${error.response.status} - ${error.response.data.ErrorMessage || JSON.stringify(error.response.data)}`;

      } else if (error.request) {

        errorMessage = 'Network Error: No response received';

      } else {

        errorMessage = `Request Error: ${error.message}`;

      }

      console.error('SMS Service Error:', errorMessage);

      

      if (process.env.NODE_ENV === 'development') {

        console.log(`[SMS Service] Development Fallback - Message to ${phoneNumber}: ${message}`);

        return {

          success: true,

          messageId: `dev_fallback_${Date.now()}`,

          message: 'SMS sent successfully (Development Fallback)',

          phoneNumber: phoneNumber,

          error: errorMessage

        };

      }



      throw new Error(`SMS sending failed: ${errorMessage}`);

    }

  }



  /**

   * Check SMS delivery status

   * @param {string} messageId - Message ID from send response

   * @returns {Promise<Object>} - Delivery status

   */

  async checkDeliveryStatus(messageId) {

    try {

      if (!this.isEnabled) {

        return {

          success: true,

          status: 'delivered',

          message: 'Development mode - assuming delivered'

        };

      }



      const response = await axios.get(this.baseUrl, {

        params: {

          user: this.apiUsername,

          apikey: this.apiPassword,

          mid: messageId // Message ID for status check

        },

        timeout: 5000

      });



      // SMS India Hub status response is a simple string, e.g., "DELIVERED"

      const status = response.data.trim().toLowerCase();

      const isSuccess = status === 'delivered' || status.includes('submitted');



      return {

        success: isSuccess,

        status: status,

        message: `Status: ${status}`

      };

    } catch (error) {

      let errorMessage = 'SMS Status Check Error';

      if (error.response) {

        errorMessage = `API Error: ${error.response.status} - ${error.response.data.ErrorMessage || JSON.stringify(error.response.data)}`;

      } else if (error.request) {

        errorMessage = 'Network Error: No response received';

      } else {

        errorMessage = `Request Error: ${error.message}`;

      }

      console.error('SMS Status Check Error:', errorMessage);

      return {

        success: false,

        status: 'unknown',

        message: errorMessage

      };

    }

  }



  /**

   * Get account balance

   * @returns {Promise<Object>} - Account balance info

   */

  async getBalance() {

    try {

      if (!this.isEnabled) {

        return {

          success: true,

          balance: 1000,

          currency: 'INR',

          message: 'Development mode - mock balance'

        };

      }



      // SMS India Hub does not seem to have a direct balance API endpoint

      // This method might need to be removed or adapted if a balance check is critical

      console.warn('SMS India Hub does not have a direct balance API endpoint. Returning mock balance.');



      return {

        success: true,

        balance: 0, // Indicate no real balance check

        currency: 'INR',

        message: 'Balance not available via direct API for SMS India Hub'

      };



    } catch (error) {

      let errorMessage = 'SMS Balance Check Error';

      if (error.response) {

        errorMessage = `API Error: ${error.response.status} - ${error.response.data.ErrorMessage || JSON.stringify(error.response.data)}`;

      } else if (error.request) {

        errorMessage = 'Network Error: No response received';

      } else {

        errorMessage = `Request Error: ${error.message}`;

      }

      console.error('SMS Balance Check Error:', errorMessage);

      return {

        success: false,

        balance: 0,

        currency: 'INR',

        message: errorMessage

      };

    }

  }



  /**

   * Validate phone number format

   * @param {string} phoneNumber - Phone number to validate

   * @returns {boolean} - Validation result

   */

  validatePhoneNumber(phoneNumber) {

    // Remove any non-digit characters

    const cleanNumber = phoneNumber.replace(/\D/g, '');

    

    // Check if it's a valid 10-digit Indian mobile number

    return /^[6-9]\d{9}$/.test(cleanNumber);

  }



  /**

   * Get template message for OTP

   * @param {string} templateId - Template ID

   * @param {string} otp - OTP code

   * @returns {string} - Formatted message

   */

  getTemplateMessage(templateId, otp) {

    const baseMessage = `Welcome to the Appzeto powered by SMSINDIAHUB. Your OTP for registration is ${otp}`;

    return baseMessage;

  }



  /**

   * Format phone number for SMS India API

   * @param {string} phoneNumber - Phone number to format

   * @returns {string} - Formatted phone number

   */

  formatPhoneNumber(phoneNumber) {

    const cleanNumber = phoneNumber.replace(/\D/g, '');

    

    // If number starts with 0, remove it

    if (cleanNumber.startsWith('0')) {

      return cleanNumber.substring(1);

    }

    

    // If number starts with +91, remove it

    if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {

      return cleanNumber.substring(2);

    }

    

    return cleanNumber;

  }

}

module.exports = new SMSService();