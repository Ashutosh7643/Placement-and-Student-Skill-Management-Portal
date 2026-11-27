(async function initStudentPortfolio() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, toInputDate, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-portfolio',
    pageTitle: 'Projects & Certifications',
    user: auth.user,
    profile: auth.profile,
  });

  let projectsCache = [];
  let certsCache = [];

  function resetProjectForm() {
    document.getElementById('editingProjectId').value = '';
    document.getElementById('projectForm').reset();
    document.getElementById('projectFormTitle').textContent = 'Add Project';
    document.getElementById('projectSubmitBtn').textContent = 'Save Project';
    document.getElementById('cancelProjectEditBtn').classList.add('hidden');
  }

  function resetCertForm() {
    document.getElementById('editingCertId').value = '';
    document.getElementById('certForm').reset();
    document.getElementById('certFormTitle').textContent = 'Add Certification';
    document.getElementById('certSubmitBtn').textContent = 'Save Certification';
    document.getElementById('cancelCertEditBtn').classList.add('hidden');
  }

  async function loadProjects() {
    const data = await apiRequest('/api/student/projects');
    projectsCache = data.projects || [];
    document.getElementById('projectsCount').textContent = projectsCache.length;

    const wrap = document.getElementById('projectsTableWrap');
    if (!projectsCache.length) {
      wrap.innerHTML = '<div class="empty-state">No projects added yet.</div>';
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Technologies</th>
            <th>Timeline</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${projectsCache
            .map(
              (p) => `
            <tr>
              <td>
                <strong>${escapeHtml(p.title)}</strong>
                ${p.role ? `<span class="muted-text"> (${escapeHtml(p.role)})</span>` : ''}
                <div class="muted-text" style="margin-top:3px;">${escapeHtml(p.description)}</div>
              </td>
              <td>
                <div class="chip-list">
                  ${(p.techStack || []).map((t) => `<span class="skill-chip">${escapeHtml(t)}</span>`).join('') || '-'}
                </div>
              </td>
              <td>${formatDate(p.startDate)} - ${formatDate(p.endDate)}</td>
              <td class="actions-cell">
                <button type="button" class="btn btn-secondary btn-sm" data-edit-project="${p._id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm" data-delete-project="${p._id}">Delete</button>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  async function loadCertifications() {
    const data = await apiRequest('/api/student/certifications');
    certsCache = data.certifications || [];
    document.getElementById('certsCount').textContent = certsCache.length;

    const wrap = document.getElementById('certsTableWrap');
    if (!certsCache.length) {
      wrap.innerHTML = '<div class="empty-state">No certifications added yet.</div>';
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Certification</th>
            <th>Issuing Organization</th>
            <th>Issue Date</th>
            <th>Credential ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${certsCache
            .map(
              (c) => `
            <tr>
              <td><strong>${escapeHtml(c.title)}</strong></td>
              <td>${escapeHtml(c.issuingOrganization)}</td>
              <td>${formatDate(c.issueDate)}</td>
              <td>${escapeHtml(c.credentialId || '-')}</td>
              <td class="actions-cell">
                <button type="button" class="btn btn-secondary btn-sm" data-edit-cert="${c._id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm" data-delete-cert="${c._id}">Delete</button>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  document.getElementById('cancelProjectEditBtn').addEventListener('click', resetProjectForm);
  document.getElementById('cancelCertEditBtn').addEventListener('click', resetCertForm);

  document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('projectSubmitBtn');
    btn.disabled = true;
    showAlert('pageAlert', '');

    const id = document.getElementById('editingProjectId').value;
    const payload = {
      title: document.getElementById('projectTitle').value,
      role: document.getElementById('projectRole').value,
      description: document.getElementById('projectDescription').value,
      techStack: document.getElementById('projectTechStack').value,
      githubUrl: document.getElementById('projectGithub').value,
      projectUrl: document.getElementById('projectUrl').value,
      startDate: document.getElementById('projectStartDate').value || null,
      endDate: document.getElementById('projectEndDate').value || null,
    };

    try {
      const res = id
        ? await apiRequest(`/api/student/projects/${id}`, { method: 'PUT', body: payload })
        : await apiRequest('/api/student/projects', { method: 'POST', body: payload });
      showAlert('pageAlert', res.message, 'success');
      resetProjectForm();
      await loadProjects();
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('certForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('certSubmitBtn');
    btn.disabled = true;
    showAlert('pageAlert', '');

    const id = document.getElementById('editingCertId').value;
    const payload = {
      title: document.getElementById('certTitle').value,
      issuingOrganization: document.getElementById('certOrg').value,
      issueDate: document.getElementById('certIssueDate').value,
      expiryDate: document.getElementById('certExpiryDate').value || null,
      credentialId: document.getElementById('certCredentialId').value,
      credentialUrl: document.getElementById('certCredentialUrl').value,
    };

    try {
      const res = id
        ? await apiRequest(`/api/student/certifications/${id}`, { method: 'PUT', body: payload })
        : await apiRequest('/api/student/certifications', { method: 'POST', body: payload });
      showAlert('pageAlert', res.message, 'success');
      resetCertForm();
      await loadCertifications();
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener('click', async (e) => {
    const editProjId = e.target.getAttribute('data-edit-project');
    if (editProjId) {
      const proj = projectsCache.find((p) => p._id === editProjId);
      if (!proj) return;
      document.getElementById('editingProjectId').value = proj._id;
      document.getElementById('projectTitle').value = proj.title;
      document.getElementById('projectRole').value = proj.role || '';
      document.getElementById('projectDescription').value = proj.description;
      document.getElementById('projectTechStack').value = (proj.techStack || []).join(', ');
      document.getElementById('projectGithub').value = proj.githubUrl || '';
      document.getElementById('projectUrl').value = proj.projectUrl || '';
      document.getElementById('projectStartDate').value = toInputDate(proj.startDate);
      document.getElementById('projectEndDate').value = toInputDate(proj.endDate);
      document.getElementById('projectFormTitle').textContent = 'Edit Project';
      document.getElementById('projectSubmitBtn').textContent = 'Update Project';
      document.getElementById('cancelProjectEditBtn').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const delProjId = e.target.getAttribute('data-delete-project');
    if (delProjId) {
      if (!window.confirm('Delete this project?')) return;
      try {
        const res = await apiRequest(`/api/student/projects/${delProjId}`, { method: 'DELETE' });
        showAlert('pageAlert', res.message, 'success');
        await loadProjects();
      } catch (err) {
        showAlert('pageAlert', err.message, 'error');
      }
      return;
    }

    const editCertId = e.target.getAttribute('data-edit-cert');
    if (editCertId) {
      const cert = certsCache.find((c) => c._id === editCertId);
      if (!cert) return;
      document.getElementById('editingCertId').value = cert._id;
      document.getElementById('certTitle').value = cert.title;
      document.getElementById('certOrg').value = cert.issuingOrganization;
      document.getElementById('certIssueDate').value = toInputDate(cert.issueDate);
      document.getElementById('certExpiryDate').value = toInputDate(cert.expiryDate);
      document.getElementById('certCredentialId').value = cert.credentialId || '';
      document.getElementById('certCredentialUrl').value = cert.credentialUrl || '';
      document.getElementById('certFormTitle').textContent = 'Edit Certification';
      document.getElementById('certSubmitBtn').textContent = 'Update Certification';
      document.getElementById('cancelCertEditBtn').classList.remove('hidden');
      document.getElementById('certForm').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const delCertId = e.target.getAttribute('data-delete-cert');
    if (delCertId) {
      if (!window.confirm('Delete this certification?')) return;
      try {
        const res = await apiRequest(`/api/student/certifications/${delCertId}`, { method: 'DELETE' });
        showAlert('pageAlert', res.message, 'success');
        await loadCertifications();
      } catch (err) {
        showAlert('pageAlert', err.message, 'error');
      }
    }
  });

  try {
    await Promise.all([loadProjects(), loadCertifications()]);
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }
})();
