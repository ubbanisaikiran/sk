import React, { useEffect, useState } from 'react';
import '../styles/Education.css';
import mba from '../assets/mba-pg.jpg';
import btech from '../assets/btech.jpg';
import inter from '../assets/inter.jpg';
import ssc from '../assets/ssc.jpg';

const EducationData = [
  {
    id: 1,
    year: '2023 - 2025',
    title: 'MBA General',
    description: 'Indian Institute of Technology (ISM), Dhanbad',
    cgpa: 'CGPA 7.53',
    note: 'Expanded my thinking around strategy, markets, and decision-making.',
    image: mba,
  },
  {
    id: 2,
    year: '2017 - 2021',
    title: 'B.Tech Computer Engineering',
    description: 'IIITDM Kancheepuram',
    cgpa: 'CGPA 6.78',
    note: 'Built the technical base that shaped my systems-oriented mindset.',
    image: btech,
  },
  {
    id: 3,
    year: '2015 - 2017',
    title: 'Intermediate MPC',
    description: 'Narayana Junior College, Hyderabad',
    cgpa: 'Percentage 92.3%',
    note: 'Developed discipline, consistency, and analytical comfort early on.',
    image: inter,
  },
  {
    id: 4,
    year: '2014 - 2015',
    title: 'SSC',
    description: 'Shivani High School, Telangana State Board',
    cgpa: 'GPA 9.5',
    note: 'A strong academic foundation that kept curiosity and ambition active.',
    image: ssc,
  },
];

const Education = () => {
  const [activeId, setActiveId] = useState(1);
  const [pauseUntil, setPauseUntil] = useState(0);
  const activeEducation = EducationData.find((item) => item.id === activeId) || EducationData[0];

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntil) {
        return;
      }

      setActiveId((currentId) => {
        const currentIndex = EducationData.findIndex((item) => item.id === currentId);
        const nextIndex = (currentIndex + 1) % EducationData.length;
        return EducationData[nextIndex].id;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [pauseUntil]);

  const handleEducationSelect = (id) => {
    setActiveId(id);
    setPauseUntil(Date.now() + 60000);
  };

  return (
    <section className="Education-section" id="Education">
      <div className="education-header">
        <p className="section-kicker">Education</p>
        <h2 className="Education-title">My academic path gave me technical grounding and a business lens.</h2>
      </div>

      <div className="Education-grid">
        <div className="education-timeline">
          {EducationData.map((item) => (
            <button
              key={item.id}
              className={`education-step ${activeId === item.id ? 'active' : ''}`}
              onClick={() => handleEducationSelect(item.id)}
              type="button"
            >
              <span className="service-number">{item.year}</span>
              <h3 className="service-title">{item.title}</h3>
              <p className="service-description">{item.description}</p>
              <p className="service-read">{item.cgpa}</p>
            </button>
          ))}
        </div>

        <div className="education-slider-panel" key={activeEducation.id}>
          <div className="education-spotlight-image education-spotlight-image--hero">
            <img src={activeEducation.image} alt="Education visual" />
            <div className="education-slide-indicator">
              <span>{activeEducation.year}</span>
              <strong>{String(EducationData.findIndex((item) => item.id === activeId) + 1).padStart(2, '0')} / {String(EducationData.length).padStart(2, '0')}</strong>
            </div>
          </div>

          <div className="education-spotlight-copy education-spotlight-copy--compact">
            <span>{activeEducation.year}</span>
            <h3>{activeEducation.title}</h3>
            <p>{activeEducation.description}</p>
            <strong>{activeEducation.cgpa}</strong>
            <p>{activeEducation.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Education;
