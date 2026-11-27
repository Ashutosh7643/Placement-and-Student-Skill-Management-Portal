(async function initAdminReports() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('admin');
  if (!auth) return;

  renderAppShell({
    role: 'admin',
    activePage: 'admin-reports',
    pageTitle: 'Placement Reports',
    user: auth.user,
  });

  let latestBranchSummary = [];

  try {
    const data = await apiRequest('/api/admin/reports');
    const { overview, branchSummary, drivePerformance, skillDemandReport } = data;
    latestBranchSummary = branchSummary || [];

    const dist = overview.statusDistribution || {};
    document.getElementById('reportOverviewStrip').innerHTML = `
      <div class="stat-tile">
        <div class="stat-label">Total Students</div>
        <div class="stat-value">${overview.totalStudents}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Companies / Drives</div>
        <div class="stat-value">${overview.totalCompanies} / ${overview.totalDrives}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Total Applications</div>
        <div class="stat-value">${overview.totalApplications}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Selections / Shortlists</div>
        <div class="stat-value">${dist.Selected || 0} / ${dist.Shortlisted || 0}</div>
      </div>
    `;

    const branchWrap = document.getElementById('branchReportWrap');
    if (!branchSummary.length) {
      branchWrap.innerHTML = '<div class="empty-state">No student branch data available.</div>';
    } else {
      branchWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Registered Students</th>
              <th>Average CGPA</th>
              <th>Zero-Backlog Students</th>
              <th>Placed Students</th>
              <th>Total Offers</th>
            </tr>
          </thead>
          <tbody>
            ${branchSummary
              .map(
                (b) => `
              <tr>
                <td><strong>${escapeHtml(b.branch)}</strong></td>
                <td>${b.studentsCount}</td>
                <td>${Number(b.avgCgpa).toFixed(2)}</td>
                <td>${b.zeroBacklogCount}</td>
                <td>${b.placedStudents}</td>
                <td>${b.totalOffers}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    const driveWrap = document.getElementById('driveReportWrap');
    if (!drivePerformance.length) {
      driveWrap.innerHTML = '<div class="empty-state">No placement drive records available.</div>';
    } else {
      driveWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company &amp; Drive</th>
              <th>Package</th>
              <th>Status</th>
              <th>Applications</th>
              <th>Shortlisted</th>
              <th>Selected</th>
              <th>Avg Skill Match</th>
            </tr>
          </thead>
          <tbody>
            ${drivePerformance
              .map(
                (d) => `
              <tr>
                <td><strong>${escapeHtml(d.companyName)}</strong> &mdash; ${escapeHtml(d.title)}</td>
                <td>${escapeHtml(d.packageLPA)} LPA</td>
                <td>${renderStatusBadge(d.status)}</td>
                <td>${d.totalApplications}</td>
                <td>${d.shortlistedCount}</td>
                <td>${d.selectedCount}</td>
                <td>${d.totalApplications > 0 ? `${d.avgSkillMatch}%` : '-'}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    const skillWrap = document.getElementById('skillReportWrap');
    if (!skillDemandReport.length) {
      skillWrap.innerHTML = '<div class="empty-state">No required skills defined across drives yet.</div>';
    } else {
      skillWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Required Skill</th>
              <th>Drives Requiring Skill</th>
              <th>Students Possessing Skill</th>
              <th>Student Coverage (%)</th>
            </tr>
          </thead>
          <tbody>
            ${skillDemandReport
              .map(
                (sk) => `
              <tr>
                <td><strong>${escapeHtml(sk.skill)}</strong></td>
                <td>${sk.drivesRequiring}</td>
                <td>${sk.studentsWithSkill}</td>
                <td>${sk.coveragePercent}%</td>
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

  document.getElementById('exportBranchCsvBtn').addEventListener('click', () => {
    if (!latestBranchSummary.length) {
      showAlert('pageAlert', 'No branch report data available to export.', 'warning');
      return;
    }
    const headers = ['Branch', 'Registered Students', 'Average CGPA', 'Zero Backlog Students', 'Placed Students', 'Total Offers'];
    const rows = latestBranchSummary.map((b) => [
      b.branch,
      b.studentsCount,
      b.avgCgpa,
      b.zeroBacklogCount,
      b.placedStudents,
      b.totalOffers,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dbuu-branch-placement-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
})();
