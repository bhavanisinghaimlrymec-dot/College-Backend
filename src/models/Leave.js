const mongoose = require('mongoose');

// Leave application. Two tracks share one collection:
//
// STUDENT track:  applied -> hod_approved | hod_rejected
//   Decided by the HOD of the student's branch.
//
// FACULTY track (role faculty or hod):
//   applied -> substitute_pending -> substitute_accepted
//       -> principal_approved | principal_rejected
//   The applicant names a substitute (same branch, not self). The request
//   reaches the principal ONLY after the substitute accepts. A decline
//   sends it back to the applicant; the principal never sees it.
const leaveSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  applicantRole: {
    type: String,
    enum: ['student', 'faculty', 'hod'],
    required: true,
  },
  applicantName: { type: String, required: true },
  applicantUsn: { type: String },
  branch: { type: String, required: true },
  sem: { type: Number }, // students only
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  reason: { type: String, required: true },
  // Faculty track only
  substitute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  substituteName: { type: String },
  periodsAffected: [{ type: String }],
  subStatus: {
    type: String,
    enum: ['none', 'pending', 'accepted', 'declined'],
    default: 'none',
  },
  status: {
    type: String,
    enum: [
      'applied',
      'substitute_pending',
      'substitute_declined',
      'substitute_accepted',
      'hod_approved',
      'hod_rejected',
      'principal_approved',
      'principal_rejected',
    ],
    default: 'applied',
  },
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  remark: { type: String },
}, { timestamps: true });

leaveSchema.index({ applicant: 1, createdAt: -1 });
leaveSchema.index({ branch: 1, status: 1, createdAt: -1 });
leaveSchema.index({ substitute: 1, subStatus: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
