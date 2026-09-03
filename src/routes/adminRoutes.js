const express = require('express');
const router = express.Router();
const { addUser, promoteSemester, getUsers, deleteUser, updateUserStatus, getOverview } = require('../controllers/adminController');
const { getAdminPerformance } = require('../controllers/performanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { addUserSchema, promoteSchema } = require('../middleware/validationSchemas');

// All routes below are protected and require Admin role
router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.post('/add-user', validate(addUserSchema), addUser);
router.post('/promote', validate(promoteSchema), promoteSemester);

// STEP 3: Admin user management endpoints
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/overview', getOverview);
router.get('/performance', getAdminPerformance);

module.exports = router;
