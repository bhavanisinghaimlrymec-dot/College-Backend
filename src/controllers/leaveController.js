const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const User = require('../models/User');
const ROLES = require('../constants/roles');
const { notify } = require('../utils/notify');

const STAFF_ROLES = [ROLES.FACULTY, ROLES.HOD];

// Overlap helper: [aFrom,aTo] overlaps [bFrom,bTo] iff aFrom <= bTo && aTo >= bFrom.
const overlaps = (aFrom, aTo, bFrom, bTo) =>
  new Date(aFrom) <= new Date(bTo) && new Date(aTo) >= new Date(bFrom);

const toSummary = (leave) => ({
  id: leave._id,
  applicantName: leave.applicantName,
  applicantUsn: leave.applicantUsn,
  applicantRole: leave.applicantRole,
  branch: leave.branch,
  sem: leave.sem,
  from: leave.from,
  to: leave.to,
  reason: leave.reason,
  substituteName: leave.substituteName,
  periodsAffected: leave.periodsAffected,
  subStatus: leave.subStatus,
  status: leave.status,
  remark: leave.remark,
  createdAt: leave.createdAt,
});

// @desc    Apply for leave (student track or faculty track)
// @route   POST /api/leaves
// @access  Private/Student, Faculty, HOD
exports.applyLeave = async (req, res) => {
  const { from, to, reason, substitute, periodsAffected } = req.body;
  try {
    if (new Date(from) > new Date(to)) {
      return res.status(400).json({ message: 'Leave start date cannot be after end date' });
    }

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const applicantRole = req.user.role === ROLES.HOD ? 'hod' : isStaff ? 'faculty' : 'student';

    let subId = null;
    let subName = null;
    if (isStaff) {
      // Faculty track: a substitute from the same branch is mandatory.
      if (!substitute || !mongoose.Types.ObjectId.isValid(substitute)) {
        return res.status(400).json({ message: 'A substitute faculty is required' });
      }
      if (substitute.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You cannot assign yourself as substitute' });
      }
      const sub = await User.findById(substitute).select('name usn branch role isActive');
      if (!sub || ![ROLES.FACULTY, ROLES.HOD].includes(sub.role)) {
        return res.status(400).json({ message: 'Substitute must be a faculty member' });
      }
      if (sub.branch !== req.user.branch) {
        return res.status(400).json({ message: 'Substitute must be from your department' });
      }
      if (sub.isActive === false) {
        return res.status(400).json({ message: 'Substitute account is suspended' });
      }
      // Substitute must not already be on approved leave overlapping these dates.
      const clash = await Leave.findOne({
        applicant: sub._id,
        status: { $in: ['substitute_accepted', 'principal_approved'] },
        from: { $lte: new Date(to) },
        to: { $gte: new Date(from) },
      }).select('_id');
      if (clash) {
        return res.status(409).json({ message: `${sub.name} is on leave during these dates` });
      }
      subId = sub._id;
      subName = sub.name;
    }

    const leave = await Leave.create({
      applicant: req.user._id,
      applicantRole,
      applicantName: req.user.name,
      applicantUsn: req.user.usn,
      branch: req.user.branch,
      sem: req.user.sem,
      from,
      to,
      reason,
      substitute: subId,
      substituteName: subName,
      periodsAffected: Array.isArray(periodsAffected) ? periodsAffected : [],
      subStatus: isStaff ? 'pending' : 'none',
      status: isStaff ? 'substitute_pending' : 'applied',
    });

    if (isStaff) {
      notify({
        toUser: subId,
        type: 'leave',
        title: `Substitute request from ${req.user.name}`,
        body: `${new Date(from).toDateString()} → ${new Date(to).toDateString()}. Accept or decline in the app.`,
        refId: leave._id,
      });
    } else {
      // Notify HODs of the student's branch.
      const hods = await User.find({ role: ROLES.HOD, branch: req.user.branch }).select('_id');
      hods.forEach((h) => {
        notify({
          toUser: h._id,
          type: 'leave',
          title: `Leave request: ${req.user.name}`,
          body: `${req.user.usn} • ${new Date(from).toDateString()} → ${new Date(to).toDateString()}`,
          refId: leave._id,
        });
      });
    }

    res.status(201).json(toSummary(leave));
  } catch (error) {
    res.status(500).json({ message: 'Error applying for leave' });
  }
};

