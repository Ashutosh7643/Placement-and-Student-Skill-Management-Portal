/**
 * Evaluates a student's eligibility for a placement drive.
 * All checks run on the server and produce clear, human-readable reasons.
 */
function evaluateEligibility(studentProfile, drive, now = new Date()) {
  const reasons = [];

  if (!studentProfile) {
    return {
      eligible: false,
      reasons: ['Student profile is incomplete. Please complete your academic profile first.'],
      checks: {
        profileComplete: false,
        statusOk: false,
        deadlineOk: false,
        cgpaOk: false,
        backlogsOk: false,
        branchOk: false,
      },
    };
  }

  const statusOk = drive.status === 'Open';
  if (!statusOk) {
    reasons.push(`Drive status is "${drive.status}" (applications are accepted only when status is "Open").`);
  }

  const deadlineDate = new Date(drive.applicationDeadline);
  const deadlineOk = !Number.isNaN(deadlineDate.getTime()) && now <= deadlineDate;
  if (!deadlineOk) {
    const formatted = Number.isNaN(deadlineDate.getTime())
      ? 'invalid date'
      : deadlineDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    reasons.push(`Application deadline (${formatted}) has passed.`);
  }

  const studentCgpa = Number(studentProfile.cgpa);
  const minCgpa = Number(drive.minCgpa || 0);
  const cgpaOk = !Number.isNaN(studentCgpa) && studentCgpa >= minCgpa;
  if (!cgpaOk) {
    reasons.push(
      `Your CGPA (${Number.isNaN(studentCgpa) ? 'N/A' : studentCgpa.toFixed(2)}) is below the minimum required CGPA (${minCgpa.toFixed(2)}).`
    );
  }

  const studentBacklogs = Number(studentProfile.backlogs);
  const maxBacklogs = Number(drive.maxBacklogs ?? 0);
  const backlogsOk = !Number.isNaN(studentBacklogs) && studentBacklogs <= maxBacklogs;
  if (!backlogsOk) {
    reasons.push(
      `Your active backlogs (${Number.isNaN(studentBacklogs) ? 'N/A' : studentBacklogs}) exceed the maximum allowed (${maxBacklogs}).`
    );
  }

  const studentBranch = String(studentProfile.branch || '').trim().toUpperCase();
  const eligibleBranches = Array.isArray(drive.eligibleBranches)
    ? drive.eligibleBranches.map((b) => String(b).trim().toUpperCase()).filter(Boolean)
    : [];

  const branchOk =
    eligibleBranches.includes('ALL') ||
    (studentBranch.length > 0 && eligibleBranches.includes(studentBranch));

  if (!branchOk) {
    reasons.push(
      `Your branch (${studentBranch || 'Not specified'}) is not listed in eligible branches (${eligibleBranches.join(', ') || 'None'}).`
    );
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    checks: {
      profileComplete: true,
      statusOk,
      deadlineOk,
      cgpaOk,
      backlogsOk,
      branchOk,
    },
  };
}

module.exports = {
  evaluateEligibility,
};
