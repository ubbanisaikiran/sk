const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { sendMail } = require('../services/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'sk-career-secret-change-this';
const sign = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

// ── Register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });

    await sendMail(email, 'Welcome to SK Career Upstep ⚡', `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#6366f1">Welcome, ${name}! ⚡</h2>
        <p>Your account is ready. We will send you a daily job digest every morning at <strong>6:30 AM IST</strong>.</p>
      </div>
    `);

    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error('register:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Login ─────────────────────────────────────────────────────
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

// ── Forgot Password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If registered, a reset link has been sent' });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?reset=true&email=${encodeURIComponent(email)}`;

    await sendMail(email, 'Password Reset — SK Career Upstep', `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#6366f1">Reset Your Password ⚡</h2>
        <p>Click below to reset your password.</p>
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

module.exports = router;