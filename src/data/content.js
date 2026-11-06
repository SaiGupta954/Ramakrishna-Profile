export const profile = {
  first: 'RAMAKRISHNA',
  last: 'GAMPA',
  location: 'Cincinnati, OH',
  email: 'Ramakrishnagampa6@gmail.com',
  linkedin: 'https://www.linkedin.com/in/ramakrishna-gampa-5355a6240',
  github: 'https://github.com/SaiGupta954',
  roles: ['Software Engineer', 'AI Full-Stack Developer', 'Debugging Engineer', '3D Web Builder'],
  summary:
    'Software engineer with 4+ years shipping full-stack products, AI / LLM features and production fixes. I build scalable web apps and REST APIs with React, Node.js, TypeScript, C# / .NET and Python — and I chase bugs down to their root cause on Linux.',
};

export const stats = [
  { value: 4, suffix: '+', label: 'Years shipping software' },
  { value: 100, suffix: '+', label: 'System failures root-caused' },
  { value: 42, suffix: '%', label: 'Faster app response at MassMutual' },
  { value: 3.96, suffix: '', label: 'M.S. Computer Science GPA', decimals: 2 },
];

export const experience = [
  {
    role: 'Software Debugging Engineer',
    company: 'Jabil',
    period: 'Jun 2026 — Present',
    code: 'SIGSEGV',
    color: '#ff6b35',
    points: [
      'Triaged and debugged 100+ software and system failures on Linux server pods during rack bring-up, isolating root cause from system and crash logs.',
      'Automated diagnostics with 10+ Python and Bash scripts for health checks and log monitoring.',
      'Traced DHCP, DNS and connectivity faults through traffic and service logs.',
      'Validated firmware and software updates with regression, stability and performance testing.',
    ],
    tags: ['Linux', 'Python', 'Bash', 'RCA', 'Networking'],
  },
  {
    role: 'AI Full Stack Developer',
    company: 'MAK Engineering Services',
    period: 'Dec 2025 — Apr 2026',
    code: 'R3F::LIVE',
    color: '#6ee7ff',
    points: [
      'Built a 3D web app with React Three Fiber and TypeScript unifying live data from 3 energy systems (solar, EV, LED) with ML results.',
      'Designed REST APIs and Apache Kafka pipelines across GCP and Azure for real-time monitoring and forecasting.',
      'Integrated fault-detection models and an LLM / RAG assistant for early warning on equipment issues.',
    ],
    tags: ['React Three Fiber', 'TypeScript', 'Kafka', 'GCP', 'Azure', 'RAG'],
  },
  {
    role: 'Data Science & AI Researcher',
    company: 'University of Cincinnati',
    period: 'Aug 2024 — Apr 2026',
    code: 'MLFLOW',
    color: '#c4f25a',
    points: [
      'Built Pandas / NumPy pipelines to clean 3 drone sensor signals (RPM, frequency, decibels) for noise models.',
      'Wrote object-oriented Python with MLflow tracking so every experiment run is reproducible.',
      'Unblocked researchers by resolving R package compilation and install errors.',
    ],
    tags: ['Python', 'Pandas', 'NumPy', 'MLflow', 'R'],
  },
  {
    role: 'Full Stack Developer',
    company: 'MassMutual',
    period: 'Aug 2020 — Apr 2024',
    code: '-42% LATENCY',
    color: '#b69cff',
    points: [
      'Delivered full-stack web apps end to end with Node.js, TypeScript and C# in an Agile team.',
      'Cut application response time by 42% with SQL query tuning, indexes and load balancing.',
      'Introduced a reusable UI component library shared across product teams.',
      'Reduced production defects with unit and integration tests, code reviews and CI/CD.',
    ],
    tags: ['Node.js', 'TypeScript', 'C# / .NET', 'SQL', 'CI/CD'],
  },
];

export const projects = [
  {
    id: 'retail',
    index: '01',
    title: 'Retail Customer Analytics & LLM Assistant',
    stack: ['Python', 'Scikit-Learn', 'Azure', 'REST APIs', 'LLMs', 'RAG'],
    blurb:
      'End-to-end analytics on Azure that turns raw transactions into insight: churn and segmentation models served over REST, plus a RAG chat assistant so non-technical teams can ask questions in plain English and get answers grounded in real numbers.',
    metrics: [
      ['2', 'ML models in prod'],
      ['RAG', 'grounded chat'],
    ],
    visual: 'clusters',
    sound: 'checkout ka-ching + live data stream',
    soundHint: 'move → to speed up the data',
    accent: '#6ee7ff',
  },
  {
    id: 'drone',
    index: '02',
    title: 'Drone Noise Reduction Using AI',
    stack: ['Python', 'TensorFlow', 'Scikit-Learn', 'Pandas'],
    blurb:
      'A TensorFlow workflow that predicts propeller noise from sensor data. Feature engineering, tuning and cross-validation cut prediction error on unseen data, and the deployed models delivered measurable noise reduction.',
    metrics: [
      ['-30%', 'prediction error'],
      ['-15%', 'drone noise'],
    ],
    visual: 'wave',
    sound: 'quad-rotor drone',
    soundHint: 'move ← → throttle · ↑ ↓ noise filter',
    accent: '#ff6b35',
  },
  {
    id: 'rna',
    index: '03',
    title: 'Single-Cell RNA-Seq Analysis Pipeline',
    stack: ['Python', 'R', 'Docker'],
    blurb:
      'A Python + R pipeline that takes raw single-cell RNA-seq data through preprocessing, normalization and validation for 2,000+ data points — parallelized and containerized with Docker for reproducible runs.',
    metrics: [
      ['3x', 'faster analysis'],
      ['-70%', 'compute time'],
    ],
    visual: 'cells',
    sound: 'lab centrifuge + bubbling samples',
    soundHint: 'move → to spin faster',
    accent: '#c4f25a',
  },
];

export const skills = {
  Languages: ['Python', 'JavaScript', 'TypeScript', 'C#', 'C++', 'SQL', 'Bash', 'HTML5', 'CSS3'],
  'Frontend & Backend': ['React', 'Next.js', 'Node.js', 'Express', '.NET Core', 'FastAPI', 'GraphQL', 'REST', 'Microservices', 'Three.js'],
  'Data & Cloud': ['PostgreSQL', 'MySQL', 'Redis', 'Kafka', 'AWS', 'Azure', 'GCP'],
  DevOps: ['Linux', 'Docker', 'Kubernetes', 'Git', 'GitHub Actions', 'CI/CD', 'MLflow'],
  'AI / ML': ['LLMs', 'RAG', 'Prompt Eng.', 'TensorFlow', 'Scikit-Learn', 'Pandas', 'NumPy'],
  Quality: ['Unit Testing', 'Integration Tests', 'Root Cause Analysis', 'QA', 'Code Reviews'],
};

export const skillColors = {
  Languages: '#ff6b35',
  'Frontend & Backend': '#6ee7ff',
  'Data & Cloud': '#b69cff',
  DevOps: '#c4f25a',
  'AI / ML': '#ff9ecd',
  Quality: '#ffd166',
};

export const education = {
  degree: 'M.S. Computer Science',
  school: 'University of Cincinnati',
  gpa: '3.96 / 4.0',
  period: 'Aug 2024 — Apr 2026',
  coursework: ['Software Engineering', 'Testing & QA', 'Advanced Algorithms', 'Data Structures', 'Cloud Computing', 'Database Systems'],
  leadership: 'Student Support Specialist — organized IEEE workshops and hackathons on applied AI, full-stack and software engineering.',
};
