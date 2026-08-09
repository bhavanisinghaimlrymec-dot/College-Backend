const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Assignment', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  studentName: { type: String, required: true },
  studentUsn: { type: String, required: true },
  fileUrl: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  grade: { type: String },
  remarks: { type: String },
  status: { 
    type: String, 
    enum: ['Submitted', 'Graded', 'Late'], 
    default: 'Submitted' 
  }
}, { timestamps: true });

// Prevent duplicate submissions: One student can only submit an assignment once
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);