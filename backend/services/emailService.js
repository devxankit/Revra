const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Use SMTP configuration from .env or fallback to old config
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || 'sagar.kiaan12@gmail.com').trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || 'unwd ukpb xgbf psdj').trim();
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Silent initialization - only log in development if needed
    if (process.env.NODE_ENV === 'development' && process.env.VERBOSE_LOGS === 'true') {
      console.log('📧 Email Service initialized with SMTP:', smtpHost);
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} userType - Type of user (admin, employee, pm, sales)
   * @returns {Promise<Object>} - Email sending result
   */
  async sendPasswordResetEmail(email, resetToken, userType = 'user') {
    try {
      // Verify transporter connection
      await this.transporter.verify();
      
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&type=${userType}`;
      
      const mailOptions = {
        from: `"Appzeto" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'alphanexis6@gmail.com'}>`,
        to: email,
        subject: 'Password Reset Request - Appzeto',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 20px 0; text-align: center; background-color: #14b8a6;">
                  <h1 style="color: #ffffff; margin: 0;">Appzeto</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px; background-color: #ffffff;">
                  <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
                    <tr>
                      <td>
                        <h2 style="color: #333333; margin-top: 0;">Password Reset Request</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          Hello,
                        </p>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          We received a request to reset your password for your Appzeto account. Click the button below to reset your password:
                        </p>
                        <table role="presentation" style="margin: 30px 0;">
                          <tr>
                            <td style="text-align: center;">
                              <a href="${resetUrl}" 
                                 style="display: inline-block; padding: 12px 30px; background-color: #14b8a6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="color: #14b8a6; font-size: 14px; word-break: break-all;">
                          ${resetUrl}
                        </p>
                        <p style="color: #999999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
                          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                        </p>
                        <p style="color: #999999; font-size: 12px; line-height: 1.6;">
                          For security reasons, never share this link with anyone.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Appzeto. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`Password reset email sent to ${email}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('Email Service Error:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  /**
   * Send welcome email with account credentials
   * @param {string} email - Recipient email
   * @param {string} name - User name
   * @param {string} password - User password
   * @param {string} role - User role
   * @returns {Promise<Object>} - Email sending result
   */
  async sendWelcomeEmailWithCredentials(email, name, password, role) {
    try {
      // Verify transporter connection
      await this.transporter.verify();
      
      const roleDisplayName = this.getRoleDisplayName(role);
      
      const mailOptions = {
        from: `"Appzeto" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'alphanexis6@gmail.com'}>`,
        to: email,
        subject: 'Welcome to Appzeto - Your Account Credentials',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Appzeto</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 20px 0; text-align: center; background-color: #14b8a6;">
                  <h1 style="color: #ffffff; margin: 0;">Appzeto</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px; background-color: #ffffff;">
                  <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
                    <tr>
                      <td>
                        <h2 style="color: #333333; margin-top: 0;">Welcome to Appzeto, ${name}!</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          Your account has been successfully created. Below are your login credentials:
                        </p>
                        
                        <!-- Credentials Box -->
                        <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                          <tr>
                            <td>
                              <p style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Role:</p>
                              <p style="color: #6b7280; font-size: 16px; margin: 0 0 20px 0;">${roleDisplayName}</p>
                              
                              <p style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Email:</p>
                              <p style="color: #6b7280; font-size: 16px; margin: 0 0 20px 0;">${email}</p>
                              
                              <p style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Password:</p>
                              <p style="color: #1f2937; font-size: 18px; font-weight: bold; font-family: monospace; background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #d1d5db; margin: 0;">${password}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          You can now log in to your account using the credentials above.
                        </p>
                        
                        <p style="color: #dc2626; font-size: 14px; line-height: 1.6; margin-top: 30px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                          <strong>Security Notice:</strong> Please change your password after your first login for security purposes. Never share your credentials with anyone.
                        </p>
                        
                        <p style="color: #999999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
                          If you have any questions or need assistance, please contact our support team.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Appzeto. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`Welcome email with credentials sent to ${email}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Welcome email sent successfully'
      };
    } catch (error) {
      console.error('Email Service Error:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  /**
   * Send welcome email for clients (without credentials - OTP login)
   * @param {string} email - Recipient email
   * @param {string} name - User name
   * @param {string} phoneNumber - User phone number
   * @returns {Promise<Object>} - Email sending result
   */
  async sendClientWelcomeEmail(email, name, phoneNumber) {
    try {
      // Verify transporter connection
      await this.transporter.verify();
      
      const mailOptions = {
        from: `"Appzeto" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'alphanexis6@gmail.com'}>`,
        to: email,
        subject: 'Welcome to Appzeto - Your Account is Ready',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Appzeto</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 20px 0; text-align: center; background-color: #14b8a6;">
                  <h1 style="color: #ffffff; margin: 0;">Appzeto</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px; background-color: #ffffff;">
                  <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
                    <tr>
                      <td>
                        <h2 style="color: #333333; margin-top: 0;">Welcome to Appzeto, ${name}!</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          Your account has been successfully created. We're excited to have you on board!
                        </p>
                        
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          To access your account, please use your registered phone number: <strong>${phoneNumber}</strong>
                        </p>
                        
                        <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                          You will receive an OTP (One-Time Password) via SMS when you log in. Simply enter the OTP to access your account.
                        </p>
                        
                        <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                          <strong>How to login:</strong>
                        </p>
                        <ol style="color: #666666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                          <li>Go to the login page</li>
                          <li>Enter your phone number: <strong>${phoneNumber}</strong></li>
                          <li>Click "Send OTP"</li>
                          <li>Enter the OTP received via SMS</li>
                          <li>You're in!</li>
                        </ol>
                        
                        <p style="color: #999999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
                          If you have any questions or need assistance, please contact our support team.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Appzeto. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`Client welcome email sent to ${email}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Welcome email sent successfully'
      };
    } catch (error) {
      console.error('Email Service Error:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  /**
   * Get display name for role
   * @param {string} role - User role
   * @returns {string} - Display name
   */
  getRoleDisplayName(role) {
    const roleMap = {
      'admin': 'Administrator',
      'hr': 'HR Manager',
      'accountant': 'Accountant',
      'pem': 'Project Expense Manager',
      'project-manager': 'Project Manager',
      'employee': 'Employee',
      'sales': 'Sales Team Member'
    };
    return roleMap[role] || role;
  }

  /**
   * Get login URL based on role
   * @param {string} role - User role
   * @returns {string} - Login URL
   */
  getLoginUrl(role) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (role === 'admin' || role === 'hr' || role === 'accountant' || role === 'pem') {
      return `${frontendUrl}/admin-login`;
    } else if (role === 'project-manager') {
      return `${frontendUrl}/pm-login`;
    } else if (role === 'sales') {
      return `${frontendUrl}/sales-login`;
    } else if (role === 'employee') {
      return `${frontendUrl}/employee-login`;
    }
    return `${frontendUrl}/login`;
  }
}

module.exports = new EmailService();
