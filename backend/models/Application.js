const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Rejected',
  'Selected',
];

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementDrive',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'Applied',
      index: true,
    },
    eligibilitySnapshot: {
      eligible: { type: Boolean, required: true },
      reasons: { type: [String], default: [] },
    },
    skillMatchSnapshot: {
      matchPercentage: { type: Number, required: true },
      matchedSkills: { type: [String], default: [] },
      missingSkills: { type: [String], default: [] },
      totalRequired: { type: Number, required: true },
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
      default: '',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ student: 1, drive: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
