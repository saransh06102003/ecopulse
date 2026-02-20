const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');
const { asyncHandler } = require('../utils/asyncHandler');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().trim().isLength({ min: 2, max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['admin', 'analyst'])
  ],
  validateRequest,
  asyncHandler(register)
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 8 })],
  validateRequest,
  asyncHandler(login)
);

module.exports = router;
