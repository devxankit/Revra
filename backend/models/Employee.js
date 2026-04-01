const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['employee'],
    default: 'employee'
  },
  team: {
    type: String,
    enum: ['developer', 'sales'],
    required: [true, 'Team is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required']
  },
  document: {
    public_id: String,
    secure_url: String,
    originalName: String,
    original_filename: String,
    format: String,
    size: Number,
    bytes: Number,
    width: Number,
    height: Number,
    resource_type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  // Employee specific fields
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },
  salary: {
    type: Number,
    min: 0,
    default: 0
  },
  fixedSalary: {
    type: Number,
    min: 0,
    default: 0
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  projectsAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  tasksAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PM'
  },
  // Points system fields
  points: {
    type: Number,
    default: 0
    // Allow negative points for overdue tasks
  },
  pointsHistory: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    points: Number, // positive or negative
    reason: String, // 'task_completed_on_time', 'task_overdue', etc.
    timestamp: { type: Date, default: Date.now }
  }],
  statistics: {
    tasksCompleted: { type: Number, default: 0 },
    tasksOnTime: { type: Number, default: 0 },
    tasksOverdue: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 }, // in days
    totalPointsEarned: { type: Number, default: 0 },
    totalPointsDeducted: { type: Number, default: 0 }
  },
  // Team management fields (for developer team leads)
  isTeamLead: {
    type: Boolean,
    default: false
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  // FCM Tokens for push notifications
  fcmTokens: {
    type: [String],
    default: []
  },
  fcmTokenMobile: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Index for better performance
// Indexes are automatically created by unique: true in schema definition

// Virtual for account lock status
employeeSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Increment login attempts
employeeSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
employeeSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Points management methods
employeeSchema.methods.addPoints = function(taskId, points, reason) {
  this.points += points;
  this.statistics.totalPointsEarned += points;
  
  this.pointsHistory.push({
    taskId: taskId,
    points: points,
    reason: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

employeeSchema.methods.deductPoints = function(taskId, points, reason) {
  // Allow points to go negative for overdue task deductions
  this.points -= points;
  this.statistics.totalPointsDeducted = (this.statistics.totalPointsDeducted || 0) + points;
  
  this.pointsHistory.push({
    taskId: taskId,
    points: -points,
    reason: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

employeeSchema.methods.updateStatistics = async function() {
  // This method needs to query actual tasks to get accurate statistics
  const Task = this.constructor.db.model('Task');
  
  // Get all tasks assigned to this employee
  const allTasks = await Task.find({ assignedTo: this._id });
  const completedTasks = allTasks.filter(t => t.status === 'completed');
  const onTimeTasks = completedTasks.filter(t => 
    t.completedDate && t.dueDate && new Date(t.completedDate) <= new Date(t.dueDate)
  );
  const overdueTasks = completedTasks.filter(t => 
    t.completedDate && t.dueDate && new Date(t.completedDate) > new Date(t.dueDate)
  );
  
  // Calculate average completion time
  let totalCompletionTime = 0;
  let completionTimeCount = 0;
  
  completedTasks.forEach(task => {
    if (task.completedDate && task.startDate) {
      const diffTime = new Date(task.completedDate) - new Date(task.startDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      totalCompletionTime += diffDays;
      completionTimeCount++;
    }
  });
  
  // Update statistics
  this.statistics.tasksCompleted = completedTasks.length;
  this.statistics.tasksOnTime = onTimeTasks.length;
  this.statistics.tasksOverdue = overdueTasks.length;
  this.statistics.averageCompletionTime = completionTimeCount > 0 
    ? totalCompletionTime / completionTimeCount 
    : 0;
  
  // Calculate completion rate
  const totalTasks = allTasks.length;
  this.statistics.completionRate = totalTasks > 0 
    ? Math.round((completedTasks.length / totalTasks) * 100) 
    : 0;
  
  // Calculate total points earned/deducted from history
  const positivePoints = this.pointsHistory.filter(h => h.points > 0)
    .reduce((sum, h) => sum + h.points, 0);
  const negativePoints = Math.abs(this.pointsHistory.filter(h => h.points < 0)
    .reduce((sum, h) => sum + h.points, 0));
  
  this.statistics.totalPointsEarned = positivePoints;
  this.statistics.totalPointsDeducted = negativePoints;
  
  return this.save();
};

// Remove password from JSON output
employeeSchema.methods.toJSON = function() {
  const employee = this.toObject();
  delete employee.password;
  delete employee.loginAttempts;
  delete employee.lockUntil;
  return employee;
};

module.exports = mongoose.model('Employee', employeeSchema);
