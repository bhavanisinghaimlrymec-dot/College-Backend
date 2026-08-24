const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { loginSchema } = require('../middleware/validationSchemas');

// --- STEP 7: Rate limiting on login to prevent brute-force attacks ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 5,                    // max 5 attempts per window per IP
  message: {
    message: 'Too many login attempts, please try again after 15 minutes',
    statusCode: 429
  },
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,      // Disable `X-RateLimit-*` headers
});

// STEP 6: validate(loginSchema) checks usn + password are present strings
// STEP 7: loginLimiter blocks after 5 failed attempts per 15 min per IP
router.post('/login', loginLimiter, validate(loginSchema), login);

// GET /api/auth/profile — requires valid JWT token
router.get('/profile', protect, getProfile);

module.exports = router;