const express = require('express');
const router = express.Router();
const {
  logSyllabus,
  updateSyllabusLog,
  getSyllabus,
} = require('../controllers/syllabusController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { syllabusSchema } = require('../middleware/validationSchemas');

router.use(protect);

// Role-shaped read: students see own branch+sem, faculty own logs,
// HOD/admin/principal see the progress matrix.
router.get(
  '/',
  authorize(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN),
  getSyllabus
);

// Daily logging: faculty + HOD only, own branch enforced in controller.
router.post(
  '/',
  authorize(ROLES.FACULTY, ROLES.HOD),
  validate(syllabusSchema),
  logSyllabus
);

// Same-day edit by owner (admin any time).
router.put(
  '/:id',
  authorize(ROLES.FACULTY, ROLES.HOD, ROLES.ADMIN),
  updateSyllabusLog
);

module.exports = router;
