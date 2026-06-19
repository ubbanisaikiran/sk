import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Launch.css';

const HERO_GIF = 'https://media.giphy.com/media/WTjXuYA2y4o3UZly3W/giphy.gif';

export default function Launch({ onPortfolio, onCareer, onAgriStack, onCustomRequest }) {
  const [visible, setVisible] = useState(false);
  const servicesRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible || typeof document === 'undefined') return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [visible]);

  const cards = useMemo(() => ([
    {
      key: 'portfolio',
      label: 'Portfolio',
      title: 'Build. Create. Innovate.',
      description:
        'Explore selected projects where I turn ideas into impactful digital solutions that solve real-world problems.',
      cta: 'View My Work',
      art: 'https://media.giphy.com/media/l2JhtHeyE3QEJJNT2/giphy.gif',
      tone: 'portfolio',
      onClick: onPortfolio,
    },
    {
      key: 'career',
      label: 'Product',
      title: 'Level Up Career',
      description:
        'Track dream companies, get daily job alerts at 6:30 AM, and never miss an opportunity again.',
      cta: 'Open Career Portal',
      art: 'https://media.giphy.com/media/xUA7b3xypm6Rnfq4qA/giphy.gif',
      tone: 'career',
      onClick: onCareer,
    },
    {
      key: 'agri',
      label: 'Tool',
      title: 'TS Agri Stack Checker',
      description:
        'Upload Aadhaar records from Excel, check live enrolment status, and detect mismatches and no-name cases.',
      cta: 'Open Tool',
      art: 'https://media.giphy.com/media/fhKi98TQbyZaU8myqw/giphy.gif',
      tone: 'agri',
      onClick: onAgriStack,
    },
    {
      key: 'custom',
      label: 'Service',
      title: 'You Name It, I\u2019ll Build It',
      description:
        'Share your digital pain point. I\u2019ll build a custom micro-solution tailored to your needs and host it here for free.',
      cta: 'Request Custom Build',
      art: 'https://media.giphy.com/media/RIqh9nbpblgvWvd6ZK/giphy.gif',
      tone: 'custom',
      onClick: onCustomRequest,
    },
  ]), [onAgriStack, onCareer, onCustomRequest, onPortfolio]);

  if (!visible) return null;

  return (
    <div className="launch-overlay">
      <div className="launch-shell" onClick={(event) => event.stopPropagation()}>
        <div className="launch-shell__glow launch-shell__glow--left" />
        <div className="launch-shell__glow launch-shell__glow--right" />
        <div className="launch-shell__grid" />

        <button className="launch-shell__close" onClick={onPortfolio} type="button">
          X
        </button>

        <section className="launch-hero">
          <div className="launch-hero__content">
            <div className="launch-hero__badge">
              <span className="launch-hero__dot" />
              Open to opportunities
            </div>

            <h1 className="launch-hero__title">
              Hey there! {'\u{1F44B}'} I&apos;m <span className="launch-hero__name">Sai Kiran</span>
            </h1>

            <p className="launch-hero__lead">
              I build products, tools, and digital solutions that <span>solve real problems.</span>
            </p>

            <p className="launch-hero__sub">
              Explore my work, products, and services below. What brings you here today?
            </p>

            <div className="launch-hero__actions">
              <button className="launch-hero__button launch-hero__button--primary" onClick={onPortfolio} type="button">
                View Portfolio {'\u2197'}
              </button>
              <button
                className="launch-hero__button launch-hero__button--secondary"
                onClick={() => servicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                type="button"
              >
                Explore Services {'\u2197'}
              </button>
            </div>
          </div>

          <div className="launch-hero__visual">
            <div className="launch-visual">
              <div className="launch-visual__chip launch-visual__chip--code">{'{ }'}</div>
              <div className="launch-visual__chip launch-visual__chip--spark">{'\u26A1'}</div>

              <div className="launch-visual__window">
                <div className="launch-visual__window-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="launch-visual__window-screen">
                  <img
                    className="launch-visual__hero-gif"
                    src={HERO_GIF}
                    alt="Animated developer coding illustration"
                  />
                </div>
                <div className="launch-visual__ring" />
              </div>

              <div className="launch-visual__stats">
                <div className="launch-visual__stat">
                  <span>7+</span>
                  <small>Projects</small>
                </div>
                <div className="launch-visual__stat">
                  <span>2+</span>
                  <small>Products</small>
                </div>
                <div className="launch-visual__stat launch-visual__stat--accent">
                  <span>Problem</span>
                  <small>Solver Mindset</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="launch-services" ref={servicesRef}>
          {cards.map((card) => (
            <button
              key={card.key}
              className={`launch-service-card launch-service-card--${card.tone}`}
              onClick={card.onClick}
              type="button"
            >
              <div className="launch-service-card__tag">{card.label}</div>
              <div className="launch-service-card__art">
                <img src={card.art} alt={`${card.title} animated illustration`} loading="lazy" />
              </div>
              <h2 className="launch-service-card__title">{card.title}</h2>
              <p className="launch-service-card__desc">{card.description}</p>
              <span className="launch-service-card__cta">
                {card.cta} {'\u2192'}
              </span>
            </button>
          ))}
        </section>

        <p className="launch-shell__hint">
          {'\u2665'} Built with passion {'\u2022'} Updated regularly {'\u2728'}
        </p>
      </div>
    </div>
  );
}
