const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'commentUserModel',
    required: true
  },
  commentUserModel: {
    type: String,
    enum: ['PM', 'Employee', 'Client'],
    required: true
  },
  message: {
    type: String,
    required: [true, 'Comment message is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [100, 'Task title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  milestone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
    required: [true, 'Milestone is required']
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'testing', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  startDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: 0,
    default: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  attachments: [{
    public_id: String,
    secure_url: String,
    originalName: String,
    original_filename: String,
    format: String,
    size: Number,
    bytes: Number,
    width: Number,
    height: Number,
    resource_type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [commentSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PM',
    required: [true, 'Task creator is required']
  },
  // Points tracking fields
  pointsAwarded: {
    type: Number,
    default: 0
  },
  completionStatus: {
    type: String,
    enum: ['on-time', 'overdue', 'pending'],
    default: 'pending'
  },
  lastPointsDeductionDate: {
    type: Date
  },
  pointsDeducted: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
taskSchema.index({ project: 1 });
taskSchema.index({ milestone: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ isUrgent: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ project: 1, status: 1 }); // Compound index for filtering

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status !== 'completed';
});

// Method to mark task as complete
taskSchema.methods.markComplete = function () {
  this.status = 'completed';
  this.completedDate = new Date();
  return this.save();
};

// Method to check if task is overdue (using virtual property instead)
// taskSchema.methods.isOverdue = function() {
//   if (!this.dueDate) return false;
//   return new Date() > this.dueDate && this.status !== 'completed';
// };

// Method to add comment
taskSchema.methods.addComment = function (userId, userModel, message) {
  this.comments.push({
    user: userId,
    commentUserModel: userModel,
    message: message
  });
  return this.save();
};

// Method to assign task to employees
taskSchema.methods.assignTo = function (employeeIds) {
  this.assignedTo = employeeIds;
  return this.save();
};

// Method to add assignee
taskSchema.methods.addAssignee = function (employeeId) {
  if (!this.assignedTo.includes(employeeId)) {
    this.assignedTo.push(employeeId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove assignee
taskSchema.methods.removeAssignee = function (employeeId) {
  this.assignedTo = this.assignedTo.filter(id => !id.equals(employeeId));
  return this.save();
};

// Method to add attachment
taskSchema.methods.addAttachment = function (attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Method to remove attachment
taskSchema.methods.removeAttachment = function (attachmentId) {
  this.attachments = this.attachments.filter(att => att._id.toString() !== attachmentId);
  return this.save();
};

// Method to update status
taskSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;

  if (newStatus === 'completed') {
    this.completedDate = new Date();
  } else if (newStatus === 'in-progress' && !this.startDate) {
    this.startDate = new Date();
  }

  return this.save();
};

// Helper method to calculate days overdue
taskSchema.methods.calculateDaysOverdue = function () {
  if (!this.dueDate) return 0;
  const now = new Date();
  const dueDate = new Date(this.dueDate);

  // Reset time to midnight for accurate day calculation
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  if (nowDate <= dueDateOnly) return 0;

  const diffTime = nowDate - dueDateOnly;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Method to calculate and set points for task completion
taskSchema.methods.calculatePoints = function () {
  if (this.status !== 'completed' || !this.completedDate || !this.dueDate) {
    return { points: 0, reason: 'not_completed' };
  }

  const completedDate = new Date(this.completedDate);
  const dueDate = new Date(this.dueDate);

  // Reset time to midnight for accurate day calculation
  const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const isOnTime = completedDateOnly <= dueDateOnly;

  let points = 0;
  let reason = '';

  if (isOnTime) {
    // Completed on time: +1 point
    points = 1;
    reason = 'task_completed_on_time';
  } else {
    // Completed overdue: Calculate days overdue and deduct accordingly
    const diffTime = completedDateOnly - dueDateOnly;
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // Deduct 1 point per day overdue (already deducted daily, so net is -daysOverdue)
    // But we still need to apply the final calculation based on total days overdue
    points = -daysOverdue;
    reason = `task_completed_overdue_${daysOverdue}_days`;
  }

  this.pointsAwarded = points;
  this.completionStatus = isOnTime ? 'on-time' : 'overdue';

  return { points, reason, daysOverdue: isOnTime ? 0 : Math.floor((completedDateOnly - dueDateOnly) / (1000 * 60 * 60 * 24)) };
};

// Method to deduct daily points for overdue tasks
taskSchema.methods.deductDailyPoints = async function () {
  if (this.status === 'completed') return { deducted: 0, message: 'task_already_completed' };
  if (!this.dueDate) return { deducted: 0, message: 'no_due_date' };

  const daysOverdue = this.calculateDaysOverdue();
  if (daysOverdue <= 0) return { deducted: 0, message: 'task_not_overdue' };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check if we already deducted points today
  if (this.lastPointsDeductionDate) {
    const lastDeduction = new Date(this.lastPointsDeductionDate);
    const lastDeductionDate = new Date(lastDeduction.getFullYear(), lastDeduction.getMonth(), lastDeduction.getDate());

    if (lastDeductionDate.getTime() === today.getTime()) {
      return { deducted: 0, message: 'points_already_deducted_today' };
    }
  }

  // Deduct 1 point per day overdue
  const pointsToDeduct = 1;
  this.lastPointsDeductionDate = now;
  this.pointsDeducted = (this.pointsDeducted || 0) + pointsToDeduct;

  await this.save();

  return {
    deducted: pointsToDeduct,
    message: `deducted_${pointsToDeduct}_point_for_${daysOverdue}_days_overdue`,
    daysOverdue
  };
};

// Set start date when status changes to in-progress
taskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'in-progress' && !this.startDate) {
    this.startDate = new Date();
  }
  next();
});

// Pre-save middleware to set completed date when status changes to completed
taskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  next();
});

// Remove sensitive data from JSON output
taskSchema.methods.toJSON = function () {
  const task = this.toObject();
  return task;
};

// Post-save middleware to update related progress and statistics
taskSchema.post('save', async function (doc) {
  try {
    // 1. Update Milestone Progress (if status modified)
    // Note: In post('save'), we use the saved document 'doc'
    // This ensures Milestone.updateProgress() queries the updated status from DB
    const Milestone = mongoose.model('Milestone');
    const milestone = await Milestone.findById(doc.milestone);
    if (milestone) {
      await milestone.updateProgress();
    }

    // 2. Update employee statistics
    if (doc.assignedTo && doc.assignedTo.length > 0) {
      const Employee = mongoose.model('Employee');
      for (const employeeId of doc.assignedTo) {
        const employee = await Employee.findById(employeeId);
        if (employee) {
          await employee.updateStatistics();
        }
      }
    }
  } catch (error) {
    console.error('Error in Task post-save hook:', error.message);
  }
});

// Post-deletion hook to handle all side effects atomically
taskSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;

  try {
    const mongoose = require('mongoose');

    // 1. Remove task from milestone array and trigger recalculation
    const Milestone = mongoose.model('Milestone');
    const milestone = await Milestone.findById(doc.milestone);
    if (milestone) {
      // Manually remove from array to ensure it's gone for pre-save hooks
      milestone.tasks = milestone.tasks.filter(id => id.toString() !== doc._id.toString());

      // updateProgress() will handle the save and the cascading project update
      // It also recalculates from the database, ensuring 0 progress for 0 tasks
      await milestone.updateProgress();
    }

    // 3. Update employee statistics for formerly assigned members
    if (doc.assignedTo && doc.assignedTo.length > 0) {
      const Employee = mongoose.model('Employee');
      for (const employeeId of doc.assignedTo) {
        const employee = await Employee.findById(employeeId);
        if (employee) {
          await employee.updateStatistics();
        }
      }
    }
  } catch (error) {
    console.error('Error in Task post-delete hook:', error.message);
  }
});

module.exports = mongoose.model('Task', taskSchema);
