// Lists shared by the website (suggestions) and the server (resume auto-fill).
// Plain data, no imports, so both sides can load it.

export const ROLES = [
  // Software development
  'Web Developer', 'Website Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'MERN Stack Developer', 'MEAN Stack Developer', 'PERN Stack Developer', 'MEVN Stack Developer',
  'React Developer', 'React Native Developer', 'Next.js Developer', 'Angular Developer', 'Vue.js Developer',
  'Node.js Developer', 'JavaScript Developer', 'TypeScript Developer', 'Python Developer', 'Django Developer',
  'Java Developer', 'Spring Boot Developer', 'PHP Developer', 'Laravel Developer', 'WordPress Developer',
  'Shopify Developer', '.NET Developer', 'C# Developer', 'C++ Developer', 'Go Developer', 'Ruby on Rails Developer',
  'Android Developer', 'iOS Developer', 'Flutter Developer', 'Mobile App Developer', 'Game Developer',
  'Unity Developer', 'Blockchain Developer', 'Salesforce Developer', 'SAP Consultant', 'API Developer',
  'Software Developer', 'Application Developer', 'Embedded Systems Developer',
  // Engineering
  'Software Engineer', 'Senior Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
  'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer (SRE)', 'Data Engineer', 'Machine Learning Engineer',
  'AI Engineer', 'QA Engineer', 'Automation Test Engineer', 'Network Engineer', 'Security Engineer',
  'Cyber Security Engineer', 'Systems Engineer', 'Embedded Engineer', 'Hardware Engineer', 'Electrical Engineer',
  'Electronics Engineer', 'Mechanical Engineer', 'Civil Engineer', 'Production Engineer', 'Quality Engineer',
  'Maintenance Engineer', 'Site Engineer', 'Design Engineer', 'Solutions Engineer', 'Support Engineer',
  'Platform Engineer', 'Database Engineer', 'Prompt Engineer',
  // Data & AI
  'Data Analyst', 'Data Scientist', 'Business Analyst', 'MIS Executive', 'Power BI Developer', 'BI Analyst',
  'Database Administrator (DBA)', 'Research Analyst',
  // Testing, IT & support
  'Software Tester', 'Manual Tester', 'QA Analyst', 'IT Support Executive', 'System Administrator',
  'Technical Support Executive', 'Network Administrator', 'Cloud Architect', 'Solution Architect', 'Technical Lead',
  'Engineering Manager', 'CTO',
  // Design
  'UI/UX Designer', 'UI Designer', 'UX Designer', 'Product Designer', 'Graphic Designer', 'Web Designer',
  'Motion Graphics Designer', 'Video Editor', '3D Artist', 'Interior Designer', 'Fashion Designer',
  // Product & management
  'Product Manager', 'Project Manager', 'Program Manager', 'Scrum Master', 'Operations Manager',
  'Operations Executive', 'General Manager', 'Team Leader', 'Store Manager', 'Branch Manager',
  // Marketing & content
  'Digital Marketing Executive', 'Digital Marketing Manager', 'SEO Executive', 'SEO Specialist',
  'Social Media Manager', 'Social Media Executive', 'Performance Marketer', 'Content Writer', 'Copywriter',
  'Content Creator', 'Marketing Executive', 'Marketing Manager', 'Brand Manager', 'Public Relations Executive',
  // Sales & business
  'Sales Executive', 'Sales Manager', 'Business Development Executive', 'Business Development Manager',
  'Inside Sales Executive', 'Field Sales Executive', 'Relationship Manager', 'Key Account Manager',
  'Telecaller', 'Real Estate Sales Executive', 'Insurance Advisor', 'Pre-Sales Executive',
  // Customer support
  'Customer Support Executive', 'Customer Service Executive', 'Customer Success Manager', 'Call Center Executive',
  'BPO Executive', 'Front Desk Executive', 'Receptionist',
  // HR & admin
  'HR Executive', 'HR Manager', 'HR Generalist', 'Recruiter', 'Technical Recruiter', 'Talent Acquisition Executive',
  'Admin Executive', 'Office Assistant', 'Personal Assistant', 'Data Entry Operator', 'Back Office Executive',
  // Finance & accounts
  'Accountant', 'Accounts Executive', 'Accounts Manager', 'Chartered Accountant (CA)', 'Finance Executive',
  'Finance Manager', 'Financial Analyst', 'Auditor', 'Tax Consultant', 'GST Executive', 'Banking Executive',
  // Others
  'Teacher', 'Tutor', 'Trainer', 'Lecturer', 'Doctor', 'Nurse', 'Pharmacist', 'Lab Technician',
  'Lawyer', 'Legal Executive', 'Supply Chain Executive', 'Logistics Executive', 'Purchase Executive',
  'Store Keeper', 'Delivery Executive', 'Driver', 'Electrician', 'Technician', 'Chef', 'Hotel Manager',
  'Event Manager', 'Travel Consultant', 'Fresher / Intern',
];

