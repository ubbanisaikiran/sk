const { batchCheckAgriStack } = require('../../src/backend/services/agriStack');

function parseRows(body) {
  if (!body) return [];
  if (Array.isArray(body.rows)) return body.rows;

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return Array.isArray(parsed?.rows) ? parsed.rows : [];
    } catch {
      return [];
    }
  }

  return [];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const rows = parseRows(req.body);

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

    return res.status(200).json({ results, summary });
  } catch (err) {
    console.error('agri-stack-function:', err);
    return res.status(500).json({ message: 'Unable to check Agri Stack registrations' });
  }
};
