import React from 'react';

export default function JobCard({ job }) {
  return (
    <div className="career-job-card">
      <div className="career-job-card__header">
        <div className="career-job-card__logo-wrap">
          <div className="career-job-card__logo">{job.logo}</div>
          <div>
            <div className="career-job-card__title">{job.title}</div>
            <div className="career-job-card__company">{job.company}</div>
          </div>
        </div>
        <span className={`career-job-card__badge career-job-card__badge--${job.type}`}>
          {job.type}
        </span>
      </div>

      <div className="career-job-card__meta">
        <span>📍 {job.location}</span>
        <span>💰 {job.salary}</span>
        <span>🕒 {job.posted}</span>
      </div>

      
        <a href={job.link}
        target="_blank"
        rel="noopener noreferrer"
        className="career-btn career-btn--primary career-job-card__apply">
        Apply Now →
      </a>
    </div>
  );
}