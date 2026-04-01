const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['project', 'milestone', 'task']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  activityType: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: ['created', 'updated', 'deleted', 'assigned', 'completed', 'commented', 'status_changed', 'priority_changed', 'due_date_changed', 'team_member_added', 'team_member_removed', 'attachment_added', 'attachment_removed', 'meeting_status_updated', 'project_started', 'project_activated', 'revision_status_updated', 'payment_created', 'payment_updated']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: [true, 'User is required']
  },
  userModel: {
    type: String,
    enum: ['PM', 'Employee', 'Client'],
    required: [true, 'User model is required']
  },
  message: {
    type: String,
    required: [true, 'Activity message is required'],
    trim: true,
    maxlength: [500, 'Activity message cannot exceed 500 characters']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
activitySchema.index({ entityType: 1, entityId: 1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1 });
activitySchema.index({ activityType: 1 });
activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 }); // Compound index for entity activities

// Static method to create activity
activitySchema.statics.createActivity = async function(data) {
  try {
    const activity = new this(data);
    await activity.save();
    return activity;
  } catch (error) {
    throw new Error('Failed to create activity');
  }
};

// Static method to get activities for an entity
activitySchema.statics.getEntityActivities = async function(entityType, entityId, limit = 50, skip = 0) {
  try {
    const activities = await this.find({ entityType, entityId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    return activities;
  } catch (error) {
    throw new Error('Failed to get entity activities');
  }
};

// Static method to get user activities
activitySchema.statics.getUserActivities = async function(userId, userModel, limit = 50, skip = 0) {
  try {
    const activities = await this.find({ user: userId, userModel })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    return activities;
  } catch (error) {
    throw new Error('Failed to get user activities');
  }
};

// Static method to get recent activities across all entities
activitySchema.statics.getRecentActivities = async function(limit = 20) {
  try {
    const activities = await this.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return activities;
  } catch (error) {
    throw new Error('Failed to get recent activities');
  }
};

// Static method to log project activity
activitySchema.statics.logProjectActivity = async function(projectId, activityType, userId, userModel, message, metadata = {}) {
  return this.createActivity({
    entityType: 'project',
    entityId: projectId,
    activityType,
    user: userId,
    userModel,
    message,
    metadata
  });
};

// Static method to log milestone activity
activitySchema.statics.logMilestoneActivity = async function(milestoneId, activityType, userId, userModel, message, metadata = {}) {
  return this.createActivity({
    entityType: 'milestone',
    entityId: milestoneId,
    activityType,
    user: userId,
    userModel,
    message,
    metadata
  });
};

// Static method to log task activity
activitySchema.statics.logTaskActivity = async function(taskId, activityType, userId, userModel, message, metadata = {}) {
  return this.createActivity({
    entityType: 'task',
    entityId: taskId,
    activityType,
    user: userId,
    userModel,
    message,
    metadata
  });
};

// Remove sensitive data from JSON output
activitySchema.methods.toJSON = function() {
  const activity = this.toObject();
  return activity;
};

module.exports = mongoose.model('Activity', activitySchema);
