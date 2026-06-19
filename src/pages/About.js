import React, { useEffect, useState } from 'react';
import '../styles/About.css';
import about from '../assets/about.png';
import about1 from '../assets/about1.svg';
import about2 from '../assets/about2.png';
const roleStories = [
  {
    label: 'Engineer',
    title: 'I like building things that remove friction.',
    description:
      'My software background trained me to think in systems, edge cases, and user workflows instead of abstract ideas alone.',
    points: ['Frontend and product flows', 'Operational tooling mindset', 'Comfort with technical detail'],
    image: about,
  },
  {
    label: 'Strategist',
    title: 'I care about why the solution matters, not only how it works.',
    description:
      'My MBA journey sharpened my interest in positioning, decision-making, market context, and the value behind execution.',
    points: ['Business framing', 'Customer and market context', 'Prioritization with outcomes in mind'],
    image: about1,
  },
  {
    label: 'Integrator',
    title: 'I bridge technical thinking with practical execution.',
    description:
      'I work best where different functions need one person who can connect the dots, simplify complexity, and keep momentum moving.',
    points: ['Cross-functional communication', 'Problem decomposition', 'Actionable execution plans'],
    image: about2,
  },
];

function About() {
  const [activeRole, setActiveRole] = useState(0);
  const [pauseUntil, setPauseUntil] = useState(0);
  const currentRole = roleStories[activeRole];

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntil) {
        return;
      }

      setActiveRole((currentIndex) => (currentIndex + 1) % roleStories.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [pauseUntil]);

  const handleRoleSelect = (index) => {
    setActiveRole(index);
    setPauseUntil(Date.now() + 60000);
  };

  return (
    <section id="about" className="about-section">
      <div className="about-heading">
        <p className="section-kicker">About me</p>
        <h2 className="section-title">
          I grew from software execution into a broader problem-solving role that blends
          technology, business judgment, and delivery.
        </h2>
      </div>

      <div className="about-story-grid">
        <div className="about-left-column">
          <p className="about-intro">
            I&apos;m Sai Kiran Ubbani, a builder who enjoys turning messy problems into
            clear product decisions. I started in software, expanded into business
            thinking, and now like work that asks for both structure and empathy.
          </p>

          <div className="about-role-switcher">
            {roleStories.map((role, index) => (
              <button
                key={role.label}
                className={`about-role-card ${activeRole === index ? 'is-active' : ''}`}
                onClick={() => handleRoleSelect(index)}
                type="button"
              >
                <span>{role.label}</span>
                <strong>{role.title}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="about-right-column">
          <div className="about-slider-panel" key={currentRole.label}>
            <div className="about-image-panel about-image-panel--hero">
              <img src={currentRole.image} alt={currentRole.label} />
              <div className="about-slide-indicator">
                <span>{currentRole.label}</span>
                <strong>
                  {String(activeRole + 1).padStart(2, '0')} / {String(roleStories.length).padStart(2, '0')}
                </strong>
              </div>
            </div>
            <div className="about-detail-panel about-detail-panel--compact">
              <span className="about-detail-label">{currentRole.label}</span>
              <h3>{currentRole.title}</h3>
              <p>{currentRole.description}</p>
              <ul>
                {currentRole.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="about-metrics">
        <div>
          <strong>3+ years</strong>
          <span>software development experience</span>
        </div>
        <div>
          <strong>2 disciplines</strong>
          <span>engineering and MBA-informed business thinking</span>
        </div>
        <div>
          <strong>Multi modes</strong>
          <span>Marketing, Operations, Web & App development, and strategic problem solving</span>
        </div>
      </div>
    </section>
  );
}

export default About;
