import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import UpdateCard from './components/UpdateCard';
import { companyAPI } from './services/api';

const TABS = ['Current Openings', 'Private', 'Govt', 'Review'];

export default function Home({ user, onLogout, navigate, PAGES }) {
  const [activeTab, setActiveTab] = useState('Current Openings');
  const [search, setSearch] = useState('');
  const [updates, setUpdates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([companyAPI.getUpdates(), companyAPI.getAll()])
      .then(([u, c]) => {
        setUpdates(u.updates || []);
        setCompanies(c.companies || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

const filtered = useMemo(() => {
  let list = updates;

  if (activeTab === 'Review') {
    // Show only applied + thinking
    list = list.filter(u => u.status === 'applied' || u.status === 'thinking');
  } else {
    // Hide applied from all other tabs
    list = list.filter(u => u.status !== 'applied');

    if (activeTab === 'Private') list = list.filter(u => u.type === 'private');
    if (activeTab === 'Govt')    list = list.filter(u => u.type === 'govt');
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(u =>
      u.company?.toLowerCase().includes(q) ||
      u.title?.toLowerCase().includes(q) ||
      u.description?.toLowerCase().includes(q)
    );
  }

  return list;
}, [updates, activeTab, search]);

  const noCompanies = !loading && companies.length === 0;
  const noUpdates   = !loading && companies.length > 0 && updates.length === 0;

  return (
    <div className="career-home">
      <Navbar
        user={user}
        onLogout={onLogout}
        onHome={() => {}}
        onCompanies={() => navigate(PAGES.COMPANIES)}
      />

      {/* Hero */}
      <section className="career-hero">
        <h1 className="career-hero__title">
          Find Your Next <span className="career-hero__accent">Opportunity</span>
        </h1>
        <p className="career-hero__sub">
          Updates from your tracked companies · Daily alerts at 6:30 AM
        </p>
        <SearchBar value={search} onChange={(val) => setSearch(val)} />
      </section>

      {/* No companies yet */}
      {noCompanies && (
        <div className="career-empty-state">
          <div className="career-empty-state__icon">📡</div>
          <h2 className="career-empty-state__title">No companies tracked yet</h2>
          <p className="career-empty-state__desc">
            Add your wishlist companies and we'll track all their job openings in one place.
            You'll also get a daily email at <strong>6:30 AM</strong> with new updates.
          </p>
          <button
            className="career-btn career-btn--primary"
            onClick={() => navigate(PAGES.COMPANIES)}
          >
            📡 Add Your First Company →
          </button>
        </div>
      )}

      {/* Has companies but no updates yet */}
      {noUpdates && (
        <div className="career-empty-state">
          <div className="career-empty-state__icon">⏳</div>
          <h2 className="career-empty-state__title">Checking your companies...</h2>
          <p className="career-empty-state__desc">
            You have <strong>{companies.length}</strong> compan{companies.length === 1 ? 'y' : 'ies'} tracked.
            No openings detected yet. Click "Check Now" in the tracker to scan immediately.
          </p>
          <button
            className="career-btn career-btn--outline"
            onClick={() => navigate(PAGES.COMPANIES)}
          >
            🔄 Go to Tracker →
          </button>
        </div>
      )}

      {/* Tabs + Updates */}
      {!noCompanies && updates.length > 0 && (
        <section className="career-jobs">
          <div className="career-tabs">
{TABS.map(tab => (
  <button
    key={tab}
    className={`career-tab ${activeTab === tab ? 'active' : ''}`}
    onClick={() => setActiveTab(tab)}
  >
    {tab}
    <span className="career-tab__count">
      {tab === 'Current Openings' && updates.filter(u => u.status === 'fresh').length}
      {tab === 'Private' && updates.filter(u => u.type === 'private' && u.status !== 'applied').length}
      {tab === 'Govt'    && updates.filter(u => u.type === 'govt'    && u.status !== 'applied').length}
      {tab === 'Review'  && updates.filter(u => u.status === 'applied' || u.status === 'thinking').length}
    </span>
  </button>
))}
          </div>

          {/* Stats row */}
          <div className="career-stats">
            <div className="career-stat">
              <span className="career-stat__num">{companies.length}</span>
              <span className="career-stat__label">Companies Tracked</span>
            </div>
            <div className="career-stat">
              <span className="career-stat__num">{updates.length}</span>
              <span className="career-stat__label">Total Updates</span>
            </div>
            <div className="career-stat">
              <span className="career-stat__num">
                {updates.filter(u => {
                  const age = Date.now() - new Date(u.detectedAt).getTime();
                  return age < 24 * 60 * 60 * 1000;
                }).length}
              </span>
              <span className="career-stat__label">New Today</span>
            </div>
          </div>

          {/* Updates Grid */}
          <div className="career-jobs__grid">
            {filtered.length === 0
              ? <div className="career-jobs__empty">No updates match your search.</div>
              : filtered.map((u, i) => <UpdateCard key={i} update={u} />)
            }
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="career-empty-state">
          <div className="career-empty-state__icon">⚡</div>
          <p className="career-empty-state__desc">Loading your updates...</p>
        </div>
      )}
    </div>
  );
}