const Grievance = require('../models/Grievance');
const User = require('../models/User');
const ROLES = require('../constants/roles');
const { notify } = require('../utils/notify');

const toSummary = (g) => ({
  id: g._id,
  studentName: g.studentName,
  studentUsn: g.studentUsn,
  branch: g.branch,
  category: g.category,
  subject: g.subject,
  description: g.description,
  status: g.status,
  reply: g.reply,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});

// @desc    Raise a grievance
// @route   POST /api/grievances
// @access  Private/Student
exports.raiseGrievance = async (req, res) => {
  const { category, subject, description } = req.body;
  try {
    const grievance = await Grievance.create({
      raisedBy: req.user._id,
      studentName: req.user.name,
      studentUsn: req.user.usn,
      branch: req.user.branch,
      category: category || 'Other',
      subject,
      description,
    });

    // Notify admins + principal.
    const staff = await User.find({
      role: { $in: [ROLES.ADMIN, ROLES.PRINCIPAL] },
    }).select('_id');
    staff.forEach((s) => {
      notify({
        toUser: s._id,
        type: 'system',
        title: `New grievance: ${subject}`,
        body: `${req.user.name} (${req.user.branch}) • ${category || 'Other'}`,
        refId: grievance._id,
      });
    });

    res.status(201).json(toSummary(grievance));
  } catch (error) {
    res.status(500).json({ message: 'Error raising grievance' });
  }
};

// @desc    My grievances (student) or all (admin/principal, ?status=&branch=)
// @route   GET /api/grievances
// @access  Private/Student, Admin, Principal
exports.listGrievances = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === ROLES.STUDENT) {
      filter.raisedBy = req.user._id;
    } else if ([ROLES.ADMIN, ROLES.PRINCIPAL].includes(req.user.role)) {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.branch) filter.branch = req.query.branch;
    } else {
      return res.status(403).json({ message: 'Not authorized to view grievances' });
    }
    const items = await Grievance.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(items.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching grievances' });
  }
};

// @desc    Reply / change status (open | in_progress | resolved)
// @route   PATCH /api/grievances/:id
// @access  Private/Admin, Principal
exports.respondGrievance = async (req, res) => {
  const { status, reply } = req.body;
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }
    if (status && !['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status) grievance.status = status;
    if (reply !== undefined) {
      grievance.reply = reply;
      grievance.repliedBy = req.user._id;
    }
    await grievance.save();

    notify({
      toUser: grievance.raisedBy,
      type: 'system',
      title: `Grievance ${grievance.status.replace('_', ' ')}: ${grievance.subject}`,
      body: grievance.reply || 'The office has updated your ticket.',
      refId: grievance._id,
    });

    res.json(toSummary(grievance));
  } catch (error) {
    res.status(500).json({ message: 'Error updating grievance' });
  }
};
