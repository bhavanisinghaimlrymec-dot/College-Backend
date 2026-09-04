const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const User = require('../models/User');
const ROLES = require('../constants/roles');
const { notify } = require('../utils/notify');

// @desc    Create a new assignment
// @route   POST /api/faculty/assignments
exports.createAssignment = async (req, res) => {
  const { title, description, subject, fileUrl, branch, sem, deadline } = req.body;

  try {
    const assignment = await Assignment.create({
      title,
      description,
      subject,
      fileUrl,
      branch,
      sem,
      deadline,
      createdBy: req.user._id,
      facultyName: req.user.name
    });
    res.status(201).json(assignment);

    notify({
      toRole: ROLES.STUDENT,
      branch,
      type: 'assignment',
      title: `New assignment: ${assignment.title}`,
      body: `${assignment.subject} • due ${assignment.deadline ? new Date(assignment.deadline).toDateString() : 'soon'} • by ${req.user.name}`,
      refId: assignment._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating assignment' });
  }
};

// --- STEP 4: Faculty's Own Assignments with Submission Counts ---

// @desc    Get all assignments created by the logged-in faculty
// @route   GET /api/faculty/assignments
exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // STEP 5 FIX: Single aggregation instead of N+1 countDocuments calls
    const assignmentIds = assignments.map((a) => a._id);
    const counts = await Submission.aggregate([
      { $match: { assignment: { $in: assignmentIds } } },
      { $group: { _id: '$assignment', count: { $sum: 1 } } }
    ]);

    // Build a lookup map: assignmentId -> submissionCount
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const assignmentsWithCounts = assignments.map((a) => ({
      ...a,
      submissionCount: countMap[a._id.toString()] || 0
    }));

    res.json(assignmentsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your assignments' });
  }
};

// @desc    Get all submissions for a specific assignment
// @route   GET /api/faculty/assignments/:id/submissions
exports.getAssignmentSubmissions = async (req, res) => {
  try {
    // STEP 2 FIX: Verify faculty owns this assignment before showing submissions
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only view submissions for your own assignments' });
    }

    const submissions = await Submission.find({ assignment: req.params.id });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions' });
  }
};

// @desc    Submit attendance for a class
// @route   POST /api/faculty/attendance
exports.takeAttendance = async (req, res) => {
  const { subject, date, period, branch, sem, records } = req.body;

  try {
    const attendance = await Attendance.create({
      subject,
      date,
      period: period || null,
      branch,
      sem,
      records,
      faculty: req.user._id
    });
    res.status(201).json({ message: 'Attendance recorded successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Error recording attendance' });
  }
};

// @desc    Upload IA marks for students
// @route   POST /api/faculty/marks
exports.uploadMarks = async (req, res) => {
  const { marksList } = req.body; // Expecting an array of marks objects

  try {
    // Department guard: every subject must be offered in the faculty's own
    // branch. Kills cross-department uploads and free-text code typos.
    const Subject = require('../models/Subject');
    const offerings = await Subject.find({ branch: req.user.branch }).select('subjectCode');
    const validCodes = new Set(offerings.map((o) => o.subjectCode.toUpperCase()));
    const invalid = [...new Set(
      marksList
        .map((m) => (m.subject || '').toString().toUpperCase())
        .filter((code) => !validCodes.has(code))
    )];
    if (invalid.length > 0) {
      return res.status(400).json({
        message: `Unknown subject(s) for your department (${req.user.branch}): ${invalid.join(', ')}. Ask your HOD to add them first.`,
        invalidSubjects: invalid,
      });
    }

    // Add faculty ID to each mark entry
    const formattedMarks = marksList.map(mark => ({
      ...mark,
      subject: (mark.subject || '').toString().toUpperCase().trim(),
      faculty: req.user._id
    }));

    await Marks.insertMany(formattedMarks, { ordered: false });

    // Notify each distinct student once (fire-and-forget).
    const studentIds = [...new Set(formattedMarks.map((m) => m.student.toString()))];
    const sample = formattedMarks[0];
    studentIds.forEach((studentId) => {
      notify({
        toUser: studentId,
        type: 'marks',
        title: `Marks published: ${sample.subject} (${sample.assessmentName})`,
        body: 'Check your marks in the app.',
      });
    });
    res.status(201).json({ message: 'Marks uploaded successfully' });
  } catch (error) {
    // Duplicate (student+subject+assessment) hits the unique compound index.
    // insertMany with ordered:false inserts the rest; surface a clear 409.
    if (error.code === 11000 || (error.writeErrors || []).some((e) => e.code === 11000)) {
      const inserted = typeof error.result?.nInserted === 'number'
        ? error.result.nInserted
        : (error.insertedCount ?? 0);
      return res.status(409).json({
        message: 'Some entries already exist and were skipped. Update is not supported yet — delete and re-upload if a correction is needed.',
        inserted,
      });
    }
    res.status(500).json({ message: 'Error uploading marks. Some entries may already exist.' });
  }
};

