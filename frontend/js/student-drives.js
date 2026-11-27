(async function initStudentDrives() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-drives',
    pageTitle: 'Placement Drives',
    user: auth.user,
    profile: auth.profile,
  });

  async function loadDrives() {
    const params = new URLSearchParams();
    const q = document.getElementById('searchQ').value.trim();
    const status = document.getElementById('filterStatus').value;
    const eligibility = document.getElementById('filterEligibility').value;
    const minPackage = document.getElementById('filterMinPackage').value;

    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (eligibility) params.set('eligibility', eligibility);
    if (minPackage) params.set('minPackage', minPackage);

    const wrap = document.getElementById('drivesTableWrap');
    try {
      const data = await apiRequest(`/api/drives?${params.toString()}`);
      const drives = data.drives || [];

      if (!drives.length) {
        wrap.innerHTML = '<div class="empty-state">No placement drives match your current filters.</div>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company &amp; Drive</th>
              <th>Package &amp; Location</th>
              <th>Criteria</th>
              <th>Required Skills</th>
              <th>Deadline &amp; Status</th>
              <th>Eligibility</th>
              <th>Skill Match</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${drives
              .map(
                (d) => `
              <tr>
                <td>
                  <strong>${escapeHtml(d.company ? d.company.name : 'Company')}</strong><br/>
                  <span>${escapeHtml(d.title)}</span><br/>
                  <span class="muted-text">${escapeHtml(d.jobRole)} (${escapeHtml(d.jobType)})</span>
                </td>
                <td>
                  <strong>${escapeHtml(d.packageLPA)} LPA</strong><br/>
                  <span class="muted-text">${escapeHtml(d.location)}</span>
                </td>
                <td>
                  Min CGPA: <strong>${Number(d.minCgpa).toFixed(1)}</strong><br/>
                  Max Backlogs: <strong>${d.maxBacklogs}</strong><br/>
                  Branches: ${escapeHtml((d.eligibleBranches || []).join(', '))}
                </td>
                <td>
                  <div class="chip-list">
                    ${
                      (d.requiredSkills || []).length
                        ? d.requiredSkills.map((sk) => `<span class="skill-chip">${escapeHtml(sk)}</span>`).join('')
                        : '<span class="muted-text">None specified</span>'
                    }
                  </div>
                </td>
                <td>
                  ${formatDate(d.applicationDeadline)}<br/>
                  ${renderStatusBadge(d.status)}
                </td>
                <td>
                  ${renderStatusBadge(d.eligibility.eligible ? 'Eligible' : 'Not Eligible')}
                  ${
                    !d.eligibility.eligible && d.eligibility.reasons.length
                      ? `<div class="muted-text" style="font-size:12px;margin-top:4px;">${escapeHtml(d.eligibility.reasons[0])}</div>`
                      : ''
                  }
                </td>
                <td>
                  <strong>${d.skillMatch.hasRequiredSkills ? `${d.skillMatch.matchPercentage}%` : 'N/A'}</strong>
                  ${
                    d.skillMatch.hasRequiredSkills
                      ? `<div class="muted-text" style="font-size:12px;">${d.skillMatch.matchedCount}/${d.skillMatch.totalRequired} matched</div>`
                      : ''
                  }
                </td>
                <td>
                  <a href="/pages/student-drive-details.html?id=${encodeURIComponent(d._id)}" class="btn btn-primary btn-sm">
                    ${d.hasApplied ? 'View Application' : 'View &amp; Apply'}
                  </a>
                  ${
                    d.hasApplied && d.application
                      ? `<div style="margin-top:5px;">${renderStatusBadge(d.application.status)}</div>`
                      : ''
                  }
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    }
  }

  document.getElementById('driveFilterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadDrives();
  });

  document.getElementById('resetFilterBtn').addEventListener('click', () => {
    document.getElementById('searchQ').value = '';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterEligibility').value = 'all';
    document.getElementById('filterMinPackage').value = '';
    loadDrives();
  });

  await loadDrives();
})();
