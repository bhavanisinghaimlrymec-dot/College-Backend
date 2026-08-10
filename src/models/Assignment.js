const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  subject: { type: String, required: true },
  fileUrl: { type: String }, // URL to the PDF/Doc on Cloudinary/S3
  branch: { type: String, required: true }, // e.g., 'CSE'
  sem: { type: Number, required: true },    // e.g., 5
  deadline: { type: Date, required: true },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  facultyName: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
