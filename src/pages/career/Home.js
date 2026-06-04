import React, { useEffect, useMemo, useState } from 'react';
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
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([companyAPI.getUpdates(), companyAPI.getAll()])
      .then(([updatesResponse, companiesResponse]) => {
        setUpdates(updatesResponse.updates || []);
        setCompanies(companiesResponse.companies || []);
      })
      .catch((err) => setError(err.message || 'Unable to load your updates right now.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (updateId, nextStatus) => {
    setUpdates((current) => current.map((update) => (
      update._id === updateId ? { ...update, status: nextStatus } : update
    )));
  };

  const filtered = useMemo(() => {
    let list = updates;

    if (activeTab === 'Review') {
      list = list.filter((update) => update.status === 'applied' || update.status === 'thinking');
    } else {
      list = list.filter((update) => update.status === 'fresh');

      if (activeTab === 'Private') list = list.filter((update) => update.type === 'private');
      if (activeTab === 'Govt') list = list.filter((update) => update.type === 'govt');
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((update) =>
        update.company?.toLowerCase().includes(query) ||
        update.title?.toLowerCase().includes(query) ||
        update.description?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [updates, activeTab, search]);

  const noCompanies = !loading && companies.length === 0;
  const noUpdates = !loading && companies.length > 0 && updates.length === 0;

  return (
    <div className="career-home">
      <Navbar
        user={user}
        onHome={() => {}}
        onLogout={onLogout}
        onCompanies={() => navigate(PAGES.COMPANIES)}
      />

      <section className="career-hero">
        <h1 className="career-hero__title">
          Find Your Next <span className="career-hero__accent">Opportunity</span>
        </h1>
        <p className="career-hero__sub">
          Updates from your tracked companies {'\u00B7'} Daily alerts at 6:30 AM
        </p>
        <SearchBar value={search} onChange={(value) => setSearch(value)} />
      </section>

      {error && <div className="career-alert career-alert--error">{error}</div>}

      {noCompanies && (
        <div className="career-empty-state">
          <div className="career-empty-state__icon">{'\u{1F4E1}'}</div>
          <h2 className="career-empty-state__title">No companies tracked yet</h2>
          <p className="career-empty-state__desc">
            Add your wishlist companies and we&apos;ll track all their job openings in one place.
            You&apos;ll also get a daily email at <strong>6:30 AM</strong> with new updates.
          </p>
          <button
            className="career-btn career-btn--primary"
            onClick={() => navigate(PAGES.COMPANIES)}
          >
            {'\u{1F4E1}'} Add Your First Company {'\u2192'}
          </button>
        </div>
      )}

      {noUpdates && (
        <div className="career-empty-state">
          <div className="career-empty-state__icon">{'\u23F3'}</div>
          <h2 className="career-empty-state__title">Checking your companies...</h2>
          <p className="career-empty-state__desc">
            You have <strong>{companies.length}</strong> compan{companies.length === 1 ? 'y' : 'ies'} tracked.
            No openings detected yet. Click "Check Now" in the tracker to scan immediately.
          </p>
          <button
            className="career-btn career-btn--outline"
            onClick={() => navigate(PAGES.COMPANIES)}
          >
            {'\u{1F504}'} Go to Tracker {'\u2192'}
          </button>
        </div>
      )}

      {!noCompanies && updates.length > 0 && (
        <section className="career-jobs">
          <div className="career-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`career-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                <span className="career-tab__count">
                  {tab === 'Current Openings' && updates.filter((update) => update.status === 'fresh').length}
                  {tab === 'Private' && updates.filter((update) => update.type === 'private' && update.status === 'fresh').length}
                  {tab === 'Govt' && updates.filter((update) => update.type === 'govt' && update.status === 'fresh').length}
                  {tab === 'Review' && updates.filter((update) => update.status === 'applied' || update.status === 'thinking').length}
                </span>
              </button>
            ))}
          </div>

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
                {updates.filter((update) => {
                  const age = Date.now() - new Date(update.detectedAt).getTime();
                  return age < 24 * 60 * 60 * 1000;
                }).length}
              </span>
              <span className="career-stat__label">New Today</span>
            </div>
          </div>

          <div className="career-jobs__grid">
            {filtered.length === 0
              ? <div className="career-jobs__empty">No updates match your search.</div>
              : filtered.map((update) => (
                <UpdateCard
                  key={update._id || `${update.company}-${update.title}`}
                  onStatusChange={handleStatusChange}
                  update={update}
                />
              ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="career-empty-state">
          <div className="career-empty-state__icon">{'\u26A1'}</div>
          <p className="career-empty-state__desc">Loading your updates...</p>
        </div>
      )}
    </div>
  );
}
