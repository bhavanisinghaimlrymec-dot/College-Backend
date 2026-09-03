const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  authorName: { type: String, required: true }, // Cached for faster feed loading
  authorRole: { type: String, required: true },
  branchTag: { type: String, default: 'All' }, // e.g., 'CSE', 'ECE', or 'All'
  audience: {
    type: String,
    enum: ['everyone', 'students', 'faculty'],
    default: 'everyone',
  },
  isImportant: { type: Boolean, default: false },
  hasAttachment: { type: Boolean, default: false },
  attachmentUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FeedPost', feedPostSchema);