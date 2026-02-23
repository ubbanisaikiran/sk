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
        {update.applyLink && (
          <a
            href={update.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="career-btn career-btn--primary career-update-card__apply"
          >
            Apply Now →
          </a>
        )}

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
          🤔 {status === 'thinking' ? 'Thinking' : 'Thinking'}
        </button>
      </div>
    </div>
  );
}