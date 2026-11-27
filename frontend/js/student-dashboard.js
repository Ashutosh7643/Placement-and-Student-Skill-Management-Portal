(async function initStudentDashboard() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-dashboard',
    pageTitle: 'Student Dashboard',
    user: auth.user,
    profile: auth.profile,
  });

  try {
    const data = await apiRequest('/api/student/dashboard');
    const { profile, stats, recentApplications, recommendedDrives } = data;

    document.getElementById('studentStatsStrip').innerHTML = `
      <div class="stat-tile">
        <div class="stat-label">CGPA / Backlogs</div>
        <div class="stat-value">${profile ? Number(profile.cgpa).toFixed(2) : '-'}</div>
        <div class="stat-sub">Active Backlogs: ${profile ? profile.backlogs : '-'}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Skills &amp; Portfolio</div>
        <div class="stat-value">${stats.totalSkillsCount}</div>
        <div class="stat-sub">${stats.technicalSkillsCount} Technical, ${stats.softSkillsCount} Soft | ${stats.projectsCount} Projects</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Eligible Open Drives</div>
        <div class="stat-value">${stats.eligibleOpenDrivesCount} / ${stats.openDrivesCount}</div>
        <div class="stat-sub">Certifications: ${stats.certificationsCount}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">My Applications</div>
        <div class="stat-value">${stats.applicationsCount}</div>
        <div class="stat-sub">Shortlisted: ${stats.statusBreakdown.Shortlisted || 0} | Selected: ${stats.statusBreakdown.Selected || 0}</div>
      </div>
    `;

    if (profile) {
      document.getElementById('academicSnapshot').innerHTML = `
        <div class="form-grid-3">
          <div><strong>University Roll No:</strong><br/>${escapeHtml(profile.rollNumber)}</div>
          <div><strong>Department &amp; Branch:</strong><br/>${escapeHtml(profile.department)} (${escapeHtml(profile.branch)})</div>
          <div><strong>Academic Year / Sem:</strong><br/>${escapeHtml(profile.academicYear)} (Semester ${escapeHtml(profile.semester)})</div>
          <div><strong>Email:</strong><br/>${escapeHtml(data.user.email)}</div>
          <div><strong>Phone:</strong><br/>${escapeHtml(profile.phone || 'Not provided')}</div>
          <div><strong>CGPA / Backlogs:</strong><br/>${Number(profile.cgpa).toFixed(2)} CGPA | ${profile.backlogs} Backlog(s)</div>
        </div>
      `;
    } else {
      document.getElementById('academicSnapshot').innerHTML =
        '<p class="muted-text">Profile not completed yet. <a href="/pages/student-profile.html">Complete your profile</a> to check drive eligibility.</p>';
    }

    const drivesWrap = document.getElementById('dashboardDrivesWrap');
    if (!recommendedDrives.length) {
      drivesWrap.innerHTML = '<div class="empty-state">No open placement drives available at the moment.</div>';
    } else {
      drivesWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company / Role</th>
              <th>Package</th>
              <th>Eligibility</th>
              <th>Skill Match</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${recommendedDrives
              .map(
                (d) => `
              <tr>
                <td>
                  <strong>${escapeHtml(d.company ? d.company.name : '')}</strong><br/>
                  <span class="muted-text">${escapeHtml(d.jobRole)}</span>
                </td>
                <td>${escapeHtml(d.packageLPA)} LPA</td>
                <td>${renderStatusBadge(d.eligibility.eligible ? 'Eligible' : 'Not Eligible')}</td>
                <td><strong>${d.skillMatch.hasRequiredSkills ? `${d.skillMatch.matchPercentage}%` : 'N/A'}</strong></td>
                <td><a class="btn btn-secondary btn-sm" href="/pages/student-drive-details.html?id=${encodeURIComponent(d._id)}">Inspect</a></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    const appsWrap = document.getElementById('dashboardAppsWrap');
    if (!recentApplications.length) {
      appsWrap.innerHTML =
        '<div class="empty-state">You have not applied to any placement drives yet. <a href="/pages/student-drives.html">Browse open drives</a>.</div>';
    } else {
      appsWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company / Drive</th>
              <th>Applied On</th>
              <th>Match</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentApplications
              .map((a) => {
                const companyName = a.drive && a.drive.company ? a.drive.company.name : 'Company';
                const driveTitle = a.drive ? a.drive.title : 'Drive removed';
                return `
                <tr>
                  <td>
                    <strong>${escapeHtml(companyName)}</strong><br/>
                    <span class="muted-text">${escapeHtml(driveTitle)}</span>
                  </td>
                  <td>${formatDate(a.appliedAt)}</td>
                  <td>${a.skillMatchSnapshot ? `${a.skillMatchSnapshot.matchPercentage}%` : '-'}</td>
                  <td>${renderStatusBadge(a.status)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }
})();
