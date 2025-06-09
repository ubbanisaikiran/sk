import React from "react";
import "../styles/Skills.css";

const Skills = () => {
  return (
    <section className="skills-section" id="skills">
      <h2 className="skills-title">
        Skills & <span>Tools</span>
      </h2>
      <p className="skills-subtext">Here’s what I bring to the table:</p>

      <div className="skills-grid">
        <div className="skill-box">
          <h3>Programming & Tech</h3>
          <p>C++, JavaScript, Python, React Native, SQL</p>
        </div>

        <div className="skill-box">
          <h3>Tools I Use</h3>
          <p>Power BI, Git, Jira, Android Studio</p>
        </div>

        <div className="skill-box">
          <h3>Design & Creativity</h3>
          <p>Figma, Canva, Adobe Creative Suite</p>
        </div>

        <div className="skill-box">
          <h3>Business & Strategy</h3>
          <p>Data Analysis, Market Research, Campaign Planning</p>
        </div>

        <div className="skill-box certifications">
          <h3>Certifications</h3>
          <ul>
            <li>Lean Six Sigma Green Belt – KPMG</li>
            <li>Digital Marketing – Google</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Skills;
