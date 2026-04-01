const ProjectExpenseCategory = require('../models/ProjectExpenseCategory');
const Project = require('../models/Project');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all project expense categories
// @route   GET /api/admin/project-expense-categories
// @access  Admin only
const getAllCategories = asyncHandler(async (req, res, next) => {
  const { isActive } = req.query;
  
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const categories = await ProjectExpenseCategory.find(filter)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ name: 1 });

  // Get expense counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      // Count expenses using this category
      const projects = await Project.find({ 'expenses.category': category.name });
      let expenseCount = 0;
      projects.forEach(project => {
        if (project.expenses && project.expenses.length > 0) {
          expenseCount += project.expenses.filter(e => e.category === category.name).length;
        }
      });

      return {
        ...category.toObject(),
        expenseCount
      };
    })
  );

  res.status(200).json({
    success: true,
    count: categoriesWithCounts.length,
    data: categoriesWithCounts
  });
});

// @desc    Get single project expense category
// @route   GET /api/admin/project-expense-categories/:id
// @access  Admin only
const getCategoryById = asyncHandler(async (req, res, next) => {
  const category = await ProjectExpenseCategory.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  res.status(200).json({
    success: true,
    data: category
  });
});

// @desc    Create project expense category
// @route   POST /api/admin/project-expense-categories
// @access  Admin only
const createCategory = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const { name } = req.body;

  if (!name || !name.trim()) {
    return next(new ErrorResponse('Category name is required', 400));
  }

  // Check if category with same name already exists
  const existingCategory = await ProjectExpenseCategory.findOne({ 
    name: name.trim() 
  });
  if (existingCategory) {
    return next(new ErrorResponse('Category with this name already exists', 400));
  }

  const category = await ProjectExpenseCategory.create({
    name: name.trim(),
    description: '',
    color: '#3B82F6',
    icon: '📋',
    isActive: true,
    createdBy: req.admin._id
  });

  await category.populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});

// @desc    Update project expense category
// @route   PUT /api/admin/project-expense-categories/:id
// @access  Admin only
const updateCategory = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const { name } = req.body;

  if (!name || !name.trim()) {
    return next(new ErrorResponse('Category name is required', 400));
  }

  let category = await ProjectExpenseCategory.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  // Check if new name conflicts with existing category
  if (name.trim() !== category.name) {
    const existingCategory = await ProjectExpenseCategory.findOne({ 
      name: name.trim() 
    });
    if (existingCategory) {
      return next(new ErrorResponse('Category with this name already exists', 400));
    }
  }

  // Update fields
  category.name = name.trim();
  category.updatedBy = req.admin._id;

  await category.save();

  await category.populate('createdBy', 'name email');
  await category.populate('updatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category
  });
});

// @desc    Delete project expense category
// @route   DELETE /api/admin/project-expense-categories/:id
// @access  Admin only
const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await ProjectExpenseCategory.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  // Check if category is being used in any expenses
  const projects = await Project.find({ 'expenses.category': category.name });
  let expenseCount = 0;
  projects.forEach(project => {
    if (project.expenses && project.expenses.length > 0) {
      expenseCount += project.expenses.filter(e => e.category === category.name).length;
    }
  });

  if (expenseCount > 0) {
    return next(new ErrorResponse(
      `Cannot delete category. It is being used in ${expenseCount} expense(s). Please update or remove those expenses first.`,
      400
    ));
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