export const SKILLS = [
  // Web & programming
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'React Native', 'Redux', 'Next.js', 'Angular', 'Vue.js',
  'Nuxt.js', 'Svelte', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'Material UI', 'SASS', 'Node.js', 'Express.js',
  'NestJS', 'REST API', 'GraphQL', 'Socket.io', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot',
  'Hibernate', 'Kotlin', 'Swift', 'Objective-C', 'Dart', 'Flutter', 'C', 'C++', 'C#', '.NET', 'ASP.NET', 'Go',
  'Rust', 'Ruby', 'Ruby on Rails', 'PHP', 'Laravel', 'CodeIgniter', 'WordPress', 'Shopify', 'Webflow', 'Wix',
  'MERN Stack', 'MEAN Stack', 'PERN Stack', 'Android', 'iOS', 'Unity', 'Solidity', 'Web3',
  // Databases
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'Supabase', 'Redis', 'Oracle', 'SQL Server', 'Prisma',
  'Mongoose', 'Elasticsearch', 'DynamoDB',
  // DevOps & cloud
  'Git', 'GitHub', 'GitLab', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'AWS', 'Azure', 'Google Cloud (GCP)',
  'Linux', 'Nginx', 'Terraform', 'Ansible', 'Vercel', 'Netlify', 'Microservices', 'System Design',
  // Data & AI
  'Data Structures & Algorithms', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Generative AI',
  'LLMs', 'Prompt Engineering', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Data Analysis', 'Data Visualization',
  'Power BI', 'Tableau', 'Excel', 'Advanced Excel', 'Google Sheets', 'Statistics', 'R',
  // Testing & security
  'Manual Testing', 'Automation Testing', 'Selenium', 'Cypress', 'Jest', 'Postman', 'API Testing', 'JIRA',
  'Cyber Security', 'Ethical Hacking', 'Networking', 'CCNA',
  // Design
  'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Canva', 'CorelDRAW', 'UI Design', 'UX Design', 'UI/UX Design',
  'Wireframing', 'Prototyping', 'Graphic Design', 'Video Editing', 'Premiere Pro', 'After Effects', 'Final Cut Pro',
  'Blender', 'AutoCAD', 'SolidWorks', '3ds Max',
  // Marketing & content
  'Digital Marketing', 'SEO', 'SEM', 'Google Ads', 'Meta Ads', 'Social Media Marketing', 'Email Marketing',
  'Content Writing', 'Copywriting', 'Blogging', 'Google Analytics', 'Branding', 'Influencer Marketing',
  // Business & soft skills
  'Communication', 'English Speaking', 'Hindi', 'Leadership', 'Team Management', 'Problem Solving',
  'Time Management', 'Negotiation', 'Presentation', 'Public Speaking', 'Critical Thinking', 'Teamwork',
  'Sales', 'B2B Sales', 'B2C Sales', 'Lead Generation', 'Cold Calling', 'Business Development', 'CRM',
  'Salesforce', 'HubSpot', 'Customer Support', 'Customer Service', 'Client Handling', 'Telecalling',
  'Project Management', 'Agile', 'Scrum', 'Product Management', 'Operations', 'Supply Chain', 'Logistics',
  // Finance, HR & office
  'Accounting', 'Tally', 'Tally Prime', 'GST', 'Taxation', 'Bookkeeping', 'Financial Analysis', 'Auditing',
  'Payroll', 'Recruitment', 'HR Operations', 'Onboarding', 'Data Entry', 'MS Office', 'MS Word', 'PowerPoint',
  'Typing', 'Documentation',
];

export const DEGREES = [
  'B.Tech', 'B.Tech (CSE)', 'B.Tech (IT)', 'B.Tech (ECE)', 'B.Tech (Mechanical)', 'B.Tech (Civil)', 'B.Tech (Electrical)',
  'B.E.', 'M.Tech', 'M.E.', 'BCA', 'MCA', 'B.Sc', 'B.Sc (Computer Science)', 'B.Sc (IT)', 'M.Sc', 'B.Com',
  'M.Com', 'BBA', 'MBA', 'PGDM', 'BA', 'MA', 'B.Des', 'M.Des', 'B.Ed', 'M.Ed', 'LLB', 'LLM', 'MBBS', 'BDS',
  'B.Pharm', 'M.Pharm', 'D.Pharm', 'BHM', 'B.Arch', 'Diploma (Engineering)', 'Polytechnic Diploma', 'ITI',
  'CA', 'CS', 'CMA', 'PhD', '12th (Science)', '12th (Commerce)', '12th (Arts)', '10th',
];

