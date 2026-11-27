const mongoose = require('mongoose');

const placementDriveSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Drive title is required'],
      trim: true,
      maxlength: [140, 'Drive title cannot exceed 140 characters'],
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      maxlength: [100, 'Job role cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    packageLPA: {
      type: Number,
      required: [true, 'Package (LPA) is required'],
      min: [0, 'Package cannot be negative'],
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    jobType: {
      type: String,
      enum: ['Full-Time', 'Internship + PPO', 'Internship'],
      default: 'Full-Time',
    },
    minCgpa: {
      type: Number,
      required: [true, 'Minimum CGPA is required'],
      min: [0, 'Minimum CGPA cannot be negative'],
      max: [10, 'Minimum CGPA cannot exceed 10'],
      default: 0,
    },
    maxBacklogs: {
      type: Number,
      required: [true, 'Maximum backlogs is required'],
      min: [0, 'Maximum backlogs cannot be negative'],
      default: 0,
    },
    eligibleBranches: {
      type: [String],
      required: [true, 'At least one eligible branch is required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one eligible branch must be specified',
      },
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true,
    },
    driveDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Open', 'Upcoming', 'Closed', 'Completed'],
      default: 'Open',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

placementDriveSchema.index({ status: 1, applicationDeadline: 1 });

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
