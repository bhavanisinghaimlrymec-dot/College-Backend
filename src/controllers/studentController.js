const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const mongoose = require('mongoose');
const { notify } = require('../utils/notify');

// @desc    Get assignments for the student's branch and semester
// @route   GET /api/student/assignments
exports.getAvailableAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      branch: req.user.branch, 
      sem: req.user.sem 
    }).sort({ deadline: 1 }).lean();
    const submissions = await Submission.find({
      student: req.user._id,
      assignment: { $in: assignments.map((assignment) => assignment._id) },
    }).select('assignment fileUrl submittedAt');
    const byAssignment = new Map(submissions.map((submission) => [submission.assignment.toString(), submission]));
    res.json(assignments.map((assignment) => {
      const submission = byAssignment.get(assignment._id.toString());
      return {
        ...assignment,
        isSubmitted: Boolean(submission),
        submissionUrl: submission?.fileUrl,
        submittedAt: submission?.submittedAt,
      };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments' });
  }
};

// @desc    Submit an assignment
// @route   POST /api/student/submit
exports.submitAssignment = async (req, res) => {
  const { assignmentId, fileUrl } = req.body;

  try {
    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.user._id,
      studentName: req.user.name,
      studentUsn: req.user.usn,
      fileUrl
    });
    res.status(201).json(submission);

    // Tell the owning faculty (fire-and-forget).
    Assignment.findById(assignmentId).select('createdBy title').then((a) => {
      if (a && a.createdBy) {
        notify({
          toUser: a.createdBy,
          type: 'submission',
          title: `New submission: ${a.title}`,
          body: `${req.user.name} (${req.user.usn}) submitted.`,
          refId: submission._id,
        });
      }
    }).catch(() => {});
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }
    res.status(500).json({ message: 'Error uploading submission' });
  }
};

// @desc    Get logged-in student's attendance
// @route   GET /api/student/my-attendance
exports.getMyAttendance = async (req, res) => {
  try {
    // --- STEP 2 FIX: Replaced the broken positional $ projection ---
    //
    // OLD (BUGGY) CODE:
    //   Attendance.find({ 'records.student': req.user._id }).select('subject date records.$');
    //
    // WHY IT WAS WRONG:
    //   The MongoDB positional $ operator (records.$) only ever returns the FIRST
    //   matching element in the array. If the query matched the document via any
    //   element in `records`, the projection would return whichever element the
    //   query engine matched first — which may not even be the logged-in student's
    //   record if MongoDB's internal query planner picks a different index entry.
    //   This caused silent data loss: sometimes returning the wrong student's
    //   status, and always returning at most one record per document.
    //
    // FIX: Use an aggregation pipeline with $filter to reliably extract ONLY
    //   the logged-in student's record from each attendance document, every time.
    //
    const studentId = new mongoose.Types.ObjectId(req.user._id);

    const attendanceRecords = await Attendance.aggregate([
      // Stage 1: Find all attendance docs that include this student
      { $match: { 'records.student': studentId } },
      // Stage 2: Project only the fields we need, filtering the records array
      //          to include ONLY this student's entry
      {
        $project: {
          subject: 1,
          date: 1,
          period: 1,
          records: {
            $filter: {
              input: '$records',
              as: 'r',
              cond: { $eq: ['$$r.student', studentId] }
            }
          }
        }
      }
    ]);

    res.json(attendanceRecords);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance' });
  }
};

// @desc    Get logged-in student's marks
// @route   GET /api/student/my-marks
exports.getMyMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ student: req.user._id });
    res.json(marks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching marks' });
  }
};
