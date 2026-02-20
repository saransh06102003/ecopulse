const EnergyLog = require('../models/EnergyLog');
const GeneratedReport = require('../models/GeneratedReport');
const { buildGeminiPrompt } = require('../utils/promptTemplate');
const { detectAnomalies } = require('../services/anomalyService');
const { generateEnterpriseReport } = require('../services/geminiService');

function calculateMetrics(logs) {
  const totalRevenueLoss = logs.reduce((sum, l) => sum + l.revenueLoss, 0);
  const totalEnergyVariance = logs.reduce((sum, l) => sum + l.energyVariance, 0);
  const totalExpected = logs.reduce((sum, l) => sum + l.expectedGeneration, 0);
  const totalActual = logs.reduce((sum, l) => sum + l.actualGeneration, 0);
  const efficiencyPercent = totalExpected > 0 ? Number(((totalActual / totalExpected) * 100).toFixed(2)) : 0;

  const byAsset = logs.reduce((acc, log) => {
    if (!acc[log.assetType]) acc[log.assetType] = { loss: 0, variance: 0, count: 0 };
    acc[log.assetType].loss += log.revenueLoss;
    acc[log.assetType].variance += log.energyVariance;
    acc[log.assetType].count += 1;
    return acc;
  }, {});

  const worstPerformingAsset = Object.entries(byAsset).sort((a, b) => b[1].loss - a[1].loss)[0]?.[0] || 'n/a';

  return {
    totalRevenueLoss: Number(totalRevenueLoss.toFixed(2)),
    totalEnergyVariance: Number(totalEnergyVariance.toFixed(2)),
    efficiencyPercent,
    incidentCount: logs.length,
    worstPerformingAsset
  };
}

function buildTrendSummary(logs) {
  const sorted = [...logs].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  const variances = sorted.map((l) => l.energyVariance);
  const losses = sorted.map((l) => l.revenueLoss);

  const trendDirection = variances.length >= 2 && variances[variances.length - 1] > variances[0] ? 'worsening' : 'improving_or_stable';

  return {
    varianceTrendDirection: trendDirection,
    averageVariance: Number((variances.reduce((a, n) => a + n, 0) / Math.max(variances.length, 1)).toFixed(2)),
    maxVariance: Math.max(0, ...variances),
    averageRevenueLoss: Number((losses.reduce((a, n) => a + n, 0) / Math.max(losses.length, 1)).toFixed(2)),
    maxRevenueLoss: Math.max(0, ...losses)
  };
}

async function generateReport(req, res) {
  const filter = { user: req.user._id };

  if (req.body.startDate || req.body.endDate) {
    filter.entryDate = {};
    if (req.body.startDate) filter.entryDate.$gte = new Date(req.body.startDate);
    if (req.body.endDate) filter.entryDate.$lte = new Date(req.body.endDate);
  }

  const logs = await EnergyLog.find(filter).sort({ entryDate: -1, createdAt: -1 }).limit(1000);
  if (!logs.length) {
    return res.status(400).json({ success: false, message: 'No logs available for report generation' });
  }

  const metrics = calculateMetrics(logs);
  const trends = buildTrendSummary(logs);
  const anomalies = detectAnomalies(logs);

  const compactLogs = logs.map((l) => ({
    entryDate: new Date(l.entryDate).toISOString().slice(0, 10),
    assetType: l.assetType,
    expectedGeneration: l.expectedGeneration,
    actualGeneration: l.actualGeneration,
    energyVariance: l.energyVariance,
    revenueLoss: l.revenueLoss,
    tariff: l.tariff,
    variancePercent: l.variancePercent
  }));

  const prompt = buildGeminiPrompt({ metrics, trends, anomalies, logs: compactLogs });
  const aiResult = await generateEnterpriseReport(prompt);

  const reportRecord = await GeneratedReport.create({
    user: req.user._id,
    timeframe: {
      from: new Date(logs[logs.length - 1].entryDate),
      to: new Date(logs[0].entryDate)
    },
    metrics,
    anomalies,
    executiveSummary: aiResult.normalized.executiveSummary,
    keyFindings: aiResult.normalized.keyFindings,
    riskLevel: aiResult.normalized.riskLevel,
    recommendations: aiResult.normalized.recommendations,
    rawAiResponse: aiResult.raw
  });

  return res.status(200).json({
    success: true,
    data: {
      reportId: reportRecord._id,
      metrics,
      anomalies,
      ai: aiResult.normalized
    }
  });
}

module.exports = { generateReport };
