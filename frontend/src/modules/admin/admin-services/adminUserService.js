import { apiRequest } from './baseApiService';
import { uploadToCloudinary } from '../../../services/cloudinaryService';

class AdminUserService {
  mapUserTypeForApi(userType) {
    switch (userType) {
      case 'project-manager':
        return 'pm';
      case 'sales':
        return 'sales';
      case 'employee':
        return 'employee';
      case 'client':
        return 'client';
      case 'hr':
      case 'accountant':
      case 'pem':
        return 'admin';
      case 'admin':
      default:
        return userType;
    }
  }

  // Get all users with filtering and pagination
  async getAllUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get single user by ID and type
  async getUser(userType, id) {
    try {
      const normalizedType = this.mapUserTypeForApi(userType);
      const response = await apiRequest(`/admin/users/${normalizedType}/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      // Handle document upload to Cloudinary if present
      if (userData.document && userData.document instanceof File) {
        const uploadResult = await uploadToCloudinary(userData.document, 'Revra/users/documents');
        if (uploadResult.success) {
          userData.document = uploadResult.data;
        } else {
          throw new Error(`Document upload failed: ${uploadResult.error}`);
        }
      }

      // Helper function to format date without timezone conversion
      const formatDateForAPI = (dateString) => {
        if (!dateString) return undefined;
        // If date is in YYYY-MM-DD format (from HTML date input), send it as-is
        // The backend will parse it correctly as a date-only value
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateString;
        }
        // If it's already a full ISO string, extract just the date part
        if (dateString.match(/^\d{4}-\d{2}-\d{2}T/)) {
          return dateString.split('T')[0];
        }
        return dateString;
      };

      // Prepare user data for API
      const requestData = {
        ...userData,
        dateOfBirth: formatDateForAPI(userData.dateOfBirth),
        joiningDate: formatDateForAPI(userData.joiningDate)
      };

      const response = await apiRequest(`/admin/users`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(userType, id, userData) {
    try {
      const normalizedType = this.mapUserTypeForApi(userType);
      // Handle document upload to Cloudinary if present
      if (userData.document && userData.document instanceof File) {
        const uploadResult = await uploadToCloudinary(userData.document, 'Revra/users/documents');
        if (uploadResult.success) {
          userData.document = uploadResult.data;
        } else {
          throw new Error(`Document upload failed: ${uploadResult.error}`);
        }
      }

      // Helper function to format date without timezone conversion
      const formatDateForAPI = (dateString) => {
        if (!dateString) return undefined;
        // If date is in YYYY-MM-DD format (from HTML date input), send it as-is
        // The backend will parse it correctly as a date-only value
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateString;
        }
        // If it's already a full ISO string, extract just the date part
        if (dateString.match(/^\d{4}-\d{2}-\d{2}T/)) {
          return dateString.split('T')[0];
        }
        return dateString;
      };

      // Prepare user data for API
      const requestData = {
        ...userData,
        dateOfBirth: formatDateForAPI(userData.dateOfBirth),
        joiningDate: formatDateForAPI(userData.joiningDate)
      };

      // Remove password fields if they are empty or undefined (for update operations)
      // Only include password if it's actually being changed
      if (!requestData.password || requestData.password.trim().length === 0) {
        delete requestData.password;
        delete requestData.confirmPassword;
      }

      const response = await apiRequest(`/admin/users/${normalizedType}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(userType, id) {
    try {
      const normalizedType = this.mapUserTypeForApi(userType);
      const response = await apiRequest(`/admin/users/${normalizedType}/${id}`, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStatistics() {
    try {
      const response = await apiRequest(`/admin/users/statistics`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  // Helper method to format user data for display
  formatUserForDisplay(user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || user.phoneNumber,
      role: user.role,
      team: user.team,
      department: user.department,
      status: user.isActive ? 'active' : 'inactive',
      joiningDate: user.joiningDate || user.createdAt,
      lastLogin: user.lastLogin,
      avatar: this.generateAvatar(user.name),
      userType: user.userType,
      dateOfBirth: user.dateOfBirth,
      document: user.document,
      // Additional fields based on user type
      ...(user.userType === 'employee' && {
        position: user.position,
        salary: user.salary,
        skills: user.skills,
        experience: user.experience,
        isTeamLead: user.isTeamLead,
        teamMembers: user.teamMembers
      }),
      ...(user.userType === 'sales' && {
        salesTarget: user.salesTarget,
        currentSales: user.currentSales,
        commissionRate: user.commissionRate
      }),
      ...(user.userType === 'client' && {
        companyName: user.companyName,
        industry: user.industry,
        address: user.address
      })
    };
  }

  // Generate avatar initials from name
  generateAvatar(name) {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Validate user data before submission
  validateUserData(userData, isEdit = false) {
    const errors = [];

    // Required fields validation
    if (!userData.name?.trim()) {
      errors.push('Name is required');
    }
    if (!userData.email?.trim()) {
      errors.push('Email is required');
    }
    if (!userData.phone?.trim()) {
      errors.push('Phone number is required');
    } else {
      // Remove +91 prefix if present and check for valid 10-digit number
      let phoneNumber = userData.phone.trim().replace(/\+91/g, '').replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        errors.push('Please enter a valid 10-digit Indian mobile number (starting with 6-9)');
      }
    }
    if (!userData.dateOfBirth) {
      errors.push('Date of birth is required');
    }
    if (!userData.joiningDate) {
      errors.push('Joining date is required');
    }
    if (!userData.role) {
      errors.push('Role is required');
    }

    // Role-specific validation
    if (userData.role === 'employee') {
      if (!userData.team) {
        errors.push('Team is required for employees');
      }
      if (userData.team === 'developer' && !userData.department) {
        errors.push('Department is required for developer employees');
      }
    }

    // Password validation for non-client users
    if (userData.role !== 'client') {
      if (!isEdit && (!userData.password || !userData.confirmPassword)) {
        errors.push('Password and confirm password are required');
      }
      if (userData.password && userData.confirmPassword && userData.password !== userData.confirmPassword) {
        errors.push('Passwords do not match');
      }
      if (userData.password && userData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
    }

    return errors;
  }

  // Get role options for dropdown
  getRoleOptions() {
    return [
      { value: 'admin', label: 'Admin', icon: 'Shield' },
      { value: 'hr', label: 'HR', icon: 'Users' },
      { value: 'project-manager', label: 'Project Manager', icon: 'Shield' },
      { value: 'employee', label: 'Employee', icon: 'Code' },
      { value: 'client', label: 'Client', icon: 'Home' }
    ];
  }

  // Get team options for employees
  getTeamOptions() {
    return [
      { value: 'developer', label: 'Developer', icon: 'Code' },
      { value: 'sales', label: 'Sales Team', icon: 'TrendingUp' }
    ];
  }

  // Get department options
  getDepartmentOptions() {
    return [
      { value: 'full-stack', label: 'Full Stack', icon: 'Code' },
      { value: 'nodejs', label: 'Node.js', icon: 'Code' },
      { value: 'web', label: 'Web', icon: 'Code' },
      { value: 'app', label: 'App', icon: 'Code' },
      { value: 'sales', label: 'Sales', icon: 'TrendingUp' }
    ];
  }

  // Get status options
  getStatusOptions() {
    return [
      { value: 'active', label: 'Active', icon: 'CheckCircle' },
      { value: 'inactive', label: 'Inactive', icon: 'AlertCircle' }
    ];
  }

  // Update developer team members assignment
  async updateDeveloperTeamMembers(memberId, teamData) {
    try {
      const response = await apiRequest(`/admin/users/developers/${memberId}/team-members`, {
        method: 'PUT',
        body: JSON.stringify(teamData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating developer team members:', error);
      throw error;
    }
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;
