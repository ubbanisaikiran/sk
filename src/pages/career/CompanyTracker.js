import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import InputField from './components/InputField';
import UpdateCard from './components/UpdateCard';
import { companyAPI } from './services/api';

export default function CompanyTracker({ user, onLogout, navigate, PAGES }) {
  const [companies, setCompanies] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'private', announceLink: '', careerLink: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    Promise.all([companyAPI.getAll(), companyAPI.getUpdates()])
      .then(([companiesResponse, updatesResponse]) => {
        setCompanies(companiesResponse.companies || []);
        setUpdates(updatesResponse.updates || []);
      })
      .catch((err) => setError(err.message || 'Unable to load your tracked companies.'));
  }, []);

  const handleStatusChange = (updateId, nextStatus) => {
    setUpdates((current) => current.map((update) => (
      update._id === updateId ? { ...update, status: nextStatus } : update
    )));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Company name is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await companyAPI.add(
        form.name.trim(),
        form.type,
        form.announceLink,
        form.careerLink
      );
      setCompanies((current) => [...current, data.company]);
      setForm({ name: '', type: 'private', announceLink: '', careerLink: '' });
      setSuccess('Company saved! Scanning now...');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleRemove = async (id) => {
    try {
      await companyAPI.remove(id);
      setCompanies((current) => current.filter((company) => company._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);

    try {
      await companyAPI.checkNow();
      const updatesResponse = await companyAPI.getUpdates();
      setUpdates(updatesResponse.updates || []);
    } catch (err) {
      setError(err.message);
    }

    setChecking(false);
  };

  return (
    <div className="career-tracker">
      <Navbar
        user={user}
        onHome={() => navigate(PAGES.HOME)}
        onLogout={onLogout}
        showCompaniesBtn={false}
      />

      <div className="career-tracker__header">
        <div>
          <h1 className="career-tracker__title">{'\u{1F4E1}'} Company Tracker</h1>
          <p className="career-tracker__sub">Auto-checked daily at <strong>6:30 AM IST</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="career-btn career-btn--success" onClick={handleCheckNow} disabled={checking}>
            {checking ? `${'\u23F3'} Checking...` : `${'\u{1F504}'} Check Now`}
          </button>
          <button className="career-btn career-btn--ghost" onClick={() => navigate(PAGES.HOME)}>
            {'\u2190'} Back
          </button>
        </div>
      </div>

      <div className="career-tracker__body">
        <div className="career-tracker__left">
          <div className="career-card">
            <h2 className="career-card__title">Add Company to Track</h2>
            <div className="career-card__fields">
              <InputField
                label="Company Name *"
                value={form.name}
                onChange={(value) => set('name', value)}
                placeholder="e.g. Google, TCS, CEL"
              />

              <div className="career-input-wrap">
                <label className="career-input-label">Company Type</label>
                <div className="career-type-toggle">
                  <button
                    type="button"
                    className={`career-type-btn ${form.type === 'private' ? 'active' : ''}`}
                    onClick={() => set('type', 'private')}
                  >
                    {'\u{1F3E2}'} Private
                  </button>
                  <button
                    type="button"
                    className={`career-type-btn ${form.type === 'govt' ? 'active' : ''}`}
                    onClick={() => set('type', 'govt')}
                  >
                    {'\u{1F3DB}\uFE0F'} Govt
                  </button>
                </div>
              </div>

              <InputField
                label="Announcement / Jobs Page Link"
                value={form.announceLink}
                onChange={(value) => set('announceLink', value)}
                placeholder="https://company.com/news"
              />
              <InputField
                label="Career Page Link"
                value={form.careerLink}
                onChange={(value) => set('careerLink', value)}
                placeholder="https://company.com/careers"
              />
            </div>

            {error && <div className="career-alert career-alert--error">{error}</div>}
            {success && <div className="career-alert career-alert--success">{success}</div>}

            <button
              className="career-btn career-btn--primary career-btn--full"
              onClick={handleSave}
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Saving...' : `${'\u{1F4BE}'} Save Company`}
            </button>
          </div>

          <div className="career-notice">
            <span>{'\u{1F4E7}'}</span>
            <span>Daily digest sent to <strong>{user?.email}</strong> every morning at 6:30 AM IST.</span>
          </div>

          <div className="career-card">
            <h2 className="career-card__title">
              Tracked Companies
              <span className="career-card__count">{companies.length}</span>
            </h2>
            <div className="career-company-list">
              {companies.length === 0
                ? <div className="career-empty">No companies yet. Add your first one above.</div>
                : companies.map((company) => (
                  <div key={company._id} className="career-company-item">
                    <div className="career-company-item__info">
                      <div className="career-company-item__name">
                        {company.name}
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            background: company.type === 'govt' ? 'rgba(234,179,8,0.15)' : 'rgba(99,102,241,0.15)',
                            color: company.type === 'govt' ? '#fbbf24' : '#a5b4fc',
                            fontFamily: 'monospace',
                          }}
                        >
                          {company.type === 'govt' ? `${'\u{1F3DB}\uFE0F'} Govt` : `${'\u{1F3E2}'} Private`}
                        </span>
                      </div>
                      <div className="career-company-item__meta">
                        {company.careerLink
                          ? <a href={company.careerLink} target="_blank" rel="noopener noreferrer" className="career-link">Career Page {'\u2197'}</a>
                          : 'No career link'}
                        {' \u00B7 '}
                        {company.lastChecked ? new Date(company.lastChecked).toLocaleDateString('en-IN') : 'Never checked'}
                      </div>
                    </div>
                    <button className="career-btn career-btn--danger-ghost" onClick={() => handleRemove(company._id)}>
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="career-tracker__right">
          <div className="career-card">
            <h2 className="career-card__title">{'\u{1F4EC}'} Latest Updates</h2>
            {updates.length === 0
              ? <div className="career-empty">No updates yet. Click "Check Now" to scan immediately.</div>
              : (
                <div className="career-updates-list">
                  {updates.map((update) => (
                    <UpdateCard
                      key={update._id || `${update.company}-${update.title}`}
                      onStatusChange={handleStatusChange}
                      update={update}
                    />
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
