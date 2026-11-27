(async function initAdminDashboard() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('admin');
  if (!auth) return;

  renderAppShell({
    role: 'admin',
    activePage: 'admin-dashboard',
    pageTitle: 'Admin Dashboard',
    user: auth.user,
  });

  try {
    const data = await apiRequest('/api/admin/dashboard');
    const { stats, recentApplications, recentDrives } = data;

    document.getElementById('adminStatsStrip').innerHTML = `
      <div class="stat-tile">
        <div class="stat-label">Registered Students</div>
        <div class="stat-value">${stats.totalStudents}</div>
        <div class="stat-sub">Active Accounts: ${stats.activeStudents}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Companies</div>
        <div class="stat-value">${stats.totalCompanies}</div>
        <div class="stat-sub">Registered Recruiters</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Placement Drives</div>
        <div class="stat-value">${stats.openDrives} / ${stats.totalDrives}</div>
        <div class="stat-sub">Open / Total Drives</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Applications</div>
        <div class="stat-value">${stats.totalApplications}</div>
        <div class="stat-sub">Shortlisted: ${stats.shortlistedStudents} | Selected: ${stats.selectedStudents}</div>
      </div>
    `;

    const breakdown = stats.statusBreakdown || {};
    document.getElementById('statusSummaryBody').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Applied</th>
            <th>Under Review</th>
            <th>Shortlisted</th>
            <th>Selected</th>
            <th>Rejected</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${breakdown.Applied || 0}</strong></td>
            <td><strong>${breakdown['Under Review'] || 0}</strong></td>
            <td><strong>${breakdown.Shortlisted || 0}</strong></td>
            <td><strong>${breakdown.Selected || 0}</strong></td>
            <td><strong>${breakdown.Rejected || 0}</strong></td>
          </tr>
        </tbody>
      </table>
    `;

    const recentAppsWrap = document.getElementById('recentAppsWrap');
    if (!recentApplications.length) {
      recentAppsWrap.innerHTML = '<div class="empty-state">No applications submitted yet.</div>';
    } else {
      recentAppsWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Company / Drive</th>
              <th>Match</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentApplications
              .map((a) => {
                const studentName = a.student ? a.student.name : 'Student';
                const roll = a.studentProfile ? a.studentProfile.rollNumber : '';
                const companyName = a.drive && a.drive.company ? a.drive.company.name : '-';
                return `
                <tr>
                  <td>
                    <strong>${escapeHtml(studentName)}</strong><br/>
                    <span class="muted-text">${escapeHtml(roll)}</span>
                  </td>
                  <td>
                    <strong>${escapeHtml(companyName)}</strong><br/>
                    <span class="muted-text">${escapeHtml(a.drive ? a.drive.jobRole : '')}</span>
                  </td>
                  <td>${a.skillMatchSnapshot ? `${a.skillMatchSnapshot.matchPercentage}%` : '-'}</td>
                  <td>${renderStatusBadge(a.status)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `;
    }

    const recentDrivesWrap = document.getElementById('recentDrivesWrap');
    if (!recentDrives.length) {
      recentDrivesWrap.innerHTML = '<div class="empty-state">No placement drives created yet.</div>';
    } else {
      recentDrivesWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company / Title</th>
              <th>Package</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentDrives
              .map(
                (d) => `
              <tr>
                <td>
                  <strong>${escapeHtml(d.company ? d.company.name : '-')}</strong><br/>
                  <span class="muted-text">${escapeHtml(d.title)}</span>
                </td>
                <td>${escapeHtml(d.packageLPA)} LPA</td>
                <td>${formatDate(d.applicationDeadline)}</td>
                <td>${renderStatusBadge(d.status)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }
})();
