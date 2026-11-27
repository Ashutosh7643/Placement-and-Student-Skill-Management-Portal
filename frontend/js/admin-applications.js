(async function initAdminApplications() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('admin');
  if (!auth) return;

  renderAppShell({
    role: 'admin',
    activePage: 'admin-applications',
    pageTitle: 'Application Management',
    user: auth.user,
  });

  const STATUSES = ['Applied', 'Under Review', 'Shortlisted', 'Rejected', 'Selected'];

  async function loadDriveFilterOptions() {
    const data = await apiRequest('/api/admin/drives');
    const select = document.getElementById('appFilterDrive');
    const drives = data.drives || [];
    select.innerHTML =
      '<option value="all">All Drives</option>' +
      drives
        .map(
          (d) =>
            `<option value="${d._id}">${escapeHtml(d.company ? d.company.name : '')} - ${escapeHtml(d.title)}</option>`
        )
        .join('');
  }

  async function loadApplications() {
    const params = new URLSearchParams();
    const q = document.getElementById('appSearchQ').value.trim();
    const driveId = document.getElementById('appFilterDrive').value;
    const branch = document.getElementById('appFilterBranch').value;
    const status = document.getElementById('appFilterStatus').value;

    if (q) params.set('q', q);
    if (driveId) params.set('driveId', driveId);
    if (branch) params.set('branch', branch);
    if (status) params.set('status', status);

    const wrap = document.getElementById('adminAppsTableWrap');
    try {
      const data = await apiRequest(`/api/admin/applications?${params.toString()}`);
      const apps = data.applications || [];

      if (!apps.length) {
        wrap.innerHTML = '<div class="empty-state">No applications match the selected filters.</div>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Academic</th>
              <th>Company &amp; Drive</th>
              <th>Skill Match</th>
              <th>Applied On</th>
              <th>Current Status</th>
              <th>Update Status &amp; Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${apps
              .map((a) => {
                const student = a.student || {};
                const prof = a.studentProfile || {};
                const drive = a.drive || {};
                const company = drive.company || {};
                const snap = a.skillMatchSnapshot || {};
                return `
                <tr>
                  <td>
                    <strong>${escapeHtml(student.name || '-')}</strong><br/>
                    <span class="muted-text">${escapeHtml(prof.rollNumber || '')}</span>
                  </td>
                  <td>
                    ${escapeHtml(prof.branch || '-')} | CGPA: <strong>${prof.cgpa !== undefined ? Number(prof.cgpa).toFixed(2) : '-'}</strong><br/>
                    <span class="muted-text">Backlogs: ${prof.backlogs ?? '-'}</span>
                  </td>
                  <td>
                    <strong>${escapeHtml(company.name || '-')}</strong><br/>
                    <span>${escapeHtml(drive.title || '-')}</span>
                  </td>
                  <td><strong>${snap.matchPercentage !== undefined ? `${snap.matchPercentage}%` : '-'}</strong></td>
                  <td>${formatDate(a.appliedAt)}</td>
                  <td>${renderStatusBadge(a.status)}</td>
                  <td style="min-width:250px;">
                    <div style="display:flex;flex-direction:column;gap:6px;">
                      <select data-status-select="${a._id}">
                        ${STATUSES.map(
                          (st) => `<option value="${st}" ${a.status === st ? 'selected' : ''}>${st}</option>`
                        ).join('')}
                      </select>
                      <input type="text" data-remarks-input="${a._id}" value="${escapeHtml(a.remarks || '')}" placeholder="Optional remarks..." />
                      <button type="button" class="btn btn-primary btn-sm" data-save-app="${a._id}">Save Status</button>
                    </div>
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

  document.getElementById('appFilterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadApplications();
  });

  document.getElementById('resetAppFilterBtn').addEventListener('click', () => {
    document.getElementById('appSearchQ').value = '';
    document.getElementById('appFilterDrive').value = 'all';
    document.getElementById('appFilterBranch').value = 'all';
    document.getElementById('appFilterStatus').value = 'all';
    loadApplications();
  });

  document.addEventListener('click', async (e) => {
    const appId = e.target.getAttribute('data-save-app');
    if (!appId) return;

    const statusSelect = document.querySelector(`[data-status-select="${appId}"]`);
    const remarksInput = document.querySelector(`[data-remarks-input="${appId}"]`);
    if (!statusSelect) return;

    e.target.disabled = true;
    showAlert('pageAlert', '');
    try {
      const res = await apiRequest(`/api/admin/applications/${encodeURIComponent(appId)}/status`, {
        method: 'PUT',
        body: {
          status: statusSelect.value,
          remarks: remarksInput ? remarksInput.value : '',
        },
      });
      showAlert('pageAlert', res.message, 'success');
      await loadApplications();
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
      e.target.disabled = false;
    }
  });

  try {
    await Promise.all([loadDriveFilterOptions(), loadApplications()]);
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }
})();
