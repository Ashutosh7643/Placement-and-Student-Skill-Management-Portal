(async function initDriveDetails() {
  const { apiRequest, renderAppShell, requirePageAuth, escapeHtml, formatDate, renderStatusBadge, showAlert } =
    window.PortalCommon;

  const auth = await requirePageAuth('student');
  if (!auth) return;

  renderAppShell({
    role: 'student',
    activePage: 'student-drives',
    pageTitle: 'Drive Details & Eligibility Check',
    user: auth.user,
    profile: auth.profile,
  });

  const params = new URLSearchParams(window.location.search);
  const driveId = params.get('id');

  if (!driveId) {
    showAlert('pageAlert', 'No placement drive selected. Choose a drive from the Placement Drives page.', 'error');
    return;
  }

  async function loadDriveDetails() {
    try {
      const data = await apiRequest(`/api/drives/${encodeURIComponent(driveId)}`);
      const d = data.drive;
      const company = d.company || {};
      const elig = d.eligibility;
      const match = d.skillMatch;

      document.getElementById('driveHeading').textContent = d.title;
      document.getElementById('driveSubheading').textContent = `${company.name || 'Company'} — ${d.jobRole} (${d.jobType})`;
      document.getElementById('driveHeaderBadges').innerHTML = `${renderStatusBadge(d.status)}`;

      document.getElementById('driveOverviewBody').innerHTML = `
        <div class="form-grid-3" style="margin-bottom:14px;">
          <div><strong>Company:</strong><br/>${escapeHtml(company.name || '-')} (${escapeHtml(company.industry || '-')})</div>
          <div><strong>Package:</strong><br/>${escapeHtml(d.packageLPA)} LPA</div>
          <div><strong>Job Location:</strong><br/>${escapeHtml(d.location)}</div>
          <div><strong>Application Deadline:</strong><br/>${formatDate(d.applicationDeadline)}</div>
          <div><strong>Drive Date:</strong><br/>${formatDate(d.driveDate)}</div>
          <div><strong>Eligible Branches:</strong><br/>${escapeHtml((d.eligibleBranches || []).join(', '))}</div>
        </div>
        <p><strong>Job Description:</strong><br/>${escapeHtml(d.description)}</p>
        ${
          company.description
            ? `<p style="margin-top:10px;" class="muted-text"><strong>About Company:</strong> ${escapeHtml(company.description)}</p>`
            : ''
        }
      `;

      // Eligibility Breakdown
      document.getElementById('eligibilityStatusBadge').innerHTML = renderStatusBadge(
        elig.eligible ? 'Eligible' : 'Not Eligible'
      );

      const checks = elig.checks || {};
      document.getElementById('eligibilityBody').innerHTML = `
        <ul class="criteria-list">
          <li class="criteria-item">
            <span>Drive Status (Required: Open)</span>
            ${renderStatusBadge(checks.statusOk ? 'Eligible' : 'Not Eligible')}
          </li>
          <li class="criteria-item">
            <span>Application Deadline (${formatDate(d.applicationDeadline)})</span>
            ${renderStatusBadge(checks.deadlineOk ? 'Eligible' : 'Not Eligible')}
          </li>
          <li class="criteria-item">
            <span>Minimum CGPA (${Number(d.minCgpa).toFixed(2)})</span>
            ${renderStatusBadge(checks.cgpaOk ? 'Eligible' : 'Not Eligible')}
          </li>
          <li class="criteria-item">
            <span>Maximum Backlogs (${d.maxBacklogs})</span>
            ${renderStatusBadge(checks.backlogsOk ? 'Eligible' : 'Not Eligible')}
          </li>
          <li class="criteria-item">
            <span>Eligible Branches (${escapeHtml((d.eligibleBranches || []).join(', '))})</span>
            ${renderStatusBadge(checks.branchOk ? 'Eligible' : 'Not Eligible')}
          </li>
        </ul>
        ${
          elig.eligible
            ? '<div class="alert alert-success" style="margin-top:14px;margin-bottom:0;">You meet all academic and drive eligibility criteria.</div>'
            : `<div class="alert alert-error" style="margin-top:14px;margin-bottom:0;">
                <strong>Not Eligible — Reasons:</strong>
                <ul style="margin-left:18px;margin-top:6px;">
                  ${elig.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
              </div>`
        }
      `;

      // Skill Match Breakdown
      document.getElementById('skillMatchPercentBadge').innerHTML = match.hasRequiredSkills
        ? `<span class="badge badge-navy">${match.matchPercentage}% Match</span>`
        : '<span class="badge badge-neutral">No Skills Listed</span>';

      document.getElementById('skillMatchBody').innerHTML = `
        <p>${escapeHtml(match.note)}</p>
        ${
          match.hasRequiredSkills
            ? `
          <div class="progress-track">
            <div class="progress-fill" style="width:${Math.min(100, Math.max(0, match.matchPercentage))}%"></div>
          </div>
          <p class="muted-text" style="margin-bottom:12px;">
            Formula: (${match.matchedCount} matched / ${match.totalRequired} required) &times; 100 = <strong>${match.matchPercentage}%</strong>
          </p>
          <div style="margin-bottom:12px;">
            <strong>Matched Skills (${match.matchedSkills.length}):</strong>
            <div class="chip-list" style="margin-top:6px;">
              ${
                match.matchedSkills.length
                  ? match.matchedSkills.map((s) => `<span class="skill-chip matched">${escapeHtml(s)}</span>`).join('')
                  : '<span class="muted-text">None matched yet</span>'
              }
            </div>
          </div>
          <div>
            <strong>Missing Skills / Skill Gaps (${match.missingSkills.length}):</strong>
            <div class="chip-list" style="margin-top:6px;">
              ${
                match.missingSkills.length
                  ? match.missingSkills.map((s) => `<span class="skill-chip missing">${escapeHtml(s)}</span>`).join('')
                  : '<span class="muted-text">No skill gaps</span>'
              }
            </div>
          </div>`
            : ''
        }
      `;

      // Application Action
      const actionBody = document.getElementById('applyActionBody');
      if (d.hasApplied && d.application) {
        actionBody.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <strong>Application Submitted</strong> on ${formatDate(d.application.appliedAt)} &mdash;
              Current Status: ${renderStatusBadge(d.application.status)}
              ${d.application.remarks ? `<div class="muted-text" style="margin-top:4px;">Remarks: ${escapeHtml(d.application.remarks)}</div>` : ''}
            </div>
            <a href="/pages/student-applications.html" class="btn btn-secondary">View My Applications</a>
          </div>
        `;
      } else if (!elig.eligible) {
        actionBody.innerHTML = `
          <button type="button" class="btn btn-primary" disabled>Apply for This Drive</button>
          <span class="muted-text" style="margin-left:10px;">You cannot apply because one or more eligibility checks failed.</span>
        `;
      } else {
        actionBody.innerHTML = `
          <button type="button" class="btn btn-primary" id="applyDriveBtn">Submit Application for This Drive</button>
          <span class="muted-text" style="margin-left:10px;">Your current profile and skill match snapshot will be recorded.</span>
        `;
        document.getElementById('applyDriveBtn').addEventListener('click', async () => {
          const btn = document.getElementById('applyDriveBtn');
          btn.disabled = true;
          showAlert('pageAlert', '');
          try {
            const res = await apiRequest('/api/applications', {
              method: 'POST',
              body: { driveId: d._id },
            });
            showAlert('pageAlert', res.message, 'success');
            await loadDriveDetails();
          } catch (err) {
            showAlert('pageAlert', err.message, 'error');
            btn.disabled = false;
          }
        });
      }
    } catch (err) {
      showAlert('pageAlert', err.message, 'error');
    }
  }

  await loadDriveDetails();
})();
