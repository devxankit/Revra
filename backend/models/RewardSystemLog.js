const mongoose = require('mongoose');

const rewardSystemLogSchema = new mongoose.Schema({
    month: {
        type: String,
        required: true, // YYYY-MM
        match: [/^\d{4}-\d{2}$/, 'Please enter a valid month format (YYYY-MM)']
    },
    year: {
        type: Number,
        required: true
    },
    team: {
        type: String,
        enum: ['dev', 'pm', 'all'],
        required: true
    },
    totalWinners: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    winners: [{
        id: { type: mongoose.Schema.Types.ObjectId, refPath: 'winners.model' },
        model: { type: String, enum: ['Employee', 'PM'] },
        name: String,
        rewardName: String,
        amount: Number
    }],
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    error: {
        type: String
    },
    executionTime: {
        type: Number // in ms
    },
    processedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

rewardSystemLogSchema.index({ month: 1, team: 1 });
rewardSystemLogSchema.index({ processedAt: -1 });

module.exports = mongoose.model('RewardSystemLog', rewardSystemLogSchema);
