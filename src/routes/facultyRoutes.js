const express = require('express');
const router = express.Router();
const { 
  createAssignment,
  getMyAssignments,
  getAssignmentSubmissions, 
  takeAttendance, 
  uploadMarks,
  getAttendanceHistory,
  deleteAssignment,
  deleteSubmission,
  gradeSubmission,
  getStudentRoster,
  getColleagues
} = require('../controllers/facultyController');
const { getFacultyExams } = require('../controllers/examController');
const { getFacultyPerformance } = require('../controllers/performanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { upload } = require('../config/storage');
const { validate } = require('../middleware/validationMiddleware');
const { attendanceSchema, marksSchema, createAssignmentSchema } = require('../middleware/validationSchemas');

router.use(protect);
router.use(authorize(ROLES.FACULTY));

// --- Assignment Management ---

router.get('/assignments', getMyAssignments);

router.post('/assignments', upload.single('file'), (req, res, next) => {
  if (req.file) req.body.fileUrl = req.file.path;
  next();
}, validate(createAssignmentSchema), createAssignment);

router.get('/assignments/:id/submissions', getAssignmentSubmissions);
router.delete('/assignments/:id', deleteAssignment);
router.delete('/submissions/:id', deleteSubmission);
router.patch('/submissions/:id/grade', gradeSubmission);
router.get('/performance', getFacultyPerformance);

// --- Classroom Management ---

// STEP 6: validate attendance and marks payloads
router.post('/attendance', validate(attendanceSchema), takeAttendance);
router.get('/attendance', getAttendanceHistory);
router.post('/marks', validate(marksSchema), uploadMarks);

// STEP 5: GET /api/faculty/students — student roster by branch+sem
router.get('/students', getStudentRoster);

// Leave substitute picker: colleagues in the same department.
router.get('/colleagues', getColleagues);

// Exam list for a class (seating itself goes out as a feed image).
router.get('/exams', getFacultyExams);

module.exports = router;