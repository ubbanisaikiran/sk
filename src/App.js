import React, { useState } from 'react';
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

function App() {
  const initialResetIntent = readResetIntent();
  const [showLaunch, setShowLaunch] = useState(() => !initialResetIntent);
  const [showCareer, setShowCareer] = useState(() => Boolean(initialResetIntent));
  const [showAgriStack, setShowAgriStack] = useState(false);
  const [resetIntent, setResetIntent] = useState(() => initialResetIntent);

  const handleResetResolved = () => {
    setResetIntent(null);
    clearCareerQuery();
  };

  const handleExitCareer = () => {
    setShowCareer(false);
    if (resetIntent) handleResetResolved();
  };

  const handleExitAgriStack = () => {
    setShowAgriStack(false);
  };

  if (showAgriStack) {
    return (
      <>
        <div className="career-root">
          <AgriStackChecker />
        </div>
        <button
          onClick={handleExitAgriStack}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 99999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
        >
          {'\u2190'} Portfolio
        </button>
      </>
    );
  }

  if (showCareer) {
    return (
      <>
        <CareerApp
          onExit={handleExitCareer}
          onResetResolved={handleResetResolved}
          resetIntent={resetIntent}
        />
        <button
          onClick={handleExitCareer}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 99999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
        >
          {'\u2190'} Portfolio
        </button>
      </>
    );
  }

  return (
    <div>
      {showLaunch && (
        <Launch
          onPortfolio={() => setShowLaunch(false)}
          onAgriStack={() => {
            setShowLaunch(false);
            setShowCareer(false);
            setShowAgriStack(true);
          }}
          onCareer={() => {
            setShowLaunch(false);
            setShowAgriStack(false);
            setShowCareer(true);
          }}
        />
      )}

      <Navbar />

      <div
        style={{
          position: 'fixed',
          top: '100px',
          right: '32px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <button
          onClick={() => {
            setShowLaunch(false);
            setShowAgriStack(false);
            setShowCareer(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 0 24px rgba(99,102,241,0.5)',
          }}
        >
          {'\u26A1'} Career Upgrade
        </button>

        <button
          onClick={() => {
            setShowLaunch(false);
            setShowCareer(false);
            setShowAgriStack(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 0 24px rgba(34,197,94,0.35)',
          }}
        >
          TS Agri Stack
        </button>
      </div>

      <div id="home"><Home /></div>
      <div id="about"><About /></div>
      <div id="skills"><Skills /></div>
      <div id="Education"><Education /></div>
      <div id="projects"><Projects /></div>
      <div id="contact"><Contact /></div>
      <div id="Footer"><Footer /></div>
    </div>
  );
}

export default App;
