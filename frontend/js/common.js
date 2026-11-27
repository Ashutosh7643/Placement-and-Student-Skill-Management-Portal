/* Shared Frontend Utilities for DBUU Placement and Student Skill Management Portal */

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toInputDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

async function apiRequest(url, options = {}) {
  const config = {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { success: response.ok, message: text || response.statusText };
  }

  if (!response.ok) {
    const err = new Error((data && data.message) || `Request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

function showAlert(containerOrId, message, type = 'info') {
  const el =
    typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!el) return;
  if (!message) {
    el.className = 'hidden';
    el.innerHTML = '';
    return;
  }
  const typeClass =
    type === 'success'
      ? 'alert-success'
      : type === 'error'
      ? 'alert-error'
      : type === 'warning'
      ? 'alert-warning'
      : 'alert-info';
  el.className = `alert ${typeClass}`;
  el.textContent = message;
}

function renderStatusBadge(status) {
  const map = {
    Open: 'badge-success',
    Selected: 'badge-success',
    Eligible: 'badge-success',
    Active: 'badge-success',
    Shortlisted: 'badge-info',
    Applied: 'badge-navy',
    'Under Review': 'badge-warning',
    Upcoming: 'badge-warning',
    Rejected: 'badge-danger',
    Closed: 'badge-danger',
    'Not Eligible': 'badge-danger',
    Inactive: 'badge-danger',
    Completed: 'badge-neutral',
  };
  const cls = map[status] || 'badge-neutral';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

const ICONS = {
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  skills:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  portfolio:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  drives:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
  applications:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  companies:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>',
  reports:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
};

function getNavItems(role) {
  if (role === 'admin') {
    return [
      { id: 'admin-dashboard', label: 'Admin Dashboard', href: '/pages/admin-dashboard.html', icon: ICONS.dashboard },
      { id: 'admin-students', label: 'Student Management', href: '/pages/admin-students.html', icon: ICONS.user },
      { id: 'admin-companies', label: 'Company Management', href: '/pages/admin-companies.html', icon: ICONS.companies },
      { id: 'admin-drives', label: 'Placement Drives', href: '/pages/admin-drives.html', icon: ICONS.drives },
      { id: 'admin-applications', label: 'Applications', href: '/pages/admin-applications.html', icon: ICONS.applications },
      { id: 'admin-reports', label: 'Placement Reports', href: '/pages/admin-reports.html', icon: ICONS.reports },
    ];
  }
  return [
    { id: 'student-dashboard', label: 'Dashboard', href: '/pages/student-dashboard.html', icon: ICONS.dashboard },
    { id: 'student-profile', label: 'My Profile', href: '/pages/student-profile.html', icon: ICONS.user },
    { id: 'student-skills', label: 'Skills', href: '/pages/student-skills.html', icon: ICONS.skills },
    { id: 'student-portfolio', label: 'Projects & Certs', href: '/pages/student-portfolio.html', icon: ICONS.portfolio },
    { id: 'student-drives', label: 'Placement Drives', href: '/pages/student-drives.html', icon: ICONS.drives },
    { id: 'student-applications', label: 'My Applications', href: '/pages/student-applications.html', icon: ICONS.applications },
  ];
}

function renderAppShell({ role, activePage, pageTitle, user, profile }) {
  const navItems = getNavItems(role);
  const sidebarEl = document.getElementById('app-sidebar');
  const topbarEl = document.getElementById('app-topbar');

  if (sidebarEl) {
    const roleLabel = role === 'admin' ? 'T&P Admin Portal' : 'Student Portal';
    sidebarEl.innerHTML = `
      <div class="sidebar-brand">
        <img src="/images/dbuu-crest.svg" alt="DBUU Emblem" />
        <div>
          <div class="sidebar-brand-text">DBUU Placement Cell</div>
          <div class="sidebar-role-tag">${escapeHtml(roleLabel)}</div>
        </div>
      </div>
      <nav class="sidebar-nav" aria-label="Primary navigation">
        ${navItems
          .map(
            (item) => `
          <a href="${item.href}" class="sidebar-link ${item.id === activePage ? 'active' : ''}">
            ${item.icon}
            <span>${escapeHtml(item.label)}</span>
          </a>`
          )
          .join('')}
      </nav>
      <div class="sidebar-footer">
        Dev Bhoomi Uttarakhand University, Dehradun
      </div>
    `;
  }

  if (topbarEl) {
    const subInfo =
      role === 'student' && profile
        ? `${profile.rollNumber} (${profile.branch})`
        : user.email;
    topbarEl.innerHTML = `
      <div class="topbar-left">
        <button type="button" class="menu-toggle" id="sidebarToggleBtn" aria-label="Toggle Menu">Menu</button>
        <h1 class="page-title">${escapeHtml(pageTitle)}</h1>
      </div>
      <div class="topbar-right">
        <div class="user-chip">
          <strong>${escapeHtml(user.name)}</strong>
          <span>${escapeHtml(subInfo)}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="logoutBtn">Logout</button>
      </div>
    `;

    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggleBtn && sidebarEl) {
      toggleBtn.addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
      });
    }
    if (overlay && sidebarEl) {
      overlay.addEventListener('click', () => {
        sidebarEl.classList.remove('open');
        overlay.classList.remove('open');
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await apiRequest('/api/auth/logout', { method: 'POST' });
        } finally {
          window.location.href = role === 'admin' ? '/pages/admin-login.html' : '/pages/login.html';
        }
      });
    }
  }
}

async function requirePageAuth(expectedRole) {
  try {
    const data = await apiRequest('/api/auth/me');
    if (!data || !data.user) {
      window.location.href = expectedRole === 'admin' ? '/pages/admin-login.html' : '/pages/login.html';
      return null;
    }
    if (expectedRole && data.user.role !== expectedRole) {
      window.location.href =
        data.user.role === 'admin' ? '/pages/admin-dashboard.html' : '/pages/student-dashboard.html';
      return null;
    }
    return data;
  } catch (err) {
    window.location.href = expectedRole === 'admin' ? '/pages/admin-login.html' : '/pages/login.html';
    return null;
  }
}

window.PortalCommon = {
  escapeHtml,
  formatDate,
  toInputDate,
  apiRequest,
  showAlert,
  renderStatusBadge,
  renderAppShell,
  requirePageAuth,
};
