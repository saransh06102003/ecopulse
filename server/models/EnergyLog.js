const mongoose = require('mongoose');

const energyLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assetType: {
      type: String,
      enum: ['solar', 'wind', 'hybrid', 'battery'],
      required: true,
      index: true
    },
    entryDate: {
      type: Date,
      required: true,
      index: true
    },
    tariff: {
      type: Number,
      required: true,
      min: 0
    },
    expectedGeneration: {
      type: Number,
      required: true,
      min: 0
    },
    actualGeneration: {
      type: Number,
      required: true,
      min: 0
    },
    energyVariance: {
      type: Number,
      required: true,
      min: 0
    },
    revenueLoss: {
      type: Number,
      required: true,
      min: 0
    },
    variancePercent: {
      type: Number,
      required: true,
      min: 0
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

energyLogSchema.index({ user: 1, entryDate: -1 });

module.exports = mongoose.model('EnergyLog', energyLogSchema);
