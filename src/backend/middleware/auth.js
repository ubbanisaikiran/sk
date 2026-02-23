const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Unauthorized — no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sk-career-secret-change-this');
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized — invalid or expired token' });
  }
};