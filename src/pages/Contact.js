import React from 'react';
import { useForm, ValidationError } from '@formspree/react';
import '../styles/Contact.css';

const Contact = () => {
  const [state, handleSubmit] = useForm('xzzgeakr');

  if (state.succeeded) {
    return (
      <section className="contact-section" id="contact">
        <div className="contact-success-card">
          <span>Message sent</span>
          <h2>Thanks for reaching out.</h2>
          <p>I will get back to you soon.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="contact-section" id="contact">
      <div className="contact-header">
        <p className="section-kicker">Contact</p>
        <h2 className="section-title">If you need a builder who can think through the problem and shape the solution, let us talk.</h2>
      </div>

      <div className="contact-container">
        <div className="contact-left">
          <div className="contact-visual">
            <img
              src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
              alt="Team collaboration"
            />
          </div>
          <h2 className="contact-subtitle">
            <span className="highlight">Let&apos;s</span> build something useful
          </h2>
          <p className="contact-description">
            I am open to product roles, problem-solving projects, and conversations where
            technology and business need to work together instead of separately.
          </p>

          <div className="contact-info">
            <p><span>📧</span> saikiranubbani@gmail.com</p>
            <p><span>📞</span> +91 9182669041</p>
            <p><span>📍</span> Hyderabad, Telangana, India</p>
          </div>
          <div className="contact-social-icons">
            <a href="https://www.linkedin.com/in/ubbani-saikiran-7bb753151/" target="_blank" rel="noreferrer">
              <i className="fab fa-linkedin-in" />
            </a>
            <a href="https://github.com/ubbanisaikiran" target="_blank" rel="noreferrer">
              <i className="fab fa-github" />
            </a>
            <a href="https://instagram.com/saikiran.ln" target="_blank" rel="noreferrer">
              <i className="fab fa-instagram" />
            </a>
            <a href="https://wa.me/919182669041" target="_blank" rel="noreferrer">
              <i className="fab fa-whatsapp" />
            </a>
            <a href="https://facebook.com/sai.sardaar.75/" target="_blank" rel="noreferrer">
              <i className="fab fa-facebook-f" />
            </a>
          </div>
        </div>

        <div className="contact-right">
          <h2 className="contact-title">Start the <span className="pink-highlight">conversation</span></h2>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter your name"
              required
            />
            <ValidationError prefix="Name" field="name" errors={state.errors} />

            <label htmlFor="email">Your Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
            />
            <ValidationError prefix="Email" field="email" errors={state.errors} />

            <label htmlFor="message">What are you trying to solve?</label>
            <textarea
              id="message"
              name="message"
              rows="6"
              placeholder="Tell me about the role, project, or problem."
              required
            />
            <ValidationError prefix="Message" field="message" errors={state.errors} />

            <button type="submit" className="submit-btn" disabled={state.submitting}>
              Send message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
