import React from 'react';
import '../styles/About.css';

function About() {
  return (
    <section id="about" className="about-section">
      <h2 className="section-title">About <span>me</span></h2>

      <div className="about-content">
        <div className="about-image">
          <img src="/profile.jpg" alt="Profile" />
        </div>

        <div className="about-text">
          <p>
          I’m Sai Kiran Ubbani, a software engineer turned business professional, with a knack for solving real-world problems using a fusion of technology and strategy.          </p>
          <p>
          I started my journey in tech, working as a Software Engineer where I built mobile applications using React Native. Later, I ventured into marketing through an internship that sparked my interest in consumer behavior, branding, and strategy.           </p>
           <p>
           Whether it's building intuitive user interfaces or drafting go-to-market strategies, I strive to bring purpose and precision to every project I take on.
           </p>

          <div className="skills">
            <div className="skill">
              <span>Business Planning & SDLC</span>
              <div className="bar"><div style={{ width: '90%' }}></div></div>
            </div>
            <div className="skill">
              <span>SQL & Excel</span>
              <div className="bar"><div style={{ width: '80%' }}></div></div>
            </div>
            <div className="skill">
              <span>JavaScript</span>
              <div className="bar"><div style={{ width: '95%' }}></div></div>
            </div>
            <div className="skill">
              <span>React Native & React JS</span>
              <div className="bar"><div style={{ width: '85%' }}></div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats">
        <div><span className="number">🔧 - 1+ Years in Software Development</span></div>
        <div><span className="number">🎓 - Dual Degrees in Engineering + MBA</span></div>
        <div><span className="number">🚀 - 3+ Major Tech Projects Deployed</span></div>
      </div>
    </section>
  );
}

export default About;
