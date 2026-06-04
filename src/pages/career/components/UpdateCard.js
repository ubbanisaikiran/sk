import React, { useEffect, useState } from 'react';
import { companyAPI } from '../services/api';

export default function UpdateCard({ update, onStatusChange }) {
  const [status, setStatus] = useState(update.status || 'fresh');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setStatus(update.status || 'fresh');
  }, [update.status]);

  const applyLinks = Array.isArray(update.applyLinks)
    ? update.applyLinks.filter(Boolean)
    : [];
  const primaryApplyLink = update.applyLink || applyLinks[0] || '';
  const hasMultipleLinks = applyLinks.length > 1;

  const handleStatus = async (nextStatus) => {
    if (!update.companyId || !update._id) return;

    setSaving(true);

    try {
      await companyAPI.updateJobStatus(update.companyId, update._id, nextStatus);
      setStatus(nextStatus);
      if (onStatusChange) onStatusChange(update._id, nextStatus);
    } catch (err) {
      console.error(err);
    }

    setSaving(false);
  };

  const daysAgo = update.detectedAt
    ? Math.floor((Date.now() - new Date(update.detectedAt)) / 86400000)
    : 0;
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
  const statusLabel = status === 'applied'
    ? `${'\u2705'} Applied`
    : status === 'thinking'
      ? `${'\u{1F914}'} Thinking`
      : `${'\u{1F514}'} New`;

  return (
    <>
      <div className={`uc ${status !== 'fresh' ? `uc--${status}` : ''}`}>
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
            {statusLabel}
          </span>
        </div>

        <div className="uc__body">
          <h3 className="uc__title">{update.title}</h3>
          {update.description && <p className="uc__desc">{update.description}</p>}
        </div>

        <div className="uc__apply-section">
          {hasMultipleLinks ? (
            <button className="uc__apply" onClick={() => setShowModal(true)}>
              {'\u{1F4CE}'} View Documents ({applyLinks.length})
            </button>
          ) : primaryApplyLink ? (
            <a
              href={primaryApplyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="uc__apply"
            >
              Apply Now {'\u2192'}
            </a>
          ) : null}
        </div>

        <div className="uc__actions">
          <button
            className={`uc__action ${status === 'applied' ? 'uc__action--active-green' : ''}`}
            onClick={() => handleStatus(status === 'applied' ? 'fresh' : 'applied')}
            disabled={saving}
          >
            {'\u2705'} {status === 'applied' ? 'Applied!' : 'Mark Applied'}
          </button>
          <button
            className={`uc__action ${status === 'thinking' ? 'uc__action--active-blue' : ''}`}
            onClick={() => handleStatus(status === 'thinking' ? 'fresh' : 'thinking')}
            disabled={saving}
          >
            {'\u{1F914}'} Thinking
          </button>
        </div>
      </div>

      {showModal && (
        <div className="uc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="uc-modal" onClick={(event) => event.stopPropagation()}>
            <div className="uc-modal__header">
              <div>
                <h3 className="uc-modal__title">{'\u{1F4CE}'} Available Documents</h3>
                <p className="uc-modal__sub">{update.company} {'\u00B7'} {update.title}</p>
              </div>
              <button className="uc-modal__close" onClick={() => setShowModal(false)}>X</button>
            </div>

            <div className="uc-modal__list">
              {applyLinks.map((link, index) => {
                const label = update.applyLabels?.[index] || `Document ${index + 1}`;
                const isPdf = link.toLowerCase().includes('.pdf');
                const isDoc = /\.(doc|docx)$/i.test(link);
                const icon = isPdf
                  ? '\u{1F4C4}'
                  : isDoc
                    ? '\u{1F4DD}'
                    : '\u{1F517}';

                return (
                  <a
                    key={`${link}-${index}`}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="uc-modal__item"
                    onClick={() => setShowModal(false)}
                  >
                    <div className="uc-modal__item-icon">{icon}</div>
                    <div className="uc-modal__item-body">
                      <div className="uc-modal__item-label">{label}</div>
                      <div className="uc-modal__item-url">{link.split('/').pop().split('?')[0]}</div>
                    </div>
                    <div className="uc-modal__item-arrow">{'\u2197'}</div>
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
