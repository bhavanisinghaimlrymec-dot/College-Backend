const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  date: { type: Date, required: true },
  branch: { type: String, required: true },
  sem: { type: Number, required: true },
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  records: [
    {
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      studentName: String,
      studentUsn: String,
      status: { type: String, enum: ['Present', 'Absent'], required: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);