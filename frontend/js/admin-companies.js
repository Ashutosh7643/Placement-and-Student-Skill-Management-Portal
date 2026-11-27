(async function initAdminCompanies() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, showAlert } = window.PortalCommon;

  const auth = await requirePageAuth('admin');
  if (!auth) return;

  renderAppShell({
    role: 'admin',
    activePage: 'admin-companies',
    pageTitle: 'Company Management',
    user: auth.user,
  });

  let companiesCache = [];

  function resetCompanyForm() {
    document.getElementById('editingCompanyId').value = '';
    document.getElementById('companyForm').reset();
    document.getElementById('companyFormHeading').textContent = 'Add Recruiting Company';
    document.getElementById('companySubmitBtn').textContent = 'Add Company';
    document.getElementById('cancelCompanyEditBtn').classList.add('hidden');
  }

  async function loadCompanies() {
    const q = document.getElementById('companySearchQ').value.trim();
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    const wrap = document.getElementById('companiesTableWrap');
    try {
      const data = await apiRequest(`/api/admin/companies${query}`);
      companiesCache = data.companies || [];

      if (!companiesCache.length) {
        wrap.innerHTML = '<div class="empty-state">No companies found.</div>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Industry</th>
              <th>Location</th>
              <th>HR Contact</th>
              <th>Drives</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${companiesCache
              .map(
                (c) => `
              <tr>
                <td>
                  <strong>${escapeHtml(c.name)}</strong>
                  ${c.website ? `<div class="muted-text" style="font-size:12px;">${escapeHtml(c.website)}</div>` : ''}
                </td>
                <td>${escapeHtml(c.industry)}</td>
                <td>${escapeHtml(c.location)}</td>
                <td>
                  ${escapeHtml(c.hrName || '-')}
                  ${c.hrEmail ? `<div class="muted-text" style="font-size:12px;">${escapeHtml(c.hrEmail)}</div>` : ''}
                </td>
                <td>${c.drivesCount}</td>
                <td class="actions-cell">
                  <button type="button" class="btn btn-secondary btn-sm" data-edit-company="${c._id}">Edit</button>
                  <button type="button" class="btn btn-danger btn-sm" data-delete-company="${c._id}">Delete</button>
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

  document.getElementById('cancelCompanyEditBtn').addEventListener('click', resetCompanyForm);

  document.getElementById('companyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('companySubmitBtn');
    btn.disabled = true;
    showAlert('pageAlert', '');

    const id = document.getElementById('editingCompanyId').value;
    const payload = {
      name: document.getElementById('companyName').value,
      industry: document.getElementById('companyIndustry').value,
      location: document.getElementById('companyLocation').value,
      website: document.getElementById('companyWebsite').value,
      hrName: document.getElementById('companyHrName').value,
      hrEmail: document.getElementById('companyHrEmail').value,
      description: document.getElementById('companyDescription').value,
    };

    try {
      const res = id
        ? await apiRequest(`/api/admin/companies/${id}`, { method: 'PUT', body: payload })
        : await apiRequest('/api/admin/companies', { method: 'POST', body: payload });
      showAlert('pageAlert', res.message, 'success');
      resetCompanyForm();
      await loadCompanies();
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('companyFilterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadCompanies();
  });

  document.getElementById('resetCompanyFilterBtn').addEventListener('click', () => {
    document.getElementById('companySearchQ').value = '';
    loadCompanies();
  });

  document.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit-company');
    if (editId) {
      const c = companiesCache.find((item) => item._id === editId);
      if (!c) return;
      document.getElementById('editingCompanyId').value = c._id;
      document.getElementById('companyName').value = c.name;
      document.getElementById('companyIndustry').value = c.industry;
      document.getElementById('companyLocation').value = c.location;
      document.getElementById('companyWebsite').value = c.website || '';
      document.getElementById('companyHrName').value = c.hrName || '';
      document.getElementById('companyHrEmail').value = c.hrEmail || '';
      document.getElementById('companyDescription').value = c.description || '';
      document.getElementById('companyFormHeading').textContent = 'Edit Company';
      document.getElementById('companySubmitBtn').textContent = 'Update Company';
      document.getElementById('cancelCompanyEditBtn').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const delId = e.target.getAttribute('data-delete-company');
    if (delId) {
      if (!window.confirm('Delete this company?')) return;
      try {
        const res = await apiRequest(`/api/admin/companies/${delId}`, { method: 'DELETE' });
        showAlert('pageAlert', res.message, 'success');
        await loadCompanies();
      } catch (err) {
        showAlert('pageAlert', err.message, 'error');
      }
    }
  });

  await loadCompanies();
})();
