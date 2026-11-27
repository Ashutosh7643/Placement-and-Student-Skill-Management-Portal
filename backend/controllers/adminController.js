const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Certification = require('../models/Certification');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const { APPLICATION_STATUSES } = require('../models/Application');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

function normalizeStringList(value, upperCase = false) {
  const rawList = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim());

  const seen = new Set();
  const cleaned = [];
  for (const item of rawList) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    const formatted = upperCase ? trimmed.toUpperCase() : trimmed;
    const key = formatted.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(formatted);
    }
  }
  return cleaned;
}

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    activeStudents,
    totalCompanies,
    totalDrives,
    openDrives,
    totalApplications,
    statusCountsRaw,
    recentApplications,
    recentDrives,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', isActive: true }),
    Company.countDocuments(),
    PlacementDrive.countDocuments(),
    PlacementDrive.countDocuments({ status: 'Open' }),
    Application.countDocuments(),
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.find()
      .populate('student', 'name email')
      .populate('studentProfile', 'rollNumber branch cgpa')
      .populate({
        path: 'drive',
        select: 'title jobRole',
        populate: { path: 'company', select: 'name' },
      })
      .sort({ appliedAt: -1 })
      .limit(6),
    PlacementDrive.find()
      .populate('company', 'name location')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const statusBreakdown = {};
  for (const status of APPLICATION_STATUSES) {
    statusBreakdown[status] = 0;
  }
  for (const item of statusCountsRaw) {
    statusBreakdown[item._id] = item.count;
  }

  return res.status(200).json({
    success: true,
    stats: {
      totalStudents,
      activeStudents,
      totalCompanies,
      totalDrives,
      openDrives,
      totalApplications,
      selectedStudents: statusBreakdown.Selected || 0,
      shortlistedStudents: statusBreakdown.Shortlisted || 0,
      statusBreakdown,
    },
    recentApplications,
    recentDrives,
  });
});

// --- Student Management ---
const listStudents = asyncHandler(async (req, res) => {
  const { q, branch, minCgpa, maxBacklogs } = req.query;

  const profileFilter = {};
  if (branch && branch !== 'all') {
    profileFilter.branch = String(branch).trim().toUpperCase();
  }
  if (minCgpa !== undefined && minCgpa !== '') {
    const val = Number(minCgpa);
    if (!Number.isNaN(val)) profileFilter.cgpa = { $gte: val };
  }
  if (maxBacklogs !== undefined && maxBacklogs !== '') {
    const val = Number(maxBacklogs);
    if (!Number.isNaN(val)) profileFilter.backlogs = { $lte: val };
  }

  const profiles = await StudentProfile.find(profileFilter)
    .populate('user', 'name email role isActive createdAt')
    .sort({ cgpa: -1, rollNumber: 1 });

  const userIds = profiles.filter((p) => p.user).map((p) => p.user._id);
  const [skillCounts, appCounts] = await Promise.all([
    Skill.aggregate([
      { $match: { student: { $in: userIds } } },
      { $group: { _id: '$student', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { student: { $in: userIds } } },
      { $group: { _id: '$student', count: { $sum: 1 } } },
    ]),
  ]);

  const skillMap = new Map(skillCounts.map((s) => [s._id.toString(), s.count]));
  const appMap = new Map(appCounts.map((a) => [a._id.toString(), a.count]));

  let students = profiles
    .filter((p) => p.user && p.user.role === 'student')
    .map((p) => ({
      id: p.user._id,
      profileId: p._id,
      name: p.user.name,
      email: p.user.email,
      isActive: p.user.isActive,
      rollNumber: p.rollNumber,
      department: p.department,
      branch: p.branch,
      academicYear: p.academicYear,
      semester: p.semester,
      cgpa: p.cgpa,
      backlogs: p.backlogs,
      phone: p.phone,
      skillsCount: skillMap.get(p.user._id.toString()) || 0,
      applicationsCount: appMap.get(p.user._id.toString()) || 0,
    }));

  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase();
    students = students.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.email.toLowerCase().includes(needle) ||
        s.rollNumber.toLowerCase().includes(needle) ||
        s.branch.toLowerCase().includes(needle)
    );
  }

  return res.status(200).json({ success: true, students });
});

