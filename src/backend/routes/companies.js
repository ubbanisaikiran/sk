const router  = require('express').Router();
const authMW  = require('../middleware/auth');
const Company = require('../models/Company');
const { checkCompany } = require('../services/checker');

router.get('/', authMW, async (req, res) => {
  try {
    const companies = await Company.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ companies });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMW, async (req, res) => {
  try {
    const { name, type, announceLink, careerLink } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Company name is required' });

    const company = await Company.create({
      userId:       req.userId,
      name:         name.trim(),
      type:         type === 'govt' ? 'govt' : 'private',
      announceLink: announceLink?.trim() || '',
      careerLink:   careerLink?.trim()   || '',
    });

    checkCompany(company).catch(console.error);
    res.status(201).json({ company });
  } catch (err) {
    console.error('add company:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMW, async (req, res) => {
  try {
    const deleted = await Company.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Company not found' });
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/updates', authMW, async (req, res) => {
  try {
    const companies = await Company.find({ userId: req.userId });
    const updates = [];

    for (const c of companies) {
      for (const u of c.updates) {
        updates.push({
          _id:         u._id,
          title:       u.title,
          description: u.description,
          applyLink:   u.applyLink,
          applyLinks:  u.applyLinks  || [],
          applyLabels: u.applyLabels || [],
          status:      u.status,
          detectedAt:  u.detectedAt,
          company:     c.name,
          companyId:   c._id,
          type:        c.type,
        });
      }
    }

    updates.sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
    res.json({ updates: updates.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/check', authMW, async (req, res) => {
  try {
    const companies = await Company.find({ userId: req.userId }).select('+lastContent');
    await Promise.allSettled(companies.map(c => checkCompany(c)));
    res.json({ message: 'Check complete', checked: companies.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:companyId/updates/:updateId', authMW, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['fresh', 'applied', 'thinking'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const company = await Company.findOne({ _id: req.params.companyId, userId: req.userId });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const update = company.updates.id(req.params.updateId);
    if (!update) return res.status(404).json({ message: 'Update not found' });

    update.status = status;
    await company.save();
    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;