const mongoose = require('mongoose');

const cpNotificationSchema = new mongoose.Schema({
  channelPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelPartner',
    required: true
  },
  type: {
    type: String,
    enum: [
      'lead_update',
      'lead_assigned',
      'lead_shared',
      'lead_unshared',
      'lead_converted',
      'payment_received',
      'payment_pending',
      'wallet_credit',
      'wallet_debit',
      'withdrawal_approved',
      'withdrawal_rejected',
      'reward_earned',
      'incentive_earned',
      'system',
      'other'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  reference: {
    type: {
      type: String,
      enum: ['lead', 'client', 'payment', 'wallet', 'withdrawal', 'reward', 'incentive', 'system', 'other']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  actionUrl: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
cpNotificationSchema.index({ channelPartner: 1, read: 1 });
cpNotificationSchema.index({ channelPartner: 1, createdAt: -1 });
cpNotificationSchema.index({ type: 1 });
cpNotificationSchema.index({ 'reference.id': 1 });

// Method to mark as read
cpNotificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create notification
cpNotificationSchema.statics.createNotification = function(data) {
  return this.create(data);
};

// Static method to get unread count
cpNotificationSchema.statics.getUnreadCount = function(channelPartnerId) {
  return this.countDocuments({
    channelPartner: channelPartnerId,
    read: false
  });
};

module.exports = mongoose.model('CPNotification', cpNotificationSchema);
