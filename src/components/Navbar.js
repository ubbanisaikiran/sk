import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/education', label: 'Education' },
  { to: '/projects', label: 'Projects' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <NavLink className="navbar-logo" onClick={closeMenu} to="/">
        SAI <span className="x-highlight">KIRAN.</span>
      </NavLink>

      <div className={`navbar-links-wrap ${isOpen ? 'is-open' : ''}`}>
        <ul className="navbar-links">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                className={({ isActive }) => `navbar-link ${isActive ? 'is-active' : ''}`}
                end={item.end}
                onClick={closeMenu}
                to={item.to}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <NavLink className="connect-btn mobile-connect" onClick={closeMenu} to="/contact">
          Let&apos;s talk
        </NavLink>
      </div>

      <div className="navbar-actions">
        <div className="navbar-status">
          <span />
          Open to build and product roles
        </div>
        <NavLink className="connect-btn" to="/contact">
          Let&apos;s talk
        </NavLink>
        <button
          className={`hamburger ${isOpen ? 'is-open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
