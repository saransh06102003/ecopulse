const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid token' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }
    return next();
  };
}

module.exports = { protect, authorizeRoles };
