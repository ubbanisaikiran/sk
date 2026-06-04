import React, { useEffect, useState } from 'react';
import './Launch.css';

export default function Launch({ onPortfolio, onCareer, onAgriStack }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="launch-overlay" onClick={onPortfolio}>
      <div className="launch-modal" onClick={(event) => event.stopPropagation()}>
        <div className="launch-modal__orb launch-modal__orb--1" />
        <div className="launch-modal__orb launch-modal__orb--2" />
        <div className="launch-modal__grid" />

        <button className="launch-modal__close" onClick={onPortfolio}>X</button>

        <div className="launch-modal__badge">
          <span className="launch-modal__dot" />
          Open to opportunities
        </div>

        <h1 className="launch-modal__title">
          Hey there! {'\u{1F44B}'}
          <br />
          I'm <span className="launch-modal__name">Sai Kiran</span>
        </h1>

        <p className="launch-modal__sub">
          A developer who builds things that matter.
          <br />
          What brings you here today?
        </p>

        <div className="launch-modal__cards">
          <div className="launch-modal__card launch-modal__card--portfolio" onClick={onPortfolio}>
            <div className="launch-modal__card-icon">{'\u{1F31F}'}</div>
            <div className="launch-modal__card-body">
              <div className="launch-modal__card-tag">View my work</div>
              <h2 className="launch-modal__card-title">Ready to Build, Create, and Innovate</h2>
              <p className="launch-modal__card-desc">
                Hi, I&apos;m Saikiran. From conceptualizing ideas to executing them, I love turning
                complex problems into engaging solutions. I&apos;m eager to bring my diverse
                background to a dynamic team. Dive in to see what I&apos;ve been working on.
              </p>
            </div>
            <span className="launch-modal__card-arrow">{'\u2192'}</span>
          </div>

          <div className="launch-modal__card launch-modal__card--career" onClick={onCareer}>
            <div className="launch-modal__card-icon">{'\u26A1'}</div>
            <div className="launch-modal__card-body">
              <div className="launch-modal__card-tag">Job search portal in my style</div>
              <h2 className="launch-modal__card-title">Level Up - One-Click Career</h2>
              <p className="launch-modal__card-desc">
                Track dream companies, get daily job alerts at 6:30 AM, and never miss an
                opening again.
              </p>
            </div>
            <span className="launch-modal__card-arrow">{'\u2192'}</span>
          </div>

          <div className="launch-modal__card launch-modal__card--agri" onClick={onAgriStack}>
            <div className="launch-modal__card-icon">{'\u{1F33E}'}</div>
            <div className="launch-modal__card-body">
              <div className="launch-modal__card-tag">Telangana registry audit</div>
              <h2 className="launch-modal__card-title">TS Agri Stack Checker</h2>
              <p className="launch-modal__card-desc">
                Upload Aadhaar records from Excel, check live enrolment status, and download
                only mismatch and no-name cases.
              </p>
            </div>
            <span className="launch-modal__card-arrow">{'\u2192'}</span>
          </div>
        </div>

        <p className="launch-modal__hint">Built with passion - updated regularly</p>
      </div>
    </div>
  );
}
