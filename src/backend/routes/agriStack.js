const router = require('express').Router();
const { batchCheckAgriStack } = require('../services/agriStack');

router.post('/check-batch', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!rows.length) {
      return res.status(400).json({ message: 'At least one row is required' });
    }

    if (rows.length > 25) {
      return res.status(400).json({ message: 'Batch size cannot exceed 25 rows' });
    }

    const results = await batchCheckAgriStack(rows);
    const summary = results.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    res.json({ results, summary });
  } catch (err) {
    console.error('agri-stack:', err.message);
    res.status(500).json({ message: 'Unable to check Agri Stack registrations' });
  }
});

module.exports = router;
