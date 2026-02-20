const express = require('express');
const { body, query } = require('express-validator');
const { createLog, getLogs } = require('../controllers/logController');
const { asyncHandler } = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('assetType').isIn(['solar', 'wind', 'hybrid', 'battery']),
    body('entryDate').isISO8601(),
    body('tariff').isFloat({ min: 0 }),
    body('expectedGeneration').isFloat({ min: 0 }),
    body('actualGeneration').isFloat({ min: 0 }),
    body('notes').optional().isString().isLength({ max: 500 })
  ],
  validateRequest,
  asyncHandler(createLog)
);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('assetType').optional().isIn(['all', 'solar', 'wind', 'hybrid', 'battery']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('format').optional().isIn(['json', 'csv'])
  ],
  validateRequest,
  asyncHandler(getLogs)
);

module.exports = router;
