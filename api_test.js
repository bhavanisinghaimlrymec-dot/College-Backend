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
