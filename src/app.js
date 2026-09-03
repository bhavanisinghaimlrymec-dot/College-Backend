const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// 1. IMPORT ALL ROUTES AT THE TOP
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const feedRoutes = require('./routes/feedRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes');
const examNoticeRoutes = require('./routes/examNoticeRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/admin/exam-notices', examNoticeRoutes);

// Root Test
app.get('/', (req, res) => {
    res.send('College App API is Active.');
});

// Error Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;