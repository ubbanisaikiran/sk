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
import Launch from './pages/Launch';

function App() {
  const [showLaunch, setShowLaunch] = useState(true);
  const [showCareer, setShowCareer] = useState(false);

  // Career view
  if (showCareer) {
    return (
      <>
        <CareerApp onExit={() => setShowCareer(false)} />
        {/* Back to Portfolio button — always visible in career */}
        <button
          onClick={() => setShowCareer(false)}
          style={{
            position: 'fixed', bottom: '24px', left: '24px', zIndex: 99999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '10px 20px',
            borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
            fontWeight: 700, backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
        >
          ← Portfolio
        </button>
      </>
    );
  }

  // Portfolio view
  return (
    <div>
      {/* Launch popup */}
      {showLaunch && (
        <Launch
          onPortfolio={() => setShowLaunch(false)}
          onCareer={() => { setShowLaunch(false); setShowCareer(true); }}
        />
      )}

      <Navbar />

      {/* Career Upgrade button — always visible on portfolio */}
      <button
        onClick={() => setShowCareer(true)}
        style={{
          position: 'fixed', top: '100px', right: '60px', zIndex: 9999,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', color: '#fff', padding: '10px 20px',
          borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
          fontWeight: 700, boxShadow: '0 0 24px rgba(99,102,241,0.5)',
        }}
      >
        ⚡ Career Upgrade     </button>

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