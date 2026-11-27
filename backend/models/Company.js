const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      maxlength: [80, 'Industry cannot exceed 80 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    hrName: {
      type: String,
      trim: true,
      maxlength: [80, 'HR contact name cannot exceed 80 characters'],
      default: '',
    },
    hrEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

companySchema.index({ industry: 1 });

module.exports = mongoose.model('Company', companySchema);
