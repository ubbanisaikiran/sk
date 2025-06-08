import React from 'react';
import '../styles/Header.css'
import { Link } from 'react-router-dom';

function Header() {
  return (
    <div className="navbar">
      <div className="logo">SAI KIRAN</div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/Education">Education</Link></li>
        <li><Link to="/projects">Projects</Link></li>
        <li><Link to="/blog">blog</Link></li>
        <li><Link to="/about">About</Link></li>
        <li><Link to="/contact">Contact me</Link></li>
      </ul>
    </div>
  );
}

export default Header;

