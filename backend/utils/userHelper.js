const Admin = require('../models/Admin');
const PM = require('../models/PM');
const Sales = require('../models/Sales');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const ChannelPartner = require('../models/ChannelPartner');

/**
 * Get user model based on userType
 * @param {string} userType - The type of user (e.g., 'admin', 'employee', 'client')
 * @returns {Object|null} The Mongoose model or null if not found
 */
function getUserModel(userType) {
  switch (userType) {
    case 'admin':
    case 'hr':
    case 'accountant':
    case 'pem':
      return Admin;
    case 'project-manager':
      return PM;
    case 'sales':
      return Sales;
    case 'employee':
      return Employee;
    case 'client':
      return Client;
    case 'channel-partner':
      return ChannelPartner;
    default:
      return null;
  }
}

module.exports = {
  getUserModel
};
