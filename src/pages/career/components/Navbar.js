import React from 'react';

export default function Navbar({ user, onLogout, onHome, onCompanies, showCompaniesBtn = true }) {
  return (
    <nav className="career-nav">
      <div className="career-nav__brand" onClick={onHome} style={{ cursor: 'pointer' }}>
        <div className="career-nav__logo">⚡</div>
        <span className="career-nav__title">Career Upstep</span>
      </div>

      <div className="career-nav__actions">
        {showCompaniesBtn && (
          <button className="career-btn career-btn--outline" onClick={onCompanies}>
            📡 Track Companies
          </button>
        )}

        <div className="career-nav__user">
          <div className="career-nav__avatar">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="career-nav__username">
            {user?.name?.split(' ')[0]}
          </span>
        </div>

        <button className="career-btn career-btn--ghost" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}