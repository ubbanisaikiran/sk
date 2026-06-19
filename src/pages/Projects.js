import React, { useState } from 'react';
import '../styles/Projects.css';
import projectData from '../data/project';

const Project = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredProject = projectData[activeIndex];

  return (
    <section className="project-section" id="projects">
      <div className="project-header">
        <p className="section-kicker">Projects and live builds</p>
        <h2 className="project-title">A mix of products, tools, and practical ideas that show how I think through problems.</h2>
      </div>

      <div className="project-feature">
        <div className="project-feature-media">
          <img src={featuredProject.image} alt={featuredProject.title} />
        </div>
        <div className="project-feature-copy">
          <span>{featuredProject.type}</span>
          <h3>{featuredProject.title}</h3>
          <p className="project-time">{featuredProject.period}</p>
          <p className="project-desc">{featuredProject.description}</p>
          <strong>{featuredProject.impact}</strong>

          <div className="project-tags">
            {featuredProject.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="project-grid">
        {projectData.map((project, index) => (
          <button
            key={project.title}
            className={`project-card ${activeIndex === index ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <div className="project-card-image">
              <img src={project.image} alt={project.title} />
            </div>
            <div className="project-info">
              <span>{project.type}</span>
              <h3 className="project-caption">{project.title}</h3>
              <p className="project-time">{project.period}</p>
              <p className="project-desc">{project.impact}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Project;
