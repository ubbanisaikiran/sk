import React, { useEffect, useState } from 'react';
import Auth from './Auth';
import Home from './Home';
import CompanyTracker from './CompanyTracker';
import './career.css';

const PAGES = {
  AUTH: 'auth',
  HOME: 'home',
  COMPANIES: 'companies',
};

export default function CareerApp({ onExit, resetIntent, onResetResolved }) {
  const [page, setPage] = useState(PAGES.AUTH);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (resetIntent?.token) {
      setUser(null);
      setPage(PAGES.AUTH);
      return;
    }

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
  }, [resetIntent]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('sk_career_token', token);
    localStorage.setItem('sk_career_user', JSON.stringify(userData));
    setUser(userData);
    setPage(PAGES.HOME);
    if (onResetResolved) onResetResolved();
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
      {page === PAGES.AUTH && (
        <Auth
          onBack={onExit}
          onLogin={handleLogin}
          onResetResolved={onResetResolved}
          resetIntent={resetIntent}
        />
      )}
      {page === PAGES.HOME && <Home {...pageProps} />}
      {page === PAGES.COMPANIES && <CompanyTracker {...pageProps} />}
    </div>
  );
}
