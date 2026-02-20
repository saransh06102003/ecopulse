const express = require('express');
const { body } = require('express-validator');
const { generateReport } = require('../controllers/reportController');
const { asyncHandler } = require('../utils/asyncHandler');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/generate-report',
  protect,
  authorizeRoles('admin', 'analyst'),
  [body('startDate').optional().isISO8601(), body('endDate').optional().isISO8601()],
  validateRequest,
  asyncHandler(generateReport)
);

module.exports = router;
