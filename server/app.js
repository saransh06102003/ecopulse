const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const logRoutes = require('./routes/logRoutes');
const reportRoutes = require('./routes/reportRoutes');
const actionRoutes = require('./routes/actionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const billingRoutes = require('./routes/billingRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { handleStripeWebhook } = require('./controllers/billingController');
const { requestMetrics } = require('./middleware/observability');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { initSentry } = require('./services/observabilityService');

function createApp() {
  const app = express();
  const sentry = initSentry();

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(requestMetrics);

  if (sentry?.Handlers?.requestHandler) {
    app.use(sentry.Handlers.requestHandler());
  }

  // Must run before JSON parser for Stripe signature verification.
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res, next) =>
    Promise.resolve(handleStripeWebhook(req, res, next)).catch(next)
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (req, res) => {
    res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/logs', logRoutes);
  app.use('/api/actions', actionRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api', reportRoutes);

  const clientPath = path.join(__dirname, '..', 'client');
  app.use(express.static(clientPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  if (sentry?.Handlers?.errorHandler) {
    app.use(sentry.Handlers.errorHandler());
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
