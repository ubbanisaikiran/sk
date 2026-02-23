import React, { useState } from 'react';
import { companyAPI } from '../services/api';

export default function UpdateCard({ update, onStatusChange }) {
  const [status, setStatus] = useState(update.status || 'fresh');
  const [saving, setSaving] = useState(false);

  const handleStatus = async (newStatus) => {
    if (!update.companyId || !update._id) return;
    setSaving(true);
    try {
      await companyAPI.updateJobStatus(update.companyId, update._id, newStatus);
      setStatus(newStatus);
      if (onStatusChange) onStatusChange(update._id, newStatus);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const hasMultipleLinks = update.applyLinks && update.applyLinks.length > 1;

  return (
    <div className={`career-update-card ${status !== 'fresh' ? 'career-update-card--' + status : ''}`}>
      <div className="career-update-card__header">
        <span className="career-update-card__badge">
          {status === 'applied' ? '✅ APPLIED' : status === 'thinking' ? '🤔 THINKING' : 'NEW'}
        </span>
        <span className="career-update-card__company">{update.company}</span>
        <span className="career-update-card__date">
          {update.detectedAt ? new Date(update.detectedAt).toLocaleDateString('en-IN') : ''}
        </span>
      </div>

      <div className="career-update-card__title">{update.title}</div>
      <div className="career-update-card__desc">{update.description}</div>

      <div className="career-update-card__actions">

        {hasMultipleLinks ? (
          <div className="career-update-card__files">
            <p className="career-update-card__files-label">📎 Downloads</p>
            {update.applyLinks.map((link, i) => {
              const raw = link.split('/').pop().split('?')[0];
              const name = raw.length > 40 ? raw.slice(0, 40) + '...' : raw || `Document ${i + 1}`;
              const isPdf = link.toLowerCase().includes('.pdf');
              return (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="career-update-card__file-btn"
                >
                  {isPdf ? '📄' : '📎'} {name}
                </a>
              );
            })}
          </div>
        ) : update.applyLink ? (
          
          <a href={update.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="career-btn career-btn--primary career-update-card__apply"
          >
            Apply Now →
          </a>
        ) : null}

        <button
          className={`career-btn ${status === 'applied' ? 'career-btn--success' : 'career-btn--ghost'}`}
          onClick={() => handleStatus(status === 'applied' ? 'fresh' : 'applied')}
          disabled={saving}
        >
          ✅ {status === 'applied' ? 'Applied' : 'Mark Applied'}
        </button>

        <button
          className={`career-btn ${status === 'thinking' ? 'career-btn--outline' : 'career-btn--ghost'}`}
          onClick={() => handleStatus(status === 'thinking' ? 'fresh' : 'thinking')}
          disabled={saving}
        >
          🤔 Thinking
        </button>

      </div>
    </div>
  );
}