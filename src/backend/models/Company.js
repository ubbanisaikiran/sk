const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  applyLink:   { type: String, default: '' },
  applyLinks:  { type: [String], default: [] },
  status:      { type: String, enum: ['fresh', 'applied', 'thinking'], default: 'fresh' },
  detectedAt:  { type: Date, default: Date.now },
});

const companySchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true, trim: true },
  type:         { type: String, enum: ['private', 'govt'], default: 'private' },
  announceLink: { type: String, default: '' },
  careerLink:   { type: String, default: '' },
  lastChecked:  { type: Date },
  lastContent:  { type: String, select: false },
  updates:      { type: [updateSchema], default: [] },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Company', companySchema);