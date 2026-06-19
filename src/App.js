import React, { useEffect, useState } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Education from './pages/Education';
import Projects from './pages/Projects';
import Skills from './pages/Skills';
import Footer from './components/Footer';
import CareerApp from './pages/career/CareerApp';
import AgriStackChecker from './pages/career/AgriStackChecker';
import CustomRequest from './pages/CustomRequest';
import Launch from './pages/Launch';

const readResetIntent = () => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (params.get('career') !== 'reset' || !token) return null;

  return {
    token,
    email: params.get('email') || '',
  };
};

const clearCareerQuery = () => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  ['career', 'token', 'email'].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
};

function FloatingBackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="app-back-button"
      type="button"
    >
      {'\u2190'} Portfolio
    </button>
  );
}

function ServiceRail({ onCareer, onAgriStack, onCustomRequest }) {
  return (
    <div className="app-service-rail">
      <button
        onClick={onCareer}
        className="app-service-rail__button app-service-rail__button--career"
        type="button"
      >
        <span>⚡</span>
        Career Upgrade
      </button>

      <button
        onClick={onAgriStack}
        className="app-service-rail__button app-service-rail__button--agri"
        type="button"
      >
        <span>🌾</span>
        TS Agri Stack
      </button>

      <button
        onClick={onCustomRequest}
        className="app-service-rail__button app-service-rail__button--custom"
        type="button"
      >
        <span>✦</span>
        Custom Build
      </button>
    </div>
  );
}

function PortfolioLayout({ showLaunch, setShowLaunch, onCareer, onAgriStack, onCustomRequest }) {
  const location = useLocation();

  return (
    <div className="app-shell">
      {showLaunch && location.pathname === '/' && (
        <Launch
          onPortfolio={() => setShowLaunch(false)}
          onAgriStack={onAgriStack}
          onCareer={onCareer}
          onCustomRequest={onCustomRequest}
        />
      )}

      <Navbar />
      <ServiceRail
        onCareer={onCareer}
        onAgriStack={onAgriStack}
        onCustomRequest={onCustomRequest}
      />
      <Outlet />
      <Footer />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [resetIntent, setResetIntent] = useState(() => readResetIntent());
  const [showLaunch, setShowLaunch] = useState(() => !readResetIntent());

  useEffect(() => {
    if (resetIntent && location.pathname !== '/career') {
      navigate('/career', { replace: true });
    }
  }, [location.pathname, navigate, resetIntent]);

  const handleResetResolved = () => {
    setResetIntent(null);
    clearCareerQuery();
  };

  const openPortfolio = () => {
    setShowLaunch(false);
    navigate('/');
  };

  const openCareer = () => {
    setShowLaunch(false);
    navigate('/career');
  };

  const openAgriStack = () => {
    setShowLaunch(false);
    navigate('/agri-stack');
  };

  const openCustomRequest = () => {
    setShowLaunch(false);
    navigate('/custom-request');
  };

  return (
    <Routes>
      <Route
        element={(
          <PortfolioLayout
            showLaunch={showLaunch}
            setShowLaunch={setShowLaunch}
            onCareer={openCareer}
            onAgriStack={openAgriStack}
            onCustomRequest={openCustomRequest}
          />
        )}
      >
        <Route
          path="/"
          element={(
            <Home
              onCareer={openCareer}
              onAgriStack={openAgriStack}
              onCustomRequest={openCustomRequest}
            />
          )}
        />
        <Route path="/about" element={<About />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/education" element={<Education />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route
        path="/career"
        element={(
          <>
            <CareerApp
              onExit={openPortfolio}
              onResetResolved={handleResetResolved}
              resetIntent={resetIntent}
            />
            <FloatingBackButton onClick={openPortfolio} />
          </>
        )}
      />
      <Route
        path="/agri-stack"
        element={(
          <>
            <div className="career-root">
              <AgriStackChecker />
            </div>
            <FloatingBackButton onClick={openPortfolio} />
          </>
        )}
      />
      <Route
        path="/custom-request"
        element={<CustomRequest onBack={openPortfolio} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

export default App;

