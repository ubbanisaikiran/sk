import React from 'react';
import '../styles/Home.css';
import profileImg from '../assets/image.jpg'; 

function Home() {
  return (
    <div className="home-container">
      <div className="home-section">
        <div className="left">
          <h2>designer</h2>
          <p>UI/UX product designer specialising in UI design and design systems.</p>
        </div>
        <div className="middle">
        <img src={profileImg} alt="profile" />
        </div>
        <div className="right">
          <h2>&lt;coder&gt;</h2>
          <p>Front-end developer who writes clean, elegant and efficient code.</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
