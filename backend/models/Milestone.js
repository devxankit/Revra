const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [100, 'Milestone title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Milestone description cannot exceed 500 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  sequence: {
    type: Number,
    min: 1
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
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
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
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
  }]
}, {
  timestamps: true
});

// Indexes for better performance
milestoneSchema.index({ project: 1 });
milestoneSchema.index({ status: 1 });
milestoneSchema.index({ sequence: 1 });
milestoneSchema.index({ dueDate: 1 });
milestoneSchema.index({ project: 1, sequence: 1 }); // Compound index for sorting

// Virtual for task completion percentage
milestoneSchema.virtual('taskCompletionPercentage').get(function () {
  if (!this.tasks || this.tasks.length === 0) {
    return 0;
  }

  // This will be calculated when tasks are populated
  return this.progress;
});

// Virtual for checking if milestone is overdue
milestoneSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status !== 'completed';
});

// Method to update milestone progress based on tasks
milestoneSchema.methods.updateProgress = async function () {
  try {
    // Calculate progress based on tasks
    const tasks = await this.constructor.model('Task').find({
      milestone: this._id
    });

    if (tasks.length === 0) {
      this.progress = 0;
    } else {
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      this.progress = Math.round((completedTasks / tasks.length) * 100);
    }

    // Auto-update status based on progress
    if (this.progress === 100 && tasks.length > 0) {
      this.status = 'completed';
    } else if (this.status === 'completed' || this.progress < 100) {
      // If progress drops OR there are no tasks, it cannot be completed
      if (this.status === 'completed') {
        this.status = 'in-progress';
      }
    }

    await this.save();

    // Update parent project progress
    const project = await this.constructor.model('Project').findById(this.project);
    if (project) {
      await project.updateProgress();
    }

    return this.progress;
  } catch (error) {
    throw new Error('Failed to update milestone progress');
  }
};

// Method to check if milestone is overdue (using virtual property instead)
// milestoneSchema.methods.isOverdue = function() {
//   if (!this.dueDate) return false;
//   return new Date() > this.dueDate && this.status !== 'completed';
// };

// Method to add team member
milestoneSchema.methods.addAssignee = function (employeeId) {
  if (!this.assignedTo.includes(employeeId)) {
    this.assignedTo.push(employeeId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove team member
milestoneSchema.methods.removeAssignee = function (employeeId) {
  this.assignedTo = this.assignedTo.filter(id => !id.equals(employeeId));
  return this.save();
};

// Method to add task
milestoneSchema.methods.addTask = async function (taskId) {
  if (!this.tasks.includes(taskId)) {
    this.tasks.push(taskId);
    await this.save();

    // Update progress after adding task
    try {
      await this.updateProgress();
    } catch (error) {
      console.error('Error updating milestone progress:', error.message);
      // Don't throw error, just log it
    }
  }
  return this;
};

// Method to remove task
milestoneSchema.methods.removeTask = async function (taskId) {
  this.tasks = this.tasks.filter(id => !id.equals(taskId));
  await this.save();
  return this;
};

// Method to add attachment
milestoneSchema.methods.addAttachment = function (attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Method to remove attachment
milestoneSchema.methods.removeAttachment = function (attachmentId) {
  this.attachments = this.attachments.filter(att => att._id.toString() !== attachmentId);
  return this.save();
};

// Pre-save middleware to ensure unique sequence within project
milestoneSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('sequence') || this.isModified('project')) {
    try {
      // Only auto-assign sequence if none provided or invalid
      if (!this.sequence || this.sequence <= 0) {
        // Find the highest sequence number for this project
        const lastMilestone = await this.constructor.findOne({
          project: this.project
        }).sort({ sequence: -1 });

        this.sequence = lastMilestone ? lastMilestone.sequence + 1 : 1;
      } else {
        // Check if the provided sequence number already exists
        const existingMilestone = await this.constructor.findOne({
          project: this.project,
          sequence: this.sequence,
          _id: { $ne: this._id }
        });

        if (existingMilestone) {
          // If sequence conflicts, throw an error instead of auto-assigning
          const error = new Error(`Sequence number ${this.sequence} already exists for this project`);
          error.name = 'ValidationError';
          return next(error);
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to update progress if tasks are modified
milestoneSchema.pre('save', async function (next) {
  if (this.isModified('tasks') && !this.isNew) {
    try {
      // Calculate progress based on tasks without calling save again
      const tasks = await this.constructor.model('Task').find({
        milestone: this._id
      });

      if (tasks.length === 0) {
        this.progress = 0;
      } else {
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        this.progress = Math.round((completedTasks / tasks.length) * 100);
      }
    } catch (error) {
      console.error('Error calculating milestone progress:', error.message);
      // Don't fail the save operation
    }
  }
  next();
});

// Remove sensitive data from JSON output
milestoneSchema.methods.toJSON = function () {
  const milestone = this.toObject();
  return milestone;
};

module.exports = mongoose.model('Milestone', milestoneSchema);

