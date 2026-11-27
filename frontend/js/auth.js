(function initAuthPages() {
  const { apiRequest, showAlert } = window.PortalCommon;

  const studentLoginForm = document.getElementById('studentLoginForm');
  if (studentLoginForm) {
    studentLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginSubmitBtn');
      btn.disabled = true;
      showAlert('authAlert', '');
      try {
        await apiRequest('/api/auth/login', {
          method: 'POST',
          body: {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            expectedRole: 'student',
          },
        });
        window.location.href = '/pages/student-dashboard.html';
      } catch (err) {
        showAlert('authAlert', err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('adminLoginBtn');
      btn.disabled = true;
      showAlert('authAlert', '');
      try {
        await apiRequest('/api/auth/login', {
          method: 'POST',
          body: {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            expectedRole: 'admin',
          },
        });
        window.location.href = '/pages/admin-dashboard.html';
      } catch (err) {
        showAlert('authAlert', err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('registerBtn');
      btn.disabled = true;
      showAlert('authAlert', '');
      try {
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            rollNumber: document.getElementById('rollNumber').value,
            department: document.getElementById('department').value,
            branch: document.getElementById('branch').value,
            academicYear: document.getElementById('academicYear').value,
            semester: Number(document.getElementById('semester').value),
            cgpa: Number(document.getElementById('cgpa').value),
            backlogs: Number(document.getElementById('backlogs').value),
            phone: document.getElementById('phone').value,
          },
        });
        window.location.href = '/pages/student-dashboard.html';
      } catch (err) {
        showAlert('authAlert', err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
