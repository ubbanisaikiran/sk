import React, { useState, useEffect } from 'react';
import './Launch.css';

export default function Launch({ onPortfolio, onCareer }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 300);
  }, []);

  if (!visible) return null;

  return (
    <div className="launch-overlay" onClick={onPortfolio}>
      <div className="launch-modal" onClick={e => e.stopPropagation()}>

        {/* Background orbs */}
        <div className="launch-modal__orb launch-modal__orb--1" />
        <div className="launch-modal__orb launch-modal__orb--2" />
        <div className="launch-modal__grid" />

        {/* Close = go to portfolio */}
        <button className="launch-modal__close" onClick={onPortfolio}>✕</button>

        {/* Badge */}
        <div className="launch-modal__badge">
          <span className="launch-modal__dot" />
          Open to opportunities
        </div>

        {/* Greeting */}
        <h1 className="launch-modal__title">
          Hey there! 👋
          <br />
          I'm <span className="launch-modal__name">Sai Kiran</span>
        </h1>

        <p className="launch-modal__sub">
          A developer who builds things that matter.
          <br />
          What brings you here today?
        </p>

        {/* Cards */}
        <div className="launch-modal__cards">

          <div className="launch-modal__card launch-modal__card--portfolio" onClick={onPortfolio}>
            <div className="launch-modal__card-icon">🌟</div>
            <div className="launch-modal__card-body">
              <div className="launch-modal__card-tag">View my work</div>
              <h2 className="launch-modal__card-title">Ready to Build, Create, and Innovate</h2>
              <p className="launch-modal__card-desc">
                Hi, I'm Saikiran. From conceptualizing ideas to executing them, I love turning complex problems into engaging solutions. I'm eager to bring my diverse background to a dynamic team. Dive in to see what I've been working on!
              </p>
            </div>
            <span className="launch-modal__card-arrow">→</span>
          </div>

          <div className="launch-modal__card launch-modal__card--career" onClick={onCareer}>
            <div className="launch-modal__card-icon">⚡</div>
            <div className="launch-modal__card-body">
              <div className="launch-modal__card-tag">Job search Portal In MyStyle</div>
              <h2 className="launch-modal__card-title">Level Up - OneClick Career</h2>
              <p className="launch-modal__card-desc">
                Track dream companies, get daily job alerts at 6:30 AM and never miss an opening again.
              </p>
            </div>
            <span className="launch-modal__card-arrow">→</span>
          </div>

        </div>

        <p className="launch-modal__hint">✦ Built with passion · Updated regularly ✦</p>

      </div>
    </div>
  );
}