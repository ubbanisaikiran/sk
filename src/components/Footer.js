import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-top">
        <div>
          <h3 className="footer-logo">
            SAI <span className="highlight-dot">KIRAN</span>
          </h3>
          <p className="footer-summary">
            A hybrid builder blending product thinking, technical execution, and practical strategy.
          </p>
        </div>

        <div className="social-icons">
          <a href="https://www.linkedin.com/in/ubbani-saikiran-7bb753151/" target="_blank" rel="noreferrer">
            <i className="fab fa-linkedin-in" />
          </a>
          <a href="https://github.com/ubbanisaikiran" target="_blank" rel="noreferrer">
            <i className="fab fa-github" />
          </a>
          <a href="https://instagram.com/saikiran.ln" target="_blank" rel="noreferrer">
            <i className="fab fa-instagram" />
          </a>
          <a href="mailto:saikiranubbani@gmail.com">
            <i className="fas fa-envelope" />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 Sai Kiran Ubbani. Built to solve real problems.</p>
        <div className="footer-links">
          <a href="/terms-of-service.html" target="_blank" rel="noreferrer">Terms of Service</a>
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
