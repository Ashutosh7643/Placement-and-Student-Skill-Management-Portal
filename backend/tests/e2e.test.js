const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'e2e-test-secret-key';

const createApp = require('../app');
const { seedDatabase } = require('../../database/seed');
const { calculateSkillMatch } = require('../services/skillMatchService');
const { evaluateEligibility } = require('../services/eligibilityService');

/**
 * Simple cookie-jar HTTP client using Node built-in fetch.
 */
class TestClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  _cookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  _saveCookies(res) {
    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const pair = raw.split(';')[0];
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const name = pair.slice(0, eqIdx).trim();
        const val = pair.slice(eqIdx + 1).trim();
        if (val === '' || raw.toLowerCase().includes('max-age=0')) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }
  }

  async request(urlPath, { method = 'GET', body = null } = {}) {
    const headers = {};
    const cookie = this._cookieHeader();
    if (cookie) headers.Cookie = cookie;
    if (body !== null) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${this.baseUrl}${urlPath}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });

    this._saveCookies(res);
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
}

async function startHttpServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function runTests() {
  const dbPath = path.join(__dirname, '..', '..', '.tmp', 'e2e-mongo');
  fs.mkdirSync(dbPath, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });
  const mongoUri = mongod.getUri();
  let serverObj = null;

  try {
    await mongoose.connect(mongoUri);
    await seedDatabase();

    serverObj = await startHttpServer(createApp());
    const baseUrl = serverObj.baseUrl;

    console.log('Running unit + E2E tests against real MongoDB instance...');

    // Unit check: Skill Match formula & edge cases (Requirement 9)
    const matchRes = calculateSkillMatch(
      [{ name: 'javascript' }, { name: 'Node.js' }, { name: 'JavaScript' }],
      ['JavaScript', 'node.js', 'SQL', 'Docker', 'sql']
    );
    assert.equal(matchRes.totalRequired, 4, 'Required skills must deduplicate case-insensitively');
    assert.equal(matchRes.matchedCount, 2, 'Matched count must avoid duplicates');
    assert.equal(matchRes.matchPercentage, 50, 'Match percentage must equal (2/4)*100 = 50');
    assert.deepEqual(matchRes.missingSkills, ['SQL', 'Docker']);

    const emptyMatch = calculateSkillMatch([{ name: 'Python' }], []);
    assert.equal(emptyMatch.totalRequired, 0);
    assert.equal(emptyMatch.matchPercentage, 100);
    assert.equal(emptyMatch.hasRequiredSkills, false);

    // Unit check: Eligibility edge cases (Requirement 8)
    const pastDrive = {
      status: 'Open',
      applicationDeadline: new Date(Date.now() - 86400000),
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: ['CSE', 'IT'],
    };
    const weakProfile = { cgpa: 6.4, backlogs: 1, branch: 'ECE' };
    const eligCheck = evaluateEligibility(weakProfile, pastDrive);
    assert.equal(eligCheck.eligible, false);
    assert.equal(eligCheck.reasons.length, 4, 'Should capture deadline, CGPA, backlog, and branch reasons');

    const studentClient = new TestClient(baseUrl);
    const adminClient = new TestClient(baseUrl);

    // 1. Public pages & shared assets load
    for (const publicPath of [
      '/',
      '/pages/login.html',
      '/pages/admin-login.html',
      '/pages/register.html',
      '/css/styles.css',
      '/images/dbuu-crest.svg',
      '/js/common.js',
      '/js/auth.js',
    ]) {
      const assetRes = await studentClient.request(publicPath);
      assert.equal(assetRes.status, 200, `Expected 200 for ${publicPath}, got ${assetRes.status}`);
    }
    const homeRes = await studentClient.request('/');
    assert.match(homeRes.data, /Dev Bhoomi Uttarakhand University/);

    // 2. Student registration works (Req 1)
    const regRes = await studentClient.request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Karan Negi',
        email: 'karan.negi@student.dbuu.ac.in',
        password: 'Password@123',
        rollNumber: 'DBUU22CSE099',
        department: 'Computer Science & Engineering',
        branch: 'CSE',
        academicYear: '3rd Year',
        semester: 6,
        cgpa: 8.2,
        backlogs: 0,
        phone: '9988776655',
      },
    });
    assert.equal(regRes.status, 201, `Registration failed: ${JSON.stringify(regRes.data)}`);
    assert.equal(regRes.data.user.role, 'student');
    assert.equal(regRes.data.profile.rollNumber, 'DBUU22CSE099');

    // 3. Logout and incorrect credentials rejected (Req 2, 3)
    const logoutRes = await studentClient.request('/api/auth/logout', { method: 'POST' });
    assert.equal(logoutRes.status, 200);

    const meAfterLogout = await studentClient.request('/api/auth/me');
    assert.equal(meAfterLogout.status, 401);

    const badLogin = await studentClient.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'karan.negi@student.dbuu.ac.in', password: 'WrongPassword' },
    });
    assert.equal(badLogin.status, 401);

    // 4. Student login works (Req 2)
    const goodLogin = await studentClient.request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'karan.negi@student.dbuu.ac.in',
        password: 'Password@123',
        expectedRole: 'student',
      },
    });
    assert.equal(goodLogin.status, 200);

    // 5. Student profile update works (Req 4)
    const profUpdate = await studentClient.request('/api/student/profile', {
      method: 'PUT',
      body: {
        name: 'Karan Singh Negi',
        rollNumber: 'DBUU22CSE099',
        department: 'Computer Science & Engineering',
        branch: 'CSE',
        academicYear: '3rd Year',
        semester: 6,
        cgpa: 8.5,
        backlogs: 0,
        phone: '9988776655',
        bio: 'Updated bio for E2E test',
      },
    });
    assert.equal(profUpdate.status, 200);
    assert.equal(profUpdate.data.profile.cgpa, 8.5);

    // 6. Skills (with duplicate prevention), Projects, Certifications CRUD (Req 5)
    const s1 = await studentClient.request('/api/student/skills', {
      method: 'POST',
      body: { name: 'JavaScript', category: 'technical', proficiency: 'Advanced' },
    });
    assert.equal(s1.status, 201);

    const dupSkill = await studentClient.request('/api/student/skills', {
      method: 'POST',
      body: { name: 'javascript', category: 'technical', proficiency: 'Beginner' },
    });
    assert.equal(dupSkill.status, 409, 'Case-insensitive duplicate skill must be prevented');

    await studentClient.request('/api/student/skills', {
      method: 'POST',
      body: { name: 'Node.js', category: 'technical', proficiency: 'Intermediate' },
    });
    await studentClient.request('/api/student/skills', {
      method: 'POST',
      body: { name: 'Communication', category: 'soft', proficiency: 'Advanced' },
    });

    const skillsList = await studentClient.request('/api/student/skills');
    assert.equal(skillsList.status, 200);
    assert.equal(skillsList.data.skills.length, 3);

    const projAdd = await studentClient.request('/api/student/projects', {
      method: 'POST',
      body: {
        title: 'Placement Portal Minor Project',
        description: 'Built using Node.js, Express, MongoDB',
        techStack: 'Node.js, Express, MongoDB',
      },
    });
    assert.equal(projAdd.status, 201);

    const certAdd = await studentClient.request('/api/student/certifications', {
      method: 'POST',
      body: {
        title: 'MongoDB Basics',
        issuingOrganization: 'MongoDB University',
        issueDate: '2026-01-15',
      },
    });
    assert.equal(certAdd.status, 201);

    // 7. Student cannot access Admin-only APIs or Admin pages (Req 15)
    const studentAdminApi = await studentClient.request('/api/admin/dashboard');
    assert.equal(studentAdminApi.status, 403);

    const studentAdminPage = await studentClient.request('/pages/admin-dashboard.html');
    assert.equal(studentAdminPage.status, 403);

    // 8. Admin login, create & edit company, create & edit drives (Req 6, 7)
    const adminLogin = await adminClient.request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@dbuu.ac.in',
        password: 'Admin@123',
        expectedRole: 'admin',
      },
    });
    assert.equal(adminLogin.status, 200);

    const compCreate = await adminClient.request('/api/admin/companies', {
      method: 'POST',
      body: {
        name: 'Dehradun Cloud Systems',
        industry: 'Cloud Engineering',
        location: 'Dehradun',
      },
    });
    assert.equal(compCreate.status, 201);
    const compId = compCreate.data.company._id;

    const compEdit = await adminClient.request(`/api/admin/companies/${compId}`, {
      method: 'PUT',
      body: { location: 'Dehradun, Uttarakhand' },
    });
    assert.equal(compEdit.status, 200);
    assert.equal(compEdit.data.company.location, 'Dehradun, Uttarakhand');

    const futureDeadline = new Date(Date.now() + 15 * 86400000).toISOString();
    const eligibleDriveRes = await adminClient.request('/api/admin/drives', {
      method: 'POST',
      body: {
        company: compId,
        title: 'Backend Engineer Campus Drive',
        jobRole: 'Junior Backend Developer',
        description: 'Build REST APIs with Node.js and MongoDB.',
        packageLPA: 6.0,
        location: 'Dehradun',
        minCgpa: 7.5,
        maxBacklogs: 0,
        eligibleBranches: ['CSE', 'IT'],
        requiredSkills: ['JavaScript', 'Node.js', 'MongoDB', 'Docker'],
        applicationDeadline: futureDeadline,
        status: 'Open',
      },
    });
    assert.equal(eligibleDriveRes.status, 201);
    const eligibleDriveId = eligibleDriveRes.data.drive._id;

    const editDriveRes = await adminClient.request(`/api/admin/drives/${eligibleDriveId}`, {
      method: 'PUT',
      body: { packageLPA: 6.5 },
    });
    assert.equal(editDriveRes.status, 200);
    assert.equal(editDriveRes.data.drive.packageLPA, 6.5);

    const highCgpaDriveRes = await adminClient.request('/api/admin/drives', {
      method: 'POST',
      body: {
        company: compId,
        title: 'Principal Honors Hiring',
        jobRole: 'R&D Engineer',
        description: 'Strict 9.5 CGPA cutoff drive.',
        packageLPA: 12.0,
        location: 'Bengaluru',
        minCgpa: 9.5,
        maxBacklogs: 0,
        eligibleBranches: ['CSE'],
        requiredSkills: ['JavaScript'],
        applicationDeadline: futureDeadline,
        status: 'Open',
      },
    });
    assert.equal(highCgpaDriveRes.status, 201);
    const ineligibleDriveId = highCgpaDriveRes.data.drive._id;

    // 9. Verify student eligibility & skill match endpoints (Req 8, 9)
    const evalEligible = await studentClient.request(`/api/drives/${eligibleDriveId}/evaluate`);
    assert.equal(evalEligible.status, 200);
    assert.equal(evalEligible.data.eligibility.eligible, true);
    assert.equal(evalEligible.data.skillMatch.matchPercentage, 50); // JavaScript & Node.js matched out of 4
    assert.deepEqual(evalEligible.data.skillMatch.missingSkills, ['MongoDB', 'Docker']);

    const evalIneligible = await studentClient.request(`/api/drives/${ineligibleDriveId}/evaluate`);
    assert.equal(evalIneligible.status, 200);
    assert.equal(evalIneligible.data.eligibility.eligible, false);
    assert.ok(evalIneligible.data.eligibility.reasons[0].includes('9.50'));

    // 10. Eligible student can apply, ineligible cannot apply, duplicate prevented (Req 10, 11, 12)
    const applyOk = await studentClient.request('/api/applications', {
      method: 'POST',
      body: { driveId: eligibleDriveId },
    });
    assert.equal(applyOk.status, 201);
    const applicationId = applyOk.data.application._id;

    const applyDup = await studentClient.request('/api/applications', {
      method: 'POST',
      body: { driveId: eligibleDriveId },
    });
    assert.equal(applyDup.status, 409);

    const applyIneligible = await studentClient.request('/api/applications', {
      method: 'POST',
      body: { driveId: ineligibleDriveId },
    });
    assert.equal(applyIneligible.status, 400);

    // 11. Admin updates application status & student sees updated status (Req 13, 14)
    const statusUpdate = await adminClient.request(`/api/admin/applications/${applicationId}/status`, {
      method: 'PUT',
      body: { status: 'Selected', remarks: 'Cleared final interview round.' },
    });
    assert.equal(statusUpdate.status, 200);
    assert.equal(statusUpdate.data.application.status, 'Selected');

    const myApps = await studentClient.request('/api/applications/my');
    assert.equal(myApps.status, 200);
    assert.equal(myApps.data.applications.length, 1);
    assert.equal(myApps.data.applications[0].status, 'Selected');
    assert.equal(myApps.data.applications[0].remarks, 'Cleared final interview round.');

    // Admin reports endpoint works with real DB aggregations
    const reportsRes = await adminClient.request('/api/admin/reports');
    assert.equal(reportsRes.status, 200);
    assert.ok(reportsRes.data.overview.totalStudents >= 4);
    assert.ok(reportsRes.data.drivePerformance.length >= 6);

    // 12. Verify all student & admin pages return 200 for authorized roles and 403 cross-role
    for (const studentPage of [
      '/pages/student-dashboard.html',
      '/pages/student-profile.html',
      '/pages/student-skills.html',
      '/pages/student-portfolio.html',
      '/pages/student-drives.html',
      '/pages/student-drive-details.html',
      '/pages/student-applications.html',
    ]) {
      const pageRes = await studentClient.request(studentPage);
      assert.equal(pageRes.status, 200, `Student should access ${studentPage}`);
    }

    for (const adminPage of [
      '/pages/admin-dashboard.html',
      '/pages/admin-students.html',
      '/pages/admin-companies.html',
      '/pages/admin-drives.html',
      '/pages/admin-applications.html',
      '/pages/admin-reports.html',
    ]) {
      const adminPageRes = await adminClient.request(adminPage);
      assert.equal(adminPageRes.status, 200, `Admin should access ${adminPage}`);
      const studentBlockedRes = await studentClient.request(adminPage);
      assert.equal(studentBlockedRes.status, 403, `Student must be blocked from ${adminPage}`);
    }

    // 13. Verify persistence across server & Mongoose restart (Req 16)
    await new Promise((resolve) => serverObj.server.close(resolve));
    await mongoose.disconnect();

    await mongoose.connect(mongoUri);
    serverObj = await startHttpServer(createApp());

    const postRestartClient = new TestClient(serverObj.baseUrl);
    const relogin = await postRestartClient.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'karan.negi@student.dbuu.ac.in', password: 'Password@123' },
    });
    assert.equal(relogin.status, 200);

    const persistedApps = await postRestartClient.request('/api/applications/my');
    assert.equal(persistedApps.status, 200);
    assert.equal(persistedApps.data.applications[0].status, 'Selected');

    const persistedSkills = await postRestartClient.request('/api/student/skills');
    assert.equal(persistedSkills.status, 200);
    assert.equal(persistedSkills.data.skills.length, 3);

    console.log('ALL 16 END-TO-END VERIFICATION CHECKS PASSED!');
  } finally {
    if (serverObj && serverObj.server && serverObj.server.listening) {
      await new Promise((resolve) => serverObj.server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongod.stop();
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('E2E Test Suite Failed:', err);
  process.exit(1);
});
