import React, { useState } from "react";
import '../styles/Education.css';

const EducationData = [
  { id: 1, year: "2023 - 2025", title: "MBA General", description: "Indian Institute of Technology (ISM)- Dhanbad",cgpa: "CGPA:- 7.53" },
  { id: 2,year: "2017 - 2021", title: "B.Tech ComputerEngineering", description: "Indian Institute Information Technology Design & Manufacturing - Kancheepuram",cgpa: "CGPA:- 6.78"  },
  { id: 3,year: "2015 - 2017", title: "Intermediate M.P.C", description: "Narayana Junior College, Hyderabad - BIE Telangana",cgpa: "Percentage:- 92.3%" },
  { id: 4,year: "2024 - 2015", title: "SSC", description: "Shivani High School, Wardhnnapet- Telangana State Board",cgpa: "GPA:- 9.5" },
];

const Education = () => {
  const [activeId, setActiveId] = useState(null);

  return (
    <section className="Education-section">
      <h2 className="Education-title">My <span>Education</span></h2>
      <div className="Education-grid">
        {EducationData.map((service, index) => (
          <div
            key={service.id}
            className={`service-card ${activeId === service.id ? "active" : ""}`}
            onClick={() => setActiveId(service.id)}
          >
            <p className="service-number">{service.year}</p>
            <h3 className="service-title">
              <span className="highlight">{service.title.split(" ")[0]}</span> <br />{service.title.split(" ")[1]}
            </h3>
            <p className="service-description">{service.description}</p>
            <p className="service-read">{service.cgpa}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Education;
