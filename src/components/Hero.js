import React from 'react';
import '../styles/Hero.css';
import profileImg from '../assets/image.jpg'; // Replace with your image

function Hero() {
  return (
    <section className="hero">
      <div className="half designer">
        <h1>designer</h1>
        <p>UI/UX product designer specialising in UI design and design systems.</p>
      </div>
      <div className="profile-img">
        <img src={profileImg} alt="profile" />
      </div>
      <div className="half coder">
        <h1>&lt;coder&gt;</h1>
        <p>Front-end developer who writes clean, elegant and efficient code.</p>
      </div>
    </section>
  );
}

export default Hero;
