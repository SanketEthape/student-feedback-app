export const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'AI & Data Science',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering'
];

export const DEPARTMENT_SUBJECTS = {
  'Computer Engineering': [
    'Data Structures and Algorithms',
    'Object Oriented Programming',
    'Database Management Systems',
    'Operating Systems',
    'Computer Networks',
    'Software Engineering',
    'Theory of Computation',
    'Compiler Design',
    'Computer Architecture and Organization',
    'Cloud Computing',
    'Cyber Security and Cryptography',
    'Web Development and Technologies',
    'Distributed Systems',
    'Artificial Intelligence and Soft Computing'
  ],
  'Information Technology': [
    'Data Structures and Algorithms',
    'Database Management Systems',
    'Computer Networks',
    'Operating Systems',
    'Software Engineering and Project Management',
    'Cloud Computing and Virtualization',
    'Information and Cyber Security',
    'Web Development Frameworks',
    'DevOps and Agile Methodologies',
    'Big Data Technologies',
    'Internet of Things (IoT)',
    'Mobile Application Development'
  ],
  'AI & Data Science': [
    'Foundations of Data Science',
    'Artificial Intelligence',
    'Machine Learning',
    'Deep Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Data Mining and Warehousing',
    'Big Data Analytics',
    'Statistical Foundations for Data Science',
    'Reinforcement Learning',
    'Business Intelligence and Visualization',
    'Neural Networks and Deep Architectures'
  ],
  'Electronics & Telecommunication': [
    'Digital Electronics and Logic Design',
    'Analog Electronics and Circuits',
    'Signals and Systems',
    'Microprocessors and Microcontrollers',
    'VLSI Design',
    'Electromagnetic Waves and Radiation',
    'Digital Communication',
    'Digital Signal Processing',
    'Embedded Systems and RTOS',
    'Wireless and Mobile Communication',
    'Optical Communication and Networks'
  ],
  'Mechanical Engineering': [
    'Engineering Mechanics',
    'Thermodynamics',
    'Strength of Materials',
    'Fluid Mechanics and Machinery',
    'Theory of Machines and Mechanisms',
    'Manufacturing Processes and Technology',
    'Heat and Mass Transfer',
    'Design of Machine Elements',
    'CAD / CAM and Automation',
    'Automobile Engineering',
    'Mechatronics and Robotics',
    'Refrigeration and Air Conditioning'
  ],
  'Civil Engineering': [
    'Basic Surveying and Geomatics',
    'Building Materials and Construction',
    'Structural Analysis',
    'Concrete Technology',
    'Geotechnical and Foundation Engineering',
    'Fluid Mechanics and Hydraulics',
    'Transportation and Highway Engineering',
    'Environmental Engineering and Pollution Control',
    'Design of Reinforced Concrete Structures',
    'Design of Steel Structures',
    'Water Resources and Irrigation Engineering',
    'Construction Management and Estimation'
  ],
  'Electrical Engineering': [
    'Basic Electrical and Electronics Engineering',
    'Network Analysis and Synthesis',
    'Electrical Machines',
    'Power Systems and Transmission',
    'Control Systems',
    'Power Electronics and Drives',
    'Electrical Measurements and Instrumentation',
    'High Voltage Engineering',
    'Renewable Energy Systems and Smart Grids',
    'Switchgear and Protection',
    'Microcontroller and PLC Programming'
  ]
};

// Flattened list of all unique subjects for global search
export const ALL_SUBJECTS = Array.from(
  new Set(Object.values(DEPARTMENT_SUBJECTS).flat())
).sort();
