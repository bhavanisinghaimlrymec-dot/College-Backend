const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getLeaves,
  decideLeave,
  decideSubstitute,
} = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { leaveApplySchema, leaveDecisionSchema } = require('../middleware/validationSchemas');

router.use(protect);

// Students, faculty and HODs can apply (staff track requires substitute).
router.post(
  '/',
  authorize(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD),
  validate(leaveApplySchema),
  applyLeave
);

// Every role can read (own / inbox / all-scoped inside the controller).
router.get('/', authorize(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN), getLeaves);

// HOD (students) / Principal+Admin (faculty) decisions.
router.patch(
  '/:id/decision',
  authorize(ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN),
  validate(leaveDecisionSchema),
  decideLeave
);

// The assigned substitute responds (any staff role may be a substitute).
router.patch(
  '/:id/substitute',
  authorize(ROLES.FACULTY, ROLES.HOD),
  decideSubstitute
);

module.exports = router;
