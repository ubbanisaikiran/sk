const { connectToDatabase } = require('../../src/backend/db');
const { runDailyCheck } = require('../../src/backend/services/checker');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await connectToDatabase();
    await runDailyCheck();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('daily-check:', err);
    return res.status(500).json({ success: false, message: 'Daily check failed' });
  }
};
