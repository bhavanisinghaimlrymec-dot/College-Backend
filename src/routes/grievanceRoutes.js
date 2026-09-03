const express = require('express');
const router = express.Router();
const {
  raiseGrievance,
  listGrievances,
  respondGrievance,
} = require('../controllers/grievanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { grievanceSchema } = require('../middleware/validationSchemas');

router.use(protect);

router.post(
  '/',
  authorize(ROLES.STUDENT),
  validate(grievanceSchema),
  raiseGrievance
);
router.get(
  '/',
  authorize(ROLES.STUDENT, ROLES.ADMIN, ROLES.PRINCIPAL),
  listGrievances
);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.PRINCIPAL),
  respondGrievance
);

module.exports = router;
