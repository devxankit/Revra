const mongoose = require('mongoose');

const leadCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true, // unique: true creates an index automatically
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color code']
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [10, 'Icon cannot exceed 10 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Created by admin is required']
  }
}, {
  timestamps: true
});

// Index for better performance
// Note: name index is created automatically by unique: true, so we don't need explicit index

// Virtual for lead count
leadCategorySchema.virtual('leadCount', {
  ref: 'Lead',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Virtual for active leads count
leadCategorySchema.virtual('activeLeadCount', {
  ref: 'Lead',
  localField: '_id',
  foreignField: 'category',
  count: true,
  match: { status: { $in: ['new', 'connected', 'hot'] } }
});

// Virtual for converted leads count
leadCategorySchema.virtual('convertedLeadCount', {
  ref: 'Lead',
  localField: '_id',
  foreignField: 'category',
  count: true,
  match: { status: 'converted' }
});

// Method to get category performance (only count converted leads that still have a client)
leadCategorySchema.methods.getPerformance = async function() {
  const Lead = mongoose.model('Lead');
  const Client = mongoose.model('Client');

  const stats = await Lead.aggregate([
    { $match: { category: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' }
      }
    }
  ]);

  const totalLeads = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalValue = stats.reduce((sum, stat) => sum + stat.totalValue, 0);

  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  let convertedLeads = 0;
  let convertedValue = 0;
  if (validOriginLeadIds.length > 0) {
    const convertedAgg = await Lead.aggregate([
      { $match: { category: this._id, status: 'converted', _id: { $in: validOriginLeadIds } } },
      { $group: { _id: null, convertedLeads: { $sum: 1 }, convertedValue: { $sum: '$value' } } }
    ]);
    const row = convertedAgg[0];
    if (row) {
      convertedLeads = row.convertedLeads;
      convertedValue = row.convertedValue;
    }
  }

  return {
    totalLeads,
    convertedLeads,
    conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    totalValue,
    convertedValue,
    averageValue: totalLeads > 0 ? totalValue / totalLeads : 0
  };
};

// Static method to get all categories with performance
leadCategorySchema.statics.getAllWithPerformance = async function() {
  const categories = await this.find().populate('createdBy', 'name');
  
  const categoriesWithPerformance = await Promise.all(
    categories.map(async (category) => {
      const performance = await category.getPerformance();
      return {
        ...category.toObject(),
        performance
      };
    })
  );

  return categoriesWithPerformance;
};

// Static method to get category statistics
// Now includes both Leads and Projects for comprehensive category performance
leadCategorySchema.statics.getCategoryStatistics = async function(dateFilter = {}) {
  const Lead = mongoose.model('Lead');
  const Project = mongoose.model('Project');
  
  // Get ALL categories first (to show all categories even if they have 0 data)
  const allCategories = await this.find({}).sort({ name: 1 });
  
  // Build match filter for leads
  const leadMatchFilter = { category: { $exists: true, $ne: null } };
  if (dateFilter.createdAt && (dateFilter.createdAt.$gte || dateFilter.createdAt.$lte)) {
    leadMatchFilter.createdAt = dateFilter.createdAt;
  }
  
  // Build match filter for projects
  const projectMatchFilter = { category: { $exists: true, $ne: null } };
  if (dateFilter.createdAt && (dateFilter.createdAt.$gte || dateFilter.createdAt.$lte)) {
    projectMatchFilter.createdAt = dateFilter.createdAt;
  }
  
  // Get lead statistics grouped by category (only count converted leads that still have a client)
  const leadStats = await Lead.aggregate([
    { $match: leadMatchFilter },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: 'originLead',
        as: '_clientRef'
      }
    },
    {
      $addFields: {
        _isConvertedWithClient: {
          $and: [
            { $eq: ['$status', 'converted'] },
            { $gt: [{ $size: '$_clientRef' }, 0] }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$category',
        totalLeads: { $sum: 1 },
        convertedLeads: {
          $sum: { $cond: ['$_isConvertedWithClient', 1, 0] }
        },
        totalValue: { $sum: '$value' },
        convertedValue: {
          $sum: { $cond: ['$_isConvertedWithClient', '$value', 0] }
        }
      }
    }
  ]);
  
  // Get project statistics grouped by category
  const projectStats = await Project.aggregate([
    { $match: projectMatchFilter },
    {
      $addFields: {
        projectValue: {
          $ifNull: [
            '$financialDetails.totalCost',
            { $ifNull: ['$budget', 0] }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$category',
        totalProjects: { $sum: 1 },
        completedProjects: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        totalProjectValue: { $sum: '$projectValue' },
        completedProjectValue: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              '$projectValue',
              0
            ]
          }
        }
      }
    }
  ]);
  
  // Combine lead and project stats by category
  const combinedStats = {};
  
  // Initialize stats for ALL categories (so we show all categories even with 0 data)
  allCategories.forEach(category => {
    const categoryId = category._id.toString();
    combinedStats[categoryId] = {
      categoryId: categoryId,
      totalLeads: 0,
      convertedLeads: 0,
      totalValue: 0,
      convertedValue: 0,
      totalProjects: 0,
      completedProjects: 0,
      totalProjectValue: 0,
      completedProjectValue: 0
    };
  });
  
  // Process lead stats and merge
  leadStats.forEach(stat => {
    const categoryId = stat._id?.toString();
    if (categoryId && combinedStats[categoryId]) {
      combinedStats[categoryId].totalLeads = stat.totalLeads || 0;
      combinedStats[categoryId].convertedLeads = stat.convertedLeads || 0;
      combinedStats[categoryId].totalValue = stat.totalValue || 0;
      combinedStats[categoryId].convertedValue = stat.convertedValue || 0;
    }
  });
  
  // Process project stats and merge
  projectStats.forEach(stat => {
    const categoryId = stat._id?.toString();
    if (categoryId && combinedStats[categoryId]) {
      combinedStats[categoryId].totalProjects = stat.totalProjects || 0;
      combinedStats[categoryId].completedProjects = stat.completedProjects || 0;
      combinedStats[categoryId].totalProjectValue = stat.totalProjectValue || 0;
      combinedStats[categoryId].completedProjectValue = stat.completedProjectValue || 0;
    }
  });
  
  // Build final result with category details - include ALL categories
  const result = allCategories.map(category => {
    const stat = combinedStats[category._id.toString()];
    if (!stat) {
      // Fallback if category not in stats (shouldn't happen, but safety check)
      return {
        categoryName: category.name,
        categoryColor: category.color,
        categoryIcon: category.icon,
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        totalValue: 0,
        convertedValue: 0,
        totalProjects: 0,
        completedProjects: 0,
        totalProjectValue: 0,
        completedProjectValue: 0,
        averageValue: 0
      };
    }
    
    const totalLeads = stat.totalLeads || 0;
    const convertedLeads = stat.convertedLeads || 0;
    const totalProjects = stat.totalProjects || 0;
    
    return {
      categoryName: category.name,
      categoryColor: category.color,
      categoryIcon: category.icon,
      totalLeads: totalLeads,
      convertedLeads: convertedLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
      totalValue: stat.totalValue || 0,
      convertedValue: stat.convertedValue || 0,
      totalProjects: totalProjects,
      completedProjects: stat.completedProjects || 0,
      totalProjectValue: stat.totalProjectValue || 0,
      completedProjectValue: stat.completedProjectValue || 0,
      averageValue: totalLeads > 0 ? (stat.totalValue || 0) / totalLeads : 0
    };
  });
  
  // Sort by converted leads (performance metric) - categories with 0 will be at the end
  result.sort((a, b) => {
    // First sort by converted leads (descending)
    if (b.convertedLeads !== a.convertedLeads) {
      return b.convertedLeads - a.convertedLeads;
    }
    // If same converted leads, sort by total leads
    return b.totalLeads - a.totalLeads;
  });
  
  return result;
};

// Static method to get category financial details including recovery
leadCategorySchema.statics.getCategoryFinancialDetails = async function() {
  const Project = mongoose.model('Project');
  const Lead = mongoose.model('Lead');
  const PaymentReceipt = require('./PaymentReceipt');
  
  // Get ALL categories
  const allCategories = await this.find({}).sort({ name: 1 });
  
  // Get all projects - include those with direct category AND those with originLead
  const projects = await Project.find({})
    .select('category originLead financialDetails.totalCost financialDetails.advanceReceived budget installmentPlan')
    .populate('originLead', 'category')
    .lean();
  
  // Create a map of leadId -> categoryId for projects without direct category
  const leadCategoryMap = {};
  const leadIds = projects
    .filter(p => p.originLead && !p.category)
    .map(p => p.originLead?._id || p.originLead);
  
  if (leadIds.length > 0) {
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('category')
      .lean();
    leads.forEach(lead => {
      if (lead.category) {
        leadCategoryMap[lead._id.toString()] = lead.category.toString();
      }
    });
  }
  
  // Get all approved payment receipts for all projects
  const projectIds = projects.map(p => p._id);
  const approvedReceipts = await PaymentReceipt.find({
    project: { $in: projectIds },
    status: 'approved'
  }).select('project amount').lean();
  
  // Create map of projectId -> total recovery
  const recoveryByProject = {};
  approvedReceipts.forEach(receipt => {
    const projectId = receipt.project?.toString();
    if (projectId) {
      if (!recoveryByProject[projectId]) {
        recoveryByProject[projectId] = 0;
      }
      recoveryByProject[projectId] += Number(receipt.amount || 0);
    }
  });
  
  // Calculate paid installments for each project
  projects.forEach(project => {
    const projectId = project._id.toString();
    if (project.installmentPlan && Array.isArray(project.installmentPlan.installments)) {
      const paidInstallments = project.installmentPlan.installments
        .filter(inst => inst.status === 'paid')
        .reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
      
      if (!recoveryByProject[projectId]) {
        recoveryByProject[projectId] = 0;
      }
      recoveryByProject[projectId] += paidInstallments;
    }
  });
  
  // Aggregate by category
  const categoryStats = {};
  
  allCategories.forEach(category => {
    const categoryId = category._id.toString();
    categoryStats[categoryId] = {
      categoryId: categoryId,
      categoryName: category.name,
      categoryColor: category.color,
      totalProjectCost: 0,
      totalRecovery: 0,
      totalPendingRecovery: 0,
      totalProjects: 0
    };
  });
  
  projects.forEach(project => {
    // Get category: direct category first, then from originLead, then from leadCategoryMap
    let categoryId = null;
    if (project.category) {
      categoryId = project.category.toString();
    } else if (project.originLead?.category) {
      categoryId = project.originLead.category.toString();
    } else if (project.originLead?._id) {
      categoryId = leadCategoryMap[project.originLead._id.toString()];
    }
    
    if (!categoryId || !categoryStats[categoryId]) return;
    
    // Calculate project cost: prefer financialDetails.totalCost, then budget, then 0
    const projectCost = Number(
      project.financialDetails?.totalCost || 
      project.budget || 
      0
    );
    
    // Get recovery amount
    const projectRecovery = recoveryByProject[project._id.toString()] || 0;
    
    // Only count projects with actual cost > 0 (to avoid counting empty projects)
    if (projectCost > 0 || projectRecovery > 0) {
      categoryStats[categoryId].totalProjectCost += projectCost;
      categoryStats[categoryId].totalRecovery += projectRecovery;
      // Calculate pending recovery (total cost - recovery)
      const pendingRecovery = Math.max(0, projectCost - projectRecovery);
      categoryStats[categoryId].totalPendingRecovery += pendingRecovery;
      categoryStats[categoryId].totalProjects += 1;
    }
  });
  
  // Get conversion data from getCategoryStatistics
  const conversionStats = await this.getCategoryStatistics({});
  const conversionMap = {};
  conversionStats.forEach(stat => {
    // Map by categoryName since getCategoryStatistics returns names
    conversionMap[stat.categoryName] = {
      totalLeads: stat.totalLeads || 0,
      convertedLeads: stat.convertedLeads || 0,
      conversionRate: stat.conversionRate || 0
    };
  });
  
  // Combine data - return all categories with their financial details
  const result = Object.values(categoryStats).map(stat => {
    const conversion = conversionMap[stat.categoryName] || { totalLeads: 0, convertedLeads: 0, conversionRate: 0 };
    return {
      categoryName: stat.categoryName,
      categoryColor: stat.categoryColor,
      totalProjectCost: stat.totalProjectCost,
      totalRecovery: stat.totalRecovery,
      totalPendingRecovery: stat.totalPendingRecovery,
      totalProjects: stat.totalProjects,
      conversionRatio: conversion.conversionRate || 0,
      totalLeads: conversion.totalLeads || 0,
      convertedLeads: conversion.convertedLeads || 0
    };
  });
  
  return result;
};

// Pre-delete middleware to check if category has leads
leadCategorySchema.pre('deleteOne', { document: true, query: false }, async function() {
  const Lead = mongoose.model('Lead');
  const leadCount = await Lead.countDocuments({ category: this._id });
  
  if (leadCount > 0) {
    throw new Error(`Cannot delete category "${this.name}" because it has ${leadCount} associated leads. Please reassign or delete the leads first.`);
  }
});

// Remove sensitive data from JSON output
leadCategorySchema.methods.toJSON = function() {
  const category = this.toObject();
  return category;
};

module.exports = mongoose.model('LeadCategory', leadCategorySchema);
