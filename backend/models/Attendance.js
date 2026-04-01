const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  // The HR-uploaded attendance month, normalized to YYYY-MM
  month: { 
    type: String, 
    required: true,
    match: /^\d{4}-\d{2}$/ // Validate format YYYY-MM
  },

  // Source file info (optional)
  sourceFileName: { type: String },

  // Records per employee for the month
  records: [
    {
      serialNo: { type: Number },
      name: { 
        type: String, 
        required: true, 
        trim: true 
      },
      employee: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Sales',
        required: false // Optional - can be linked later
      },
      requiredDays: { 
        type: Number, 
        default: 0,
        min: 0
      },
      attendedDays: { 
        type: Number, 
        default: 0,
        min: 0
      },
      absentDays: { 
        type: Number, 
        default: 0,
        min: 0
      }
    }
  ],

  // Audit
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin',
    required: false // Optional in case auth fails
  },
}, { 
  timestamps: true,
  collection: 'attendances' // Explicit collection name
});

// Indexes for faster queries
attendanceSchema.index({ month: 1 }, { unique: true });
attendanceSchema.index({ month: 1, 'records.name': 1 });
attendanceSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);


