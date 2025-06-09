import React from "react";
import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-top">
        <h3 className="footer-logo">SAI<span className="highlight-dot">KIRAN</span></h3>

        <div className="social-icons">
          <a href="https://www.linkedin.com/in/ubbani-saikiran-7bb753151/" target="_blank" rel="noreferrer">
            <i className="fab fa-linkedin-in"></i>
          </a>
          <a href="https://github.com/ubbanisaikiran" target="_blank" rel="noreferrer">
            <i className="fab fa-github"></i>
          </a>
          <a href="https://instagram.com/saikiran.ln" target="_blank" rel="noreferrer">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://twitter.com/saikiranubbani" target="_blank" rel="noreferrer">
            <i className="fab fa-twitter"></i>
          </a>
          <a href="saikiranubbani@gmail.com">
            <i className="fas fa-envelope"></i>
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 Sai Kiran Ubbani. All rights reserved.</p>
        <div className="footer-links">
        <a href="/terms-of-service.html" target="_blank" rel="noreferrer">Terms of Service</a>
<a href="/privacy-policy.html" target="_blank" rel="noreferrer">Privacy Policy</a>

        </div>
      </div>
    </footer>
  );
};

export default Footer;

