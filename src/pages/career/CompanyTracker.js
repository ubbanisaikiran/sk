import React, { useState, useEffect } from 'react';
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

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    Promise.all([companyAPI.getAll(), companyAPI.getUpdates()])
      .then(([c, u]) => {
        setCompanies(c.companies || []);
        setUpdates(u.updates || []);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Company name is required'); return; }
    setError(''); setLoading(true);
    try {
      const data = await companyAPI.add(
        form.name.trim(),
        form.type,
        form.announceLink,
        form.careerLink
      );
      setCompanies(prev => [...prev, data.company]);
      setForm({ name: '', type: 'private', announceLink: '', careerLink: '' });
      setSuccess('✓ Company saved! Scanning now...');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleRemove = async (id) => {
    try {
      await companyAPI.remove(id);
      setCompanies(prev => prev.filter(c => c._id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await companyAPI.checkNow();
      const u = await companyAPI.getUpdates();
      setUpdates(u.updates || []);
    } catch (e) {
      setError(e.message);
    }
    setChecking(false);
  };

  return (
    <div className="career-tracker">
      <Navbar
        user={user}
        onLogout={onLogout}
        onHome={() => navigate(PAGES.HOME)}
        showCompaniesBtn={false}
      />

      <div className="career-tracker__header">
        <div>
          <h1 className="career-tracker__title">📡 Company Tracker</h1>
          <p className="career-tracker__sub">
            Auto-checked daily at <strong>6:30 AM IST</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="career-btn career-btn--success"
            onClick={handleCheckNow}
            disabled={checking}
          >
            {checking ? '⏳ Checking...' : '🔄 Check Now'}
          </button>
          <button
            className="career-btn career-btn--ghost"
            onClick={() => navigate(PAGES.HOME)}
          >
            ← Back
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
                onChange={v => set('name', v)}
                placeholder="e.g. Google, TCS, CEL"
              />

              {/* Type toggle */}
              <div className="career-input-wrap">
                <label className="career-input-label">Company Type</label>
                <div className="career-type-toggle">
                  <button
                    type="button"
                    className={`career-type-btn ${form.type === 'private' ? 'active' : ''}`}
                    onClick={() => set('type', 'private')}
                  >
                    🏢 Private
                  </button>
                  <button
                    type="button"
                    className={`career-type-btn ${form.type === 'govt' ? 'active' : ''}`}
                    onClick={() => set('type', 'govt')}
                  >
                    🏛️ Govt
                  </button>
                </div>
              </div>

              <InputField
                label="Announcement / Jobs Page Link"
                value={form.announceLink}
                onChange={v => set('announceLink', v)}
                placeholder="https://company.com/news"
              />
              <InputField
                label="Career Page Link"
                value={form.careerLink}
                onChange={v => set('careerLink', v)}
                placeholder="https://company.com/careers"
              />
            </div>

            {error   && <div className="career-alert career-alert--error">{error}</div>}
            {success && <div className="career-alert career-alert--success">{success}</div>}

            <button
              className="career-btn career-btn--primary career-btn--full"
              onClick={handleSave}
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Saving...' : '💾 Save Company'}
            </button>
          </div>

          <div className="career-notice">
            <span>📧</span>
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
                : companies.map(c => (
                  <div key={c._id} className="career-company-item">
                    <div className="career-company-item__info">
                      <div className="career-company-item__name">
                        {c.name}
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: c.type === 'govt' ? 'rgba(234,179,8,0.15)' : 'rgba(99,102,241,0.15)',
                          color: c.type === 'govt' ? '#fbbf24' : '#a5b4fc',
                          fontFamily: 'monospace',
                        }}>
                          {c.type === 'govt' ? '🏛️ Govt' : '🏢 Private'}
                        </span>
                      </div>
                      <div className="career-company-item__meta">
                        {c.careerLink
                          ? <a href={c.careerLink} target="_blank" rel="noopener noreferrer" className="career-link">Career Page ↗</a>
                          : 'No career link'}
                        {' · Last checked: '}
                        {c.lastChecked
                          ? new Date(c.lastChecked).toLocaleDateString('en-IN')
                          : 'Never'}
                      </div>
                    </div>
                    <button
                      className="career-btn career-btn--danger-ghost"
                      onClick={() => handleRemove(c._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="career-tracker__right">
          <div className="career-card">
            <h2 className="career-card__title">📬 Latest Updates</h2>
            {updates.length === 0
              ? <div className="career-empty">No updates yet. Click "Check Now" to scan immediately.</div>
              : <div className="career-updates-list">
                  {updates.map((u, i) => <UpdateCard key={i} update={u} />)}
                </div>
            }
          </div>
        </div>

      </div>
    </div>
  );
}