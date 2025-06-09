import React from 'react';
import { useForm, ValidationError } from '@formspree/react';
import "../styles/Contact.css";

const Contact = () => {
  const [state, handleSubmit] = useForm("xzzgeakr");

  if (state.succeeded) {
    return <p className="success-message">Thanks for your message!</p>;
  }

  return (
    <section className="contact-section">
      <h2 className="section-title">Connect <span>with me</span></h2>

      <div className="contact-container">
        {/* LEFT SIDE */}
        <div className="contact-left">
          <h2 className="contact-subtitle">
            <span className="highlight">Let’s</span> talk
          </h2>
          <p className="contact-description">
            I’d love to connect and explore opportunities to work together!
          </p>

          <div className="contact-info">
            <p><span>📧</span> saikiranubbani@gmail.com</p>
            <p><span>📞</span> +91 9182669041</p>
            <p><span>📍</span> Hyderabad-Telangana, India.</p>
          </div>
          <div className="contact-social-icons">
            <a href="https://www.linkedin.com/in/ubbani-saikiran-7bb753151/" target="_blank" rel="noreferrer">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="https://github.com/ubbanisaikiran" target="_blank" rel="noreferrer">
              <i className="fab fa-github"></i>
            </a>
            <a href="https://instagram.com/saikiran.ln" target="_blank" rel="noreferrer">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://wa.me/919182669041" target="_blank" rel="noreferrer">
              <i className="fab fa-whatsapp"></i>
            </a>
            <a href="https://x.com/saikiranubbani" target="_blank" rel="noreferrer">
              <i className="fab fa-x-twitter"></i>
            </a>
            <a href="https://facebook.com/sai.sardaar.75/" target="_blank" rel="noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="contact-right">
          <h2 className="contact-title">Get in <span className="pink-highlight">touch</span></h2>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter your name"
              required
            />
            <ValidationError
              prefix="Name"
              field="name"
              errors={state.errors}
            />

            <label htmlFor="email">Your Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
            />
            <ValidationError
              prefix="Email"
              field="email"
              errors={state.errors}
            />

            <label htmlFor="message">Write your message here</label>
            <textarea
              id="message"
              name="message"
              rows="6"
              placeholder="Enter your message"
              required
            />
            <ValidationError
              prefix="Message"
              field="message"
              errors={state.errors}
            />

            <button type="submit" className="submit-btn" disabled={state.submitting}>
              Submit now
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
