const { createApp } = require('../server/app');
const { connectDB } = require('../server/utils/db');

let app;
let dbConnectionPromise;

function ensureDbConnected() {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDB(process.env.MONGO_URI);
  }
  return dbConnectionPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDbConnected();
    if (!app) app = createApp();
    return app(req, res);
  } catch (error) {
    console.error('Vercel handler error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server failed to initialize'
    });
  }
};
