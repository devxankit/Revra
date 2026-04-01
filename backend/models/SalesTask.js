const mongoose = require('mongoose');

const salesTaskSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  category: { type: String, enum: ['work', 'personal', 'urgent'], default: 'work' },
  dueDate: { type: Date },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

salesTaskSchema.index({ owner: 1, completed: 1, priority: 1, dueDate: 1 });

module.exports = mongoose.model('SalesTask', salesTaskSchema);


