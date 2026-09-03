const express = require('express');
const router = express.Router();
const {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { eventSchema } = require('../middleware/validationSchemas');

router.use(protect);

// Everyone with a login reads the calendar (branch-scoped in controller).
router.get(
  '/',
  authorize(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN),
  listEvents
);

// Only admin/principal manage it.
router.post('/', authorize(ROLES.ADMIN, ROLES.PRINCIPAL), validate(eventSchema), createEvent);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.PRINCIPAL), updateEvent);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.PRINCIPAL), deleteEvent);

module.exports = router;
