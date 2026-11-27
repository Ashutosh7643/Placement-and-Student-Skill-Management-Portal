(async function initAdminStudents() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('admin');
  if (!auth) return;

  renderAppShell({
    role: 'admin',
    activePage: 'admin-students',
    pageTitle: 'Student Management',
    user: auth.user,
  });

  const modal = document.getElementById('studentModal');
  const modalBody = document.getElementById('studentModalBody');

  function closeModal() {
    modal.classList.add('hidden');
  }

  document.getElementById('closeStudentModalBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  async function loadStudents() {
    const params = new URLSearchParams();
    const q = document.getElementById('filterQ').value.trim();
    const branch = document.getElementById('filterBranch').value;
    const minCgpa = document.getElementById('filterMinCgpa').value;
    const maxBacklogs = document.getElementById('filterMaxBacklogs').value;

    if (q) params.set('q', q);
    if (branch) params.set('branch', branch);
    if (minCgpa !== '') params.set('minCgpa', minCgpa);
    if (maxBacklogs !== '') params.set('maxBacklogs', maxBacklogs);

    const wrap = document.getElementById('studentsTableWrap');
    try {
      const data = await apiRequest(`/api/admin/students?${params.toString()}`);
      const students = data.students || [];

      if (!students.length) {
        wrap.innerHTML = '<div class="empty-state">No student records match your filters.</div>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Student Name &amp; Email</th>
              <th>Branch / Sem</th>
              <th>CGPA</th>
              <th>Backlogs</th>
              <th>Skills / Apps</th>
              <th>Account</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map(
                (s) => `
              <tr>
                <td><strong>${escapeHtml(s.rollNumber)}</strong></td>
                <td>
                  <strong>${escapeHtml(s.name)}</strong><br/>
                  <span class="muted-text">${escapeHtml(s.email)}</span>
                </td>
                <td>${escapeHtml(s.branch)} (Sem ${s.semester})</td>
                <td><strong>${Number(s.cgpa).toFixed(2)}</strong></td>
                <td>${s.backlogs}</td>
                <td>${s.skillsCount} skills / ${s.applicationsCount} apps</td>
                <td>${renderStatusBadge(s.isActive ? 'Active' : 'Inactive')}</td>
                <td>
                  <button type="button" class="btn btn-secondary btn-sm" data-view-student="${s.id}">View / Edit</button>
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

  async function openStudentModal(studentId) {
    modal.classList.remove('hidden');
    modalBody.innerHTML = 'Loading student profile...';
    try {
      const data = await apiRequest(`/api/admin/students/${encodeURIComponent(studentId)}`);
      const { student, profile, skills, projects, certifications, applications } = data;
      document.getElementById('studentModalTitle').textContent = `${student.name} (${profile ? profile.rollNumber : ''})`;

      modalBody.innerHTML = `
        <div id="modalAlert" class="hidden"></div>
        <form id="editStudentForm" style="margin-bottom:18px;">
          <div class="form-grid">
            <div class="form-group">
              <label for="mName">Full Name</label>
              <input type="text" id="mName" value="${escapeHtml(student.name)}" required />
            </div>
            <div class="form-group">
              <label for="mRoll">Roll Number</label>
              <input type="text" id="mRoll" value="${escapeHtml(profile ? profile.rollNumber : '')}" required />
            </div>
            <div class="form-group">
              <label for="mBranch">Branch</label>
              <input type="text" id="mBranch" value="${escapeHtml(profile ? profile.branch : '')}" required />
            </div>
            <div class="form-group">
              <label for="mSem">Semester</label>
              <input type="number" id="mSem" min="1" max="8" value="${profile ? profile.semester : 6}" required />
            </div>
            <div class="form-group">
              <label for="mCgpa">CGPA</label>
              <input type="number" id="mCgpa" min="0" max="10" step="0.01" value="${profile ? profile.cgpa : 0}" required />
            </div>
            <div class="form-group">
              <label for="mBacklogs">Backlogs</label>
              <input type="number" id="mBacklogs" min="0" value="${profile ? profile.backlogs : 0}" required />
            </div>
            <div class="form-group">
              <label for="mStatus">Account Status</label>
              <select id="mStatus">
                <option value="true" ${student.isActive ? 'selected' : ''}>Active</option>
                <option value="false" ${!student.isActive ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
            <div class="form-group">
              <label for="mPhone">Phone</label>
              <input type="text" id="mPhone" value="${escapeHtml(profile ? profile.phone || '' : '')}" />
            </div>
          </div>
          <div style="margin-top:12px;">
            <button type="submit" class="btn btn-primary btn-sm">Update Student Record</button>
          </div>
        </form>

        <div style="margin-bottom:12px;">
          <strong>Skills (${skills.length}):</strong>
          <div class="chip-list" style="margin-top:6px;">
            ${skills.length ? skills.map((sk) => `<span class="skill-chip">${escapeHtml(sk.name)} (${escapeHtml(sk.category)})</span>`).join('') : '<span class="muted-text">No skills added</span>'}
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <strong>Projects (${projects.length}):</strong>
          ${projects.length ? `<ul style="margin-left:18px;margin-top:4px;">${projects.map((p) => `<li><strong>${escapeHtml(p.title)}</strong> &mdash; ${escapeHtml((p.techStack || []).join(', '))}</li>`).join('')}</ul>` : '<span class="muted-text"> None</span>'}
        </div>
        <div style="margin-bottom:12px;">
          <strong>Certifications (${certifications.length}):</strong>
          ${certifications.length ? `<ul style="margin-left:18px;margin-top:4px;">${certifications.map((c) => `<li>${escapeHtml(c.title)} (${escapeHtml(c.issuingOrganization)})</li>`).join('')}</ul>` : '<span class="muted-text"> None</span>'}
        </div>
        <div>
          <strong>Applications (${applications.length}):</strong>
          ${applications.length ? `<ul style="margin-left:18px;margin-top:4px;">${applications.map((a) => `<li>${escapeHtml(a.drive && a.drive.company ? a.drive.company.name : 'Company')} - ${escapeHtml(a.drive ? a.drive.title : '')} (${escapeHtml(a.status)})</li>`).join('')}</ul>` : '<span class="muted-text"> None</span>'}
        </div>
      `;

      document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await apiRequest(`/api/admin/students/${encodeURIComponent(studentId)}`, {
            method: 'PUT',
            body: {
              name: document.getElementById('mName').value,
              rollNumber: document.getElementById('mRoll').value,
              branch: document.getElementById('mBranch').value,
              semester: Number(document.getElementById('mSem').value),
              cgpa: Number(document.getElementById('mCgpa').value),
              backlogs: Number(document.getElementById('mBacklogs').value),
              isActive: document.getElementById('mStatus').value === 'true',
              phone: document.getElementById('mPhone').value,
            },
          });
          showAlert('modalAlert', res.message, 'success');
          await loadStudents();
        } catch (err) {
          showAlert('modalAlert', err.message, 'error');
        }
      });
    } catch (err) {
      modalBody.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  }

  document.getElementById('studentFilterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadStudents();
  });

  document.getElementById('resetStudentFilterBtn').addEventListener('click', () => {
    document.getElementById('filterQ').value = '';
    document.getElementById('filterBranch').value = 'all';
    document.getElementById('filterMinCgpa').value = '';
    document.getElementById('filterMaxBacklogs').value = '';
    loadStudents();
  });

  document.addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-view-student');
    if (id) openStudentModal(id);
  });

  await loadStudents();
})();
