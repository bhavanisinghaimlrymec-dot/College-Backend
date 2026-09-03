const ExamNotice = require('../models/ExamNotice');
const ROLES = require('../constants/roles');
const { notify } = require('../utils/notify');

const toSummary = (e) => ({
  id: e._id,
  title: e.title,
  examType: e.examType,
  branch: e.branch,
  sem: e.sem,
  subject: e.subject,
  subjectName: e.subjectName,
  date: e.date,
  startTime: e.startTime,
  noticeReleased: e.noticeReleased,
  collectionPoint: e.collectionPoint,
  releasedAt: e.releasedAt,
  createdAt: e.createdAt,
});

// @desc    Create an exam notice (hall tickets collected offline)
// @route   POST /api/admin/exam-notices
// @access  Private/Admin, Principal
exports.createExamNotice = async (req, res) => {
  const { title, examType, branch, sem, subject, subjectName, date, startTime } = req.body;
  try {
    const notice = await ExamNotice.create({
      title,
      examType: examType || 'SEE',
      branch,
      sem,
      subject,
      subjectName,
      date,
      startTime,
      createdBy: req.user._id,
    });
    res.status(201).json(toSummary(notice));
  } catch (error) {
    res.status(500).json({ message: 'Error creating exam notice' });
  }
};

// @desc    List exam notices (?branch=&sem=&upcoming=true)
// @route   GET /api/admin/exam-notices
// @access  Private/Admin, Principal
exports.listExamNotices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.sem) filter.sem = Number(req.query.sem);
    if (req.query.upcoming === 'true') filter.date = { $gte: new Date() };
    const notices = await ExamNotice.find(filter).sort({ date: 1 }).limit(200);
    res.json(notices.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exam notices' });
  }
};

// @desc    Release the hall-ticket collection notice (notification only)
// @route   PATCH /api/admin/exam-notices/:id/release
// @access  Private/Admin, Principal
exports.releaseNotice = async (req, res) => {
  const { collectionPoint } = req.body;
  try {
    const notice = await ExamNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Exam notice not found' });
    }
    if (notice.noticeReleased) {
      return res.status(409).json({ message: 'Notice already released (no duplicate push sent)' });
    }
    notice.noticeReleased = true;
    notice.collectionPoint = (collectionPoint || 'Exam section, Admin block').trim();
    notice.releasedAt = new Date();
    await notice.save();

    notify({
      toRole: ROLES.STUDENT,
      branch: notice.branch,
      type: 'exam',
      title: `Hall tickets released: ${notice.subject || notice.title}`,
      body: `Collect from ${notice.collectionPoint}. Exam on ${new Date(notice.date).toDateString()}.`,
      refId: notice._id,
    });

    res.json(toSummary(notice));
  } catch (error) {
    res.status(500).json({ message: 'Error releasing notice' });
  }
};

// @desc    Delete an exam notice
// @route   DELETE /api/admin/exam-notices/:id
// @access  Private/Admin, Principal
exports.deleteExamNotice = async (req, res) => {
  try {
    const notice = await ExamNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Exam notice not found' });
    }
    await notice.deleteOne();
    res.json({ message: 'Exam notice deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting exam notice' });
  }
};

// @desc    Student's exams: own branch+sem, upcoming first
// @route   GET /api/student/exams
// @access  Private/Student
exports.getMyExams = async (req, res) => {
  try {
    const notices = await ExamNotice.find({
      branch: req.user.branch,
      sem: req.user.sem,
    }).sort({ date: 1 }).limit(100);
    res.json(notices.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exams' });
  }
};

// @desc    Faculty view of exams (?branch=&sem= required)
// @route   GET /api/faculty/exams
// @access  Private/Faculty, HOD
exports.getFacultyExams = async (req, res) => {
  try {
    const { branch, sem } = req.query;
    if (!branch || !sem) {
      return res.status(400).json({ message: 'branch and sem query parameters are required' });
    }
    const notices = await ExamNotice.find({ branch, sem: Number(sem) })
      .sort({ date: 1 })
      .limit(100);
    res.json(notices.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exams' });
  }
};
