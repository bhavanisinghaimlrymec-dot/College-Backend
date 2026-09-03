const express = require('express');
const router = express.Router();
const {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/syllabusController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { subjectSchema } = require('../middleware/validationSchemas');

router.use(protect);

// Everyone with a login can read the offerings.
router.get(
  '/',
  authorize(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN),
  listSubjects
);

// Only admin (any branch) and HOD (own branch, enforced in controller).
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.HOD),
  validate(subjectSchema),
  createSubject
);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.HOD), updateSubject);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.HOD), deleteSubject);

module.exports = router;
