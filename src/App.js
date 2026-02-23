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

function App() {
  const [showCareer, setShowCareer] = useState(false);

  if (showCareer) {
    return <CareerApp onExit={() => setShowCareer(false)} />;
  }

  return (
    <div>
      <Navbar />

      {/* Career Upstep Button — floating fixed button */}
      <button
        onClick={() => setShowCareer(true)}
        style={{
          position: 'fixed',
          top: '100px',
          right: '50px',
          zIndex: 9999,
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
        ⚡ Career Upstep
      </button>

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