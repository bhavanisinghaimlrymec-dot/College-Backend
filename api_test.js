/**
 * Comprehensive API Test Script
 * Tests all endpoints without modifying any source code
 */

const http = require('http');

const BASE = 'http://localhost:5000';

// Store tokens and IDs for chained tests
const state = {
  adminToken: null,
  facultyToken: null,
  studentToken: null,
  createdFacultyUsn: 'TESTFAC01',
  createdStudentUsn: 'TESTSTU01',
  createdFacultyId: null,
  createdStudentId: null,
  createdAssignmentId: null,
  createdPostId: null,
};

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', (err) => resolve({ status: 0, body: { error: err.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function log(testName, pass, detail) {
  const icon = pass ? '✅' : '❌';
  const line = `${icon} ${testName}: ${detail}`;
  console.log(line);
  results.push({ testName, pass, detail });
  if (pass) passed++; else failed++;
}

function logSkip(testName, reason) {
  const line = `⏭️  ${testName}: SKIPPED — ${reason}`;
  console.log(line);
  results.push({ testName, pass: null, detail: `SKIPPED — ${reason}` });
  skipped++;
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   COLLEGE BACKEND — COMPREHENSIVE API TEST SUITE');
  console.log('═══════════════════════════════════════════════════\n');

  // ──────────────────── 1. ROOT ────────────────────
  console.log('── 1. ROOT ENDPOINT ──');
  {
    const r = await request('GET', '/');
    log('GET /', r.status === 200, `Status ${r.status} | Body: ${JSON.stringify(r.body).substring(0, 80)}`);
  }

  // ──────────────────── 2. AUTH ────────────────────
  console.log('\n── 2. AUTH ENDPOINTS ──');

  // 2a. Login with no body (validation test)
  {
    const r = await request('POST', '/api/auth/login', {});
    log('POST /api/auth/login (empty body)', r.status === 400, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 100)}`);
  }

  // 2b. Login with bad credentials
  {
    const r = await request('POST', '/api/auth/login', { usn: 'FAKE', password: 'wrong' });
    log('POST /api/auth/login (bad creds)', r.status === 401, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 100)}`);
  }

  // 2c. Admin login
  {
    const r = await request('POST', '/api/auth/login', { usn: 'ADMIN01', password: 'adminpassword123' });
    const ok = r.status === 200 && r.body.token;
    if (ok) state.adminToken = r.body.token;
    log('POST /api/auth/login (admin)', ok, `Status ${r.status} | role=${r.body.role} | token=${ok ? 'received' : 'MISSING'}`);
  }

  // ──────────────────── 3. ADMIN ────────────────────
  console.log('\n── 3. ADMIN ENDPOINTS ──');

  if (!state.adminToken) {
    logSkip('All admin tests', 'Admin login failed');
  } else {
    // 3a. No-auth access (should fail)
    {
      const r = await request('GET', '/api/admin/users');
      log('GET /api/admin/users (no token)', r.status === 401, `Status ${r.status}`);
    }

    // 3b. Add faculty user
    {
      const r = await request('POST', '/api/admin/add-user', {
        name: 'Test Faculty',
        usn: state.createdFacultyUsn,
        email: 'testfac@college.edu',
        password: 'password123',
        role: 'faculty',
        branch: 'CSE',
      }, state.adminToken);
      const ok = r.status === 201 || (r.status === 400 && r.body.message && r.body.message.includes('already exists'));
      if (r.body.user) state.createdFacultyId = r.body.user.id;
      log('POST /api/admin/add-user (faculty)', ok, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }

    // 3c. Add student user
    {
      const r = await request('POST', '/api/admin/add-user', {
        name: 'Test Student',
        usn: state.createdStudentUsn,
        email: 'teststu@college.edu',
        password: 'password123',
        role: 'student',
        branch: 'CSE',
        sem: 4,
      }, state.adminToken);
      const ok = r.status === 201 || (r.status === 400 && r.body.message && r.body.message.includes('already exists'));
      if (r.body.user) state.createdStudentId = r.body.user.id;
      log('POST /api/admin/add-user (student)', ok, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }

    // 3d. Add user with validation errors (missing required fields)
    {
      const r = await request('POST', '/api/admin/add-user', { name: 'No Role' }, state.adminToken);
      log('POST /api/admin/add-user (invalid body)', r.status === 400, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }

    // 3e. Get all users
    {
      const r = await request('GET', '/api/admin/users', null, state.adminToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/admin/users', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 3f. Get users with role filter
    {
      const r = await request('GET', '/api/admin/users?role=student', null, state.adminToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/admin/users?role=student', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 3g. Promote semester (dry-run on non-existent branch to avoid breaking data)
    {
      const r = await request('POST', '/api/admin/promote', {
        branch: 'NONEXISTENT_TEST',
        currentSem: 1,
      }, state.adminToken);
      const ok = r.status === 200;
      log('POST /api/admin/promote (non-existent branch)', ok, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }

    // 3h. Promote validation (missing fields)
    {
      const r = await request('POST', '/api/admin/promote', {}, state.adminToken);
      log('POST /api/admin/promote (invalid body)', r.status === 400, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }
  }

  // ──────────────────── 4. LOGIN FACULTY & STUDENT ────────────────────
  console.log('\n── 4. FACULTY & STUDENT LOGIN ──');

  // Faculty login
  {
    const r = await request('POST', '/api/auth/login', { usn: state.createdFacultyUsn, password: 'password123' });
    if (r.status === 200 && r.body.token) state.facultyToken = r.body.token;
    log('POST /api/auth/login (faculty)', r.status === 200 && r.body.token, `Status ${r.status} | role=${r.body.role}`);
  }

  // Student login
  {
    const r = await request('POST', '/api/auth/login', { usn: state.createdStudentUsn, password: 'password123' });
    if (r.status === 200 && r.body.token) {
      state.studentToken = r.body.token;
      state.createdStudentId = r.body._id;
    }
    log('POST /api/auth/login (student)', r.status === 200 && r.body.token, `Status ${r.status} | role=${r.body.role}`);
  }

  // ──────────────────── 5. FACULTY ENDPOINTS ────────────────────
  console.log('\n── 5. FACULTY ENDPOINTS ──');

  if (!state.facultyToken) {
    logSkip('All faculty tests', 'Faculty login failed');
  } else {
    // 5a. Role test: faculty accessing admin route should fail
    {
      const r = await request('GET', '/api/admin/users', null, state.facultyToken);
      log('GET /api/admin/users (faculty token → denied)', r.status === 403, `Status ${r.status}`);
    }

    // 5b. Create assignment
    {
      const r = await request('POST', '/api/faculty/assignments', {
        title: 'Test Assignment',
        description: 'Automated API test assignment',
        branch: 'CSE',
        sem: 4,
        deadline: '2026-12-31T23:59:59.000Z',
      }, state.facultyToken);
      const ok = r.status === 201 && r.body._id;
      if (ok) state.createdAssignmentId = r.body._id;
      log('POST /api/faculty/assignments', ok, `Status ${r.status} | ID: ${r.body._id || 'N/A'}`);
    }

    // 5c. Create assignment with invalid body
    {
      const r = await request('POST', '/api/faculty/assignments', { title: 'Missing fields' }, state.facultyToken);
      log('POST /api/faculty/assignments (invalid)', r.status === 400, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }

    // 5d. Get my assignments
    {
      const r = await request('GET', '/api/faculty/assignments', null, state.facultyToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/faculty/assignments', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 5e. Get submissions for assignment
    if (state.createdAssignmentId) {
      const r = await request('GET', `/api/faculty/assignments/${state.createdAssignmentId}/submissions`, null, state.facultyToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/faculty/assignments/:id/submissions', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    } else {
      logSkip('GET /api/faculty/assignments/:id/submissions', 'No assignment created');
    }

    // 5f. Get student roster
    {
      const r = await request('GET', '/api/faculty/students?branch=CSE&sem=4', null, state.facultyToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/faculty/students?branch=CSE&sem=4', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 5g. Get student roster without params
    {
      const r = await request('GET', '/api/faculty/students', null, state.facultyToken);
      log('GET /api/faculty/students (no params)', r.status === 400, `Status ${r.status}`);
    }

    // 5h. Take attendance
    if (state.createdStudentId) {
      const r = await request('POST', '/api/faculty/attendance', {
        subject: 'Test Subject',
        date: '2026-08-09',
        branch: 'CSE',
        sem: 4,
        records: [
          { student: state.createdStudentId, studentName: 'Test Student', studentUsn: state.createdStudentUsn, status: 'Present' }
        ]
      }, state.facultyToken);
      log('POST /api/faculty/attendance', r.status === 201, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    } else {
      logSkip('POST /api/faculty/attendance', 'No student ID');
    }

    // 5i. Attendance with invalid body
    {
      const r = await request('POST', '/api/faculty/attendance', {}, state.facultyToken);
      log('POST /api/faculty/attendance (invalid)', r.status === 400, `Status ${r.status}`);
    }

    // 5j. Upload marks
    if (state.createdStudentId) {
      const r = await request('POST', '/api/faculty/marks', {
        marksList: [
          { student: state.createdStudentId, subject: 'Test Subject', assessmentName: 'IA1', marksObtained: 18, maxMarks: 20 }
        ]
      }, state.facultyToken);
      const ok = r.status === 201;
      log('POST /api/faculty/marks', ok, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    } else {
      logSkip('POST /api/faculty/marks', 'No student ID');
    }

    // 5k. Marks with invalid body
    {
      const r = await request('POST', '/api/faculty/marks', {}, state.facultyToken);
      log('POST /api/faculty/marks (invalid)', r.status === 400, `Status ${r.status}`);
    }

    // 5l. Marks with marksObtained > maxMarks
    if (state.createdStudentId) {
      const r = await request('POST', '/api/faculty/marks', {
        marksList: [
          { student: state.createdStudentId, subject: 'Test', assessmentName: 'IA2', marksObtained: 25, maxMarks: 20 }
        ]
      }, state.facultyToken);
      log('POST /api/faculty/marks (over max)', r.status === 400, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }
  }

  // ──────────────────── 6. STUDENT ENDPOINTS ────────────────────
  console.log('\n── 6. STUDENT ENDPOINTS ──');

  if (!state.studentToken) {
    logSkip('All student tests', 'Student login failed');
  } else {
    // 6a. Role test: student accessing faculty route should fail
    {
      const r = await request('GET', '/api/faculty/assignments', null, state.studentToken);
      log('GET /api/faculty/assignments (student token → denied)', r.status === 403, `Status ${r.status}`);
    }

    // 6b. Get available assignments
    {
      const r = await request('GET', '/api/student/assignments', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/student/assignments', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 6c. Submit assignment
    if (state.createdAssignmentId) {
      const r = await request('POST', '/api/student/submit', {
        assignmentId: state.createdAssignmentId,
        fileUrl: 'https://example.com/test-submission.pdf',
      }, state.studentToken);
      const ok = r.status === 201 || (r.status === 400 && r.body.message && r.body.message.includes('already submitted'));
      log('POST /api/student/submit', ok, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    } else {
      logSkip('POST /api/student/submit', 'No assignment created');
    }

    // 6d. Submit with invalid body
    {
      const r = await request('POST', '/api/student/submit', {}, state.studentToken);
      log('POST /api/student/submit (invalid)', r.status === 400, `Status ${r.status}`);
    }

    // 6e. Get my attendance
    {
      const r = await request('GET', '/api/student/my-attendance', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/student/my-attendance', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 6f. Get my marks
    {
      const r = await request('GET', '/api/student/my-marks', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/student/my-marks', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }
  }

  // ──────────────────── 7. FEED ENDPOINTS ────────────────────
  console.log('\n── 7. FEED ENDPOINTS ──');

  if (!state.adminToken) {
    logSkip('All feed tests', 'No logged-in user');
  } else {
    // 7a. No-auth feed access
    {
      const r = await request('GET', '/api/feed');
      log('GET /api/feed (no token)', r.status === 401, `Status ${r.status}`);
    }

    // 7b. Create a post (as admin)
    {
      const r = await request('POST', '/api/feed/create', {
        title: 'Test Announcement',
        content: 'This is an automated test post',
        branchTag: 'All',
      }, state.adminToken);
      const ok = r.status === 201 && r.body._id;
      if (ok) state.createdPostId = r.body._id;
      log('POST /api/feed/create', ok, `Status ${r.status} | ID: ${r.body._id || 'N/A'}`);
    }

    // 7c. Create post with invalid body
    {
      const r = await request('POST', '/api/feed/create', {}, state.adminToken);
      log('POST /api/feed/create (invalid)', r.status === 400, `Status ${r.status}`);
    }

    // 7d. Get feed posts
    {
      const r = await request('GET', '/api/feed', null, state.adminToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/feed', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 7e. Create broadcast (admin only)
    {
      const r = await request('POST', '/api/feed/broadcast', {
        title: 'Test Broadcast',
        content: 'System-wide test broadcast',
      }, state.adminToken);
      const ok = r.status === 201;
      log('POST /api/feed/broadcast (admin)', ok, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 120)}`);
    }

    // 7e2. Targeted broadcast (students of CSE only)
    let targetedId = null;
    {
      const r = await request('POST', '/api/feed/broadcast', {
        title: 'CSE Students Only',
        content: 'Targeted test broadcast',
        audience: 'students',
        branchTag: 'CSE',
      }, state.adminToken);
      const ok = r.status === 201 && r.body.audience === 'students' && r.body.branchTag === 'CSE';
      if (ok) targetedId = r.body._id;
      log('POST /api/feed/broadcast (targeted)', ok, `Status ${r.status} | audience=${r.body.audience} branch=${r.body.branchTag}`);
    }

    // 7e3. Student sees the targeted post; faculty does not
    if (targetedId && state.studentToken && state.facultyToken) {
      const s = await request('GET', '/api/feed', null, state.studentToken);
      const f = await request('GET', '/api/feed', null, state.facultyToken);
      const sSeen = Array.isArray(s.body) && s.body.some((p) => p._id === targetedId);
      const fSeen = Array.isArray(f.body) && f.body.some((p) => p._id === targetedId);
      log('GET /api/feed (student sees targeted)', s.status === 200 && sSeen, `Status ${s.status} | seen=${sSeen}`);
      log('GET /api/feed (faculty hidden from students-only)', f.status === 200 && !fSeen, `Status ${f.status} | seen=${fSeen}`);
      await request('DELETE', `/api/feed/${targetedId}`, null, state.adminToken);
    }

    // 7f. Broadcast as student (should be denied)
    if (state.studentToken) {
      const r = await request('POST', '/api/feed/broadcast', {
        title: 'Hack',
        content: 'Should fail',
      }, state.studentToken);
      log('POST /api/feed/broadcast (student → denied)', r.status === 403, `Status ${r.status}`);
    }

    // 7g. Broadcast with invalid body
    {
      const r = await request('POST', '/api/feed/broadcast', {}, state.adminToken);
      log('POST /api/feed/broadcast (invalid)', r.status === 400, `Status ${r.status}`);
    }

    // 7h. Delete post
    if (state.createdPostId) {
      const r = await request('DELETE', `/api/feed/${state.createdPostId}`, null, state.adminToken);
      log('DELETE /api/feed/:id', r.status === 200, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 80)}`);
    }

    // 7i. Delete non-existent post
    {
      const r = await request('DELETE', '/api/feed/000000000000000000000000', null, state.adminToken);
      log('DELETE /api/feed/:id (non-existent)', r.status === 404, `Status ${r.status}`);
    }
  }

  // ──────────────────── 8. CLEANUP & 404 ────────────────────
  console.log('\n── 8. ERROR HANDLING & EDGE CASES ──');

  // 8a. Non-existent route
  {
    const r = await request('GET', '/api/nonexistent');
    log('GET /api/nonexistent (404 handler)', r.status === 404, `Status ${r.status}`);
  }

  // 8b. Delete assignment (faculty ownership test)
  if (state.createdAssignmentId && state.facultyToken) {
    const r = await request('DELETE', `/api/faculty/assignments/${state.createdAssignmentId}`, null, state.facultyToken);
    log('DELETE /api/faculty/assignments/:id (own)', r.status === 200, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 80)}`);
  }

  // 8c. Delete assignment not owned (using student token on faculty route → 403 role denied)
  {
    if (state.studentToken) {
      const r = await request('DELETE', '/api/faculty/assignments/000000000000000000000000', null, state.studentToken);
      log('DELETE /api/faculty/assignments/:id (student → denied)', r.status === 403, `Status ${r.status}`);
    }
  }

  // ──────────────────── 9. NEW ENDPOINTS (change-password, attendance history) ──
  console.log('\n── 9. NEW ENDPOINTS ──');

  if (!state.facultyToken) {
    logSkip('All new-endpoint tests', 'Faculty login failed');
  } else {
    // 9a. Change password with wrong current password
    {
      const r = await request('POST', '/api/auth/change-password', {
        currentPassword: 'definitely-wrong',
        newPassword: 'newpass123',
      }, state.facultyToken);
      log('POST /api/auth/change-password (wrong current)', r.status === 401, `Status ${r.status}`);
    }

    // 9b. Change password validation (short new password)
    {
      const r = await request('POST', '/api/auth/change-password', {
        currentPassword: 'password123',
        newPassword: '123',
      }, state.facultyToken);
      log('POST /api/auth/change-password (invalid body)', r.status === 400, `Status ${r.status}`);
    }

    // 9c. Change password round-trip on the disposable test faculty account
    {
      const r1 = await request('POST', '/api/auth/change-password', {
        currentPassword: 'password123',
        newPassword: 'newpass123',
      }, state.facultyToken);
      const loginNew = await request('POST', '/api/auth/login', { usn: state.createdFacultyUsn, password: 'newpass123' });
      const ok = r1.status === 200 && loginNew.status === 200 && loginNew.body.token;
      if (ok) state.facultyToken = loginNew.body.token;
      log('POST /api/auth/change-password (round-trip)', ok, `Change: ${r1.status} | Re-login: ${loginNew.status}`);
      // Restore original password so re-runs of this suite keep working
      if (ok) {
        await request('POST', '/api/auth/change-password', {
          currentPassword: 'newpass123',
          newPassword: 'password123',
        }, state.facultyToken);
      }
    }

    // 9e. Faculty attendance history
    {
      const r = await request('GET', '/api/faculty/attendance', null, state.facultyToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/faculty/attendance', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }
  }

  // ──────────────────── 9b. NOTIFICATIONS ────────────────────
  console.log('\n── 9b. NOTIFICATIONS ──');

  if (!state.studentToken) {
    logSkip('All notification tests', 'Student login failed');
  } else {
    // 9b-i. No-auth inbox access (should fail)
    {
      const r = await request('GET', '/api/notifications');
      log('GET /api/notifications (no token)', r.status === 401, `Status ${r.status}`);
    }

    // 9b-ii. Student inbox (broadcast from 7e + assignment from 5b should be here)
    {
      const r = await request('GET', '/api/notifications', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/notifications (student)', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9b-iii. Unread count
    {
      const r = await request('GET', '/api/notifications/unread-count', null, state.studentToken);
      const ok = r.status === 200 && typeof r.body.unread === 'number';
      log('GET /api/notifications/unread-count', ok, `Status ${r.status} | Unread: ${r.body.unread}`);
    }

    // 9b-iv. Mark all read, then unread must be 0
    {
      const m = await request('PATCH', '/api/notifications/read-all', {}, state.studentToken);
      const c = await request('GET', '/api/notifications/unread-count', null, state.studentToken);
      const ok = m.status === 200 && c.status === 200 && c.body.unread === 0;
      log('PATCH /api/notifications/read-all', ok, `Mark: ${m.status} | Unread after: ${c.body.unread}`);
    }

    // 9b-v. Mark non-existent as read → 404
    {
      const r = await request('PATCH', '/api/notifications/000000000000000000000000/read', {}, state.studentToken);
      log('PATCH /api/notifications/:id/read (missing → 404)', r.status === 404, `Status ${r.status}`);
    }
  }

  // ──────────────────── 9c. LEAVE WORKFLOWS ────────────────────
  console.log('\n── 9c. LEAVE WORKFLOWS ──');

  if (!state.studentToken || !state.facultyToken || !state.adminToken) {
    logSkip('All leave tests', 'Need student + faculty + admin tokens');
  } else {
    // 9c-i. Student applies (goes to HOD of CSE — none exists, stays 'applied')
    let studentLeaveId = null;
    {
      const r = await request('POST', '/api/leaves', {
        from: '2026-10-01', to: '2026-10-02', reason: 'Family function',
      }, state.studentToken);
      const ok = r.status === 201 && r.body.status === 'applied';
      if (ok) studentLeaveId = r.body.id;
      log('POST /api/leaves (student apply)', ok, `Status ${r.status} | state=${r.body.status}`);
    }

    // 9c-ii. Faculty apply without substitute → 400
    {
      const r = await request('POST', '/api/leaves', {
        from: '2026-10-05', to: '2026-10-06', reason: 'No substitute given',
      }, state.facultyToken);
      log('POST /api/leaves (faculty, no substitute → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9c-iii. Faculty applies with self as substitute → 400
    {
      const me = await request('GET', '/api/auth/profile', null, state.facultyToken);
      const r = await request('POST', '/api/leaves', {
        from: '2026-10-05', to: '2026-10-06', reason: 'Self cover',
        substitute: me.body._id,
      }, state.facultyToken);
      log('POST /api/leaves (self substitute → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9c-iv. Invalid leave body → 400
    {
      const r = await request('POST', '/api/leaves', {}, state.studentToken);
      log('POST /api/leaves (invalid → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9c-v. Mine listing contains the fresh application
    {
      const r = await request('GET', '/api/leaves?scope=mine', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body) && r.body.length >= 1;
      log('GET /api/leaves?scope=mine', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9c-vi. Student cannot decide leaves → 403 (route-level role guard)
    if (studentLeaveId) {
      const r = await request('PATCH', `/api/leaves/${studentLeaveId}/decision`, { decision: 'approve' }, state.studentToken);
      log('PATCH /api/leaves/:id/decision (student → 403)', r.status === 403, `Status ${r.status}`);
    }
  }

  // ──────────────────── 9d. SUBJECTS + SYLLABUS + DEPT MARKS GUARD ──
  console.log('\n── 9d. SUBJECTS + SYLLABUS ──');

  if (!state.adminToken || !state.facultyToken || !state.studentToken) {
    logSkip('All subject/syllabus tests', 'Need admin + faculty + student tokens');
  } else {
    // 9d-i. Admin creates an offering
    let subjectOk = false;
    {
      const r = await request('POST', '/api/subjects', {
        branch: 'CSE', sem: 4, subjectCode: '21CS41', subjectName: 'Test Subject', totalModules: 5,
      }, state.adminToken);
      subjectOk = r.status === 201 || (r.status === 409 && r.body.message && r.body.message.includes('already exists'));
      log('POST /api/subjects (admin)', subjectOk, `Status ${r.status}`);
    }

    // 9d-ii. Duplicate offering → 409
    {
      const r = await request('POST', '/api/subjects', {
        branch: 'CSE', sem: 4, subjectCode: '21CS41', subjectName: 'Dupe', totalModules: 5,
      }, state.adminToken);
      log('POST /api/subjects (duplicate → 409)', r.status === 409, `Status ${r.status}`);
    }

    // 9d-iii. Faculty lists own-branch offerings
    {
      const r = await request('GET', '/api/subjects?branch=CSE&sem=4', null, state.facultyToken);
      const ok = r.status === 200 && Array.isArray(r.body) && r.body.length >= 1;
      log('GET /api/subjects?branch=CSE&sem=4', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9d-iv. Faculty logs syllabus for the offering
    {
      const r = await request('POST', '/api/syllabus', {
        subject: '21CS41', topicCovered: 'Automated test topic', moduleNo: 1, periodsUsed: 2,
      }, state.facultyToken);
      log('POST /api/syllabus', r.status === 201, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 100)}`);
    }

    // 9d-v. Same-day duplicate log → 409
    {
      const r = await request('POST', '/api/syllabus', {
        subject: '21CS41', topicCovered: 'Another topic', moduleNo: 2,
      }, state.facultyToken);
      log('POST /api/syllabus (dupe day → 409)', r.status === 409, `Status ${r.status}`);
    }

    // 9d-vi. Unknown subject → 400
    {
      const r = await request('POST', '/api/syllabus', {
        subject: 'NOPE999', topicCovered: 'Ghost topic', moduleNo: 1,
      }, state.facultyToken);
      log('POST /api/syllabus (unknown subject → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9d-vii. Student syllabus view shows progress
    {
      const r = await request('GET', '/api/syllabus', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/syllabus (student)', ok, `Status ${r.status} | Subjects: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9d-viii. Student cannot log syllabus → 403
    {
      const r = await request('POST', '/api/syllabus', {
        subject: '21CS41', topicCovered: 'Hack', moduleNo: 1,
      }, state.studentToken);
      log('POST /api/syllabus (student → 403)', r.status === 403, `Status ${r.status}`);
    }

    // 9d-ix. Marks for unknown subject → 400 (department guard)
    if (state.createdStudentId) {
      const r = await request('POST', '/api/faculty/marks', {
        marksList: [
          { student: state.createdStudentId, subject: 'GHOST101', assessmentName: 'IA9', marksObtained: 10, maxMarks: 20 }
        ]
      }, state.facultyToken);
      log('POST /api/faculty/marks (unknown subject → 400)', r.status === 400, `Status ${r.status} | ${JSON.stringify(r.body).substring(0, 100)}`);
    }
  }

  // ──────────────────── 9e. EXAM NOTICES (hall-ticket notice only) ──
  console.log('\n── 9e. EXAM NOTICES ──');

  if (!state.adminToken || !state.studentToken || !state.facultyToken) {
    logSkip('All exam notice tests', 'Need admin + student + faculty tokens');
  } else {
    // 9e-i. Admin creates a notice
    let noticeId = null;
    {
      const r = await request('POST', '/api/admin/exam-notices', {
        title: 'SEE Nov 2026', examType: 'SEE', branch: 'CSE', sem: 4,
        subject: '21CS41', subjectName: 'Test Subject', date: '2026-11-20',
      }, state.adminToken);
      const ok = r.status === 201 && r.body.id;
      if (ok) noticeId = r.body.id;
      log('POST /api/admin/exam-notices', ok, `Status ${r.status} | ID: ${noticeId || 'N/A'}`);
    }

    // 9e-ii. Invalid body → 400
    {
      const r = await request('POST', '/api/admin/exam-notices', { title: 'Bad' }, state.adminToken);
      log('POST /api/admin/exam-notices (invalid → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9e-iii. Student sees own exams
    {
      const r = await request('GET', '/api/student/exams', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body) && r.body.length >= 1;
      log('GET /api/student/exams', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9e-iv. Faculty exams without params → 400; with params → 200
    {
      const bad = await request('GET', '/api/faculty/exams', null, state.facultyToken);
      const good = await request('GET', '/api/faculty/exams?branch=CSE&sem=4', null, state.facultyToken);
      log('GET /api/faculty/exams (no params → 400)', bad.status === 400, `Status ${bad.status}`);
      log('GET /api/faculty/exams (filtered)', good.status === 200 && Array.isArray(good.body), `Status ${good.status}`);
    }

    // 9e-v. Student cannot create → 403
    {
      const r = await request('POST', '/api/admin/exam-notices', {
        title: 'Hack', branch: 'CSE', sem: 4, date: '2026-11-21',
      }, state.studentToken);
      log('POST /api/admin/exam-notices (student → 403)', r.status === 403, `Status ${r.status}`);
    }

    if (noticeId) {
      // 9e-vi. Release → student inbox gets the notice
      const rel = await request('PATCH', `/api/admin/exam-notices/${noticeId}/release`, {
        collectionPoint: 'Exam section, Admin block',
      }, state.adminToken);
      const ok = rel.status === 200 && rel.body.noticeReleased === true;
      log('PATCH /api/admin/exam-notices/:id/release', ok, `Status ${rel.status}`);
      const inbox = await request('GET', '/api/notifications', null, state.studentToken);
      const found = Array.isArray(inbox.body) && inbox.body.some((n) => n.type === 'exam');
      log('Release pushed exam notification', found, `Inbox has exam item: ${found}`);

      // 9e-vii. Double release → 409, no duplicate push
      const dup = await request('PATCH', `/api/admin/exam-notices/${noticeId}/release`, {}, state.adminToken);
      log('PATCH release twice (→ 409)', dup.status === 409, `Status ${dup.status}`);

      // 9e-viii. Delete
      const del = await request('DELETE', `/api/admin/exam-notices/${noticeId}`, null, state.adminToken);
      log('DELETE /api/admin/exam-notices/:id', del.status === 200, `Status ${del.status}`);
    } else {
      logSkip('Release/delete exam notice tests', 'No notice created');
    }
  }

  // ──────────────────── 9f. ACADEMIC CALENDAR EVENTS ──
  console.log('\n── 9f. EVENTS ──');

  if (!state.adminToken || !state.studentToken) {
    logSkip('All event tests', 'Need admin + student tokens');
  } else {
    // 9f-i. Admin creates a branch event
    let eventId = null;
    {
      const r = await request('POST', '/api/events', {
        title: 'Test Sports Day', description: 'Automated test event',
        date: '2026-12-10', branch: 'CSE', eventType: 'event',
      }, state.adminToken);
      const ok = r.status === 201 && r.body.id;
      if (ok) eventId = r.body.id;
      log('POST /api/events (admin)', ok, `Status ${r.status} | ID: ${eventId || 'N/A'}`);
    }

    // 9f-ii. Invalid body → 400
    {
      const r = await request('POST', '/api/events', { title: 'No date' }, state.adminToken);
      log('POST /api/events (invalid → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9f-iii. Student sees it (own branch scope)
    {
      const r = await request('GET', '/api/events', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body) && r.body.length >= 1;
      log('GET /api/events (student)', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9f-iv. Student cannot create → 403
    {
      const r = await request('POST', '/api/events', { title: 'Hack', date: '2026-12-11' }, state.studentToken);
      log('POST /api/events (student → 403)', r.status === 403, `Status ${r.status}`);
    }

    if (eventId) {
      // 9f-v. Update then delete
      const u = await request('PUT', `/api/events/${eventId}`, { title: 'Test Sports Day (edited)' }, state.adminToken);
      log('PUT /api/events/:id', u.status === 200, `Status ${u.status}`);
      const d = await request('DELETE', `/api/events/${eventId}`, null, state.adminToken);
      log('DELETE /api/events/:id', d.status === 200, `Status ${d.status}`);
    } else {
      logSkip('PUT/DELETE /api/events/:id', 'No event created');
    }
  }

  // ──────────────────── 9g. GRIEVANCES + PERFORMANCE + GRADING ──
  console.log('\n── 9g. GRIEVANCES + PERFORMANCE + GRADING ──');

  if (!state.adminToken || !state.studentToken || !state.facultyToken) {
    logSkip('All 9g tests', 'Need admin + student + faculty tokens');
  } else {
    // 9g-i. Student raises a grievance
    let grievanceId = null;
    {
      const r = await request('POST', '/api/grievances', {
        category: 'Academic', subject: 'Library hours', description: 'Please extend library hours during exams.',
      }, state.studentToken);
      const ok = r.status === 201 && r.body.id;
      if (ok) grievanceId = r.body.id;
      log('POST /api/grievances (student)', ok, `Status ${r.status}`);
    }

    // 9g-ii. Invalid grievance → 400
    {
      const r = await request('POST', '/api/grievances', { subject: 'x' }, state.studentToken);
      log('POST /api/grievances (invalid → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9g-iii. Admin lists + resolves
    {
      const l = await request('GET', '/api/grievances', null, state.adminToken);
      const okList = l.status === 200 && Array.isArray(l.body);
      log('GET /api/grievances (admin)', okList, `Status ${l.status}`);
      if (grievanceId) {
        const p = await request('PATCH', `/api/grievances/${grievanceId}`, {
          status: 'resolved', reply: 'Extended till 8pm during exams.',
        }, state.adminToken);
        log('PATCH /api/grievances/:id (resolve)', p.status === 200 && p.body.status === 'resolved', `Status ${p.status}`);
      }
    }

    // 9g-iv. Student sees own ticket with reply
    {
      const r = await request('GET', '/api/grievances', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/grievances (student)', ok, `Status ${r.status}`);
    }

    // 9g-v. Faculty cannot raise → 403
    {
      const r = await request('POST', '/api/grievances', {
        subject: 'Hack', description: 'Should be denied for faculty.',
      }, state.facultyToken);
      log('POST /api/grievances (faculty → 403)', r.status === 403, `Status ${r.status}`);
    }

    // 9g-vi. Performance endpoints (200 with shape, may be empty arrays)
    {
      const a = await request('GET', '/api/admin/performance?branch=CSE&sem=4', null, state.adminToken);
      const okA = a.status === 200 && Array.isArray(a.body.subjects);
      log('GET /api/admin/performance', okA, `Status ${a.status}`);
      const bad = await request('GET', '/api/admin/performance', null, state.adminToken);
      log('GET /api/admin/performance (no params → 400)', bad.status === 400, `Status ${bad.status}`);
      const f = await request('GET', '/api/faculty/performance?sem=4', null, state.facultyToken);
      const okF = f.status === 200 && Array.isArray(f.body.subjects);
      log('GET /api/faculty/performance', okF, `Status ${f.status}`);
    }

    // 9g-vii. Grade a submission (uses assignment+submission from §5/§6 if present)
    {
      const assigns = await request('GET', '/api/faculty/assignments', null, state.facultyToken);
      let graded = false;
      if (assigns.status === 200 && Array.isArray(assigns.body) && assigns.body.length > 0) {
        const aid = assigns.body[0]._id;
        const subs = await request('GET', `/api/faculty/assignments/${aid}/submissions`, null, state.facultyToken);
        if (subs.status === 200 && Array.isArray(subs.body) && subs.body.length > 0) {
          const g = await request('PATCH', `/api/faculty/submissions/${subs.body[0]._id}/grade`, {
            grade: 'A', remarks: 'Well done', status: 'Graded',
          }, state.facultyToken);
          graded = g.status === 200;
          log('PATCH /api/faculty/submissions/:id/grade', graded, `Status ${g.status}`);
        }
      }
      if (!graded) logSkip('PATCH grade', 'No submissions available to grade');
    }
  }

  // ──────────────────── 9h. BROCHURES ──
  console.log('\n── 9h. BROCHURES ──');

  if (!state.adminToken || !state.studentToken || !state.facultyToken) {
    logSkip('All brochure tests', 'Need admin + student + faculty tokens');
  } else {
    // 9h-i. Faculty uploads via file URL
    let brochureId = null;
    {
      const r = await request('POST', '/api/brochures', {
        title: 'Test Prospectus',
        description: 'Automated test brochure',
        branch: 'All',
        fileUrl: 'https://example.com/prospectus.pdf',
      }, state.facultyToken);
      const ok = r.status === 201 && r.body.id && r.body.fileType === 'pdf';
      if (ok) brochureId = r.body.id;
      log('POST /api/brochures (faculty, pdf url)', ok, `Status ${r.status} | type=${r.body.fileType}`);
    }

    // 9h-ii. Upload without file → 400
    {
      const r = await request('POST', '/api/brochures', { title: 'No file' }, state.facultyToken);
      log('POST /api/brochures (no file → 400)', r.status === 400, `Status ${r.status}`);
    }

    // 9h-iii. Student lists and sees it
    {
      const r = await request('GET', '/api/brochures', null, state.studentToken);
      const ok = r.status === 200 && Array.isArray(r.body);
      log('GET /api/brochures (student)', ok, `Status ${r.status} | Count: ${Array.isArray(r.body) ? r.body.length : 'N/A'}`);
    }

    // 9h-iv. Student cannot upload → 403
    {
      const r = await request('POST', '/api/brochures', {
        title: 'Hack', fileUrl: 'https://example.com/x.pdf',
      }, state.studentToken);
      log('POST /api/brochures (student → 403)', r.status === 403, `Status ${r.status}`);
    }

    if (brochureId) {
      // 9h-v. Owner faculty deletes own upload
      const d = await request('DELETE', `/api/brochures/${brochureId}`, null, state.facultyToken);
      log('DELETE /api/brochures/:id (owner)', d.status === 200, `Status ${d.status}`);
    } else {
      logSkip('DELETE /api/brochures/:id', 'No brochure created');
    }
  }

  // ──────────────────── 10. CLEANUP TEST DATA ────────────────────
  console.log('\n── 10. CLEANUP ──');
  // Delete test users (admin deletes faculty and student test users)
  if (state.adminToken) {
    // First, get user list to find test user IDs
    const r = await request('GET', '/api/admin/users', null, state.adminToken);
    if (r.status === 200 && Array.isArray(r.body)) {
      for (const user of r.body) {
        if (user.usn === state.createdFacultyUsn || user.usn === state.createdStudentUsn) {
          const del = await request('DELETE', `/api/admin/users/${user.id}`, null, state.adminToken);
          log(`DELETE /api/admin/users/${user.usn}`, del.status === 200, `Status ${del.status} | ${JSON.stringify(del.body).substring(0, 80)}`);
        }
      }
    }
  }

  // ──────────────────── SUMMARY ────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`   RESULTS: ${passed} PASSED | ${failed} FAILED | ${skipped} SKIPPED`);
  console.log('═══════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.pass === false).forEach(r => {
      console.log(`   • ${r.testName}: ${r.detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
