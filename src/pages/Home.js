import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Home.css';
import profileImg from '../assets/profile11.jpeg';

const serviceCards = [
  {
    title: 'Career Upgrade',
    eyebrow: 'Product',
    summary: 'Track roles, keep momentum, and turn job hunting into a calmer daily system.',
    action: 'Explore career portal Now',
    propKey: 'onCareer',
  },
  {
    title: 'TS Agri Stack Checker',
    eyebrow: 'Tool',
    summary: 'Compare records, surface mismatches, and save time on manual review.',
    action: 'Explore tool Now',
    propKey: 'onAgriStack',
  },
  {
    title: 'Custom Build Service',
    eyebrow: 'Service',
    summary: 'Turn a recurring workflow problem into a small, useful product.',
    action: 'Start request Now',
    propKey: 'onCustomRequest',
  },
];

function Home({ onCareer, onAgriStack, onCustomRequest }) {
  const navigate = useNavigate();

  const serviceActions = {
    onCareer,
    onAgriStack,
    onCustomRequest,
  };

  return (
    <section id="home" className="home-section">
      <div className="home-grid">
        <div className="home-copy">
          <div className="home-eyebrow">Software engineer + MBA</div>
          <h1 className="hero-title" style={{ lineHeight: '1.08' }}>
            MBA graduate with a technology background, focused on business analysis, market research, strategy, and practical problem-solving.
            <span className="gradient-text"> I like turning customer friction into cleaner flows, better decisions, and useful tools.</span>
          </h1>
          <p className="subtext">
            I&apos;m Sai Kiran Ubbani, a hybrid builder who works across product thinking,
            software execution, and business strategy. I like understanding the problem
            behind the request, shaping a cleaner path forward, and turning ideas into
            tools, flows, and decisions teams can actually use.
          </p>

          <div className="home-proof-grid">
            <div className="home-proof-card">
              <span>What I add to a team</span>
              <strong>Structured thinking with hands-on execution</strong>
            </div>
            <div className="home-proof-card">
              <span>How I work</span>
              <strong>See the pattern, simplify the system, ship the fix</strong>
            </div>
            <div className="home-proof-card">
              <span>Where I fit best</span>
              <strong>0 to 1 products, internal tools, and cross-functional problem solving</strong>
            </div>
          </div>

          <div className="cta-buttons">
            <button className="gradient-btn" onClick={() => navigate('/contact')} type="button">
              Start a conversation
            </button>
            <button className="outline-btn" onClick={() => navigate('/projects')} type="button">
              Explore selected work
            </button>
            <a href="/SaiKiran_Resume.pdf" download className="text-link-btn">
              Download resume
            </a>
          </div>
        </div>

        <div className="home-visual">
          <div className="home-portrait-panel">
            <div className="home-portrait-frame">
              <img src={profileImg} alt="Sai Kiran portrait" className="profile-pic" />
            </div>
            <div className="home-portrait-meta">
              <span>Builder profile</span>
              <strong>Code, operations, strategy, and user empathy in one workflow.</strong>
            </div>
          </div>

          <div className="home-floating-note home-floating-note--top">
            <span>Product lens</span>
            <strong>From user friction to usable flow</strong>
          </div>
          <div className="home-floating-note home-floating-note--bottom">
            <span>Execution style</span>
            <strong>Fast enough to move, structured enough to scale</strong>
          </div>
        </div>
      </div>

      <div className="home-services-showcase">
        <div className="home-services-intro">
          <p className="home-section-kicker">Existing services</p>
          <h2>I already turn that mindset into products, tools, and services.</h2>
          <p>
            These are not placeholders. They are active examples of how I approach real
            problems with different solution formats.
          </p>
        </div>

        <div className="home-service-cards">
          {serviceCards.map((card) => (
            <button
              key={card.title}
              className="home-service-card"
              onClick={serviceActions[card.propKey]}
              type="button"
            >
              <span>{card.eyebrow}</span>
              <h3>{card.title}</h3>
              <p>{card.summary}</p>
              <p style={{color:"green"}}>{card.action}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="home-editorial-band">
        <div className="home-editorial-copy">
          <p className="home-section-kicker">Why teams bring me in</p>
          <h2>I am strongest where ambiguity is high and the solution still needs to feel grounded.</h2>
          <p>
            Whether the challenge is customer-facing, operational, or strategic, I like
            translating uncertainty into something more visible: a system, a dashboard, a
            process, or a product direction people can align around.
          </p>
          <Link className="home-inline-link" to="/about">
            See how I connect engineering with strategy
          </Link>
        </div>
        <div className="home-editorial-image">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
            alt="Collaborative product team discussion"
          />
        </div>
      </div>
    </section>
  );
}

export default Home;
