const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const ROLES = require('../constants/roles');

const PASS_RATIO = 0.4;

// Shared aggregator: per-subject marks + attendance for one branch+sem.
const aggregate = async (branch, sem) => {
  const [marksGroups, sessions] = await Promise.all([
    Marks.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentDoc',
        },
      },
      { $unwind: '$studentDoc' },
      { $match: { 'studentDoc.branch': branch, 'studentDoc.sem': sem } },
      {
        $group: {
          _id: '$subject',
          avgMarks: { $avg: '$marksObtained' },
          avgMax: { $avg: '$maxMarks' },
          count: { $sum: 1 },
          assessments: { $addToSet: '$assessmentName' },
          passes: {
            $sum: {
              $cond: [
                { $gte: ['$marksObtained', { $multiply: ['$maxMarks', PASS_RATIO] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Attendance.find({ branch, sem }).select('subject records.status').lean(),
  ]);

  const attBySubject = {};
  sessions.forEach((s) => {
    const entry = (attBySubject[s.subject] = attBySubject[s.subject] || {
      present: 0,
      total: 0,
      sessions: 0,
    });
    entry.sessions += 1;
    (s.records || []).forEach((r) => {
      entry.total += 1;
      if (r.status === 'Present') entry.present += 1;
    });
  });

  const subjects = marksGroups.map((g) => {
    const att = attBySubject[g._id] || { present: 0, total: 0, sessions: 0 };
    return {
      subject: g._id,
      assessments: g.assessments,
      studentsAssessed: g.count,
      avgMarks: Math.round(g.avgMarks * 10) / 10,
      avgMax: Math.round(g.avgMax * 10) / 10,
      passPercent: g.count ? Math.round((g.passes / g.count) * 100) : 0,
      attendancePercent: att.total ? Math.round((att.present / att.total) * 100) : null,
      attendanceSessions: att.sessions,
    };
  });

  // Subjects with attendance but no marks yet still show up.
  Object.keys(attBySubject).forEach((subject) => {
    if (!subjects.some((s) => s.subject === subject)) {
      const att = attBySubject[subject];
      subjects.push({
        subject,
        assessments: [],
        studentsAssessed: 0,
        avgMarks: null,
        avgMax: null,
        passPercent: null,
        attendancePercent: att.total ? Math.round((att.present / att.total) * 100) : null,
        attendanceSessions: att.sessions,
      });
    }
  });

  subjects.sort((a, b) => a.subject.compareTo(b.subject));
  return { branch, sem, subjects };
};

// @desc    Class performance (branch+sem): marks + attendance per subject
// @route   GET /api/admin/performance?branch=&sem=
// @access  Private/Admin, Principal
exports.getAdminPerformance = async (req, res) => {
  try {
    const { branch, sem } = req.query;
    if (!branch || !sem) {
      return res.status(400).json({ message: 'branch and sem query parameters are required' });
    }
    res.json(await aggregate(branch, Number(sem)));
  } catch (error) {
    res.status(500).json({ message: 'Error loading performance' });
  }
};

// @desc    Class performance for faculty (defaults to own branch)
// @route   GET /api/faculty/performance?sem=&branch=
// @access  Private/Faculty, HOD
exports.getFacultyPerformance = async (req, res) => {
  try {
    const branch = req.query.branch || req.user.branch;
    const { sem } = req.query;
    if (!sem) {
      return res.status(400).json({ message: 'sem query parameter is required' });
    }
    // Faculty/HOD cannot peek into other departments.
    if (req.user.role !== ROLES.ADMIN && branch !== req.user.branch) {
      return res.status(403).json({ message: 'You can only view your own department' });
    }
    res.json(await aggregate(branch, Number(sem)));
  } catch (error) {
    res.status(500).json({ message: 'Error loading performance' });
  }
};
