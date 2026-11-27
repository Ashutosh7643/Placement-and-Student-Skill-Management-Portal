const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Student ID / University Roll Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Roll number cannot exceed 30 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Branch cannot exceed 50 characters'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      maxlength: [30, 'Academic year cannot exceed 30 characters'],
    },
    semester: {
      type: Number,
      required: [true, 'Current semester is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
    },
    backlogs: {
      type: Number,
      required: [true, 'Backlogs count is required'],
      min: [0, 'Backlogs cannot be negative'],
      default: 0,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [250, 'Address cannot exceed 250 characters'],
      default: '',
    },
    linkedinUrl: {
      type: String,
      trim: true,
      default: '',
    },
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

studentProfileSchema.index({ branch: 1, cgpa: -1 });
studentProfileSchema.index({ department: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
