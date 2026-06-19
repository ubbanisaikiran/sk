import React, { useEffect, useState } from 'react';
import '../styles/Skills.css';
import codeing from '../assets/coding.jpg';
import analze from '../assets/analyze.jpg';
import design from '../assets/design.jpg';
import operate from '../assets/operate.jpg';

const skillAreas = [
  {
    name: 'Build',
    description: 'The tools I use to turn ideas into products, interfaces, and functioning workflows.',
    tools: ['React', 'React Native', 'JavaScript', 'SQL', 'Python', 'C++'],
    outcomes: ['Frontend experiences', 'Internal tools', 'Operational workflows'],
    image : codeing,
  },
  {
    name: 'Analyze',
    description: 'The systems and thinking styles I rely on when the problem is not fully clear yet.',
    tools: ['Excel', 'Power BI', 'Data analysis', 'Research synthesis', 'Consumer insights'],
    outcomes: ['Decision support', 'Pattern finding', 'Clearer business framing'],
    image : analze,
  },
  {
    name: 'Design',
    description: 'The creative layer I use to make ideas easier to understand, trust, and adopt.',
    tools: ['Figma', 'Canva', 'Adobe Creative Suite', 'UI thinking'],
    outcomes: ['Visual communication', 'Interface direction', 'Sharper storytelling'],
    image : design,
  },
  {
    name: 'Operate',
    description: 'The way I connect planning, delivery, and communication so work actually moves.',
    tools: ['Jira', 'Git', 'SDLC', 'Business planning', 'Cross-functional coordination'],
    outcomes: ['Execution clarity', 'Prioritization', 'More reliable delivery'],
    image : operate,
  },
];

const certifications = ['Lean Six Sigma Green Belt - KPMG', 'Digital Marketing - Google'];

const Skills = () => {
  const [activeArea, setActiveArea] = useState(0);
  const [pauseUntil, setPauseUntil] = useState(0);
  const currentArea = skillAreas[activeArea];

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntil) {
        return;
      }

      setActiveArea((currentIndex) => (currentIndex + 1) % skillAreas.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [pauseUntil]);

  const handleAreaSelect = (index) => {
    setActiveArea(index);
    setPauseUntil(Date.now() + 60000);
  };

  return (
    <section className="skills-section" id="skills">
      <div className="skills-header">
        <p className="section-kicker">Skills and tools</p>
        <h2 className="skills-title">I use the right tools for the problem in front of me.</h2>
      </div>

      <div className="skills-layout">
        <div className="skills-selector">
          {skillAreas.map((area, index) => (
            <button
              key={area.name}
              className={`skills-selector-card ${activeArea === index ? 'is-active' : ''}`}
              onClick={() => handleAreaSelect(index)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{area.name}</strong>
              <p>{area.description}</p>
            </button>
          ))}
        </div>

        <div className="skills-slider-panel" key={currentArea.name}>
          <div className="skills-image-card skills-image-card--hero">
            <img src={currentArea.image} alt="Skills visual" />
            <div className="skills-slide-indicator">
              <span>{currentArea.name}</span>
              <strong>{String(activeArea + 1).padStart(2, '0')} / {String(skillAreas.length).padStart(2, '0')}</strong>
            </div>
          </div>

          <div className="skills-detail-card skills-detail-card--compact">
            <span>{currentArea.name}</span>
            <h3>{currentArea.description}</h3>

            <div className="skills-chip-cloud">
              {currentArea.tools.map((tool) => (
                <span key={tool}>{tool}</span>
              ))}
            </div>

            <div className="skills-outcome-list">
              {currentArea.outcomes.map((outcome) => (
                <div key={outcome}>
                  <strong>{outcome}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="skills-cert-strip">
        <p>Certifications</p>
        <div>
          {certifications.map((certification) => (
            <span key={certification}>{certification}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
