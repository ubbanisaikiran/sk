import React, { useState } from "react";
import "../styles/Projects.css";
import Projectdata from "../data/project";

const Project = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const visibleProjects = showAll ? Projectdata : Projectdata.slice(0, 6);

  return (
    <section className="project-section" id="portfolio">
      <h2 className="project-title">
        My <span>Projects</span>
      </h2>

      <div className="project-grid">
        {visibleProjects.map((project, index) => (
          <div
            key={index}
            className={`project-card ${activeIndex === index ? "active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            {/* <img src={project.image} alt={`Project ${index}`} className="project-image" /> */}
            <div className="project-info">
              <h3 className="project-caption">{project.caption}</h3>
              <p className="project-time">{project.Time}</p>
              <p className="project-desc">{project.Des}</p>
            </div>
          </div>
        ))}
      </div>

      {!showAll && (
        <button className="show-more-btn" onClick={() => setShowAll(true)}>
          Show More →
        </button>
      )}
    </section>
  );
};

export default Project;
