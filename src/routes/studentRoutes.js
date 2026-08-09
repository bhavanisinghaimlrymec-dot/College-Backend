const express = require('express');
const router = express.Router();

const { 
    getAvailableAssignments, 
    submitAssignment, 
    getMyAttendance, 
    getMyMarks 
} = require('../controllers/studentController');

const { upload } = require('../config/storage');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ROLES = require('../constants/roles');
const { validate } = require('../middleware/validationMiddleware');
const { submitAssignmentSchema } = require('../middleware/validationSchemas');

router.use(protect);
router.use(authorize(ROLES.STUDENT));

router.get('/assignments', getAvailableAssignments);

router.post('/submit', upload.single('file'), (req, res, next) => {
    if (req.file) {
        req.body.fileUrl = req.file.path;
    }
    next();
}, validate(submitAssignmentSchema), submitAssignment);

router.get('/my-attendance', getMyAttendance);
router.get('/my-marks', getMyMarks);

module.exports = router;