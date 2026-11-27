const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Certification = require('../models/Certification');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const { evaluateEligibility } = require('../services/eligibilityService');
const { calculateSkillMatch } = require('../services/skillMatchService');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, skills, projectsCount, certificationsCount, applications, openDrives] =
    await Promise.all([
      StudentProfile.findOne({ user: userId }),
      Skill.find({ student: userId }),
      Project.countDocuments({ student: userId }),
      Certification.countDocuments({ student: userId }),
      Application.find({ student: userId })
        .populate({
          path: 'drive',
          populate: { path: 'company', select: 'name location' },
        })
        .sort({ appliedAt: -1 }),
      PlacementDrive.find({ status: 'Open' })
        .populate('company', 'name location industry')
        .sort({ applicationDeadline: 1 }),
    ]);

  const technicalSkillsCount = skills.filter((s) => s.category === 'technical').length;
  const softSkillsCount = skills.filter((s) => s.category === 'soft').length;

  const statusBreakdown = {
    Applied: 0,
    'Under Review': 0,
    Shortlisted: 0,
    Rejected: 0,
    Selected: 0,
  };
  for (const app of applications) {
    if (Object.prototype.hasOwnProperty.call(statusBreakdown, app.status)) {
      statusBreakdown[app.status] += 1;
    }
  }

  const appliedDriveIds = new Set(
    applications.filter((a) => a.drive).map((a) => a.drive._id.toString())
  );

  const evaluatedDrives = openDrives.map((drive) => {
    const eligibility = evaluateEligibility(profile, drive);
    const skillMatch = calculateSkillMatch(skills, drive.requiredSkills);
    return {
      _id: drive._id,
      title: drive.title,
      jobRole: drive.jobRole,
      company: drive.company,
      packageLPA: drive.packageLPA,
      location: drive.location,
      applicationDeadline: drive.applicationDeadline,
      status: drive.status,
      eligibility,
      skillMatch,
      hasApplied: appliedDriveIds.has(drive._id.toString()),
    };
  });

  const eligibleOpenDrivesCount = evaluatedDrives.filter((d) => d.eligibility.eligible).length;

  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
    profile,
    stats: {
      technicalSkillsCount,
      softSkillsCount,
      totalSkillsCount: skills.length,
      projectsCount,
      certificationsCount,
      applicationsCount: applications.length,
      eligibleOpenDrivesCount,
      openDrivesCount: openDrives.length,
      statusBreakdown,
    },
    recentApplications: applications.slice(0, 5),
    recommendedDrives: evaluatedDrives.slice(0, 5),
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
    profile,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    rollNumber,
    department,
    branch,
    academicYear,
    semester,
    cgpa,
    backlogs,
    phone,
    address,
    linkedinUrl,
    githubUrl,
    bio,
  } = req.body;

  if (name) {
    await User.findByIdAndUpdate(req.user._id, { name: String(name).trim() }, { runValidators: true });
  }

  const normalizedRoll = String(rollNumber).trim().toUpperCase();
  const duplicateRoll = await StudentProfile.findOne({
    rollNumber: normalizedRoll,
    user: { $ne: req.user._id },
  });
  if (duplicateRoll) {
    throw new ApiError(409, 'Another student is already registered with this Roll Number.');
  }

  const profileData = {
    user: req.user._id,
    rollNumber: normalizedRoll,
    department: String(department).trim(),
    branch: String(branch).trim().toUpperCase(),
    academicYear: String(academicYear).trim(),
    semester: Number(semester),
    cgpa: Number(cgpa),
    backlogs: Number(backlogs ?? 0),
    phone: phone !== undefined ? String(phone).trim() : '',
    address: address !== undefined ? String(address).trim() : '',
    linkedinUrl: linkedinUrl !== undefined ? String(linkedinUrl).trim() : '',
    githubUrl: githubUrl !== undefined ? String(githubUrl).trim() : '',
    bio: bio !== undefined ? String(bio).trim() : '',
  };

  const profile = await StudentProfile.findOneAndUpdate(
    { user: req.user._id },
    profileData,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const updatedUser = await User.findById(req.user._id).select('-passwordHash');

  return res.status(200).json({
    success: true,
    message: 'Student profile updated successfully.',
    user: updatedUser.toSafeObject(),
    profile,
  });
});

// --- Skills CRUD ---
const listSkills = asyncHandler(async (req, res) => {
  const filter = { student: req.user._id };
  if (req.query.category && ['technical', 'soft'].includes(req.query.category)) {
    filter.category = req.query.category;
  }
  const skills = await Skill.find(filter).sort({ category: 1, name: 1 });
  return res.status(200).json({ success: true, skills });
});

const addSkill = asyncHandler(async (req, res) => {
  const { name, category, proficiency } = req.body;
  const trimmedName = String(name).trim();
  const normalizedName = trimmedName.toLowerCase();

  const existing = await Skill.findOne({
    student: req.user._id,
    category,
    normalizedName,
  });
  if (existing) {
    throw new ApiError(
      409,
      `The ${category} skill "${existing.name}" is already in your profile.`
    );
  }

  const skill = await Skill.create({
    student: req.user._id,
    name: trimmedName,
    normalizedName,
    category,
    proficiency: proficiency || 'Intermediate',
  });

  return res.status(201).json({
    success: true,
    message: 'Skill added successfully.',
    skill,
  });
});

const updateSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, proficiency } = req.body;

  const skill = await Skill.findOne({ _id: id, student: req.user._id });
  if (!skill) {
    throw new ApiError(404, 'Skill not found.');
  }

  const nextName = name !== undefined ? String(name).trim() : skill.name;
  const nextCategory = category !== undefined ? category : skill.category;
  const nextNormalized = nextName.toLowerCase();

  const duplicate = await Skill.findOne({
    _id: { $ne: skill._id },
    student: req.user._id,
    category: nextCategory,
    normalizedName: nextNormalized,
  });
  if (duplicate) {
    throw new ApiError(
      409,
      `The ${nextCategory} skill "${duplicate.name}" already exists in your profile.`
    );
  }

  skill.name = nextName;
  skill.normalizedName = nextNormalized;
  skill.category = nextCategory;
  if (proficiency !== undefined) {
    skill.proficiency = proficiency;
  }
  await skill.save();

  return res.status(200).json({
    success: true,
    message: 'Skill updated successfully.',
    skill,
  });
});

const deleteSkill = asyncHandler(async (req, res) => {
  const deleted = await Skill.findOneAndDelete({
    _id: req.params.id,
    student: req.user._id,
  });
  if (!deleted) {
    throw new ApiError(404, 'Skill not found.');
  }
  return res.status(200).json({
    success: true,
    message: 'Skill deleted successfully.',
  });
});

// --- Projects CRUD ---
const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ student: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json({ success: true, projects });
});

const addProject = asyncHandler(async (req, res) => {
  const { title, description, techStack, role, startDate, endDate, projectUrl, githubUrl } = req.body;
  const cleanTechStack = Array.isArray(techStack)
    ? techStack.map((t) => String(t).trim()).filter(Boolean)
    : String(techStack || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const project = await Project.create({
    student: req.user._id,
    title: String(title).trim(),
    description: String(description).trim(),
    techStack: cleanTechStack,
    role: role ? String(role).trim() : '',
    startDate: startDate || null,
    endDate: endDate || null,
    projectUrl: projectUrl ? String(projectUrl).trim() : '',
    githubUrl: githubUrl ? String(githubUrl).trim() : '',
  });

  return res.status(201).json({
    success: true,
    message: 'Project added successfully.',
    project,
  });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, student: req.user._id });
  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }

  const { title, description, techStack, role, startDate, endDate, projectUrl, githubUrl } = req.body;
  if (title !== undefined) project.title = String(title).trim();
  if (description !== undefined) project.description = String(description).trim();
  if (techStack !== undefined) {
    project.techStack = Array.isArray(techStack)
      ? techStack.map((t) => String(t).trim()).filter(Boolean)
      : String(techStack || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
  }
  if (role !== undefined) project.role = String(role).trim();
  if (startDate !== undefined) project.startDate = startDate || null;
  if (endDate !== undefined) project.endDate = endDate || null;
  if (projectUrl !== undefined) project.projectUrl = String(projectUrl).trim();
  if (githubUrl !== undefined) project.githubUrl = String(githubUrl).trim();

  await project.save();
  return res.status(200).json({
    success: true,
    message: 'Project updated successfully.',
    project,
  });
});

const deleteProject = asyncHandler(async (req, res) => {
  const deleted = await Project.findOneAndDelete({
    _id: req.params.id,
    student: req.user._id,
  });
  if (!deleted) {
    throw new ApiError(404, 'Project not found.');
  }
  return res.status(200).json({
    success: true,
    message: 'Project deleted successfully.',
  });
});

// --- Certifications CRUD ---
const listCertifications = asyncHandler(async (req, res) => {
  const certifications = await Certification.find({ student: req.user._id }).sort({ issueDate: -1 });
  return res.status(200).json({ success: true, certifications });
});

const addCertification = asyncHandler(async (req, res) => {
  const { title, issuingOrganization, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
  const certification = await Certification.create({
    student: req.user._id,
    title: String(title).trim(),
    issuingOrganization: String(issuingOrganization).trim(),
    issueDate,
    expiryDate: expiryDate || null,
    credentialId: credentialId ? String(credentialId).trim() : '',
    credentialUrl: credentialUrl ? String(credentialUrl).trim() : '',
  });

  return res.status(201).json({
    success: true,
    message: 'Certification added successfully.',
    certification,
  });
});

const updateCertification = asyncHandler(async (req, res) => {
  const certification = await Certification.findOne({ _id: req.params.id, student: req.user._id });
  if (!certification) {
    throw new ApiError(404, 'Certification not found.');
  }

  const { title, issuingOrganization, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
  if (title !== undefined) certification.title = String(title).trim();
  if (issuingOrganization !== undefined) {
    certification.issuingOrganization = String(issuingOrganization).trim();
  }
  if (issueDate !== undefined) certification.issueDate = issueDate;
  if (expiryDate !== undefined) certification.expiryDate = expiryDate || null;
  if (credentialId !== undefined) certification.credentialId = String(credentialId).trim();
  if (credentialUrl !== undefined) certification.credentialUrl = String(credentialUrl).trim();

  await certification.save();
  return res.status(200).json({
    success: true,
    message: 'Certification updated successfully.',
    certification,
  });
});

const deleteCertification = asyncHandler(async (req, res) => {
  const deleted = await Certification.findOneAndDelete({
    _id: req.params.id,
    student: req.user._id,
  });
  if (!deleted) {
    throw new ApiError(404, 'Certification not found.');
  }
  return res.status(200).json({
    success: true,
    message: 'Certification deleted successfully.',
  });
});

module.exports = {
  getDashboardSummary,
  getProfile,
  updateProfile,
  listSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  listProjects,
  addProject,
  updateProject,
  deleteProject,
  listCertifications,
  addCertification,
  updateCertification,
  deleteCertification,
};
