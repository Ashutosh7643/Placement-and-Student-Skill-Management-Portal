const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      minlength: [1, 'Skill name cannot be empty'],
      maxlength: [60, 'Skill name cannot exceed 60 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['technical', 'soft'],
      required: [true, 'Skill category is required'],
    },
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
  },
  {
    timestamps: true,
  }
);

skillSchema.pre('validate', function syncNormalizedName(next) {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
  next();
});

skillSchema.index({ student: 1, category: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('Skill', skillSchema);
