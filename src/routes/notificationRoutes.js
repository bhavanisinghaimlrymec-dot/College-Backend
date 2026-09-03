const express = require('express');
const router = express.Router();
const {
  getMine,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification routes require login; every role has an inbox.
router.use(protect);

router.get('/', getMine);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
