const User = require('../models/User');
const ROLES = require('../constants/roles');
const Attendance = require('../models/Attendance');
const FeedPost = require('../models/FeedPost');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Marks = require('../models/Marks');
const Notification = require('../models/Notification');
const Leave = require('../models/Leave');

// @desc    Register a new user (Student or Faculty)
// @route   POST /api/admin/add-user
// @access  Private/Admin
exports.addUser = async (req, res) => {
  const { name, usn: usnInput, employeeId, email, password, role, branch, sem } = req.body;
  const usn = (usnInput || employeeId || '').trim();

  try {
    if (!usn) {
      return res.status(400).json({ message: 'USN or Employee ID is required' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const userExists = await User.findOne({ $or: [{ usn }, { email: cleanEmail }] });

    if (userExists) {
      if (userExists.usn === usn) {
        return res.status(400).json({ message: 'User with this USN or Employee ID already exists' });
      }
      return res.status(400).json({ message: 'User with this Email already exists' });
    }

    const user = await User.create({
      name,
      usn,
      email: cleanEmail,
      password,
      role,
      branch,
      sem,
    });

    if (user) {
      res.status(201).json({
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`,
        user: { id: user._id, name: user.name, usn: user.usn }
      });
    }
  } catch (error) {
    console.error('Error in addUser:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this USN/Employee ID or Email already exists' });
    }
    res.status(500).json({ message: error.message || 'Server error while adding user' });
  }
};

// @desc    Promote students in a branch to next semester.
//          Pass studentIds to promote only selected students;
//          omit it to promote the whole class.
// @route   POST /api/admin/promote
// @access  Private/Admin
exports.promoteSemester = async (req, res) => {
  const { branch, currentSem, studentIds } = req.body;

  try {
    const filter = { role: ROLES.STUDENT, branch: branch, sem: currentSem };
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      filter._id = { $in: studentIds };
    }
    const result = await User.updateMany(filter, { $inc: { sem: 1 } });

    res.json({ message: `Successfully promoted ${result.modifiedCount} students.` });
  } catch (error) {
    res.status(500).json({ message: 'Error during semester promotion' });
  }
};

// --- STEP 3: Admin User Management Endpoints ---

// @desc    Get all users (with optional role/branch filters)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.branch) filter.branch = req.query.branch;

    // Optional pagination: only when ?page or ?limit is passed, so existing
    // clients that expect a plain array keep working unchanged.
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    if (!wantsPagination) {
      const users = await User.find(filter)
        .select('name usn email role branch sem isActive')
        .sort({ createdAt: -1 });

      // Map _id to id for cleaner API response
      const result = users.map((u) => ({
        id: u._id,
        name: u.name,
        usn: u.usn,
        email: u.email,
        role: u.role,
        branch: u.branch,
        sem: u.sem,
        isActive: u.isActive,
      }));

      return res.json(result);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('name usn email role branch sem isActive')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    res.json({
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        usn: u.usn,
        email: u.email,
        role: u.role,
        branch: u.branch,
        sem: u.sem,
        isActive: u.isActive,
      })),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Delete a user by ID (with cascade cleanup of their data)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent locking everyone out: never delete the last active admin.
    if (user.role === ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin account' });
      }
    }

    const userId = user._id;

    if (user.role === ROLES.STUDENT) {
      await Promise.all([
        Submission.deleteMany({ student: userId }),
        Marks.deleteMany({ student: userId }),
        // Remove the student's embedded rows from all attendance sessions
        Attendance.updateMany(
          { 'records.student': userId },
          { $pull: { records: { student: userId } } }
        ),
      ]);
    }

    if (user.role === ROLES.FACULTY) {
      // Assignments owned by this faculty + their submissions
      const owned = await Assignment.find({ createdBy: userId }).select('_id');
      const ownedIds = owned.map((a) => a._id);
      await Promise.all([
        Submission.deleteMany({ assignment: { $in: ownedIds } }),
        Assignment.deleteMany({ createdBy: userId }),
        Attendance.deleteMany({ faculty: userId }),
        Marks.deleteMany({ faculty: userId }),
      ]);
    }

    // Feed posts authored by this user (any role)
    await FeedPost.deleteMany({ author: userId });

    // Notifications addressed to them + their leave applications.
    await Notification.deleteMany({ toUser: userId });
    await Leave.deleteMany({
      $or: [{ applicant: userId }, { substitute: userId }],
    });

    await user.deleteOne();
    res.json({ message: `User ${user.name} (${user.usn}) and their associated data deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// @desc    Suspend or reactivate a user
// @route   PATCH /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be a boolean' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    ).select('name usn email role branch sem isActive');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status' });
  }
};

// @desc    Campus summary for the admin dashboard
// @route   GET /api/admin/overview
exports.getOverview = async (req, res) => {
  try {
    const [students, faculty, activeUsers, attendanceSessions, posts] = await Promise.all([
      User.countDocuments({ role: ROLES.STUDENT }),
      User.countDocuments({ role: ROLES.FACULTY }),
      User.countDocuments({ isActive: true }),
      Attendance.countDocuments(),
      FeedPost.countDocuments(),
    ]);
    res.json({ students, faculty, activeUsers, attendanceSessions, posts });
  } catch (error) {
    res.status(500).json({ message: 'Error loading overview' });
  }
};

// @desc    Export per-student attendance as CSV, branch+sem wise
//          (optional ?subject= filter). One row per student x subject.
// @route   GET /api/admin/attendance/export?branch=&sem=[&subject=]
// @access  Private/Admin
exports.exportAttendanceCsv = async (req, res) => {
  const { branch, sem, subject } = req.query;

  if (!branch || !sem) {
    return res.status(400).json({
      message: 'Both "branch" and "sem" query parameters are required',
    });
  }

  try {
    const match = {
      branch: { $regex: `^${String(branch).trim()}$`, $options: 'i' },
      sem: Number(sem),
    };
    if (subject && String(subject).trim()) {
      match.subject = String(subject).trim().toUpperCase();
    }

    const rows = await Attendance.aggregate([
      { $match: match },
      { $unwind: '$records' },
      {
        $group: {
          _id: {
            usn: '$records.studentUsn',
            name: '$records.studentName',
            subject: '$subject',
          },
          sessions: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$records.status', 'Present'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.subject': 1, '_id.usn': 1 } },
    ]);

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      'USN,Student Name,Branch,Sem,Subject,Sessions,Present,Absent,Percentage',
    ];
    for (const r of rows) {
      const absent = r.sessions - r.present;
      const pct = r.sessions
        ? ((r.present / r.sessions) * 100).toFixed(1)
        : '0.0';
      lines.push(
        [
          r._id.usn,
          r._id.name,
          String(branch).trim().toUpperCase(),
          sem,
          r._id.subject,
          r.sessions,
          r.present,
          absent,
          pct,
        ]
          .map(esc)
          .join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_${String(branch).trim()}_sem${sem}.csv"`
    );
    res.send(lines.join('\n'));
  } catch (error) {
    res.status(500).json({ message: 'Error exporting attendance' });
  }
};
