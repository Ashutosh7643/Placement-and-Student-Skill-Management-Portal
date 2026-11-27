(async function initStudentProfile() {
  const { apiRequest, renderAppShell, requirePageAuth, showAlert } = window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-profile',
    pageTitle: 'My Academic Profile',
    user: auth.user,
    profile: auth.profile,
  });

  function populateForm(user, profile) {
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
    if (profile) {
      document.getElementById('rollNumber').value = profile.rollNumber || '';
      document.getElementById('department').value = profile.department || '';
      document.getElementById('branch').value = profile.branch || 'CSE';
      document.getElementById('academicYear').value = profile.academicYear || '3rd Year';
      document.getElementById('semester').value = profile.semester || 6;
      document.getElementById('cgpa').value = profile.cgpa ?? '';
      document.getElementById('backlogs').value = profile.backlogs ?? 0;
      document.getElementById('phone').value = profile.phone || '';
      document.getElementById('linkedinUrl').value = profile.linkedinUrl || '';
      document.getElementById('githubUrl').value = profile.githubUrl || '';
      document.getElementById('address').value = profile.address || '';
      document.getElementById('bio').value = profile.bio || '';
    }
  }

  try {
    const res = await apiRequest('/api/student/profile');
    populateForm(res.user, res.profile);
  } catch (err) {
    showAlert('pageAlert', err.message, 'error');
  }

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    showAlert('pageAlert', '');

    try {
      const payload = {
        name: document.getElementById('name').value,
        rollNumber: document.getElementById('rollNumber').value,
        department: document.getElementById('department').value,
        branch: document.getElementById('branch').value,
        academicYear: document.getElementById('academicYear').value,
        semester: Number(document.getElementById('semester').value),
        cgpa: Number(document.getElementById('cgpa').value),
        backlogs: Number(document.getElementById('backlogs').value),
        phone: document.getElementById('phone').value,
        linkedinUrl: document.getElementById('linkedinUrl').value,
        githubUrl: document.getElementById('githubUrl').value,
        address: document.getElementById('address').value,
        bio: document.getElementById('bio').value,
      };

      const updated = await apiRequest('/api/student/profile', {
        method: 'PUT',
        body: payload,
      });

      populateForm(updated.user, updated.profile);
      renderAppShell({
        role: 'student',
        activePage: 'student-profile',
        pageTitle: 'My Academic Profile',
        user: updated.user,
        profile: updated.profile,
      });
      showAlert('pageAlert', updated.message, 'success');
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
