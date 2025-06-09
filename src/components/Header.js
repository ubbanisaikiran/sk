import React from 'react';
import '../styles/Header.css'

function Header() {
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="navbar">
      <div className="logo">Ale<span>X.</span></div>
      <ul className="nav-links">
        {['home', 'about', 'services', 'portfolio', 'contact'].map((item) => (
          <li key={item} onClick={() => scrollToSection(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </li>
        ))}
      </ul>
      <button className="connect-btn">Connect With Me</button>
    </div>
  );
}

export default Header;

