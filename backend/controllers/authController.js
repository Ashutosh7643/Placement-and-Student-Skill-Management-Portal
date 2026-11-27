const bcrypt = require('bcryptjs');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const registerStudent = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    rollNumber,
    department,
    branch,
    academicYear,
    semester,
    cgpa,
    backlogs,
    phone,
  } = req.body;

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRoll = String(rollNumber).trim().toUpperCase();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  const existingRoll = await StudentProfile.findOne({ rollNumber: normalizedRoll });
  if (existingRoll) {
    throw new ApiError(409, 'A student with this University Roll Number is already registered.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'student',
  });

  let profile;
  try {
    profile = await StudentProfile.create({
      user: user._id,
      rollNumber: normalizedRoll,
      department: String(department).trim(),
      branch: String(branch).trim().toUpperCase(),
      academicYear: String(academicYear).trim(),
      semester: Number(semester),
      cgpa: Number(cgpa),
      backlogs: Number(backlogs ?? 0),
      phone: phone ? String(phone).trim() : '',
    });
  } catch (err) {
    // Roll back user creation if profile creation fails
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  req.session.userId = user._id.toString();
  req.session.userRole = user.role;

  return res.status(201).json({
    success: true,
    message: 'Student registration successful.',
    user: user.toSafeObject(),
    profile,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, expectedRole } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact the Training & Placement Cell.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (expectedRole && user.role !== expectedRole) {
    if (expectedRole === 'admin') {
      throw new ApiError(403, 'Access denied. Please use the Student Login page for student accounts.');
    }
    throw new ApiError(403, 'Administrator accounts must sign in through the Admin Login page.');
  }

  req.session.userId = user._id.toString();
  req.session.userRole = user.role;

  let profile = null;
  if (user.role === 'student') {
    profile = await StudentProfile.findOne({ user: user._id });
  }

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    user: user.toSafeObject(),
    profile,
  });
});

const logout = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  }

  return req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.role === 'student') {
    profile = await StudentProfile.findOne({ user: req.user._id });
  }

  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
    profile,
  });
});

module.exports = {
  registerStudent,
  login,
  logout,
  getCurrentUser,
};