// Indian cities: the biggest job markets first (they win ties in suggestions), then the rest
// alphabetically. Also used to spot a city in resumes, so names that are also common
// surnames or street names (Sagar, Tonk…) are left out.
const MAJOR_CITIES = [
  'Jaipur', 'Delhi', 'New Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad',
  'Noida', 'Gurugram', 'Chandigarh', 'Indore', 'Lucknow', 'Kochi', 'Surat', 'Nagpur', 'Bhopal', 'Coimbatore',
  'Visakhapatnam', 'Vadodara', 'Jodhpur', 'Udaipur', 'Kota', 'Ghaziabad', 'Faridabad', 'Navi Mumbai', 'Thane', 'Mysuru',
];
const OTHER_CITIES = [
  'Agartala', 'Agra', 'Ahmednagar', 'Aizawl', 'Ajmer', 'Akola', 'Aligarh', 'Allahabad', 'Alwar', 'Ambala', 'Amravati',
  'Amritsar', 'Anand', 'Anantapur', 'Asansol', 'Aurangabad', 'Bareilly', 'Barmer', 'Belagavi', 'Bellary', 'Bharatpur',
  'Bhavnagar', 'Bhilai', 'Bhilwara', 'Bhiwadi', 'Bhubaneswar', 'Bikaner', 'Bilaspur', 'Bokaro', 'Chittorgarh',
  'Churu', 'Cuttack', 'Darjeeling', 'Davanagere', 'Dehradun', 'Dewas', 'Dhanbad', 'Dharamshala', 'Dhule', 'Dibrugarh',
  'Dindigul', 'Durgapur', 'Erode', 'Gandhinagar', 'Gangtok', 'Gaya', 'Gorakhpur', 'Greater Noida', 'Gulbarga', 'Guntur',
  'Guwahati', 'Gwalior', 'Haldwani', 'Haridwar', 'Hisar', 'Hosur', 'Howrah', 'Hubballi', 'Imphal', 'Itanagar', 'Jabalpur',
  'Jaisalmer', 'Jalandhar', 'Jalgaon', 'Jammu', 'Jamnagar', 'Jamshedpur', 'Jhansi', 'Jhunjhunu', 'Junagadh', 'Kakinada',
  'Kalyan', 'Kannur', 'Kanpur', 'Karnal', 'Kharagpur', 'Kishangarh', 'Kohima', 'Kolhapur', 'Kollam', 'Kozhikode',
  'Kurnool', 'Latur', 'Ludhiana', 'Madurai', 'Mangaluru', 'Manipal', 'Mathura', 'Meerut', 'Mohali', 'Moradabad',
  'Muzaffarpur', 'Nanded', 'Nashik', 'Nellore', 'Nizamabad', 'Ooty', 'Panaji', 'Panipat', 'Patiala', 'Patna',
  'Pondicherry', 'Port Blair', 'Prayagraj', 'Raipur', 'Rajahmundry', 'Rajkot', 'Ranchi', 'Ratlam', 'Rishikesh',
  'Rohtak', 'Rourkela', 'Saharanpur', 'Salem', 'Sambalpur', 'Sangli', 'Satara', 'Secunderabad', 'Shillong', 'Shimla',
  'Sikar', 'Silchar', 'Siliguri', 'Solapur', 'Sonipat', 'Sri Ganganagar', 'Srinagar', 'Thiruvananthapuram', 'Thrissur',
  'Tiruchirappalli', 'Tirunelveli', 'Tirupati', 'Tiruppur', 'Udupi', 'Ujjain', 'Vapi', 'Varanasi', 'Vellore', 'Vijayawada',
  'Warangal', 'Zirakpur',
  // Older or everyday names people still type.
  'Bangalore', 'Gurgaon', 'Bombay', 'Calcutta', 'Madras', 'Mysore', 'Mangalore', 'Trivandrum', 'Cochin', 'Baroda', 'Vizag',
];
export const CITIES = [...MAJOR_CITIES, ...OTHER_CITIES, 'Remote'];

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands', 'Chandigarh UT', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi NCR',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Everything a location box suggests: cities first, then states, then "Remote".
export const LOCATIONS = [...MAJOR_CITIES, ...OTHER_CITIES, ...STATES, 'Remote'];
