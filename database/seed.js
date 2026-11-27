const path = require('path');

// Allow running `node database/seed.js` from project root while dependencies live in backend/node_modules
module.paths.push(path.join(__dirname, '..', 'backend', 'node_modules'));

const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDatabase, mongoose } = require('../backend/config/database');
const User = require('../backend/models/User');
const StudentProfile = require('../backend/models/StudentProfile');
const Skill = require('../backend/models/Skill');
const Project = require('../backend/models/Project');
const Certification = require('../backend/models/Certification');
const Company = require('../backend/models/Company');
const PlacementDrive = require('../backend/models/PlacementDrive');
const Application = require('../backend/models/Application');
const { evaluateEligibility } = require('../backend/services/eligibilityService');
const { calculateSkillMatch } = require('../backend/services/skillMatchService');

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function seedDatabase() {
  console.log('Clearing existing collections...');
  await Promise.all([
    Application.deleteMany({}),
    PlacementDrive.deleteMany({}),
    Company.deleteMany({}),
    Certification.deleteMany({}),
    Project.deleteMany({}),
    Skill.deleteMany({}),
    StudentProfile.deleteMany({}),
    User.deleteMany({}),
  ]);

  console.log('Creating demo Admin and Student accounts...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);

  const adminUser = await User.create({
    name: 'Dr. Rajesh Nautiyal (T&P Officer)',
    email: 'admin@dbuu.ac.in',
    passwordHash: adminPasswordHash,
    role: 'admin',
  });

  const [student1, student2, student3] = await User.create([
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@student.dbuu.ac.in',
      passwordHash: studentPasswordHash,
      role: 'student',
    },
    {
      name: 'Priya Rawat',
      email: 'priya.rawat@student.dbuu.ac.in',
      passwordHash: studentPasswordHash,
      role: 'student',
    },
    {
      name: 'Rohan Bisht',
      email: 'rohan.bisht@student.dbuu.ac.in',
      passwordHash: studentPasswordHash,
      role: 'student',
    },
  ]);

  const [profile1, profile2, profile3] = await StudentProfile.create([
    {
      user: student1._id,
      rollNumber: 'DBUU22CSE001',
      department: 'Computer Science & Engineering',
      branch: 'CSE',
      academicYear: '3rd Year',
      semester: 6,
      cgpa: 8.45,
      backlogs: 0,
      phone: '9876543210',
      address: 'Prem Nagar, Dehradun, Uttarakhand',
      linkedinUrl: 'https://linkedin.com/in/aarav-sharma-demo',
      githubUrl: 'https://github.com/aarav-sharma-demo',
      bio: 'B.Tech CSE undergraduate focused on full-stack web development and problem solving.',
    },
    {
      user: student2._id,
      rollNumber: 'DBUU22CSE014',
      department: 'Computer Science & Engineering',
      branch: 'CSE',
      academicYear: '3rd Year',
      semester: 6,
      cgpa: 6.4,
      backlogs: 1,
      phone: '9876543211',
      address: 'Ballupur Road, Dehradun, Uttarakhand',
      bio: 'CSE student learning backend development and database management.',
    },
    {
      user: student3._id,
      rollNumber: 'DBUU22ECE008',
      department: 'Electronics & Communication Engineering',
      branch: 'ECE',
      academicYear: '4th Year',
      semester: 7,
      cgpa: 7.8,
      backlogs: 0,
      phone: '9876543212',
      address: 'Clement Town, Dehradun, Uttarakhand',
      bio: 'ECE final-year student interested in embedded C, Java, and software engineering.',
    },
  ]);

  console.log('Adding demo skills, projects, and certifications...');
  const student1Skills = await Skill.create([
    { student: student1._id, name: 'JavaScript', normalizedName: 'javascript', category: 'technical', proficiency: 'Advanced' },
    { student: student1._id, name: 'Node.js', normalizedName: 'node.js', category: 'technical', proficiency: 'Intermediate' },
    { student: student1._id, name: 'Express.js', normalizedName: 'express.js', category: 'technical', proficiency: 'Intermediate' },
    { student: student1._id, name: 'MongoDB', normalizedName: 'mongodb', category: 'technical', proficiency: 'Intermediate' },
    { student: student1._id, name: 'HTML5', normalizedName: 'html5', category: 'technical', proficiency: 'Advanced' },
    { student: student1._id, name: 'CSS3', normalizedName: 'css3', category: 'technical', proficiency: 'Advanced' },
    { student: student1._id, name: 'SQL', normalizedName: 'sql', category: 'technical', proficiency: 'Intermediate' },
    { student: student1._id, name: 'Communication', normalizedName: 'communication', category: 'soft', proficiency: 'Advanced' },
    { student: student1._id, name: 'Teamwork', normalizedName: 'teamwork', category: 'soft', proficiency: 'Advanced' },
  ]);

  await Skill.create([
    { student: student2._id, name: 'HTML5', normalizedName: 'html5', category: 'technical', proficiency: 'Intermediate' },
    { student: student2._id, name: 'CSS3', normalizedName: 'css3', category: 'technical', proficiency: 'Intermediate' },
    { student: student2._id, name: 'Python', normalizedName: 'python', category: 'technical', proficiency: 'Beginner' },
    { student: student2._id, name: 'Time Management', normalizedName: 'time management', category: 'soft', proficiency: 'Intermediate' },
    { student: student3._id, name: 'Java', normalizedName: 'java', category: 'technical', proficiency: 'Intermediate' },
    { student: student3._id, name: 'SQL', normalizedName: 'sql', category: 'technical', proficiency: 'Intermediate' },
    { student: student3._id, name: 'C++', normalizedName: 'c++', category: 'technical', proficiency: 'Advanced' },
    { student: student3._id, name: 'Problem Solving', normalizedName: 'problem solving', category: 'soft', proficiency: 'Advanced' },
  ]);

  await Project.create([
    {
      student: student1._id,
      title: 'Campus Library Issue Tracker',
      description: 'Web application to track book lending, student fines, and catalog search using Node.js and MongoDB.',
      techStack: ['Node.js', 'Express.js', 'MongoDB', 'HTML5', 'CSS3'],
      role: 'Full-Stack Developer',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-11-15'),
      githubUrl: 'https://github.com/aarav-sharma-demo/library-tracker',
    },
    {
      student: student1._id,
      title: 'Student Attendance REST API',
      description: 'RESTful backend service with role-based login for faculty attendance submission.',
      techStack: ['JavaScript', 'Express.js', 'MongoDB'],
      role: 'Backend Developer',
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-03-20'),
    },
    {
      student: student3._id,
      title: 'Smart Energy Meter Monitor',
      description: 'Microcontroller telemetry collector with SQL reporting dashboard.',
      techStack: ['C++', 'SQL'],
      role: 'Developer',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-10'),
    },
  ]);

  await Certification.create([
    {
      student: student1._id,
      title: 'MongoDB Node.js Developer Path',
      issuingOrganization: 'MongoDB University',
      issueDate: new Date('2026-02-12'),
      credentialId: 'MDB-DEMO-4092',
    },
    {
      student: student1._id,
      title: 'Responsive Web Design',
      issuingOrganization: 'freeCodeCamp',
      issueDate: new Date('2025-07-18'),
      credentialId: 'FCC-DEMO-1823',
    },
    {
      student: student3._id,
      title: 'Core Java Programming',
      issuingOrganization: 'NPTEL / IIT',
      issueDate: new Date('2025-10-25'),
      credentialId: 'NPTEL-JAVA-901',
    },
  ]);

  console.log('Creating demo companies and placement drives...');
  const [company1, company2, company3, company4] = await Company.create([
    {
      name: 'Rubico IT Pvt. Ltd.',
      industry: 'Software Development & Web Engineering',
      location: 'Dehradun, Uttarakhand',
      website: 'https://rubicotech.com',
      hrName: 'Meenakshi Joshi',
      hrEmail: 'careers@rubicotech-demo.example',
      description: 'Custom web and mobile engineering studio headquartered in Dehradun.',
    },
    {
      name: 'Infosys Limited',
      industry: 'IT Services & Consulting',
      location: 'Bengaluru / Chandigarh',
      website: 'https://www.infosys.com',
      hrName: 'Sandeep Kulkarni',
      hrEmail: 'campus@infosys-demo.example',
      description: 'Global enterprise technology consulting and digital services company.',
    },
    {
      name: 'TCS Digital',
      industry: 'Enterprise Software & Cloud',
      location: 'Noida / Gurugram',
      website: 'https://www.tcs.com',
      hrName: 'Ananya Verma',
      hrEmail: 'recruitment@tcs-demo.example',
      description: 'Tata Consultancy Services digital engineering hiring track.',
    },
    {
      name: 'Coforge Limited',
      industry: 'Digital Solutions & QA',
      location: 'Greater Noida, UP',
      website: 'https://www.coforge.com',
      hrName: 'Vikram Mehta',
      hrEmail: 'talent@coforge-demo.example',
      description: 'IT solutions provider specializing in enterprise platforms and cloud.',
    },
  ]);

  const [drive1, drive2, drive3, drive4, drive5] = await PlacementDrive.create([
    {
      company: company1._id,
      title: 'Associate Full-Stack Developer Drive 2026',
      jobRole: 'Associate Software Engineer',
      description:
        'Work on production web applications using JavaScript, Node.js, REST APIs, and MongoDB. Includes 6-month structured mentorship in Dehradun.',
      packageLPA: 5.5,
      location: 'Dehradun, Uttarakhand',
      jobType: 'Full-Time',
      minCgpa: 6.5,
      maxBacklogs: 0,
      eligibleBranches: ['CSE', 'IT', 'AI & ML'],
      requiredSkills: ['JavaScript', 'Node.js', 'Express.js', 'MongoDB', 'HTML5', 'CSS3', 'Git'],
      applicationDeadline: daysFromNow(25),
      driveDate: daysFromNow(32),
      status: 'Open',
      createdBy: adminUser._id,
    },
    {
      company: company2._id,
      title: 'Infosys Systems Engineer Campus Drive',
      jobRole: 'Systems Engineer',
      description:
        'Entry-level software engineering role involving enterprise application development, SQL databases, and testing.',
      packageLPA: 4.5,
      location: 'Chandigarh / Pune',
      jobType: 'Full-Time',
      minCgpa: 6.0,
      maxBacklogs: 1,
      eligibleBranches: ['CSE', 'IT', 'ECE', 'EEE'],
      requiredSkills: ['Java', 'SQL', 'Problem Solving', 'Communication'],
      applicationDeadline: daysFromNow(20),
      driveDate: daysFromNow(28),
      status: 'Open',
      createdBy: adminUser._id,
    },
    {
      company: company3._id,
      title: 'TCS Digital Cloud & Backend Hiring',
      jobRole: 'Digital Software Engineer',
      description:
        'Hiring strong programmers with solid knowledge of backend APIs, data structures, Docker, and cloud fundamentals.',
      packageLPA: 7.25,
      location: 'Noida, Uttar Pradesh',
      jobType: 'Full-Time',
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: ['CSE', 'IT'],
      requiredSkills: ['JavaScript', 'Node.js', 'SQL', 'Docker', 'Data Structures', 'React'],
      applicationDeadline: daysFromNow(18),
      driveDate: daysFromNow(26),
      status: 'Open',
      createdBy: adminUser._id,
    },
    {
      company: company4._id,
      title: 'Coforge Summer Technical Internship',
      jobRole: 'Software Engineering Intern',
      description:
        'Six-month internship with pre-placement offer evaluation for final and pre-final year students.',
      packageLPA: 4.0,
      location: 'Greater Noida, UP',
      jobType: 'Internship + PPO',
      minCgpa: 6.5,
      maxBacklogs: 0,
      eligibleBranches: ['ALL'],
      requiredSkills: ['Python', 'SQL', 'Communication'],
      applicationDeadline: daysFromNow(35),
      driveDate: daysFromNow(42),
      status: 'Upcoming',
      createdBy: adminUser._id,
    },
    {
      company: company1._id,
      title: 'Frontend Trainee Drive (2025 Batch)',
      jobRole: 'Frontend Developer Trainee',
      description: 'Completed recruitment drive for UI engineering trainees.',
      packageLPA: 4.2,
      location: 'Dehradun, Uttarakhand',
      jobType: 'Full-Time',
      minCgpa: 6.0,
      maxBacklogs: 0,
      eligibleBranches: ['CSE', 'IT'],
      requiredSkills: ['HTML5', 'CSS3', 'JavaScript'],
      applicationDeadline: daysFromNow(-10),
      driveDate: daysFromNow(-5),
      status: 'Closed',
      createdBy: adminUser._id,
    },
  ]);

  console.log('Creating demo applications...');
  const d1Eligibility = evaluateEligibility(profile1, drive1);
  const d1Match = calculateSkillMatch(student1Skills, drive1.requiredSkills);

  await Application.create({
    student: student1._id,
    studentProfile: profile1._id,
    drive: drive1._id,
    status: 'Shortlisted',
    eligibilitySnapshot: {
      eligible: d1Eligibility.eligible,
      reasons: d1Eligibility.reasons,
    },
    skillMatchSnapshot: {
      matchPercentage: d1Match.matchPercentage,
      matchedSkills: d1Match.matchedSkills,
      missingSkills: d1Match.missingSkills,
      totalRequired: d1Match.totalRequired,
    },
    remarks: 'Shortlisted for technical interview round.',
  });

  const student3Skills = await Skill.find({ student: student3._id });
  const d2Eligibility = evaluateEligibility(profile3, drive2);
  const d2Match = calculateSkillMatch(student3Skills, drive2.requiredSkills);

  await Application.create({
    student: student3._id,
    studentProfile: profile3._id,
    drive: drive2._id,
    status: 'Under Review',
    eligibilitySnapshot: {
      eligible: d2Eligibility.eligible,
      reasons: d2Eligibility.reasons,
    },
    skillMatchSnapshot: {
      matchPercentage: d2Match.matchPercentage,
      matchedSkills: d2Match.matchedSkills,
      missingSkills: d2Match.missingSkills,
      totalRequired: d2Match.totalRequired,
    },
    remarks: 'Academic records verified by T&P Cell.',
  });

  console.log('Seed completed successfully.');
  console.log('Demo Credentials:');
  console.log('  Admin   -> admin@dbuu.ac.in / Admin@123');
  console.log('  Student -> aarav.sharma@student.dbuu.ac.in / Student@123');
  console.log('  Student -> priya.rawat@student.dbuu.ac.in / Student@123');
  console.log('  Student -> rohan.bisht@student.dbuu.ac.in / Student@123');
}

if (require.main === module) {
  connectDatabase()
    .then(() => seedDatabase())
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seed failed:', err.message);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = { seedDatabase };
