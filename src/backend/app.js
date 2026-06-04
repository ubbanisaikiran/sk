require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const agriStackRoutes = require('./routes/agriStack');
const { connectToDatabase } = require('./db');

function createCorsMiddleware() {
  const exactAllowedOrigins = new Set([
    'https://ubbanisaikiran.github.io',
    'https://ubbanisaikiran.github.io/sk',
    process.env.FRONTEND_URL,
  ].filter(Boolean));

  const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (exactAllowedOrigins.has(origin) || localOriginPattern.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });
}

function createApp({ mountBase = '' } = {}) {
  const app = express();
  const normalizedBasePath = mountBase.replace(/\/$/, '');
  const routeBases = Array.from(new Set(
    ['', normalizedBasePath].map((value) => value || '')
  ));
  const isDatabaseFreePath = (requestPath = '') => {
    const normalizedPath = requestPath.replace(/^\/api(?=\/|$)/, '');
    return normalizedPath.startsWith('/agri-stack') || normalizedPath === '/';
  };

  app.use(createCorsMiddleware());
  app.use(express.json());

  app.use(async (req, res, next) => {
    if (isDatabaseFreePath(req.path)) {
      return next();
    }

    try {
      await connectToDatabase();
      next();
    } catch (err) {
      console.error('MongoDB error:', err);
      res.status(500).json({ message: 'Database connection failed' });
    }
  });

  routeBases.forEach((basePath) => {
    app.get(basePath || '/', (_req, res) => res.json({ status: 'SK Career API \u26A1' }));
    app.use(`${basePath}/auth`, authRoutes);
    app.use(`${basePath}/companies`, companyRoutes);
    app.use(`${basePath}/agri-stack`, agriStackRoutes);
  });

  return app;
}

module.exports = { createApp };
