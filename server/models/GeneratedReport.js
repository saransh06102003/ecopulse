const mongoose = require('mongoose');

const generatedReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    timeframe: {
      from: { type: Date, required: true },
      to: { type: Date, required: true }
    },
    metrics: {
      totalRevenueLoss: { type: Number, required: true, min: 0 },
      totalEnergyVariance: { type: Number, required: true, min: 0 },
      efficiencyPercent: { type: Number, required: true, min: 0 },
      incidentCount: { type: Number, required: true, min: 0 },
      worstPerformingAsset: { type: String, required: true }
    },
    anomalies: [
      {
        date: Date,
        assetType: String,
        severity: String,
        reason: String,
        revenueLoss: Number,
        energyVariance: Number
      }
    ],
    executiveSummary: { type: String, required: true },
    keyFindings: [{ type: String }],
    riskLevel: { type: String, required: true },
    recommendations: [{ type: String }],
    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

generatedReportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('GeneratedReport', generatedReportSchema);
