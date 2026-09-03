const Subject = require('../models/Subject');
const SyllabusLog = require('../models/SyllabusLog');
const ROLES = require('../constants/roles');

const midnight = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const sameDay = (a, b) => midnight(a).getTime() === midnight(b).getTime();

// ── Subjects ────────────────────────────────────────────────

// @desc    List subject offerings (?branch=&sem=)
// @route   GET /api/subjects
// @access  Private (all roles)
exports.listSubjects = async (req, res) => {
  try {
    const filter = {};
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.sem) filter.sem = Number(req.query.sem);
    const subjects = await Subject.find(filter).sort({ branch: 1, sem: 1, subjectCode: 1 });
    res.json(subjects.map((s) => ({
      id: s._id,
      branch: s.branch,
      sem: s.sem,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      totalModules: s.totalModules,
      facultyName: s.facultyName,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// @desc    Create a subject offering
// @route   POST /api/subjects
// @access  Private/Admin (any branch), HOD (own branch only)
exports.createSubject = async (req, res) => {
  const { branch, sem, subjectCode, subjectName, totalModules, faculty } = req.body;
  try {
    if (req.user.role === ROLES.HOD && branch !== req.user.branch) {
      return res.status(403).json({ message: 'HOD can only add subjects for their own department' });
    }
    const subject = await Subject.create({
      branch,
      sem,
      subjectCode,
      subjectName,
      totalModules: totalModules || 5,
      faculty: faculty || undefined,
      createdBy: req.user._id,
    });
    if (faculty) {
      const User = require('../models/User');
      const f = await User.findById(faculty).select('name');
      if (f) {
        subject.facultyName = f.name;
        await subject.save();
      }
    }
    res.status(201).json(subject);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This subject code already exists for the branch+sem' });
    }
    res.status(500).json({ message: 'Error creating subject' });
  }
};

// @desc    Update a subject offering
// @route   PUT /api/subjects/:id
// @access  Private/Admin (any), HOD (own branch only)
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    if (req.user.role === ROLES.HOD && subject.branch !== req.user.branch) {
      return res.status(403).json({ message: 'HOD can only edit their own department subjects' });
    }
    ['subjectName', 'totalModules'].forEach((k) => {
      if (req.body[k] !== undefined) subject[k] = req.body[k];
    });
    if (req.body.faculty !== undefined) {
      subject.faculty = req.body.faculty || undefined;
      if (req.body.faculty) {
        const User = require('../models/User');
        const f = await User.findById(req.body.faculty).select('name');
        subject.facultyName = f ? f.name : '';
      } else {
        subject.facultyName = '';
      }
    }
    await subject.save();
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject' });
  }
};

// @desc    Delete a subject offering (logs/marks keep denormalized names)
// @route   DELETE /api/subjects/:id
// @access  Private/Admin (any), HOD (own branch only)
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    if (req.user.role === ROLES.HOD && subject.branch !== req.user.branch) {
      return res.status(403).json({ message: 'HOD can only delete their own department subjects' });
    }
    await subject.deleteOne();
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject' });
  }
};

// ── Syllabus logs ───────────────────────────────────────────

// @desc    Log today's coverage for a subject in the faculty's own branch
// @route   POST /api/syllabus
// @access  Private/Faculty, HOD
exports.logSyllabus = async (req, res) => {
  const { subject, date, topicCovered, moduleNo, periodsUsed } = req.body;
  try {
    const code = (subject || '').toString().toUpperCase().trim();
    const offering = await Subject.findOne({ branch: req.user.branch, subjectCode: code });
    if (!offering) {
      return res.status(400).json({
        message: `Subject ${code} is not offered in your department (${req.user.branch}). Ask your HOD to add it first.`,
      });
    }
    const day = midnight(date || new Date());
    const log = await SyllabusLog.create({
      branch: req.user.branch,
      sem: offering.sem,
      subject: code,
      subjectName: offering.subjectName,
      date: day,
      topicCovered,
      moduleNo,
      periodsUsed: periodsUsed || 1,
      faculty: req.user._id,
      facultyName: req.user.name,
    });
    res.status(201).json(log);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You already logged this subject today. Edit that entry instead.',
      });
    }
    res.status(500).json({ message: 'Error logging syllabus' });
  }
};

// @desc    Edit a same-day syllabus entry
// @route   PUT /api/syllabus/:id
// @access  Private/Owner faculty (Admin any)
exports.updateSyllabusLog = async (req, res) => {
  try {
    const log = await SyllabusLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Syllabus entry not found' });
    }
    if (req.user.role !== ROLES.ADMIN &&
        log.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own entries' });
    }
    if (req.user.role !== ROLES.ADMIN && !sameDay(log.createdAt, new Date())) {
      return res.status(409).json({ message: 'Only today’s entry can be edited' });
    }
    ['topicCovered', 'moduleNo', 'periodsUsed'].forEach((k) => {
      if (req.body[k] !== undefined) log[k] = req.body[k];
    });
    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error updating syllabus entry' });
  }
};

// @desc    Syllabus view, role-shaped:
//   student: own branch+sem grouped by subject with progress %
//   faculty: own logs (?subject=)
//   hod: own-branch matrix | admin/principal: matrix (?branch= or all)
// @route   GET /api/syllabus
// @access  Private (all roles)
exports.getSyllabus = async (req, res) => {
  try {
    const role = req.user.role;

    if (role === ROLES.STUDENT) {
      const offerings = await Subject.find({ branch: req.user.branch, sem: req.user.sem });
      const logs = await SyllabusLog.find({ branch: req.user.branch, sem: req.user.sem })
        .sort({ date: -1 })
        .lean();
      const bySubject = {};
      logs.forEach((l) => {
        (bySubject[l.subject] = bySubject[l.subject] || []).push(l);
      });
      return res.json(offerings.map((o) => {
        const covered = new Set((bySubject[o.subjectCode] || []).map((l) => l.moduleNo));
        return {
          subject: o.subjectCode,
          subjectName: o.subjectName,
          totalModules: o.totalModules,
          modulesCovered: covered.size,
          percent: o.totalModules ? Math.round((covered.size / o.totalModules) * 100) : 0,
          facultyName: o.facultyName,
          logs: (bySubject[o.subjectCode] || []).slice(0, 20),
        };
      }));
    }

    if (role === ROLES.FACULTY || role === ROLES.HOD) {
      const filter = role === ROLES.FACULTY
        ? { faculty: req.user._id }
        : { branch: req.user.branch };
      if (req.query.subject) filter.subject = req.query.subject.toString().toUpperCase();
      const logs = await SyllabusLog.find(filter).sort({ date: -1 }).limit(200);
      return res.json(logs);
    }

    // Admin / Principal matrix
    const match = {};
    if (req.query.branch) match.branch = req.query.branch;
    const offerings = await Subject.find(match).lean();
    const logs = await SyllabusLog.find(match).lean();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    res.json(offerings.map((o) => {
      const rel = logs.filter((l) => l.branch === o.branch && l.subject === o.subjectCode);
      const covered = new Set(rel.map((l) => l.moduleNo));
      const last = rel.reduce((m, l) => (l.date > m ? l.date : m), null);
      return {
        branch: o.branch,
        sem: o.sem,
        subject: o.subjectCode,
        subjectName: o.subjectName,
        facultyName: o.facultyName,
        totalModules: o.totalModules,
        modulesCovered: covered.size,
        percent: o.totalModules ? Math.round((covered.size / o.totalModules) * 100) : 0,
        lastLogDate: last,
        stale: !last || new Date(last).getTime() < sevenDaysAgo,
      };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching syllabus' });
  }
};
