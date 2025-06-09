import React from "react";
import "../styles/Home.css";
import profileImg from "../assets/profile11.jpeg";

function Home() {
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="home" className="home-section">
      <img src={profileImg} alt="Profile" className="profile-pic" />

      <h1 className="hero-title">
        Hi,<span className="gradient-text"> I'm Sai Kiran,</span> a hybrid
        techie and strategist.
      </h1>

      <p className="subtext">
        With a curious mind and a builder's mindset, I enjoy solving real-world
        problems by blending business strategy with technology. Whether it’s
        writing code or analyzing customer insights, I love creating impact
        through thoughtful, data-driven solutions. <br />I blend code and
        business to deliver real impact.
      </p>

      <div className="cta-buttons">
        <button
          className="gradient-btn"
          onClick={() => scrollToSection("contact")}
        >
          Connect with me
        </button>
        <a href="/SaiKiran_Resume.pdf" download className="outline-btn">
          My resume
        </a>
      </div>
    </div>
  );
}

export default Home;
