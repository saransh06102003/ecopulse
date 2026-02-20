function mean(values) {
  if (!values.length) return 0;
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((acc, n) => acc + (n - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function detectAnomalies(logs) {
  if (!logs.length) return [];

  const losses = logs.map((l) => l.revenueLoss);
  const variances = logs.map((l) => l.energyVariance);
  const avgLoss = mean(losses);
  const avgVariance = mean(variances);
  const lossStd = stdDev(losses);
  const varianceStd = stdDev(variances);

  return logs
    .map((log) => {
      const lossZ = lossStd ? (log.revenueLoss - avgLoss) / lossStd : 0;
      const varianceZ = varianceStd ? (log.energyVariance - avgVariance) / varianceStd : 0;
      const suddenDrop = log.expectedGeneration > 0 && (log.actualGeneration / log.expectedGeneration) < 0.65;
      if (lossZ < 2 && varianceZ < 2 && !suddenDrop) return null;

      let severity = 'medium';
      if (lossZ >= 3 || varianceZ >= 3 || suddenDrop) severity = 'high';

      const reasons = [];
      if (lossZ >= 2) reasons.push('revenue loss outlier');
      if (varianceZ >= 2) reasons.push('variance outlier');
      if (suddenDrop) reasons.push('actual generation dropped below 65% of expected');

      return {
        date: log.entryDate,
        assetType: log.assetType,
        severity,
        reason: reasons.join(', '),
        revenueLoss: log.revenueLoss,
        energyVariance: log.energyVariance
      };
    })
    .filter(Boolean);
}

module.exports = { detectAnomalies };
