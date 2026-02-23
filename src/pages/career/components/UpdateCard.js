import React, { useState } from 'react';
import { companyAPI } from '../services/api';

export default function UpdateCard({ update, onStatusChange }) {
  const [status, setStatus]     = useState(update.status || 'fresh');
  const [saving, setSaving]     = useState(false);
  const [showModal, setShowModal] = useState(false);

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
    <>
      {/* ── Card ─────────────────────────────────── */}
      <div className={`uc ${status !== 'fresh' ? 'uc--' + status : ''}`}>

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

        <div className="uc__body">
          <h3 className="uc__title">{update.title}</h3>
          {update.description && (
            <p className="uc__desc">{update.description}</p>
          )}
        </div>

        {/* Apply / Downloads */}
        <div className="uc__apply-section">
          {hasMultipleLinks ? (
            <button className="uc__apply" onClick={() => setShowModal(true)}>
              📎 View Documents ({update.applyLinks.length})
            </button>
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
        </div>

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

      {/* ── Documents Modal ───────────────────────── */}
      {showModal && (
        <div className="uc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="uc-modal" onClick={e => e.stopPropagation()}>

            <div className="uc-modal__header">
              <div>
                <h3 className="uc-modal__title">📎 Available Documents</h3>
                <p className="uc-modal__sub">{update.company} · {update.title}</p>
              </div>
              <button className="uc-modal__close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="uc-modal__list">
              {update.applyLinks.map((link, i) => {
                const label = (update.applyLabels && update.applyLabels[i])
                  ? update.applyLabels[i]
                  : `Document ${i + 1}`;
                const isPdf = link.toLowerCase().includes('.pdf');
                const isDoc = link.toLowerCase().match(/\.(doc|docx)$/);
                return (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="uc-modal__item"
                    onClick={() => setShowModal(false)}
                  >
                    <div className="uc-modal__item-icon">
                      {isPdf ? '📄' : isDoc ? '📝' : '🔗'}
                    </div>
                    <div className="uc-modal__item-body">
                      <div className="uc-modal__item-label">{label}</div>
                      <div className="uc-modal__item-url">{link.split('/').pop().split('?')[0]}</div>
                    </div>
                    <div className="uc-modal__item-arrow">↗</div>
                  </a>
                );
              })}
            </div>

            <div className="uc-modal__footer">
              <button className="career-btn career-btn--ghost" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}