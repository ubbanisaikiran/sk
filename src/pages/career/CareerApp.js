import React, { useState, useEffect } from 'react';
import Auth from './Auth';
import Home from './Home';
import CompanyTracker from './CompanyTracker';
import './career.css';

const PAGES = {
  AUTH: 'auth',
  HOME: 'home',
  COMPANIES: 'companies',
};

export default function CareerApp({ onExit }) {
  const [page, setPage] = useState(PAGES.AUTH);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sk_career_token');
    const savedUser = localStorage.getItem('sk_career_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setPage(PAGES.HOME);
      } catch {
        localStorage.removeItem('sk_career_token');
        localStorage.removeItem('sk_career_user');
      }
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('sk_career_token', token);
    localStorage.setItem('sk_career_user', JSON.stringify(userData));
    setUser(userData);
    setPage(PAGES.HOME);
  };

  const handleLogout = () => {
    localStorage.removeItem('sk_career_token');
    localStorage.removeItem('sk_career_user');
    setUser(null);
    setPage(PAGES.AUTH);
  };

  const navigate = (target) => setPage(target);
  const pageProps = { user, onLogout: handleLogout, navigate, PAGES };

  return (
    <div className="career-root">
      {page === PAGES.AUTH && <Auth onLogin={handleLogin} onBack={onExit} />}
      {page === PAGES.HOME && <Home {...pageProps} />}
      {page === PAGES.COMPANIES && <CompanyTracker {...pageProps} />}
    </div>
  );
}