const mongoose = require('mongoose');

const projectExpenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color code'],
    default: '#3B82F6'
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon cannot exceed 50 characters'],
    default: '📋'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Created by admin is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for better performance (name already has index from unique: true)
projectExpenseCategorySchema.index({ isActive: 1 });

// Virtual for expense count
projectExpenseCategorySchema.virtual('expenseCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'expenses.category',
  count: true
});

// Remove sensitive data from JSON output
projectExpenseCategorySchema.methods.toJSON = function() {
  const category = this.toObject();
  return category;
};

module.exports = mongoose.model('ProjectExpenseCategory', projectExpenseCategorySchema);