// @desc    Get attendance sessions taken by the logged-in faculty
// @route   GET /api/faculty/attendance?subject=&branch=&sem=
// @access  Private/Faculty
exports.getAttendanceHistory = async (req, res) => {
  try {
    const filter = { faculty: req.user._id };
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.sem) filter.sem = Number(req.query.sem);

    const sessions = await Attendance.find(filter)
      .sort({ date: -1 })
      .lean();

    res.json(sessions.map((s) => ({
      ...s,
      presentCount: (s.records || []).filter((r) => r.status === 'Present').length,
      absentCount: (s.records || []).filter((r) => r.status === 'Absent').length,
      totalCount: (s.records || []).length,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance history' });
  }
};

// @desc    Grade a submission (grade + remarks + status)
// @route   PATCH /api/faculty/submissions/:id/grade
// @access  Private/Faculty (own assignments only)
exports.gradeSubmission = async (req, res) => {
  const { grade, remarks, status } = req.body;
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment || assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only grade submissions for your own assignments' });
    }
    if (grade !== undefined) submission.grade = grade;
    if (remarks !== undefined) submission.remarks = remarks;
    if (status !== undefined) {
      if (!['Submitted', 'Graded', 'Late'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      submission.status = status;
    } else if (grade !== undefined) {
      submission.status = 'Graded';
    }
    await submission.save();

    notify({
      toUser: submission.student,
      type: 'submission',
      title: `Graded: ${assignment.title}`,
      body: grade ? `Grade: ${grade}${remarks ? ` • ${remarks}` : ''}` : 'Check your submission.',
      refId: submission._id,
    });

    res.json({ message: 'Submission graded', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error grading submission' });
  }
};

// @desc    Delete a bad submission (e.g., wrong file uploaded)
// @route   DELETE /api/faculty/submissions/:id
exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // STEP 2 FIX: Verify the submission's assignment belongs to this faculty
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment || assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete submissions for your own assignments' });
    }

    await submission.deleteOne();
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting submission' });
  }
};

// @desc    Delete an assignment and all its associated submissions
// @route   DELETE /api/faculty/assignments/:id
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // STEP 2 FIX: Verify faculty owns this assignment before deleting
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own assignments' });
    }

    // Clean up all submissions related to this assignment first
    await Submission.deleteMany({ assignment: req.params.id });
    await assignment.deleteOne();

    res.json({ message: 'Assignment and related submissions deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting assignment' });
  }
};

// --- STEP 5: Student Roster for Faculty ---

// @desc    Get faculty/HOD colleagues in the logged-in faculty's branch
// @route   GET /api/faculty/colleagues
// @access  Private/Faculty (used by the leave substitute picker)
exports.getColleagues = async (req, res) => {
  try {
    const colleagues = await User.find({
      role: { $in: [ROLES.FACULTY, ROLES.HOD] },
      branch: req.user.branch,
      _id: { $ne: req.user._id },
      isActive: true,
    }).select('name usn').sort({ name: 1 });

    res.json(colleagues.map((c) => ({ id: c._id, name: c.name, usn: c.usn })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching colleagues' });
  }
};

// @desc    Get list of students by branch and semester
// @route   GET /api/faculty/students
// @access  Private/Faculty
exports.getStudentRoster = async (req, res) => {
  const { branch, sem } = req.query;

  if (!branch || !sem) {
    return res.status(400).json({ 
      message: 'Both "branch" and "sem" query parameters are required',
      statusCode: 400
    });
  }

  try {
    // Branch match is case-insensitive exact ('cse' finds 'CSE') so a
    // casing mismatch can never silently return an empty roster.
    const students = await User.find({
      role: ROLES.STUDENT,
      branch: { $regex: `^${branch.trim()}$`, $options: 'i' },
      sem: Number(sem)
    }).select('name usn').sort({ usn: 1 });

    // Return clean response with id, name, usn only
    const result = students.map((s) => ({
      id: s._id,
      name: s.name,
      usn: s.usn,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student roster' });
  }
};
