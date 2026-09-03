const express = require('express');
const router = express.Router();
const {
  createExamNotice,
  listExamNotices,
  releaseNotice,
  deleteExamNotice,
} = require('../controllers/examController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { examNoticeSchema } = require('../middleware/validationSchemas');

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.PRINCIPAL));

router.get('/', listExamNotices);
router.post('/', validate(examNoticeSchema), createExamNotice);
router.patch('/:id/release', releaseNotice);
router.delete('/:id', deleteExamNotice);

module.exports = router;
