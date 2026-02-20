const EnergyLog = require('../models/EnergyLog');

function normalizeLogPayload(body) {
  const expected = Number(body.expectedGeneration);
  const actual = Number(body.actualGeneration);
  const tariff = Number(body.tariff);
  const energyVariance = Math.max(0, expected - actual);
  const revenueLoss = Number((energyVariance * tariff).toFixed(2));
  const variancePercent = expected > 0 ? Number(((energyVariance / expected) * 100).toFixed(2)) : 0;

  return {
    assetType: body.assetType,
    entryDate: new Date(body.entryDate),
    tariff,
    expectedGeneration: expected,
    actualGeneration: actual,
    energyVariance,
    revenueLoss,
    variancePercent,
    notes: body.notes || ''
  };
}

async function createLog(req, res) {
  const payload = normalizeLogPayload(req.body);
  const log = await EnergyLog.create({ ...payload, user: req.user._id });

  return res.status(201).json({
    success: true,
    data: log
  });
}

async function getLogs(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.assetType && req.query.assetType !== 'all') filter.assetType = req.query.assetType;
  if (req.query.startDate || req.query.endDate) {
    filter.entryDate = {};
    if (req.query.startDate) filter.entryDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.entryDate.$lte = new Date(req.query.endDate);
  }

  const [items, total] = await Promise.all([
    EnergyLog.find(filter).sort({ entryDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    EnergyLog.countDocuments(filter)
  ]);

  if (String(req.query.format).toLowerCase() === 'csv') {
    const csvHeader = 'entryDate,assetType,expectedGeneration,actualGeneration,energyVariance,revenueLoss,tariff,variancePercent,notes';
    const csvRows = items.map((i) => [
      new Date(i.entryDate).toISOString().slice(0, 10),
      i.assetType,
      i.expectedGeneration,
      i.actualGeneration,
      i.energyVariance,
      i.revenueLoss,
      i.tariff,
      i.variancePercent,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ecopulse-logs.csv"');
    return res.status(200).send([csvHeader, ...csvRows].join('\n'));
  }

  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}

module.exports = { createLog, getLogs };
