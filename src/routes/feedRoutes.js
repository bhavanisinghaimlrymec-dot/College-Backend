const express = require('express');
const router = express.Router();
const { createPost, getPosts, deletePost, createBroadcast } = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { createPostSchema, broadcastSchema } = require('../middleware/validationSchemas');

// All feed routes require a valid login
router.use(protect);

router.get('/', getPosts);
router.post('/create', validate(createPostSchema), createPost);
router.delete('/:id', deletePost);

router.post('/broadcast', authorize(ROLES.ADMIN), validate(broadcastSchema), createBroadcast);

module.exports = router;