(async function initStudentSkills() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, showAlert } = window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-skills',
    pageTitle: 'Technical & Soft Skills',
    user: auth.user,
    profile: auth.profile,
  });

  let skillsCache = [];

  function resetSkillForm() {
    document.getElementById('editingSkillId').value = '';
    document.getElementById('skillName').value = '';
    document.getElementById('skillCategory').value = 'technical';
    document.getElementById('skillProficiency').value = 'Intermediate';
    document.getElementById('skillFormHeading').textContent = 'Add Technical or Soft Skill';
    document.getElementById('skillSubmitBtn').textContent = 'Add Skill';
    document.getElementById('cancelSkillEditBtn').classList.add('hidden');
  }

  function renderSkillTable(containerId, items, emptyText) {
    const el = document.getElementById(containerId);
    if (!items.length) {
      el.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Skill Name</th>
            <th>Proficiency</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (s) => `
            <tr>
              <td><strong>${escapeHtml(s.name)}</strong></td>
              <td><span class="badge badge-navy">${escapeHtml(s.proficiency)}</span></td>
              <td class="actions-cell">
                <button type="button" class="btn btn-secondary btn-sm" data-edit-skill="${s._id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm" data-delete-skill="${s._id}">Delete</button>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  async function loadSkills() {
    const data = await apiRequest('/api/student/skills');
    skillsCache = data.skills || [];
    const tech = skillsCache.filter((s) => s.category === 'technical');
    const soft = skillsCache.filter((s) => s.category === 'soft');

    document.getElementById('techCount').textContent = tech.length;
    document.getElementById('softCount').textContent = soft.length;

    renderSkillTable('technicalSkillsWrap', tech, 'No technical skills added yet.');
    renderSkillTable('softSkillsWrap', soft, 'No soft skills added yet.');
  }

  document.getElementById('cancelSkillEditBtn').addEventListener('click', resetSkillForm);

  document.getElementById('skillForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('skillSubmitBtn');
    btn.disabled = true;
    showAlert('pageAlert', '');

    const editingId = document.getElementById('editingSkillId').value;
    const payload = {
      name: document.getElementById('skillName').value,
      category: document.getElementById('skillCategory').value,
      proficiency: document.getElementById('skillProficiency').value,
    };

    try {
      const res = editingId
        ? await apiRequest(`/api/student/skills/${editingId}`, { method: 'PUT', body: payload })
        : await apiRequest('/api/student/skills', { method: 'POST', body: payload });

      showAlert('pageAlert', res.message, 'success');
      resetSkillForm();
      await loadSkills();
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit-skill');
    if (editId) {
      const skill = skillsCache.find((s) => s._id === editId);
      if (!skill) return;
      document.getElementById('editingSkillId').value = skill._id;
      document.getElementById('skillName').value = skill.name;
      document.getElementById('skillCategory').value = skill.category;
      document.getElementById('skillProficiency').value = skill.proficiency;
      document.getElementById('skillFormHeading').textContent = 'Edit Skill';
      document.getElementById('skillSubmitBtn').textContent = 'Update Skill';
      document.getElementById('cancelSkillEditBtn').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const deleteId = e.target.getAttribute('data-delete-skill');
    if (deleteId) {
      if (!window.confirm('Delete this skill from your profile?')) return;
      try {
        const res = await apiRequest(`/api/student/skills/${deleteId}`, { method: 'DELETE' });
        showAlert('pageAlert', res.message, 'success');
        await loadSkills();
      } catch (err) {
        showAlert('pageAlert', err.message, 'error');
      }
    }
  });

  try {
    await loadSkills();
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }
})();
