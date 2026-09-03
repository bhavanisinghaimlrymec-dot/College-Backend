const express = require('express');
const router = express.Router();
const {
  getSlots,
  createSlot,
  updateSlot,
  deleteSlot,
} = require('../controllers/timetableController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { timetableSchema } = require('../middleware/validationSchemas');

router.use(protect);
router.use(authorize(ROLES.FACULTY, ROLES.ADMIN));

router.get('/', getSlots);
router.post('/', validate(timetableSchema), createSlot);
router.put('/:id', updateSlot);
router.delete('/:id', deleteSlot);

module.exports = router;
