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
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const hasMultipleLinks = update.applyLinks && update.applyLinks.length > 1;
  const daysAgo = update.detectedAt
    ? Math.floor((Date.now() - new Date(update.detectedAt)) / 86400000)
    : 0;
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;

  return (
    <div className={`uc ${status !== 'fresh' ? 'uc--' + status : ''}`}>

      {/* Top bar */}
      <div className="uc__top">
        <div className="uc__left">
          <div className="uc__avatar">
            {update.company?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="uc__company">{update.company}</div>
            <div className="uc__time">{timeLabel}</div>
          </div>
        </div>
        <span className={`uc__status uc__status--${status}`}>
          {status === 'applied' ? '✅ Applied' : status === 'thinking' ? '🤔 Thinking' : '🔔 New'}
        </span>
      </div>

      {/* Content */}
      <div className="uc__body">
        <h3 className="uc__title">{update.title}</h3>
        {update.description && (
          <p className="uc__desc">{update.description}</p>
        )}
      </div>

      {/* Downloads or Apply */}
      {hasMultipleLinks ? (
        <div className="uc__downloads">
          <div className="uc__downloads-label">📎 Available Downloads</div>
          <div className="uc__downloads-grid">
            {update.applyLinks.map((link, i) => {
              const label = (update.applyLabels && update.applyLabels[i])
                ? update.applyLabels[i]
                : `Document ${i + 1}`;
              const isPdf = link.toLowerCase().includes('.pdf');
              return (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="uc__dl-btn">
                  <span className="uc__dl-icon">{isPdf ? '📄' : '📎'}</span>
                  <span className="uc__dl-name">{label}</span>
                </a>
              );
            })}
          </div>
        </div>
      ) : update.applyLink ? (
        <a
          href={update.applyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="uc__apply"
        >
          Apply Now →
        </a>
      ) : null}

      {/* Actions */}
      <div className="uc__actions">
        <button
          className={`uc__action ${status === 'applied' ? 'uc__action--active-green' : ''}`}
          onClick={() => handleStatus(status === 'applied' ? 'fresh' : 'applied')}
          disabled={saving}
        >
          ✅ {status === 'applied' ? 'Applied!' : 'Mark Applied'}
        </button>
        <button
          className={`uc__action ${status === 'thinking' ? 'uc__action--active-blue' : ''}`}
          onClick={() => handleStatus(status === 'thinking' ? 'fresh' : 'thinking')}
          disabled={saving}
        >
          🤔 Thinking
        </button>
      </div>

    </div>
  );
}