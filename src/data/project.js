import projectCareer from '../assets/visuals/project-career.svg';
import projectAgri from '../assets/visuals/project-agri.svg';
import projectHospital from '../assets/visuals/project-hospital.svg';
import projectFire from '../assets/visuals/project-fire.svg';
import projectPatient from '../assets/visuals/project-patient.svg';
import projectRestaurant from '../assets/visuals/project-restaurant.svg';

const projectData = [
  {
    title: 'Career Upgrade Portal',
    period: 'Live product',
    type: 'Product',
    description:
      'A focused career workspace for tracking dream companies, managing opportunities, and surfacing daily job updates in one calm flow.',
    impact: 'Turns scattered job-search effort into one cleaner operating system.',
    stack: ['React', 'Automation', 'Product Thinking'],
    image: projectCareer,
  },
  {
    title: 'TS Agri Stack Checker',
    period: 'Live tool',
    type: 'Operations tool',
    description:
      'A practical checker for Aadhaar-based records that helps teams identify live enrollment mismatches, no-name cases, and workflow gaps faster.',
    impact: 'Built to reduce manual verification overhead and improve field accuracy.',
    stack: ['React', 'Excel workflows', 'Data validation'],
    image: projectAgri,
  },
  {
    title: 'Next-Gen Smart Hospital System',
    period: 'Oct 2024 - Nov 2024',
    type: 'Concept + systems design',
    description:
      'Designed a smart hospital concept that combines IoT and blockchain to improve emergency response, resource coordination, and trust in medical workflows.',
    impact: 'Framed complex healthcare inefficiencies as a connected systems problem.',
    stack: ['IoT', 'Blockchain', 'Systems architecture'],
    image: projectHospital,
  },
  {
    title: 'Fire Safety Intelligence Platform',
    period: 'Sep 2024 - Nov 2024',
    type: 'Research project',
    description:
      'Explored an AI and IoT fire-safety model with real-time tracking, evacuation planning, and blockchain-backed incident records for safer response systems.',
    impact: 'Focused on reliability, traceability, and faster decision-making under pressure.',
    stack: ['AI', 'IoT', 'Blockchain'],
    image: projectFire,
  },
  {
    title: 'Patient Monitoring System',
    period: 'Aug 2021 - Feb 2022',
    type: 'Health-tech build',
    description:
      'Built a wearable monitoring flow and companion app concept for tracking patient vitals and helping users trigger emergency care pathways earlier.',
    impact: 'Oriented around reducing delays between alerts and care decisions.',
    stack: ['Mobile app', 'Sensors', 'Healthcare UX'],
    image: projectPatient,
  },
  {
    title: 'Restaurant Management Application',
    period: 'Mar 2019 - Apr 2019',
    type: 'Software build',
    description:
      'Created a desktop solution to streamline restaurant order-taking and inventory tracking through a simple JavaScript and MySQL workflow.',
    impact: 'Solved an operations problem with a more structured day-to-day system.',
    stack: ['JavaScript', 'MySQL', 'Desktop workflows'],
    image: projectRestaurant,
  },
];

export default projectData;
