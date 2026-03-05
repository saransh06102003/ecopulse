const path = require('path');

function loadModule(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    return null;
  }
}

const appModule =
  loadModule('../server/app') ||
  loadModule(path.join(process.cwd(), 'server', 'app')) ||
  loadModule(path.join(__dirname, '..', 'server', 'app'));

const dbModule =
  loadModule('../server/utils/db') ||
  loadModule(path.join(process.cwd(), 'server', 'utils', 'db')) ||
  loadModule(path.join(__dirname, '..', 'server', 'utils', 'db'));

const bootstrapError =
  !appModule || !dbModule ? 'Failed to resolve backend modules for Vercel runtime' : null;

const { createApp } = appModule || {};
const { connectDB } = dbModule || {};

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
    if (bootstrapError) {
      return res.status(500).json({
        success: false,
        message: bootstrapError
      });
    }
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
