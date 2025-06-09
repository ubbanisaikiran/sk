import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
// import Header from './components/Header';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Education from './pages/Education';
import Projects from './pages/Projects';
import Skills from './pages/Skills';
import Footer from './components/Footer';

function App() {
  return (
    <div>
      <Navbar />
      <div id="home"><Home /></div>
      <div id="about"><About /></div>
      <div id="skills"><Skills /></div>
      <div id="Education"><Education /></div>
      <div id="projects"><Projects /></div>
      <div id="contact"><Contact /></div>
      <div id="Footer"><Footer /></div>
    </div>
  );
}

export default App;

