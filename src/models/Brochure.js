const mongoose = require('mongoose');

// College brochure / prospectus files (image or PDF) uploaded by
// faculty or admin. Students browse and open them from the drawer.
const brochureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fileUrl: { type: String, required: true },
  fileType: {
    type: String,
    enum: ['image', 'pdf', 'other'],
    default: 'other',
  },
  branch: { type: String, default: 'All' },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploaderName: { type: String, required: true },
}, { timestamps: true });

brochureSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('Brochure', brochureSchema);
