/**
 * Rule-based skill matching service.
 * Formula: Match Percentage = (Number of matched required skills / Total number of required skills) * 100
 * Performs case-insensitive comparison and prevents duplicate skill counting.
 */
function calculateSkillMatch(studentSkills, requiredSkills) {
  // Deduplicate required skills case-insensitively while preserving display label
  const requiredMap = new Map();
  if (Array.isArray(requiredSkills)) {
    for (const rawSkill of requiredSkills) {
      const label = String(rawSkill || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!requiredMap.has(key)) {
        requiredMap.set(key, label);
      }
    }
  }

  const uniqueRequired = Array.from(requiredMap.entries());
  const totalRequired = uniqueRequired.length;

  // Deduplicate student skills case-insensitively
  const studentSkillSet = new Set();
  if (Array.isArray(studentSkills)) {
    for (const item of studentSkills) {
      const label = typeof item === 'string' ? item : item && item.name;
      const normalized = String(label || '').trim().toLowerCase();
      if (normalized) {
        studentSkillSet.add(normalized);
      }
    }
  }

  if (totalRequired === 0) {
    return {
      matchPercentage: 100,
      matchedSkills: [],
      missingSkills: [],
      matchedCount: 0,
      totalRequired: 0,
      hasRequiredSkills: false,
      note: 'No specific required skills were listed for this drive.',
    };
  }

  const matchedSkills = [];
  const missingSkills = [];

  for (const [key, displayLabel] of uniqueRequired) {
    if (studentSkillSet.has(key)) {
      matchedSkills.push(displayLabel);
    } else {
      missingSkills.push(displayLabel);
    }
  }

  const rawPercentage = (matchedSkills.length / totalRequired) * 100;
  const matchPercentage = Math.round(rawPercentage * 10) / 10;

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    matchedCount: matchedSkills.length,
    totalRequired,
    hasRequiredSkills: true,
    note:
      missingSkills.length === 0
        ? 'You possess all required skills for this drive.'
        : `Missing ${missingSkills.length} of ${totalRequired} required skill(s).`,
  };
}

module.exports = {
  calculateSkillMatch,
};
