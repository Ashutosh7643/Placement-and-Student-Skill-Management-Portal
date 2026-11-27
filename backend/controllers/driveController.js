const PlacementDrive = require('../models/PlacementDrive');
const StudentProfile = require('../models/StudentProfile');
const Skill = require('../models/Skill');
const Application = require('../models/Application');
const { evaluateEligibility } = require('../services/eligibilityService');
const { calculateSkillMatch } = require('../services/skillMatchService');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const listDrives = asyncHandler(async (req, res) => {
  const { q, status, branch, minPackage, eligibility: eligibilityFilter } = req.query;

  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (branch && branch !== 'all') {
    const b = String(branch).trim().toUpperCase();
    query.eligibleBranches = { $in: [b, 'ALL'] };
  }
  if (minPackage !== undefined && minPackage !== '') {
    const parsedMin = Number(minPackage);
    if (!Number.isNaN(parsedMin)) {
      query.packageLPA = { $gte: parsedMin };
    }
  }

  let drives = await PlacementDrive.find(query)
    .populate('company', 'name industry location website description')
    .sort({ applicationDeadline: 1, createdAt: -1 });

  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase();
    drives = drives.filter((d) => {
      const companyName = d.company && d.company.name ? d.company.name.toLowerCase() : '';
      const title = (d.title || '').toLowerCase();
      const role = (d.jobRole || '').toLowerCase();
      const location = (d.location || '').toLowerCase();
      const skillsText = (d.requiredSkills || []).join(' ').toLowerCase();
      return (
        companyName.includes(needle) ||
        title.includes(needle) ||
        role.includes(needle) ||
        location.includes(needle) ||
        skillsText.includes(needle)
      );
    });
  }

  if (req.user && req.user.role === 'student') {
    const [profile, skills, applications] = await Promise.all([
      StudentProfile.findOne({ user: req.user._id }),
      Skill.find({ student: req.user._id }),
      Application.find({ student: req.user._id }).select('drive status appliedAt'),
    ]);

    const appByDrive = new Map(
      applications.map((a) => [a.drive.toString(), { id: a._id, status: a.status, appliedAt: a.appliedAt }])
    );

    let enriched = drives.map((drive) => {
      const eligibility = evaluateEligibility(profile, drive);
      const skillMatch = calculateSkillMatch(skills, drive.requiredSkills);
      const existingApp = appByDrive.get(drive._id.toString()) || null;
      return {
        ...drive.toObject(),
        eligibility,
        skillMatch,
        hasApplied: Boolean(existingApp),
        application: existingApp,
      };
    });

    if (eligibilityFilter === 'eligible') {
      enriched = enriched.filter((d) => d.eligibility.eligible);
    } else if (eligibilityFilter === 'not_eligible') {
      enriched = enriched.filter((d) => !d.eligibility.eligible);
    }

    return res.status(200).json({ success: true, drives: enriched });
  }

  return res.status(200).json({ success: true, drives });
});

const getDriveDetails = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id).populate(
    'company',
    'name industry location website hrName hrEmail description'
  );
  if (!drive) {
    throw new ApiError(404, 'Placement drive not found.');
  }

  if (req.user && req.user.role === 'student') {
    const [profile, skills, existingApplication] = await Promise.all([
      StudentProfile.findOne({ user: req.user._id }),
      Skill.find({ student: req.user._id }),
      Application.findOne({ student: req.user._id, drive: drive._id }),
    ]);

    const eligibility = evaluateEligibility(profile, drive);
    const skillMatch = calculateSkillMatch(skills, drive.requiredSkills);

    return res.status(200).json({
      success: true,
      drive: {
        ...drive.toObject(),
        eligibility,
        skillMatch,
        hasApplied: Boolean(existingApplication),
        application: existingApplication,
      },
    });
  }

  return res.status(200).json({ success: true, drive });
});

const evaluateDriveForStudent = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id).populate('company', 'name');
  if (!drive) {
    throw new ApiError(404, 'Placement drive not found.');
  }

  const [profile, skills] = await Promise.all([
    StudentProfile.findOne({ user: req.user._id }),
    Skill.find({ student: req.user._id }),
  ]);

  const eligibility = evaluateEligibility(profile, drive);
  const skillMatch = calculateSkillMatch(skills, drive.requiredSkills);

  return res.status(200).json({
    success: true,
    driveId: drive._id,
    driveTitle: drive.title,
    companyName: drive.company ? drive.company.name : '',
    eligibility,
    skillMatch,
  });
});

module.exports = {
  listDrives,
  getDriveDetails,
  evaluateDriveForStudent,
};
