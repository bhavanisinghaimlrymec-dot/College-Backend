const Brochure = require('../models/Brochure');
const ROLES = require('../constants/roles');
const { notify } = require('../utils/notify');

const imageExt = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const pdfExt = ['pdf'];

const detectType = (url = '', originalName = '') => {
  const src = `${originalName}.${url}`.toLowerCase();
  if (imageExt.some((e) => src.endsWith(e))) return 'image';
  if (pdfExt.some((e) => src.endsWith(e))) return 'pdf';
  return 'other';
};

const toSummary = (b) => ({
  id: b._id,
  title: b.title,
  description: b.description,
  fileUrl: b.fileUrl,
  fileType: b.fileType,
  branch: b.branch,
  uploaderName: b.uploaderName,
  createdAt: b.createdAt,
});

// @desc    List brochures (All + own branch; admin/principal all or ?branch=)
// @route   GET /api/brochures
// @access  Private (all roles)
exports.listBrochures = async (req, res) => {
  try {
    const filter = {};
    if ([ROLES.ADMIN, ROLES.PRINCIPAL].includes(req.user.role)) {
      if (req.query.branch) filter.branch = req.query.branch;
    } else {
      filter.branch = { $in: ['All', req.user.branch] };
    }
    const items = await Brochure.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(items.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brochures' });
  }
};

// @desc    Upload a brochure (image or PDF via multipart file or fileUrl)
// @route   POST /api/brochures
// @access  Private/Admin, Principal, HOD, Faculty
exports.uploadBrochure = async (req, res) => {
  const { title, description, branch, fileUrl } = req.body;
  try {
    const url = req.file ? req.file.path : (fileUrl || '').trim();
    if (!url) {
      return res.status(400).json({ message: 'Attach a file or provide a file URL' });
    }
    const brochure = await Brochure.create({
      title,
      description: description || '',
      fileUrl: url,
      fileType: detectType(url, req.file ? req.file.originalname : ''),
      branch: (branch || 'All').trim() || 'All',
      uploadedBy: req.user._id,
      uploaderName: req.user.name,
    });

    notify({
      toRole: 'all',
      branch: brochure.branch,
      type: 'system',
      title: `New brochure: ${brochure.title}`,
      body: `Uploaded by ${req.user.name}`,
      refId: brochure._id,
    });

    res.status(201).json(toSummary(brochure));
  } catch (error) {
    res.status(500).json({ message: 'Error uploading brochure' });
  }
};

// @desc    Delete a brochure (owner faculty, or admin/principal)
// @route   DELETE /api/brochures/:id
// @access  Private/Admin, Principal, HOD, Faculty
exports.deleteBrochure = async (req, res) => {
  try {
    const brochure = await Brochure.findById(req.params.id);
    if (!brochure) {
      return res.status(404).json({ message: 'Brochure not found' });
    }
    const isOwner = brochure.uploadedBy.toString() === req.user._id.toString();
    if (!isOwner && ![ROLES.ADMIN, ROLES.PRINCIPAL].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only the uploader or admin can delete this' });
    }
    await brochure.deleteOne();
    res.json({ message: 'Brochure deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting brochure' });
  }
};
