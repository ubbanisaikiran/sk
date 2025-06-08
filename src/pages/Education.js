import React from 'react';
import { education } from '../data/education';

function Education() {
  return (
    <section>
      <h2>Education</h2>
      <ul>
        {education.map((edu, index) => (
          <li key={index}>
            <h3>{edu.institution}</h3>
            <p>{edu.degree} - {edu.year}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Education;
