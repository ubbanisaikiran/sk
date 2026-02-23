require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const cron       = require('node-cron');
const authRoutes    = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const { runDailyCheck } = require('./services/checker');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ubbanisaikiran.github.io',
    process.env.FRONTEND_URL,
  ].filter(Boolean), // Removes undefined values if env vars are missing
  credentials: true, // Add this if you are managing auth tokens/cookies
}));
app.use(express.json());

app.use('/api/auth',      authRoutes);
app.use('/api/companies', companyRoutes);
app.get('/', (_, res) => res.json({ status: 'SK Career API ⚡' }));

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sk-career')
  .then(() => console.log(' MongoDB connected'))
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });

// Daily check at 6:30 AM IST
cron.schedule('30 6 * * *', () => {
  console.log('⏰  Running daily company check...');
  runDailyCheck();
}, { timezone: 'Asia/Kolkata' });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀  Backend running on http://localhost:${PORT}`));