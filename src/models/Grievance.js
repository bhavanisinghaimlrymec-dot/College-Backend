const mongoose = require('mongoose');

// Student grievance / support ticket. Lifecycle:
//   open -> in_progress -> resolved (student may reopen -> open)
const grievanceSchema = new mongoose.Schema({
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: { type: String, required: true },
  studentUsn: { type: String },
  branch: { type: String, required: true },
  category: {
    type: String,
    enum: ['Academic', 'Fees', 'Hostel', 'Transport', 'Faculty', 'Other'],
    default: 'Other',
  },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open',
  },
  reply: { type: String, default: '' },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

grievanceSchema.index({ raisedBy: 1, createdAt: -1 });
grievanceSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Grievance', grievanceSchema);
