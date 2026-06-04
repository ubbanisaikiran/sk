const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail } = require('../services/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'sk-career-secret-change-this';
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;

const sign = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const resolveFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) {
    return `${forwardedProto || 'https'}://${host}`.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    await User.create({ name, email, password });

    await sendMail(email, 'Welcome to SK Career Upgrade \u26A1', `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#6366f1">Welcome, ${name}! &#9889;</h2>
        <p>Your account is ready. We will send you a daily job digest every morning at <strong>6:30 AM IST</strong>.</p>
      </div>
    `);

    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error('register:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      token: sign(user._id),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpiresAt');
    if (!user) return res.json({ message: 'If registered, a reset link has been sent' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);
    await user.save();

    const resetLink = `${resolveFrontendUrl(req)}?career=reset&token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;

    await sendMail(email, 'Password Reset - SK Career Upgrade', `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#6366f1">Reset Your Password &#9889;</h2>
        <p>This link stays active for 60 minutes.</p>
        <a href="${resetLink}"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#6366f1;color:#fff;border-radius:8px;font-weight:700;text-decoration:none">
          Reset Password
        </a>
      </div>
    `);

    res.json({ message: 'If registered, a reset link has been sent' });
  } catch (err) {
    console.error('forgot-password:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpiresAt');

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('reset-password:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
