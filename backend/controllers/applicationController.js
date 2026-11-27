const PlacementDrive = require('../models/PlacementDrive');
const StudentProfile = require('../models/StudentProfile');
const Skill = require('../models/Skill');
const Application = require('../models/Application');
const { evaluateEligibility } = require('../services/eligibilityService');
const { calculateSkillMatch } = require('../services/skillMatchService');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const applyToDrive = asyncHandler(async (req, res) => {
  const { driveId } = req.body;
  const userId = req.user._id;

  const drive = await PlacementDrive.findById(driveId).populate('company', 'name');
  if (!drive) {
    throw new ApiError(404, 'Placement drive not found.');
  }

  const [profile, skills, existingApplication] = await Promise.all([
    StudentProfile.findOne({ user: userId }),
    Skill.find({ student: userId }),
    Application.findOne({ student: userId, drive: drive._id }),
  ]);

  if (existingApplication) {
    throw new ApiError(409, 'You have already applied to this placement drive.');
  }

  const eligibility = evaluateEligibility(profile, drive);
  if (!eligibility.eligible) {
    throw new ApiError(
      400,
      `You are not eligible for this placement drive: ${eligibility.reasons.join(' ')}`,
      eligibility.reasons.map((msg) => ({ field: 'eligibility', message: msg }))
    );
  }

  const skillMatch = calculateSkillMatch(skills, drive.requiredSkills);

  const application = await Application.create({
    student: userId,
    studentProfile: profile._id,
    drive: drive._id,
    status: 'Applied',
    eligibilitySnapshot: {
      eligible: eligibility.eligible,
      reasons: eligibility.reasons,
    },
    skillMatchSnapshot: {
      matchPercentage: skillMatch.matchPercentage,
      matchedSkills: skillMatch.matchedSkills,
      missingSkills: skillMatch.missingSkills,
      totalRequired: skillMatch.totalRequired,
    },
  });

  return res.status(201).json({
    success: true,
    message: `Successfully applied to ${drive.title} at ${drive.company ? drive.company.name : 'Company'}.`,
    application,
  });
});

const getMyApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { student: req.user._id };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'drive',
      populate: { path: 'company', select: 'name location industry' },
    })
    .sort({ appliedAt: -1 });

  return res.status(200).json({
    success: true,
    applications,
  });
});

module.exports = {
  applyToDrive,
  getMyApplications,
};