const getStudentDetails = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' }).select('-passwordHash');
  if (!user) {
    throw new ApiError(404, 'Student not found.');
  }

  const [profile, skills, projects, certifications, applications] = await Promise.all([
    StudentProfile.findOne({ user: user._id }),
    Skill.find({ student: user._id }).sort({ category: 1, name: 1 }),
    Project.find({ student: user._id }).sort({ createdAt: -1 }),
    Certification.find({ student: user._id }).sort({ issueDate: -1 }),
    Application.find({ student: user._id })
      .populate({
        path: 'drive',
        select: 'title jobRole packageLPA status',
        populate: { path: 'company', select: 'name' },
      })
      .sort({ appliedAt: -1 }),
  ]);

  return res.status(200).json({
    success: true,
    student: user.toSafeObject(),
    profile,
    skills,
    projects,
    certifications,
    applications,
  });
});

const updateStudentRecord = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' }).select('-passwordHash');
  if (!user) {
    throw new ApiError(404, 'Student not found.');
  }

  const {
    name,
    isActive,
    rollNumber,
    department,
    branch,
    academicYear,
    semester,
    cgpa,
    backlogs,
    phone,
  } = req.body;

  if (name !== undefined) user.name = String(name).trim();
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  await user.save();

  const profile = await StudentProfile.findOne({ user: user._id });
  if (profile) {
    if (rollNumber !== undefined) {
      const normalizedRoll = String(rollNumber).trim().toUpperCase();
      const dup = await StudentProfile.findOne({
        rollNumber: normalizedRoll,
        user: { $ne: user._id },
      });
      if (dup) {
        throw new ApiError(409, 'Roll number is already assigned to another student.');
      }
      profile.rollNumber = normalizedRoll;
    }
    if (department !== undefined) profile.department = String(department).trim();
    if (branch !== undefined) profile.branch = String(branch).trim().toUpperCase();
    if (academicYear !== undefined) profile.academicYear = String(academicYear).trim();
    if (semester !== undefined) profile.semester = Number(semester);
    if (cgpa !== undefined) profile.cgpa = Number(cgpa);
    if (backlogs !== undefined) profile.backlogs = Number(backlogs);
    if (phone !== undefined) profile.phone = String(phone).trim();
    await profile.save();
  }

  return res.status(200).json({
    success: true,
    message: 'Student record updated successfully.',
    student: user.toSafeObject(),
    profile,
  });
});

// --- Company Management ---
const listCompanies = asyncHandler(async (req, res) => {
  const { q, industry } = req.query;
  const filter = {};
  if (industry && industry !== 'all') {
    filter.industry = industry;
  }

  let companies = await Company.find(filter).sort({ name: 1 });
  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase();
    companies = companies.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.industry.toLowerCase().includes(needle) ||
        c.location.toLowerCase().includes(needle)
    );
  }

  const driveCounts = await PlacementDrive.aggregate([
    { $group: { _id: '$company', count: { $sum: 1 } } },
  ]);
  const driveCountMap = new Map(driveCounts.map((d) => [d._id.toString(), d.count]));

  const result = companies.map((c) => ({
    ...c.toObject(),
    drivesCount: driveCountMap.get(c._id.toString()) || 0,
  }));

  return res.status(200).json({ success: true, companies: result });
});

