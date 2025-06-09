import React from "react";
import "../styles/Contact.css";

const Contact = () => {
  return (
    <section className="contact-section">
            <h2 className="section-title">Contant <span>with me</span></h2>

      <div className="contact-container">
        {/* LEFT SIDE */}
        <div className="contact-left">
          <h2 className="contact-subtitle">
            <span className="highlight">Let’s</span> talk
          </h2>
          <p className="contact-description">
          I’d love to connect and explore opportunities to work together!          </p>

          <div className="contact-info">
            <p><span>📧</span> saikiranubbani@gmail.com</p>
            <p><span>📞</span> +91 9182669041</p>
            <p><span>📍</span> Hyderabad-Telangana, India.</p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="contact-right">
          <h2 className="contact-title">Get in <span className="pink-highlight">touch</span></h2>
          <form className="contact-form">
            <label>Your Name</label>
            <input type="text" placeholder="Enter your name" required />

            <label>Your Email</label>
            <input type="email" placeholder="Enter your email" required />

            <label>Write your message here</label>
            <textarea rows="6" placeholder="Enter your message" required />

            {/* <div className="captcha-box">
              <input type="checkbox" />
              <span>I am human</span>
              <div className="captcha-placeholder">hCaptcha</div>
            </div> */}

            <button type="submit" className="submit-btn">Submit now</button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
