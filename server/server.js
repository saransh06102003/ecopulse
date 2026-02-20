require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB } = require('./utils/db');
const authRoutes = require('./routes/authRoutes');
const logRoutes = require('./routes/logRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api', reportRoutes);

const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5001;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`EcoPulse server running on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
})();
