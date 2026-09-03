const express = require('express');
const router = express.Router();
const {
  listBrochures,
  uploadBrochure,
  deleteBrochure,
} = require('../controllers/brochureController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { upload } = require('../config/storage');
const { validate } = require('../middleware/validationMiddleware');
const { brochureSchema } = require('../middleware/validationSchemas');

router.use(protect);

router.get(
  '/',
  authorize(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN),
  listBrochures
);
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.FACULTY),
  upload.single('file'),
  (req, res, next) => {
    if (req.file) req.body.fileUrl = req.file.path;
    next();
  },
  validate(brochureSchema),
  uploadBrochure
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.FACULTY),
  deleteBrochure
);

module.exports = router;
