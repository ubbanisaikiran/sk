import React from "react";
import "../styles/Navbar.css";

const Navbar = () => {
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        SAI<span className="x-highlight">KIRAN</span>
      </div>
      <ul className="navbar-links">
        <li onClick={() => scrollToSection("home")} className="active">
          Home
          {/* <span className="nav-underline" /> */}
        </li>
        <li onClick={() => scrollToSection("about")}>About</li>
        <li onClick={() => scrollToSection("skills")}>Skills</li>
        <li onClick={() => scrollToSection("Education")}>Education</li>
        <li onClick={() => scrollToSection("projects")}>Projects</li>
        <li onClick={() => scrollToSection("contact")}>Contact</li>
      </ul>
      <button className="connect-btn" onClick={() => scrollToSection("contact")}>
        Connect With Me
      </button>
    </nav>
  );
};

export default Navbar;