const createCompany = asyncHandler(async (req, res) => {
  const { name, industry, location, website, hrName, hrEmail, description } = req.body;
  const trimmedName = String(name).trim();

  const existing = await Company.findOne({
    name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (existing) {
    throw new ApiError(409, `Company "${existing.name}" already exists.`);
  }

  const company = await Company.create({
    name: trimmedName,
    industry: String(industry).trim(),
    location: String(location).trim(),
    website: website ? String(website).trim() : '',
    hrName: hrName ? String(hrName).trim() : '',
    hrEmail: hrEmail ? String(hrEmail).trim().toLowerCase() : '',
    description: description ? String(description).trim() : '',
  });

  return res.status(201).json({
    success: true,
    message: 'Company added successfully.',
    company,
  });
});

const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    throw new ApiError(404, 'Company not found.');
  }

  const { name, industry, location, website, hrName, hrEmail, description } = req.body;
  if (name !== undefined) {
    const trimmedName = String(name).trim();
    const duplicate = await Company.findOne({
      _id: { $ne: company._id },
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (duplicate) {
      throw new ApiError(409, `Another company named "${duplicate.name}" already exists.`);
    }
    company.name = trimmedName;
  }
  if (industry !== undefined) company.industry = String(industry).trim();
  if (location !== undefined) company.location = String(location).trim();
  if (website !== undefined) company.website = String(website).trim();
  if (hrName !== undefined) company.hrName = String(hrName).trim();
  if (hrEmail !== undefined) company.hrEmail = String(hrEmail).trim().toLowerCase();
  if (description !== undefined) company.description = String(description).trim();

  await company.save();
  return res.status(200).json({
    success: true,
    message: 'Company updated successfully.',
    company,
  });
});

const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    throw new ApiError(404, 'Company not found.');
  }

  const linkedDrivesCount = await PlacementDrive.countDocuments({ company: company._id });
  if (linkedDrivesCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete "${company.name}" because ${linkedDrivesCount} placement drive(s) are linked to it. Delete those drives first.`
    );
  }

  await Company.findByIdAndDelete(company._id);
  return res.status(200).json({
    success: true,
    message: 'Company deleted successfully.',
  });
});

// --- Placement Drive Management ---
const listDrivesAdmin = asyncHandler(async (req, res) => {
  const { q, status, companyId } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (companyId && companyId !== 'all') filter.company = companyId;

  let drives = await PlacementDrive.find(filter)
    .populate('company', 'name industry location')
    .sort({ createdAt: -1 });

  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase();
    drives = drives.filter((d) => {
      const cname = d.company && d.company.name ? d.company.name.toLowerCase() : '';
      return (
        d.title.toLowerCase().includes(needle) ||
        d.jobRole.toLowerCase().includes(needle) ||
        cname.includes(needle)
      );
    });
  }

  const appCounts = await Application.aggregate([
    { $group: { _id: '$drive', count: { $sum: 1 } } },
  ]);
  const appCountMap = new Map(appCounts.map((a) => [a._id.toString(), a.count]));

  const result = drives.map((d) => ({
    ...d.toObject(),
    applicationsCount: appCountMap.get(d._id.toString()) || 0,
  }));

  return res.status(200).json({ success: true, drives: result });
});

const createDrive = asyncHandler(async (req, res) => {
  const {
    company,
    title,
    jobRole,
    description,
    packageLPA,
    location,
    jobType,
    minCgpa,
    maxBacklogs,
    eligibleBranches,
    requiredSkills,
    applicationDeadline,
    driveDate,
    status,
  } = req.body;

  const companyDoc = await Company.findById(company);
  if (!companyDoc) {
    throw new ApiError(404, 'Selected company does not exist.');
  }

  const cleanBranches = normalizeStringList(eligibleBranches, true);
  if (cleanBranches.length === 0) {
    throw new ApiError(400, 'Please specify at least one eligible branch.');
  }

  const cleanSkills = normalizeStringList(requiredSkills, false);

  const drive = await PlacementDrive.create({
    company: companyDoc._id,
    title: String(title).trim(),
    jobRole: String(jobRole).trim(),
    description: String(description).trim(),
    packageLPA: Number(packageLPA),
    location: String(location).trim(),
    jobType: jobType || 'Full-Time',
    minCgpa: Number(minCgpa ?? 0),
    maxBacklogs: Number(maxBacklogs ?? 0),
    eligibleBranches: cleanBranches,
    requiredSkills: cleanSkills,
    applicationDeadline,
    driveDate: driveDate || null,
    status: status || 'Open',
    createdBy: req.user._id,
  });

  const populated = await PlacementDrive.findById(drive._id).populate('company', 'name location industry');

  return res.status(201).json({
    success: true,
    message: 'Placement drive created successfully.',
    drive: populated,
  });
});

const updateDrive = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) {
    throw new ApiError(404, 'Placement drive not found.');
  }

  const {
    company,
    title,
    jobRole,
    description,
    packageLPA,
    location,
    jobType,
    minCgpa,
    maxBacklogs,
    eligibleBranches,
    requiredSkills,
    applicationDeadline,
    driveDate,
    status,
  } = req.body;

  if (company !== undefined) {
    const companyDoc = await Company.findById(company);
    if (!companyDoc) {
      throw new ApiError(404, 'Selected company does not exist.');
    }
    drive.company = companyDoc._id;
  }
  if (title !== undefined) drive.title = String(title).trim();
  if (jobRole !== undefined) drive.jobRole = String(jobRole).trim();
  if (description !== undefined) drive.description = String(description).trim();
  if (packageLPA !== undefined) drive.packageLPA = Number(packageLPA);
  if (location !== undefined) drive.location = String(location).trim();
  if (jobType !== undefined) drive.jobType = jobType;
  if (minCgpa !== undefined) drive.minCgpa = Number(minCgpa);
  if (maxBacklogs !== undefined) drive.maxBacklogs = Number(maxBacklogs);
  if (eligibleBranches !== undefined) {
    const cleanBranches = normalizeStringList(eligibleBranches, true);
    if (cleanBranches.length === 0) {
      throw new ApiError(400, 'At least one eligible branch is required.');
    }
    drive.eligibleBranches = cleanBranches;
  }
  if (requiredSkills !== undefined) {
    drive.requiredSkills = normalizeStringList(requiredSkills, false);
  }
  if (applicationDeadline !== undefined) drive.applicationDeadline = applicationDeadline;
  if (driveDate !== undefined) drive.driveDate = driveDate || null;
  if (status !== undefined) drive.status = status;

  await drive.save();
  const populated = await PlacementDrive.findById(drive._id).populate('company', 'name location industry');

  return res.status(200).json({
    success: true,
    message: 'Placement drive updated successfully.',
    drive: populated,
  });
});

const deleteDrive = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) {
    throw new ApiError(404, 'Placement drive not found.');
  }

  const deletedApps = await Application.deleteMany({ drive: drive._id });
  await PlacementDrive.findByIdAndDelete(drive._id);

  return res.status(200).json({
    success: true,
    message: `Placement drive deleted successfully (removed ${deletedApps.deletedCount} associated application(s)).`,
  });
});

// --- Applications Management ---
const listApplications = asyncHandler(async (req, res) => {
  const { driveId, status, branch, q } = req.query;
  const filter = {};
  if (driveId && driveId !== 'all') filter.drive = driveId;
  if (status && status !== 'all') filter.status = status;

  let applications = await Application.find(filter)
    .populate('student', 'name email')
    .populate('studentProfile', 'rollNumber branch department cgpa backlogs phone')
    .populate({
      path: 'drive',
      select: 'title jobRole packageLPA status',
      populate: { path: 'company', select: 'name' },
    })
    .sort({ appliedAt: -1 });

  if (branch && branch !== 'all') {
    const targetBranch = String(branch).trim().toUpperCase();
    applications = applications.filter(
      (a) => a.studentProfile && a.studentProfile.branch === targetBranch
    );
  }

  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase();
    applications = applications.filter((a) => {
      const studentName = a.student && a.student.name ? a.student.name.toLowerCase() : '';
      const roll = a.studentProfile && a.studentProfile.rollNumber ? a.studentProfile.rollNumber.toLowerCase() : '';
      const driveTitle = a.drive && a.drive.title ? a.drive.title.toLowerCase() : '';
      const companyName =
        a.drive && a.drive.company && a.drive.company.name ? a.drive.company.name.toLowerCase() : '';
      return (
        studentName.includes(needle) ||
        roll.includes(needle) ||
        driveTitle.includes(needle) ||
        companyName.includes(needle)
      );
    });
  }

  return res.status(200).json({ success: true, applications });
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const application = await Application.findById(req.params.id);
  if (!application) {
    throw new ApiError(404, 'Application not found.');
  }

  application.status = status;
  if (remarks !== undefined) {
    application.remarks = String(remarks).trim();
  }
  await application.save();

  const updated = await Application.findById(application._id)
    .populate('student', 'name email')
    .populate('studentProfile', 'rollNumber branch cgpa backlogs')
    .populate({
      path: 'drive',
      select: 'title jobRole',
      populate: { path: 'company', select: 'name' },
    });

  return res.status(200).json({
    success: true,
    message: `Application status updated to "${status}".`,
    application: updated,
  });
});

// --- Basic Reports ---
const getReports = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalCompanies,
    totalDrives,
    totalApplications,
    branchStatsRaw,
    driveStatsRaw,
    selectedByBranchRaw,
    drivesAll,
    allStudentSkills,
    statusSummaryRaw,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Company.countDocuments(),
    PlacementDrive.countDocuments(),
    Application.countDocuments(),
    StudentProfile.aggregate([
      {
        $group: {
          _id: '$branch',
          studentsCount: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' },
          zeroBacklogCount: {
            $sum: { $cond: [{ $eq: ['$backlogs', 0] }, 1, 0] },
          },
        },
      },
      { $sort: { studentsCount: -1 } },
    ]),
    Application.aggregate([
      {
        $group: {
          _id: '$drive',
          totalApplications: { $sum: 1 },
          shortlistedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] },
          },
          selectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] },
          },
          avgSkillMatch: { $avg: '$skillMatchSnapshot.matchPercentage' },
        },
      },
    ]),
    Application.aggregate([
      { $match: { status: 'Selected' } },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'studentProfile',
          foreignField: '_id',
          as: 'profile',
        },
      },
      { $unwind: '$profile' },
      {
        $group: {
          _id: '$profile.branch',
          uniqueStudents: { $addToSet: '$student' },
          totalOffers: { $sum: 1 },
        },
      },
    ]),
    PlacementDrive.find().populate('company', 'name').sort({ createdAt: -1 }),
    Skill.find().select('normalizedName name student'),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const selectedBranchMap = new Map(
    selectedByBranchRaw.map((b) => [
      b._id,
      { placedStudents: b.uniqueStudents.length, totalOffers: b.totalOffers },
    ])
  );

  const branchSummary = branchStatsRaw.map((b) => {
    const placedInfo = selectedBranchMap.get(b._id) || { placedStudents: 0, totalOffers: 0 };
    return {
      branch: b._id,
      studentsCount: b.studentsCount,
      avgCgpa: Math.round((b.avgCgpa || 0) * 100) / 100,
      zeroBacklogCount: b.zeroBacklogCount,
      placedStudents: placedInfo.placedStudents,
      totalOffers: placedInfo.totalOffers,
    };
  });

  const driveStatsMap = new Map(driveStatsRaw.map((d) => [d._id.toString(), d]));
  const drivePerformance = drivesAll.map((drive) => {
    const stat = driveStatsMap.get(drive._id.toString()) || {
      totalApplications: 0,
      shortlistedCount: 0,
      selectedCount: 0,
      rejectedCount: 0,
      avgSkillMatch: 0,
    };
    return {
      driveId: drive._id,
      title: drive.title,
      companyName: drive.company ? drive.company.name : 'Unknown',
      packageLPA: drive.packageLPA,
      status: drive.status,
      totalApplications: stat.totalApplications,
      shortlistedCount: stat.shortlistedCount,
      selectedCount: stat.selectedCount,
      rejectedCount: stat.rejectedCount,
      avgSkillMatch: Math.round((stat.avgSkillMatch || 0) * 10) / 10,
    };
  });

  // Compute top required skills in drives vs student coverage
  const studentSkillHolders = new Map();
  for (const sk of allStudentSkills) {
    const key = sk.normalizedName;
    if (!studentSkillHolders.has(key)) {
      studentSkillHolders.set(key, new Set());
    }
    studentSkillHolders.get(key).add(sk.student.toString());
  }

  const requiredSkillFreq = new Map();
  for (const drive of drivesAll) {
    const seenInDrive = new Set();
    for (const rawSkill of drive.requiredSkills || []) {
      const label = String(rawSkill || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seenInDrive.has(key)) continue;
      seenInDrive.add(key);
      if (!requiredSkillFreq.has(key)) {
        requiredSkillFreq.set(key, { name: label, drivesRequiring: 0 });
      }
      requiredSkillFreq.get(key).drivesRequiring += 1;
    }
  }

  const skillDemandReport = Array.from(requiredSkillFreq.entries())
    .map(([key, info]) => {
      const studentsWithSkill = studentSkillHolders.has(key) ? studentSkillHolders.get(key).size : 0;
      const coveragePercent =
        totalStudents > 0 ? Math.round((studentsWithSkill / totalStudents) * 1000) / 10 : 0;
      return {
        skill: info.name,
        drivesRequiring: info.drivesRequiring,
        studentsWithSkill,
        coveragePercent,
      };
    })
    .sort((a, b) => b.drivesRequiring - a.drivesRequiring || a.coveragePercent - b.coveragePercent);

  const statusDistribution = {};
  for (const s of APPLICATION_STATUSES) {
    statusDistribution[s] = 0;
  }
  for (const row of statusSummaryRaw) {
    statusDistribution[row._id] = row.count;
  }

  return res.status(200).json({
    success: true,
    overview: {
      totalStudents,
      totalCompanies,
      totalDrives,
      totalApplications,
      statusDistribution,
    },
    branchSummary,
    drivePerformance,
    skillDemandReport,
  });
});

module.exports = {
  getDashboardStats,
  listStudents,
  getStudentDetails,
  updateStudentRecord,
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  listDrivesAdmin,
  createDrive,
  updateDrive,
  deleteDrive,
  listApplications,
  updateApplicationStatus,
  getReports,
};
