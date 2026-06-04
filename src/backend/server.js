require('dotenv').config();
const cron = require('node-cron');
const { createApp } = require('./app');
const { connectToDatabase } = require('./db');
const { runDailyCheck } = require('./services/checker');

const app = createApp({ mountBase: '/api' });

cron.schedule('30 6 * * *', async () => {
  console.log('\u23F0 Running daily company check...');
  try {
    await connectToDatabase();
    await runDailyCheck();
  } catch (err) {
    console.error('Daily company check skipped:', err.message);
  }
}, { timezone: 'Asia/Kolkata' });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\u{1F680} Backend running on http://localhost:${PORT}`));

connectToDatabase()
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB unavailable at startup:', err.message);
    console.error('Agri Stack checks can still run, but auth/company features need a working MongoDB connection.');
  });
