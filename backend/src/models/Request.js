const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    elderId: {
      type: String,
      required: true,
      index: true,
    },
    requestText: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['daily_help', 'medical', 'emergency', 'social', 'transport', 'other'],
      default: 'other',
    },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    requestSummary: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

module.exports = mongoose.model('Request', requestSchema);
