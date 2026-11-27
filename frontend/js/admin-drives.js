(async function initAdminDrives() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, toInputDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('admin');
  if (!auth) return;

  renderAppShell({
    role: 'admin',
    activePage: 'admin-drives',
    pageTitle: 'Placement Drive Management',
    user: auth.user,
  });

  let drivesCache = [];

  function resetDriveForm() {
    document.getElementById('editingDriveId').value = '';
    document.getElementById('driveForm').reset();
    document.getElementById('driveMinCgpa').value = '6.5';
    document.getElementById('driveMaxBacklogs').value = '0';
    document.getElementById('driveBranches').value = 'CSE, IT';
    document.getElementById('driveStatus').value = 'Open';
    document.getElementById('driveFormHeading').textContent = 'Create Placement Drive';
    document.getElementById('driveSubmitBtn').textContent = 'Create Placement Drive';
    document.getElementById('cancelDriveEditBtn').classList.add('hidden');
  }

  async function loadCompanyOptions() {
    const data = await apiRequest('/api/admin/companies');
    const select = document.getElementById('driveCompany');
    const companies = data.companies || [];
    if (!companies.length) {
      select.innerHTML = '<option value="">No companies registered yet</option>';
      return;
    }
    select.innerHTML = companies
      .map((c) => `<option value="${c._id}">${escapeHtml(c.name)} (${escapeHtml(c.location)})</option>`)
      .join('');
  }

  async function loadDrives() {
    const params = new URLSearchParams();
    const q = document.getElementById('driveSearchQ').value.trim();
    const status = document.getElementById('driveFilterStatus').value;
    if (q) params.set('q', q);
    if (status) params.set('status', status);

    const wrap = document.getElementById('drivesTableWrap');
    try {
      const data = await apiRequest(`/api/admin/drives?${params.toString()}`);
      drivesCache = data.drives || [];

      if (!drivesCache.length) {
        wrap.innerHTML = '<div class="empty-state">No placement drives match your filters.</div>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company &amp; Drive</th>
              <th>Package</th>
              <th>Eligibility Criteria</th>
              <th>Required Skills</th>
              <th>Deadline &amp; Status</th>
              <th>Apps</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${drivesCache
              .map(
                (d) => `
              <tr>
                <td>
                  <strong>${escapeHtml(d.company ? d.company.name : '-')}</strong><br/>
                  <span>${escapeHtml(d.title)}</span><br/>
                  <span class="muted-text">${escapeHtml(d.jobRole)}</span>
                </td>
                <td>${escapeHtml(d.packageLPA)} LPA</td>
                <td>
                  CGPA &ge; ${Number(d.minCgpa).toFixed(1)}<br/>
                  Backlogs &le; ${d.maxBacklogs}<br/>
                  ${escapeHtml((d.eligibleBranches || []).join(', '))}
                </td>
                <td>
                  <div class="chip-list">
                    ${(d.requiredSkills || []).map((sk) => `<span class="skill-chip">${escapeHtml(sk)}</span>`).join('') || '-'}
                  </div>
                </td>
                <td>
                  ${formatDate(d.applicationDeadline)}<br/>
                  ${renderStatusBadge(d.status)}
                </td>
                <td><strong>${d.applicationsCount}</strong></td>
                <td class="actions-cell">
                  <button type="button" class="btn btn-secondary btn-sm" data-edit-drive="${d._id}">Edit</button>
                  <button type="button" class="btn btn-danger btn-sm" data-delete-drive="${d._id}">Delete</button>
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

  document.getElementById('cancelDriveEditBtn').addEventListener('click', resetDriveForm);

  document.getElementById('driveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('driveSubmitBtn');
    btn.disabled = true;
    showAlert('pageAlert', '');

    const id = document.getElementById('editingDriveId').value;
    const payload = {
      company: document.getElementById('driveCompany').value,
      title: document.getElementById('driveTitle').value,
      jobRole: document.getElementById('driveRole').value,
      packageLPA: Number(document.getElementById('drivePackage').value),
      location: document.getElementById('driveLocation').value,
      jobType: document.getElementById('driveJobType').value,
      minCgpa: Number(document.getElementById('driveMinCgpa').value),
      maxBacklogs: Number(document.getElementById('driveMaxBacklogs').value),
      eligibleBranches: document.getElementById('driveBranches').value,
      requiredSkills: document.getElementById('driveSkills').value,
      applicationDeadline: document.getElementById('driveDeadline').value,
      driveDate: document.getElementById('driveDate').value || null,
      status: document.getElementById('driveStatus').value,
      description: document.getElementById('driveDescription').value,
    };

    try {
      const res = id
        ? await apiRequest(`/api/admin/drives/${id}`, { method: 'PUT', body: payload })
        : await apiRequest('/api/admin/drives', { method: 'POST', body: payload });
      showAlert('pageAlert', res.message, 'success');
      resetDriveForm();
      await loadDrives();
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('driveFilterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadDrives();
  });

  document.getElementById('resetDriveFilterBtn').addEventListener('click', () => {
    document.getElementById('driveSearchQ').value = '';
    document.getElementById('driveFilterStatus').value = 'all';
    loadDrives();
  });

  document.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit-drive');
    if (editId) {
      const d = drivesCache.find((item) => item._id === editId);
      if (!d) return;
      document.getElementById('editingDriveId').value = d._id;
      document.getElementById('driveCompany').value = d.company ? d.company._id : '';
      document.getElementById('driveTitle').value = d.title;
      document.getElementById('driveRole').value = d.jobRole;
      document.getElementById('drivePackage').value = d.packageLPA;
      document.getElementById('driveLocation').value = d.location;
      document.getElementById('driveJobType').value = d.jobType;
      document.getElementById('driveMinCgpa').value = d.minCgpa;
      document.getElementById('driveMaxBacklogs').value = d.maxBacklogs;
      document.getElementById('driveBranches').value = (d.eligibleBranches || []).join(', ');
      document.getElementById('driveSkills').value = (d.requiredSkills || []).join(', ');
      document.getElementById('driveDeadline').value = toInputDate(d.applicationDeadline);
      document.getElementById('driveDate').value = toInputDate(d.driveDate);
      document.getElementById('driveStatus').value = d.status;
      document.getElementById('driveDescription').value = d.description;
      document.getElementById('driveFormHeading').textContent = 'Edit Placement Drive';
      document.getElementById('driveSubmitBtn').textContent = 'Update Placement Drive';
      document.getElementById('cancelDriveEditBtn').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const delId = e.target.getAttribute('data-delete-drive');
    if (delId) {
      if (!window.confirm('Delete this placement drive and its associated applications?')) return;
      try {
        const res = await apiRequest(`/api/admin/drives/${delId}`, { method: 'DELETE' });
        showAlert('pageAlert', res.message, 'success');
        await loadDrives();
      } catch (err) {
        showAlert('pageAlert', err.message, 'error');
      }
    }
  });

  try {
    await Promise.all([loadCompanyOptions(), loadDrives()]);
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }
})();