// @desc    List leaves: ?scope=mine (own) | inbox (awaiting my action) | all (admin read-only)
// @route   GET /api/leaves
// @access  Private (all roles)
exports.getLeaves = async (req, res) => {
  try {
    const scope = req.query.scope || 'mine';
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (scope === 'mine') {
      filter.applicant = req.user._id;
    } else if (scope === 'inbox') {
      if (req.user.role === ROLES.HOD) {
        // HOD inbox: applied student leaves of their department.
        filter.applicantRole = 'student';
        filter.branch = req.user.branch;
        filter.status = filter.status || 'applied';
      } else if (req.user.role === ROLES.PRINCIPAL || req.user.role === ROLES.ADMIN) {
        // Principal inbox: faculty leaves whose substitute accepted.
        filter.applicantRole = { $in: ['faculty', 'hod'] };
        filter.status = filter.status || 'substitute_accepted';
      } else {
        // Faculty inbox: substitute requests addressed to me.
        filter.substitute = req.user._id;
        filter.subStatus = 'pending';
      }
    } else if (scope === 'all') {
      if (![ROLES.ADMIN, ROLES.PRINCIPAL].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only admin or principal can list all leaves' });
      }
    } else {
      return res.status(400).json({ message: 'scope must be mine, inbox or all' });
    }

    const leaves = await Leave.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(leaves.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaves' });
  }
};

// @desc    Approve / reject a leave (HOD for students, Principal for faculty)
// @route   PATCH /api/leaves/:id/decision
// @access  Private/HOD, Principal, Admin
exports.decideLeave = async (req, res) => {
  const { decision, remark } = req.body;
  try {
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'" });
    }
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    if (leave.applicantRole === 'student') {
      if (req.user.role !== ROLES.HOD || req.user.branch !== leave.branch) {
        return res.status(403).json({ message: 'Only the department HOD can decide this leave' });
      }
      if (leave.status !== 'applied') {
        return res.status(409).json({ message: `Leave already ${leave.status}` });
      }
      leave.status = decision === 'approve' ? 'hod_approved' : 'hod_rejected';
    } else {
      if (![ROLES.PRINCIPAL, ROLES.ADMIN].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only the principal can decide faculty leaves' });
      }
      if (leave.status !== 'substitute_accepted') {
        return res.status(409).json({
          message: 'Substitute must accept before the principal can decide',
        });
      }
      leave.status = decision === 'approve' ? 'principal_approved' : 'principal_rejected';
    }

    leave.decidedBy = req.user._id;
    leave.remark = remark || '';
    await leave.save();

    notify({
      toUser: leave.applicant,
      type: 'leave',
      title: `Leave ${decision === 'approve' ? 'approved' : 'rejected'}`,
      body: remark || `${new Date(leave.from).toDateString()} → ${new Date(leave.to).toDateString()}`,
      refId: leave._id,
    });
    if (leave.substitute) {
      notify({
        toUser: leave.substitute,
        type: 'leave',
        title: `Leave ${decision === 'approve' ? 'approved' : 'rejected'} (${leave.applicantName})`,
        body: decision === 'approve'
          ? `You cover ${leave.applicantName}'s classes ${new Date(leave.from).toDateString()} → ${new Date(leave.to).toDateString()}.`
          : 'No cover needed.',
        refId: leave._id,
      });
    }

    res.json(toSummary(leave));
  } catch (error) {
    res.status(500).json({ message: 'Error deciding leave' });
  }
};

// @desc    Substitute accepts or declines covering the classes
// @route   PATCH /api/leaves/:id/substitute
// @access  Private (the assigned substitute only)
exports.decideSubstitute = async (req, res) => {
  const { decision } = req.body;
  try {
    if (!['accept', 'decline'].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'accept' or 'decline'" });
    }
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }
    if (!leave.substitute || leave.substitute.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the assigned substitute can respond' });
    }
    if (leave.subStatus !== 'pending') {
      return res.status(409).json({ message: `Request already ${leave.subStatus}` });
    }

    if (decision === 'accept') {
      leave.subStatus = 'accepted';
      leave.status = 'substitute_accepted';
      await leave.save();

      // Now — and only now — it reaches the principal's inbox.
      const principals = await User.find({
        role: { $in: [ROLES.PRINCIPAL, ROLES.ADMIN] },
      }).select('_id');
      principals.forEach((p) => {
        notify({
          toUser: p._id,
          type: 'leave',
          title: `Leave approval: ${leave.applicantName}`,
          body: `Substitute ${leave.substituteName} accepted. ${new Date(leave.from).toDateString()} → ${new Date(leave.to).toDateString()}`,
          refId: leave._id,
        });
      });
      notify({
        toUser: leave.applicant,
        type: 'leave',
        title: `${leave.substituteName} accepted your cover request`,
        body: 'Your leave is now with the principal.',
        refId: leave._id,
      });
    } else {
      leave.subStatus = 'declined';
      leave.status = 'substitute_declined';
      await leave.save();

      notify({
        toUser: leave.applicant,
        type: 'leave',
        title: `${leave.substituteName} declined your cover request`,
        body: 'Pick another substitute and re-apply.',
        refId: leave._id,
      });
    }

    res.json(toSummary(leave));
  } catch (error) {
    res.status(500).json({ message: 'Error responding to substitute request' });
  }
};
