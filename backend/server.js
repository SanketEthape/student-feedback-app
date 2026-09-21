const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =====================================================
// ALLOWED ORIGINS — driven by environment variables
// Never hardcode production URLs here.
//
// On Render (production):
//   Set FRONTEND_URL = https://your-frontend.onrender.com
//   Optionally set CORS_ORIGINS = url1,url2 for extra origins
//
// Locally (development):
//   Falls back to localhost:5173 and localhost:3000
// =====================================================

const buildAllowedOrigins = () => {
  const origins = new Set();

  const clean = (url) => url.trim().replace(/\/+$/, '');

  // Primary frontend URL from env (required in production)
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').map(clean).filter(Boolean).forEach(u => origins.add(u));
  }

  // Extra origins (comma-separated) — optional
  if (process.env.CORS_ORIGINS) {
    process.env.CORS_ORIGINS.split(',').map(clean).filter(Boolean).forEach(u => origins.add(u));
  }

  // Localhost fallback only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:5173');
    origins.add('http://localhost:3000');
  }

  return [...origins];
};

const allowedOrigins = buildAllowedOrigins();
console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root Health Check Route (avoids "Cannot GET /" in browser)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Student Feedback API is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student-auth', require('./routes/student-auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/responses', require('./routes/responses'));
app.use('/api/analytics', require('./routes/analytics'));


// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (bound to 0.0.0.0)`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });