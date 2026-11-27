(async function initStudentApplications() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-applications',
    pageTitle: 'My Applications',
    user: auth.user,
    profile: auth.profile,
  });

  async function loadApplications() {
    const status = document.getElementById('appStatusFilter').value;
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const wrap = document.getElementById('applicationsTableWrap');

    try {
      const data = await apiRequest(`/api/applications/my${query}`);
      const apps = data.applications || [];

      if (!apps.length) {
        wrap.innerHTML = '<div class="empty-state">No applications found for the selected filter.</div>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company &amp; Role</th>
              <th>Package</th>
              <th>Applied Date</th>
              <th>Skill Match</th>
              <th>Missing Skills</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${apps
              .map((a) => {
                const drive = a.drive || {};
                const company = drive.company || {};
                const snap = a.skillMatchSnapshot || {};
                return `
                <tr>
                  <td>
                    <strong>${escapeHtml(company.name || 'Company')}</strong><br/>
                    <span>${escapeHtml(drive.title || 'Placement Drive')}</span>
                  </td>
                  <td>${drive.packageLPA !== undefined ? `${escapeHtml(drive.packageLPA)} LPA` : '-'}</td>
                  <td>${formatDate(a.appliedAt)}</td>
                  <td><strong>${snap.matchPercentage !== undefined ? `${snap.matchPercentage}%` : '-'}</strong></td>
                  <td>
                    ${
                      (snap.missingSkills || []).length
                        ? snap.missingSkills.map((s) => `<span class="skill-chip missing">${escapeHtml(s)}</span>`).join(' ')
                        : '<span class="muted-text">None</span>'
                    }
                  </td>
                  <td>${renderStatusBadge(a.status)}</td>
                  <td>${escapeHtml(a.remarks || '-')}</td>
                  <td>
                    ${
                      drive._id
                        ? `<a href="/pages/student-drive-details.html?id=${encodeURIComponent(drive._id)}" class="btn btn-secondary btn-sm">Drive</a>`
                        : '-'
                    }
                  </td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    }
  }

  document.getElementById('appStatusFilter').addEventListener('change', loadApplications);
  await loadApplications();
})();
