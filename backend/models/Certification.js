const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Certification title is required'],
      trim: true,
      maxlength: [120, 'Certification title cannot exceed 120 characters'],
    },
    issuingOrganization: {
      type: String,
      required: [true, 'Issuing organization is required'],
      trim: true,
      maxlength: [120, 'Issuing organization cannot exceed 120 characters'],
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    credentialId: {
      type: String,
      trim: true,
      maxlength: [80, 'Credential ID cannot exceed 80 characters'],
      default: '',
    },
    credentialUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Certification', certificationSchema);
